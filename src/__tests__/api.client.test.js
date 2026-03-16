// Tests for src/api/client.js
// Uses vitest globals (describe, test, expect, vi, beforeEach, afterEach)

import { get, post, put, del, getStoredUser, setStoredUser, clearAuth, ApiError, tokenStore } from "../api/client.js";

// Helper to create a mock Response
function mockResponse(status, body, ok = null) {
  const isOk = ok !== null ? ok : status >= 200 && status < 300;
  return {
    ok: isOk,
    status,
    json: async () => body,
    headers: new Headers(),
  };
}

describe("API Client", () => {
  let fetchMock;

  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
    // Reset tokenStore
    tokenStore.set(null, null);
    // Set up fetch mock
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  describe("get()", () => {
    test("makes a GET fetch call with correct URL", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(200, { items: [] }));

      const result = await get("/posts");

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe("/posts");
      expect(opts.method).toBe("GET");
    });

    test("returns parsed JSON on success", async () => {
      const data = { items: [{ id: "1", title: "Test" }] };
      fetchMock.mockResolvedValueOnce(mockResponse(200, data));

      const result = await get("/posts");
      expect(result).toEqual(data);
    });

    test("includes Authorization header when auth option is true and token exists", async () => {
      tokenStore.set("my-access-token", "my-refresh-token");
      fetchMock.mockResolvedValueOnce(mockResponse(200, {}));

      await get("/posts", { auth: true });

      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.headers["Authorization"]).toBe("Bearer my-access-token");
    });
  });

  describe("post()", () => {
    test("makes a POST fetch call with JSON body", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(201, { postId: "abc" }));

      const body = { title: "Test Post", category: "news" };
      await post("/posts", body);

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe("/posts");
      expect(opts.method).toBe("POST");
      expect(opts.body).toBe(JSON.stringify(body));
      expect(opts.headers["Content-Type"]).toBe("application/json");
    });

    test("returns parsed JSON response body", async () => {
      const responseData = { postId: "xyz", title: "My Post" };
      fetchMock.mockResolvedValueOnce(mockResponse(201, responseData));

      const result = await post("/posts", { title: "My Post", category: "news" });
      expect(result).toEqual(responseData);
    });
  });

  describe("put()", () => {
    test("makes a PUT fetch call with JSON body", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(200, { updated: true }));

      await put("/posts/abc", { title: "Updated Title" });

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe("/posts/abc");
      expect(opts.method).toBe("PUT");
    });
  });

  describe("del()", () => {
    test("makes a DELETE fetch call", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(204, null));

      await del("/posts/abc");

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe("/posts/abc");
      expect(opts.method).toBe("DELETE");
    });

    test("returns null for 204 No Content response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => { throw new Error("No body"); },
      });

      const result = await del("/posts/abc");
      expect(result).toBeNull();
    });
  });

  describe("401 handling", () => {
    test("on 401 response without refresh token, throws ApiError", async () => {
      // No refresh token in tokenStore
      tokenStore.set(null, null);

      fetchMock.mockResolvedValueOnce(mockResponse(401, { error: "Unauthorized" }, false));

      await expect(get("/protected", { auth: true, retry: false })).rejects.toThrow(ApiError);
    });

    test("ApiError has correct status property", async () => {
      tokenStore.set(null, null);
      fetchMock.mockResolvedValueOnce(mockResponse(401, { error: "Unauthorized" }, false));

      try {
        await get("/protected", { auth: true, retry: false });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(401);
      }
    });

    test("non-401 HTTP error throws ApiError with correct status", async () => {
      fetchMock.mockResolvedValueOnce(mockResponse(404, { message: "Not found" }, false));

      try {
        await get("/nonexistent");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(404);
      }
    });
  });

  describe("clearAuth()", () => {
    test("removes localStorage items", () => {
      localStorage.setItem("hob_access", "test-access");
      localStorage.setItem("hob_refresh", "test-refresh");
      localStorage.setItem("hob_user", JSON.stringify({ userId: "123" }));

      clearAuth();

      expect(localStorage.getItem("hob_access")).toBeNull();
      expect(localStorage.getItem("hob_refresh")).toBeNull();
      expect(localStorage.getItem("hob_user")).toBeNull();
    });

    test("clears tokenStore tokens", () => {
      tokenStore.set("access-token", "refresh-token");

      clearAuth();

      expect(tokenStore.accessToken).toBeNull();
      expect(tokenStore.refreshToken).toBeNull();
    });
  });

  describe("getStoredUser() / setStoredUser()", () => {
    test("setStoredUser stores user in localStorage", () => {
      const user = { userId: "abc", displayName: "Alice", isAdmin: false };
      setStoredUser(user);

      const stored = localStorage.getItem("hob_user");
      expect(JSON.parse(stored)).toEqual(user);
    });

    test("getStoredUser returns null when not set", () => {
      localStorage.removeItem("hob_user");
      expect(getStoredUser()).toBeNull();
    });

    test("getStoredUser returns parsed user when set", () => {
      const user = { userId: "xyz", displayName: "Bob", isAdmin: true };
      localStorage.setItem("hob_user", JSON.stringify(user));

      expect(getStoredUser()).toEqual(user);
    });

    test("setStoredUser with null removes localStorage item", () => {
      localStorage.setItem("hob_user", JSON.stringify({ userId: "123" }));

      setStoredUser(null);

      expect(localStorage.getItem("hob_user")).toBeNull();
    });
  });
});
