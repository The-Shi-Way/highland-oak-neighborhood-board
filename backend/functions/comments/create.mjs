import { getUserFromEvent } from "../../lib/auth.mjs";
import { getItem, putItem, updateItemExpression } from "../../lib/dynamo.mjs";
import { parseBody, createCommentSchema } from "../../lib/validate.mjs";
import { sanitizeHtml } from "../../lib/sanitize.mjs";
import { enforceRateLimit } from "../../lib/ratelimit.mjs";
import { created, badRequest, unauthorized, notFound, serverError } from "../../lib/response.mjs";

export const handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const { userId } = user;

    const postId = event.pathParameters?.id;
    if (!postId) {
      return badRequest("Post ID is required");
    }

    // Rate limit: max 20 comments per 5 minutes
    const rateLimitResult = await enforceRateLimit(userId, "create-comment", 20, 300);
    if (rateLimitResult) return rateLimitResult;

    const { body, parentCommentId } = parseBody(event, createCommentSchema);

    // Verify post exists and is active
    const post = await getItem(`POST#${postId}`, "DETAIL");
    if (!post || post.status === "deleted") {
      return notFound("Post not found");
    }

    // Verify parent comment exists if provided
    if (parentCommentId) {
      // Validate UUID format first for fast rejection
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(parentCommentId)) {
        return badRequest("Invalid parent comment ID format");
      }

      // Query for the parent comment to confirm it exists on this post
      const { queryItems } = await import("../../lib/dynamo.mjs");
      const { items: parentItems } = await queryItems({
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        FilterExpression: "commentId = :cid",
        ExpressionAttributeValues: {
          ":pk": `POST#${postId}`,
          ":prefix": "COMMENT#",
          ":cid": parentCommentId,
        },
      });

      if (!parentItems || parentItems.length === 0) {
        return badRequest("Parent comment not found");
      }
    }

    const sanitizedBody = sanitizeHtml(body);
    if (!sanitizedBody || sanitizedBody.trim().length === 0) {
      return badRequest("Comment cannot be empty");
    }

    // Fetch user profile for display name
    const userProfile = await getItem(`USER#${userId}`, "PROFILE");
    const authorDisplayName = userProfile?.displayName || "Unknown User";

    const commentId = crypto.randomUUID();
    const now = new Date().toISOString();

    const commentItem = {
      PK: `POST#${postId}`,
      SK: `COMMENT#${now}#${commentId}`,
      commentId,
      postId,
      body: sanitizedBody,
      authorId: userId,
      authorDisplayName,
      parentCommentId: parentCommentId || null,
      createdAt: now,
      updatedAt: now,
      status: "active",
    };

    await putItem(commentItem);

    // Atomically increment post comment count
    await updateItemExpression(
      `POST#${postId}`,
      "DETAIL",
      "ADD #commentCount :one",
      { "#commentCount": "commentCount" },
      { ":one": 1 }
    );

    return created({
      commentId,
      postId,
      body: sanitizedBody,
      authorDisplayName,
      parentCommentId: parentCommentId || null,
      createdAt: now,
      status: "active",
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return badRequest(err.message);
    }
    if (err.statusCode === 401) {
      return unauthorized();
    }
    console.error("Create comment error:", err);
    return serverError("Failed to create comment");
  }
};
