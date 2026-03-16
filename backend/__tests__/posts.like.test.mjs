import { mockSend, resetMocks, mockGet, mockNotFound } from "./helpers/mockDynamo.mjs";

process.env.TABLE_NAME = "CommunityBoard-test";
process.env.AWS_REGION = "us-east-1";

const { handler } = await import("../functions/posts/like.mjs");

function makeAuthEvent(postId, userId = "user-123") {
  return {
    pathParameters: { id: postId },
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            sub: userId,
            email: "test@example.com",
            "custom:role": "member",
          },
        },
      },
    },
  };
}

function makeUnauthEvent(postId) {
  return {
    pathParameters: { id: postId },
  };
}

describe("POST /posts/:id/like", () => {
  beforeEach(() => {
    resetMocks();
  });

  test("like a post (not previously liked) → 200 with { liked: true }", async () => {
    // getItem for post existence check
    mockGet({
      PK: "POST#post-abc",
      SK: "DETAIL",
      postId: "post-abc",
      title: "Test Post",
      status: "active",
      likeCount: 5,
    });

    // PutCommand (create like — condition succeeds, item didn't exist)
    mockSend.mockResolvedValueOnce({});

    // UpdateCommand (increment likeCount)
    mockSend.mockResolvedValueOnce({
      Attributes: { likeCount: 6 },
    });

    const event = makeAuthEvent("post-abc");
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.liked).toBe(true);
    expect(body.likeCount).toBe(6);
  });

  test("unlike a post (ConditionalCheckFailedException on Put) → deletes like, returns { liked: false }", async () => {
    // getItem for post existence check
    mockGet({
      PK: "POST#post-abc",
      SK: "DETAIL",
      postId: "post-abc",
      title: "Test Post",
      status: "active",
      likeCount: 5,
    });

    // PutCommand throws ConditionalCheckFailedException (like already exists)
    const err = new Error("ConditionalCheckFailedException");
    err.name = "ConditionalCheckFailedException";
    mockSend.mockRejectedValueOnce(err);

    // DeleteCommand (remove the like)
    mockSend.mockResolvedValueOnce({});

    // UpdateCommand (decrement likeCount)
    mockSend.mockResolvedValueOnce({
      Attributes: { likeCount: 4 },
    });

    const event = makeAuthEvent("post-abc");
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.liked).toBe(false);
    expect(body.likeCount).toBe(4);
  });

  test("unauthenticated request → 401", async () => {
    const event = makeUnauthEvent("post-abc");
    const result = await handler(event);
    expect(result.statusCode).toBe(401);
  });

  test("missing post id → 400", async () => {
    const event = {
      pathParameters: {},
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: "user-123",
              email: "test@example.com",
              "custom:role": "member",
            },
          },
        },
      },
    };

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  test("post not found → 404", async () => {
    // getItem returns null (post doesn't exist)
    mockNotFound();

    const event = makeAuthEvent("nonexistent-post");
    const result = await handler(event);
    expect(result.statusCode).toBe(404);
  });

  test("deleted post → 404", async () => {
    // getItem returns a deleted post
    mockGet({
      PK: "POST#post-deleted",
      SK: "DETAIL",
      postId: "post-deleted",
      status: "deleted",
    });

    const event = makeAuthEvent("post-deleted");
    const result = await handler(event);
    expect(result.statusCode).toBe(404);
  });
});
