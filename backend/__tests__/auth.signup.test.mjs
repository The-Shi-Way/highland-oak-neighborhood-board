import { mockCognitoSend, resetCognitoMocks } from "./helpers/mockCognito.mjs";
import { mockSend, resetMocks, mockPut } from "./helpers/mockDynamo.mjs";

// Set required env vars before importing the handler
process.env.USER_POOL_ID = "us-east-1_testpool";
process.env.USER_POOL_CLIENT_ID = "testclientid";
process.env.TABLE_NAME = "CommunityBoard-test";
process.env.AWS_REGION = "us-east-1";

const { handler } = await import("../functions/auth/signup.mjs");

function makeEvent(body) {
  return { body: JSON.stringify(body) };
}

describe("POST /auth/signup", () => {
  beforeEach(() => {
    resetCognitoMocks();
    resetMocks();
  });

  test("happy path: valid email + displayName + password → 201 with userId and displayName", async () => {
    const mockUserId = "abc-123-def-456";

    // Mock AdminCreateUser response
    mockCognitoSend.mockResolvedValueOnce({
      User: {
        Attributes: [
          { Name: "sub", Value: mockUserId },
          { Name: "email", Value: "test@example.com" },
        ],
      },
    });

    // Mock AdminSetUserPassword response
    mockCognitoSend.mockResolvedValueOnce({});

    // Mock DynamoDB putItem (via mockSend)
    mockPut();

    const event = makeEvent({
      email: "test@example.com",
      displayName: "TestUser",
      password: "Password123!",
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.userId).toBe(mockUserId);
    expect(body.displayName).toBe("TestUser");
    expect(body.message).toMatch(/created/i);
  });

  test("missing required fields → 400", async () => {
    const event = makeEvent({ email: "test@example.com" });
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBeDefined();
  });

  test("missing email → 400", async () => {
    const event = makeEvent({ displayName: "TestUser", password: "Password123!" });
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  test("invalid email format → 400", async () => {
    const event = makeEvent({
      email: "notanemail",
      displayName: "TestUser",
      password: "Password123!",
    });
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toMatch(/email/i);
  });

  test("short password (< 8 chars) → 400", async () => {
    const event = makeEvent({
      email: "test@example.com",
      displayName: "TestUser",
      password: "short",
    });
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toMatch(/password/i);
  });

  test("Cognito UsernameExistsException → 409 conflict", async () => {
    const err = new Error("User already exists");
    err.name = "UsernameExistsException";
    mockCognitoSend.mockRejectedValueOnce(err);

    const event = makeEvent({
      email: "existing@example.com",
      displayName: "TestUser",
      password: "Password123!",
    });

    const result = await handler(event);
    expect(result.statusCode).toBe(409);
    const body = JSON.parse(result.body);
    expect(body.error).toMatch(/already exists/i);
  });

  test("empty body → 400", async () => {
    const event = { body: null };
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  test("displayName too short after sanitization → 400", async () => {
    // Single character display name — sanitize-html should pass it through, but length check fails
    const event = makeEvent({
      email: "test@example.com",
      displayName: "A",
      password: "Password123!",
    });
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });
});
