const API_URL = import.meta.env.VITE_API_URL || "";

// Stores tokens in-memory (session-level) and in localStorage for persistence
const tokenStore = {
  accessToken: localStorage.getItem("hob_access") || null,
  refreshToken: localStorage.getItem("hob_refresh") || null,

  set(access, refresh) {
    this.accessToken = access;
    if (access) localStorage.setItem("hob_access", access);
    else localStorage.removeItem("hob_access");
    if (refresh !== undefined) {
      this.refreshToken = refresh;
      if (refresh) localStorage.setItem("hob_refresh", refresh);
      else localStorage.removeItem("hob_refresh");
    }
  },
  clear() { this.set(null, null); }
};

// JWT decode (no verification — browser-side only)
function decodeJwt(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

// Get user claims from stored id token
export function getStoredUser() {
  // parse stored user from localStorage "hob_user" — set on login
  const s = localStorage.getItem("hob_user");
  return s ? JSON.parse(s) : null;
}

export function setStoredUser(user) {
  if (user) localStorage.setItem("hob_user", JSON.stringify(user));
  else localStorage.removeItem("hob_user");
}

export function clearAuth() {
  tokenStore.clear();
  localStorage.removeItem("hob_user");
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function tryRefresh() {
  if (!tokenStore.refreshToken) return false;
  try {
    const data = await request("POST", "/auth/refresh", { refreshToken: tokenStore.refreshToken }, { retry: false });
    tokenStore.set(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

// Core request function
async function request(method, path, body = null, { auth = false, retry = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && tokenStore.accessToken) {
    headers["Authorization"] = `Bearer ${tokenStore.accessToken}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Attempt token refresh on 401
  if (res.status === 401 && retry && tokenStore.refreshToken) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(method, path, body, { auth, retry: false });
    clearAuth();
    throw new ApiError(401, "Session expired. Please sign in again.");
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j.message || msg;
    } catch {}
    throw new ApiError(res.status, msg);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const get = (path, opts) => request("GET", path, null, opts);
export const post = (path, body, opts) => request("POST", path, body, opts);
export const put = (path, body, opts) => request("PUT", path, body, opts);
export const del = (path, opts) => request("DELETE", path, null, opts);
export { tokenStore };
