import { post, tokenStore, setStoredUser, clearAuth } from "./client.js";

export async function signup(email, displayName, password) {
  return post("/auth/signup", { email, displayName, password });
}

export async function login(email, password) {
  const data = await post("/auth/login", { email, password });
  tokenStore.set(data.accessToken, data.refreshToken);
  // Store user object derived from response
  const user = {
    email,
    displayName: data.displayName || email.split("@")[0],
    id: data.userId,
    role: data.role || "member",
    joinedAt: data.joinedAt || new Date().toISOString(),
  };
  setStoredUser(user);
  return user;
}

export async function logout() {
  try { await post("/auth/logout", {}, { auth: true }); } catch {}
  clearAuth();
}

export async function forgotPassword(email) {
  return post("/auth/forgot-password", { email });
}

export async function resetPassword(email, code, newPassword) {
  return post("/auth/reset-password", { email, code, newPassword });
}
