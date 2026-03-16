import { getUserFromEvent } from "../../lib/auth.mjs";
import { queryItems, updateItem } from "../../lib/dynamo.mjs";
import { noContent, badRequest, unauthorized, forbidden, notFound, serverError } from "../../lib/response.mjs";

export const handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const { userId, isAdmin } = user;

    const postId = event.pathParameters?.id;
    const commentId = event.pathParameters?.cid;

    if (!postId) {
      return badRequest("Post ID is required");
    }
    if (!commentId) {
      return badRequest("Comment ID is required");
    }

    // Find the comment by querying for items with this commentId
    const { items } = await queryItems({
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      FilterExpression: "commentId = :cid",
      ExpressionAttributeValues: {
        ":pk": `POST#${postId}`,
        ":prefix": "COMMENT#",
        ":cid": commentId,
      },
    });

    if (!items || items.length === 0) {
      return notFound("Comment not found");
    }

    const comment = items[0];

    if (comment.status === "deleted") {
      return notFound("Comment not found");
    }

    // Check ownership or admin
    if (comment.authorId !== userId && !isAdmin) {
      return forbidden();
    }

    const now = new Date().toISOString();
    const commentSK = comment.SK;

    // Soft-delete: anonymize and mark as deleted
    await updateItem(`POST#${postId}`, commentSK, {
      status: "deleted",
      body: "[deleted]",
      authorDisplayName: "Deleted User",
      authorId: "deleted",
      updatedAt: now,
    });

    return noContent();
  } catch (err) {
    if (err.statusCode === 401) {
      return unauthorized();
    }
    if (err.statusCode === 403) {
      return forbidden();
    }
    console.error("Delete comment error:", err);
    return serverError("Failed to delete comment");
  }
};
