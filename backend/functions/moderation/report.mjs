import { getUserFromEvent } from "../../lib/auth.mjs";
import { getItem, putItem, queryItems, updateItem } from "../../lib/dynamo.mjs";
import { parseBody, reportSchema } from "../../lib/validate.mjs";
import { enforceRateLimit } from "../../lib/ratelimit.mjs";
import { created, badRequest, unauthorized, notFound, conflict, serverError } from "../../lib/response.mjs";

const AUTO_HIDE_THRESHOLD = 3;

export const handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const { userId } = user;

    const postId = event.pathParameters?.id;
    if (!postId) {
      return badRequest("Post ID is required");
    }

    // Rate limit: max 5 reports per 10 minutes
    const rateLimitResult = await enforceRateLimit(userId, "report-post", 5, 600);
    if (rateLimitResult) return rateLimitResult;

    const { reason } = parseBody(event, reportSchema);

    // Verify post exists and is active
    const post = await getItem(`POST#${postId}`, "DETAIL");
    if (!post || post.status === "deleted") {
      return notFound("Post not found");
    }

    // Check if user already reported this post
    const existingReport = await getItem(`REPORT#${postId}`, `USER#${userId}`);
    if (existingReport) {
      return conflict("You have already reported this post");
    }

    const now = new Date().toISOString();

    // Write the report item
    await putItem({
      PK: `REPORT#${postId}`,
      SK: `USER#${userId}`,
      postId,
      userId,
      reason,
      reportedAt: now,
      // Add to GSI for admin moderation queries
      GSI1PK: "MODERATION#reports",
      GSI1SK: `${now}#${postId}#${userId}`,
    });

    // Count total reports on this post
    const { items: reports } = await queryItems({
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `REPORT#${postId}`,
        ":prefix": "USER#",
      },
    });

    const reportCount = reports.length;

    // Update the reportCount on the post detail
    await updateItem(`POST#${postId}`, "DETAIL", {
      reportCount,
      updatedAt: now,
    });

    // Auto-hide if report count meets threshold
    if (reportCount >= AUTO_HIDE_THRESHOLD && post.status === "active") {
      await updateItem(`POST#${postId}`, "DETAIL", {
        status: "hidden",
        hiddenAt: now,
        hiddenReason: "Auto-hidden due to reports",
      });
    }

    return created({
      message: "Report submitted successfully",
      reportCount,
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return badRequest(err.message);
    }
    if (err.statusCode === 401) {
      return unauthorized();
    }
    console.error("Report post error:", err);
    return serverError("Failed to submit report");
  }
};
