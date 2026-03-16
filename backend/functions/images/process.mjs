import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

const MAX_WIDTH = 1200;
const WEBP_QUALITY = 85;

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export const handler = async (event) => {
  const bucket = event.Records?.[0]?.s3?.bucket?.name;
  const rawKey = event.Records?.[0]?.s3?.object?.key;

  if (!bucket || !rawKey) {
    console.error("Missing bucket or key in S3 event");
    return;
  }

  // URL-decode the key (S3 event keys are URL-encoded)
  const key = decodeURIComponent(rawKey.replace(/\+/g, " "));

  // Only process files in the uploads/ prefix
  if (!key.startsWith("uploads/")) {
    console.log(`Skipping key not in uploads/ prefix: ${key}`);
    return;
  }

  console.log(`Processing image: s3://${bucket}/${key}`);

  try {
    // Download the original image
    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
    const s3Object = await s3Client.send(getCommand);
    const imageBuffer = await streamToBuffer(s3Object.Body);

    // Process with sharp:
    // 1. Auto-rotate based on EXIF orientation
    // 2. Resize to max 1200px wide while maintaining aspect ratio
    // 3. Strip all metadata (EXIF, ICC profile, etc.)
    // 4. Convert to WebP at quality 85
    const processedBuffer = await sharp(imageBuffer)
      .rotate() // auto-rotate based on EXIF orientation data
      .resize({
        width: MAX_WIDTH,
        withoutEnlargement: true, // don't upscale images smaller than MAX_WIDTH
        fit: "inside",
      })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .withMetadata(false) // strip all metadata including EXIF
      .toBuffer();

    // Determine the output key: strip "uploads/" prefix, replace with "processed/", change extension to .webp
    const keyWithoutPrefix = key.replace(/^uploads\//, "");
    const keyWithoutExtension = keyWithoutPrefix.replace(/\.[^/.]+$/, "");
    const outputKey = `processed/${keyWithoutExtension}.webp`;

    console.log(`Saving processed image to: s3://${bucket}/${outputKey}`);

    // Upload the processed image
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: outputKey,
      Body: processedBuffer,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable", // cache for 1 year
      Metadata: {
        "original-key": key,
        "processed-at": new Date().toISOString(),
      },
    });
    await s3Client.send(putCommand);

    console.log(`Successfully saved processed image: ${outputKey}`);

    // Delete the original upload to save storage
    const deleteCommand = new DeleteObjectCommand({ Bucket: bucket, Key: key });
    await s3Client.send(deleteCommand);

    console.log(`Deleted original upload: ${key}`);
  } catch (err) {
    console.error(`Failed to process image ${key}:`, err);
    // Don't throw — S3 trigger functions should not fail loudly
    // unless you want Lambda to retry
    throw err; // rethrow to allow Lambda to retry on transient errors
  }
};
