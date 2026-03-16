import { mockSend, resetMocks, mockGet, mockNotFound } from "./helpers/mockDynamo.mjs";

process.env.TABLE_NAME = "CommunityBoard-test";
process.env.AWS_REGION = "us-east-1";

const { handler } = await import("../functions/posts/create.mjs");

function makeAuthEvent(body, userId = "user-123", role = "member") {
  return {
    body: JSON.stringify(body),
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            sub: userId,
            email: "test@example.com",
            "custom:role": role,
          },
        },
      },
    },
  };
}

function makeUnauthEvent(body) {
  return { body: JSON.stringify(body) };
}

describe("POST /posts", () => {
  beforeEach(() => {
    resetMocks();
  });

  test("happy path: authenticated user creates post → 201 with post object and 3 transact writes", async () => {
    // Rate limit check: getItem returns null (no existing rate limit record)
    mockNotFound();
    // Rate limit increment: UpdateCommand resolves
    mockSend.mockResolvedValueOnce({ Attributes: { count: 1 } });
    // getItem for user profile
    mockGet({ PK: "USER#user-123", SK: "PROFILE", displayName: "Alice" });
    // transactWrite resolves
    mockSend.mockResolvedValueOnce({});
    // updateItemExpression for post count increment
    mockSend.mockResolvedValueOnce({ Attributes: { postCount: 1 } });

    const event = makeAuthEvent({
      title: "My Test Post Title",
      category: "news",
      body: "This is the body of the post.",
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.postId).toBeDefined();
    expect(body.title).toBe("My Test Post Title");
    expect(body.category).toBe("news");
    expect(body.authorDisplayName).toBe("Alice");
    expect(body.likeCount).toBe(0);
    expect(body.commentCount).toBe(0);
    expect(body.status).toBe("active");
  });

  test("category 'watch' with urgency → includes urgency in post", async () => {
    // Rate limit check
    mockNotFound();
    mockSend.mockResolvedValueOnce({ Attributes: { count: 1 } });
    // User profile
    mockGet({ PK: "USER#user-123", SK: "PROFILE", displayName: "Alice" });
    // transactWrite (4 items for watch+alert: 3 standard + 1 alert)
    mockSend.mockResolvedValueOnce({});
    // Post count increment
    mockSend.mockResolvedValueOnce({ Attributes: { postCount: 1 } });

    const event = makeAuthEvent({
      title: "Suspicious Activity Reported",
      category: "watch",
      urgency: "alert",
      body: "Please be on the lookout.",
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.urgency).toBe("alert");
    expect(body.category).toBe("watch");
  });

  test("category 'watch' with 'caution' urgency → includes urgency", async () => {
    mockNotFound();
    mockSend.mockResolvedValueOnce({ Attributes: { count: 1 } });
    mockGet({ PK: "USER#user-123", SK: "PROFILE", displayName: "Alice" });
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({ Attributes: { postCount: 1 } });

    const event = makeAuthEvent({
      title: "Neighborhood Watch Update",
      category: "watch",
      urgency: "caution",
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.urgency).toBe("caution");
  });

  test("missing title → 400", async () => {
    const event = makeAuthEvent({
      category: "news",
      body: "Body without title",
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBeDefined();
  });

  test("title too short (< 3 chars) → 400", async () => {
    const event = makeAuthEvent({
      title: "Hi",
      category: "news",
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toMatch(/title|3/i);
  });

  test("invalid category → 400", async () => {
    const event = makeAuthEvent({
      title: "Valid Post Title",
      category: "invalid-category",
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toMatch(/category/i);
  });

  test("unauthenticated request → 401", async () => {
    const event = makeUnauthEvent({
      title: "Valid Post Title",
      category: "news",
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(401);
  });
});
