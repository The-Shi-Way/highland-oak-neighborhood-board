import { get, put, del } from "./client.js";

export function getMe() { return get("/me", { auth: true }); }

export function updateMe(data) { return put("/me", data, { auth: true }); }

export function deleteMe() { return del("/me", { auth: true }); }
