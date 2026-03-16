import { requireAdmin } from "../../lib/auth.mjs";
import { getItem, updateItem } from "../../lib/dynamo.mjs";
import { parseBody, adminUpdateStatusSchema } from "../../lib/validate.mjs";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "../../lib/response.mjs";

export const handler = async (event) => {
  try {
    const user = requireAdmin(event);

    const postId = event.pathParameters?.id;
    if (!postId) {
      return badRequest("Post ID is required");
    }

    const { status } = parseBody(event, adminUpdateStatusSchema);

    // Verify post exists
    const post = await getItem(`POST#${postId}`, "DETAIL");
    if (!post || post.status === "deleted") {
      return notFound("Post not found");
    }

    const now = new Date().toISOString();

    const updateFields = {
      status,
      updatedAt: now,
      moderatedAt: now,
      moderatedBy: user.userId,
    };

    if (status === "active") {
      updateFields.hiddenAt = null;
      updateFields.hiddenReason = null;
    } else if (status === "hidden") {
      updateFields.hiddenAt = now;
      updateFields.hiddenReason = "Hidden by moderator";
    }

    const updatedPost = await updateItem(`POST#${postId}`, "DETAIL", updateFields);

    return ok({
      postId: updatedPost.postId,
      title: updatedPost.title,
      category: updatedPost.category,
      status: updatedPost.status,
      authorDisplayName: updatedPost.authorDisplayName,
      createdAt: updatedPost.createdAt,
      updatedAt: updatedPost.updatedAt,
      reportCount: updatedPost.reportCount || 0,
      moderatedAt: updatedPost.moderatedAt,
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
    console.error("Admin update status error:", err);
    return serverError("Failed to update post status");
  }
};
