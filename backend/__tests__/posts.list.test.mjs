import { mockSend, resetMocks } from "./helpers/mockDynamo.mjs";

process.env.TABLE_NAME = "CommunityBoard-test";
process.env.AWS_REGION = "us-east-1";

const { handler } = await import("../functions/posts/list.mjs");

function makeEvent(queryStringParameters = {}) {
  return { queryStringParameters };
}

const samplePost = (overrides = {}) => ({
  PK: "COMMUNITY#default",
  SK: "POST#2024-01-01T00:00:00.000Z#post-abc",
  postId: "post-abc",
  title: "Sample Post Title",
  category: "news",
  body: "Post body content",
  urgency: undefined,
  imageKey: null,
  authorDisplayName: "Alice",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  likeCount: 3,
  commentCount: 1,
  status: "active",
  reportCount: 0,
  ...overrides,
});

describe("GET /posts", () => {
  beforeEach(() => {
    resetMocks();
  });

  test("list all posts → 200 with items array", async () => {
    const items = [samplePost(), samplePost({ postId: "post-def", title: "Another Post" })];

    mockSend.mockResolvedValueOnce({
      Items: items,
      Count: items.length,
      LastEvaluatedKey: undefined,
    });

    const event = makeEvent({});
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBe(2);
    expect(body.items[0].title).toBe("Sample Post Title");
    expect(body.count).toBe(2);
    expect(body.nextCursor).toBeNull();
  });

  test("filter by category → queries GSI1", async () => {
    const watchPost = samplePost({
      postId: "post-watch",
      category: "watch",
      urgency: "alert",
      title: "Watch Post",
    });

    mockSend.mockResolvedValueOnce({
      Items: [watchPost],
      Count: 1,
      LastEvaluatedKey: undefined,
    });

    const event = makeEvent({ category: "watch" });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.items.length).toBe(1);
    expect(body.items[0].category).toBe("watch");

    // Verify that QueryCommand was called with GSI1 index
    const queryCommandCalls = mockSend.mock.calls;
    expect(queryCommandCalls.length).toBe(1);
    // The QueryCommand arg should include IndexName: "GSI1"
    const queryArg = queryCommandCalls[0][0];
    expect(queryArg.IndexName).toBe("GSI1");
  });

  test("pagination with cursor → includes cursor in query", async () => {
    const items = [samplePost({ postId: "post-page2" })];
    const lastKey = { PK: "COMMUNITY#default", SK: "POST#2024-01-01T00:00:00.000Z#post-abc" };

    mockSend.mockResolvedValueOnce({
      Items: items,
      Count: 1,
      LastEvaluatedKey: lastKey,
    });

    // Encode a cursor for the next page
    const cursor = Buffer.from(JSON.stringify({ PK: "COMMUNITY#default", SK: "POST#2023-12-01T00:00:00.000Z#post-prev" })).toString("base64");

    const event = makeEvent({ cursor });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.items.length).toBe(1);
    // Next cursor should be set since there's a lastEvaluatedKey
    expect(body.nextCursor).not.toBeNull();
    // Verify cursor can be decoded to the last evaluated key
    const decodedCursor = JSON.parse(Buffer.from(body.nextCursor, "base64").toString("utf-8"));
    expect(decodedCursor).toEqual(lastKey);
  });

  test("invalid cursor → 400", async () => {
    const event = makeEvent({ cursor: "!!!invalid-base64-json!!!" });
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toMatch(/cursor/i);
  });

  test("invalid category → 400", async () => {
    const event = makeEvent({ category: "bogus" });
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toMatch(/category/i);
  });

  test("invalid limit → 400", async () => {
    const event = makeEvent({ limit: "not-a-number" });
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  test("filters out deleted posts from results", async () => {
    const items = [
      samplePost({ postId: "post-active", status: "active" }),
      samplePost({ postId: "post-deleted", status: "deleted" }),
    ];

    mockSend.mockResolvedValueOnce({
      Items: items,
      Count: 2,
      LastEvaluatedKey: undefined,
    });

    const event = makeEvent({});
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    // Deleted post should be filtered out
    expect(body.items.length).toBe(1);
    expect(body.items[0].postId).toBe("post-active");
  });

  test("no queryStringParameters → defaults to global feed", async () => {
    mockSend.mockResolvedValueOnce({
      Items: [],
      Count: 0,
      LastEvaluatedKey: undefined,
    });

    const event = { queryStringParameters: null };
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.items).toEqual([]);
  });
});
