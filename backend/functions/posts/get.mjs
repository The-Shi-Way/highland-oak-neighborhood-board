import { getItem, queryItems } from "../../lib/dynamo.mjs";
import { ok, notFound, badRequest, serverError } from "../../lib/response.mjs";

export const handler = async (event) => {
  try {
    const postId = event.pathParameters?.id;
    if (!postId) {
      return badRequest("Post ID is required");
    }

    // Fetch full post detail
    const post = await getItem(`POST#${postId}`, "DETAIL");
    if (!post || post.status === "deleted") {
      return notFound("Post not found");
    }

    // Fetch comments for this post, sorted ascending by SK (timestamp)
    const { items: commentItems } = await queryItems({
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `POST#${postId}`,
        ":prefix": "COMMENT#",
      },
      ScanIndexForward: true, // ascending by creation time
    });

    const comments = commentItems
      .filter((c) => c.status !== "deleted" || c.body === "[deleted]")
      .map((c) => ({
        commentId: c.commentId,
        body: c.status === "deleted" ? "[deleted]" : c.body,
        authorDisplayName: c.status === "deleted" ? "Deleted User" : c.authorDisplayName,
        parentCommentId: c.parentCommentId || null,
        createdAt: c.createdAt,
        status: c.status || "active",
      }));

    return ok({
      postId: post.postId,
      title: post.title,
      category: post.category,
      body: post.body,
      urgency: post.urgency,
      imageKey: post.imageKey,
      authorDisplayName: post.authorDisplayName,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      likeCount: post.likeCount || 0,
      commentCount: post.commentCount || 0,
      status: post.status || "active",
      comments,
    });
  } catch (err) {
    console.error("Get post error:", err);
    return serverError("Failed to retrieve post");
  }
};
