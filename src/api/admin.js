import { get, put, del } from "./client.js";

export function listReports() { return get("/admin/reports", { auth: true }); }

export function updatePostStatus(id, status) {
  return put(`/admin/posts/${id}/status`, { status }, { auth: true });
}

export function hardDeletePost(id) { return del(`/admin/posts/${id}`, { auth: true }); }
