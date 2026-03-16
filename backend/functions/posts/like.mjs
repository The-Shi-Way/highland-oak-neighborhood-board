import { getUserFromEvent } from "../../lib/auth.mjs";
import { getItem, putItemConditional, deleteItem, updateItemExpression } from "../../lib/dynamo.mjs";
import { ok, badRequest, unauthorized, notFound, serverError } from "../../lib/response.mjs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const { userId } = user;

    const postId = event.pathParameters?.id;
    if (!postId) {
      return badRequest("Post ID is required");
    }

    // Verify post exists and is active
    const post = await getItem(`POST#${postId}`, "DETAIL");
    if (!post || post.status === "deleted") {
      return notFound("Post not found");
    }

    const likePK = `POST#${postId}`;
    const likeSK = `LIKE#${userId}`;
    const tableName = process.env.TABLE_NAME;
    const now = new Date().toISOString();

    // Try to create the like (condition: item must not exist)
    let liked;
    let likeCountDelta;

    try {
      await docClient.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            PK: likePK,
            SK: likeSK,
            userId,
            postId,
            createdAt: now,
          },
          ConditionExpression: "attribute_not_exists(PK)",
        })
      );
      // Like was created
      liked = true;
      likeCountDelta = 1;
    } catch (err) {
      if (err.name === "ConditionalCheckFailedException") {
        // Like already exists — remove it (toggle off)
        await docClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: { PK: likePK, SK: likeSK },
          })
        );
        liked = false;
        likeCountDelta = -1;
      } else {
        throw err;
      }
    }

    // Atomically update likeCount on the post
    const updatedPost = await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { PK: `POST#${postId}`, SK: "DETAIL" },
        UpdateExpression: "ADD #likeCount :delta",
        ExpressionAttributeNames: { "#likeCount": "likeCount" },
        ExpressionAttributeValues: { ":delta": likeCountDelta },
        ReturnValues: "ALL_NEW",
      })
    );

    const newLikeCount = Math.max(0, updatedPost.Attributes?.likeCount || 0);

    return ok({ liked, likeCount: newLikeCount });
  } catch (err) {
    if (err.statusCode === 401) {
      return unauthorized();
    }
    console.error("Like post error:", err);
    return serverError("Failed to toggle like");
  }
};
