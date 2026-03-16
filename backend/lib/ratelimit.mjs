import { getItem, putItem } from "./dynamo.mjs";
import { tooManyRequests } from "./response.mjs";

/**
 * Rate limit a user action using DynamoDB TTL-based counter.
 * @param {string} userId - The user ID
 * @param {string} action - Action name (e.g., "create-post")
 * @param {number} maxRequests - Max allowed requests within the window
 * @param {number} windowSeconds - Time window in seconds
 */
export async function checkRateLimit(userId, action, maxRequests = 10, windowSeconds = 60) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSeconds); // quantize to window boundary
  const pk = `RATELIMIT#${userId}#${action}`;
  const sk = `WINDOW#${windowStart}`;
  const ttl = windowStart + windowSeconds + 10; // expire slightly after window ends

  const existing = await getItem(pk, sk);
  const count = existing ? (existing.count || 0) : 0;

  if (count >= maxRequests) {
    return false; // rate limit exceeded
  }

  // Increment counter using conditional update
  const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
  const { DynamoDBDocumentClient, UpdateCommand } = await import("@aws-sdk/lib-dynamodb");

  const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
  const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });

  await docClient.send(
    new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { PK: pk, SK: sk },
      UpdateExpression: "SET #count = if_not_exists(#count, :zero) + :one, #ttl = :ttl, #action = :action, #userId = :userId",
      ExpressionAttributeNames: {
        "#count": "count",
        "#ttl": "TTL",
        "#action": "action",
        "#userId": "userId",
      },
      ExpressionAttributeValues: {
        ":zero": 0,
        ":one": 1,
        ":ttl": ttl,
        ":action": action,
        ":userId": userId,
      },
    })
  );

  return true; // allowed
}

/**
 * Enforce rate limit — returns a 429 response object if exceeded, null if allowed.
 */
export async function enforceRateLimit(userId, action, maxRequests = 10, windowSeconds = 60) {
  const allowed = await checkRateLimit(userId, action, maxRequests, windowSeconds);
  if (!allowed) {
    return tooManyRequests();
  }
  return null;
}
