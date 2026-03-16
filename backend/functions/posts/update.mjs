import { getUserFromEvent } from "../../lib/auth.mjs";
import { getItem, updateItem, updateItemExpression } from "../../lib/dynamo.mjs";
import { parseBody, updatePostSchema } from "../../lib/validate.mjs";
import { sanitizeText, sanitizeHtml } from "../../lib/sanitize.mjs";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "../../lib/response.mjs";

export const handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const { userId, isAdmin } = user;

    const postId = event.pathParameters?.id;
    if (!postId) {
      return badRequest("Post ID is required");
    }

    const updates = parseBody(event, updatePostSchema);

    if (Object.keys(updates).length === 0) {
      return badRequest("At least one field must be provided for update");
    }

    // Fetch existing post
    const existingPost = await getItem(`POST#${postId}`, "DETAIL");
    if (!existingPost || existingPost.status === "deleted") {
      return notFound("Post not found");
    }

    // Check ownership
    if (existingPost.authorId !== userId && !isAdmin) {
      return forbidden();
    }

    const now = new Date().toISOString();
    const updatedFields = { updatedAt: now };

    if (updates.title !== undefined) {
      const sanitizedTitle = sanitizeText(updates.title);
      if (!sanitizedTitle || sanitizedTitle.length < 3) {
        return badRequest("Title must be at least 3 characters after sanitization");
      }
      updatedFields.title = sanitizedTitle;
    }

    if (updates.body !== undefined) {
      updatedFields.body = sanitizeHtml(updates.body);
    }

    if (updates.urgency !== undefined) {
      if (existingPost.category !== "watch") {
        return badRequest("Urgency can only be set for watch category posts");
      }
      updatedFields.urgency = updates.urgency;
    }

    if (updates.imageKey !== undefined) {
      updatedFields.imageKey = updates.imageKey;
    }

    // Update the main post detail item
    const updatedPost = await updateItem(`POST#${postId}`, "DETAIL", updatedFields);

    // Also update the community feed projection if title changed
    if (updatedFields.title || updatedFields.urgency || updatedFields.imageKey) {
      const projectionUpdates = { updatedAt: now };
      if (updatedFields.title) projectionUpdates.title = updatedFields.title;
      if (updatedFields.urgency) projectionUpdates.urgency = updatedFields.urgency;
      if (updatedFields.imageKey !== undefined) projectionUpdates.imageKey = updatedFields.imageKey;

      // We need to find the community feed projection item (SK includes timestamp)
      // Since we store createdAt in post, we can reconstruct the SK
      if (existingPost.createdAt) {
        try {
          await updateItem(
            "COMMUNITY#default",
            `POST#${existingPost.createdAt}#${postId}`,
            projectionUpdates
          );
        } catch (projErr) {
          // Non-critical, log but continue
          console.warn("Failed to update community feed projection:", projErr.message);
        }
      }
    }

    return ok({
      postId: updatedPost.postId,
      title: updatedPost.title,
      category: updatedPost.category,
      body: updatedPost.body,
      urgency: updatedPost.urgency,
      imageKey: updatedPost.imageKey,
      authorDisplayName: updatedPost.authorDisplayName,
      createdAt: updatedPost.createdAt,
      updatedAt: updatedPost.updatedAt,
      likeCount: updatedPost.likeCount || 0,
      commentCount: updatedPost.commentCount || 0,
      status: updatedPost.status,
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return badRequest(err.message);
    }
    if (err.statusCode === 401) {
      return unauthorized();
    }
    if (err.statusCode === 403) {
      return forbidden();
    }
    console.error("Update post error:", err);
    return serverError("Failed to update post");
  }
};
