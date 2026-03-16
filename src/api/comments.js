import { post, del } from "./client.js";

export function createComment(postId, body, parentCommentId = null) {
  return post(`/posts/${postId}/comments`, { body, parentCommentId }, { auth: true });
}

export function deleteComment(postId, commentId) {
  return del(`/posts/${postId}/comments/${commentId}`, { auth: true });
}
