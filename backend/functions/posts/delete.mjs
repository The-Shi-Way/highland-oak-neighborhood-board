import { getUserFromEvent } from "../../lib/auth.mjs";
import { getItem, updateItem } from "../../lib/dynamo.mjs";
import { noContent, badRequest, unauthorized, forbidden, notFound, serverError } from "../../lib/response.mjs";

export const handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const { userId, isAdmin } = user;

    const postId = event.pathParameters?.id;
    if (!postId) {
      return badRequest("Post ID is required");
    }

    // Fetch existing post
    const existingPost = await getItem(`POST#${postId}`, "DETAIL");
    if (!existingPost || existingPost.status === "deleted") {
      return notFound("Post not found");
    }

    // Check ownership or admin
    if (existingPost.authorId !== userId && !isAdmin) {
      return forbidden();
    }

    const now = new Date().toISOString();

    // Soft-delete: anonymize and mark as deleted
    await updateItem(`POST#${postId}`, "DETAIL", {
      status: "deleted",
      authorDisplayName: "Deleted User",
      authorId: "deleted",
      updatedAt: now,
    });

    // Also soft-delete the community feed projection
    if (existingPost.createdAt) {
      try {
        await updateItem(
          "COMMUNITY#default",
          `POST#${existingPost.createdAt}#${postId}`,
          {
            status: "deleted",
            authorDisplayName: "Deleted User",
            updatedAt: now,
          }
        );
      } catch (projErr) {
        // Non-critical, log but continue
        console.warn("Failed to update community feed projection on delete:", projErr.message);
      }
    }

    return noContent();
  } catch (err) {
    if (err.statusCode === 401) {
      return unauthorized();
    }
    if (err.statusCode === 403) {
      return forbidden();
    }
    console.error("Delete post error:", err);
    return serverError("Failed to delete post");
  }
};
