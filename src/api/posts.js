import { get, post, put, del } from "./client.js";

export function listPosts({ category, cursor, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (category && category !== "all") params.set("category", category);
  if (cursor) params.set("cursor", cursor);
  params.set("limit", String(limit));
  return get(`/posts?${params}`);
}

export function getPost(id) { return get(`/posts/${id}`); }

export function createPost(data) { return post("/posts", data, { auth: true }); }

export function updatePost(id, data) { return put(`/posts/${id}`, data, { auth: true }); }

export function deletePost(id) { return del(`/posts/${id}`, { auth: true }); }

export function likePost(id) { return post(`/posts/${id}/like`, {}, { auth: true }); }

export function reportPost(id, reason) {
  return post(`/posts/${id}/report`, { reason }, { auth: true });
}
