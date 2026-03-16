import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getUserFromEvent } from "../../lib/auth.mjs";
import { parseBody, presignSchema } from "../../lib/validate.mjs";
import { sanitizeText } from "../../lib/sanitize.mjs";
import { enforceRateLimit } from "../../lib/ratelimit.mjs";
import { ok, badRequest, unauthorized, serverError } from "../../lib/response.mjs";

const CONTENT_TYPE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

const PRESIGN_EXPIRY_SECONDS = 300; // 5 minutes

const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

export const handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const { userId } = user;

    // Rate limit: max 20 presign requests per 10 minutes
    const rateLimitResult = await enforceRateLimit(userId, "presign-upload", 20, 600);
    if (rateLimitResult) return rateLimitResult;

    const { filename, contentType, size, postId } = parseBody(event, presignSchema);

    // Sanitize and extract extension from original filename
    const sanitizedFilename = sanitizeText(filename);
    const originalExtension = sanitizedFilename.split(".").pop()?.toLowerCase();
    const expectedExtension = CONTENT_TYPE_EXTENSIONS[contentType];

    if (!expectedExtension) {
      return badRequest("Unsupported content type");
    }

    // Use the content-type derived extension for security
    const ext = expectedExtension;
    const fileUUID = crypto.randomUUID();
    const key = `uploads/${postId}/${fileUUID}.${ext}`;

    const bucket = process.env.IMAGES_BUCKET;
    if (!bucket) {
      return serverError("Images bucket not configured");
    }

    // Generate presigned PUT URL
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
      Metadata: {
        "uploaded-by": userId,
        "original-filename": sanitizedFilename.slice(0, 256),
        "post-id": postId,
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGN_EXPIRY_SECONDS,
    });

    return ok({
      uploadUrl,
      key,
      expiresIn: PRESIGN_EXPIRY_SECONDS,
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return badRequest(err.message);
    }
    if (err.statusCode === 401) {
      return unauthorized();
    }
    console.error("Presign error:", err);
    return serverError("Failed to generate upload URL");
  }
};
