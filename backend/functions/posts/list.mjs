import { queryItems } from "../../lib/dynamo.mjs";
import { ok, badRequest, serverError } from "../../lib/response.mjs";

const VALID_CATEGORIES = ["news", "watch", "community", "photos"];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function mapPostItem(item) {
  return {
    postId: item.postId,
    title: item.title,
    category: item.category,
    body: item.body,
    urgency: item.urgency,
    imageKey: item.imageKey,
    authorDisplayName: item.authorDisplayName,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    likeCount: item.likeCount || 0,
    commentCount: item.commentCount || 0,
    status: item.status || "active",
    reportCount: item.reportCount || 0,
  };
}

export const handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const category = params.category;
    const cursorParam = params.cursor;
    const limitParam = parseInt(params.limit || String(DEFAULT_LIMIT), 10);

    if (isNaN(limitParam) || limitParam < 1) {
      return badRequest("limit must be a positive integer");
    }
    const limit = Math.min(limitParam, MAX_LIMIT);

    if (category && !VALID_CATEGORIES.includes(category)) {
      return badRequest(`category must be one of: ${VALID_CATEGORIES.join(", ")}`);
    }

    let exclusiveStartKey;
    if (cursorParam) {
      try {
        const decoded = Buffer.from(cursorParam, "base64").toString("utf-8");
        exclusiveStartKey = JSON.parse(decoded);
      } catch {
        return badRequest("Invalid cursor value");
      }
    }

    let queryParams;

    if (category) {
      // Query GSI1 for category-specific feed
      queryParams = {
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: {
          ":pk": `CAT#${category}`,
          ":statusActive": "active",
        },
        FilterExpression: "#status = :statusActive OR attribute_not_exists(#status)",
        ExpressionAttributeNames: { "#status": "status" },
        ScanIndexForward: false, // descending by GSI1SK (timestamp)
        Limit: limit,
        ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
      };
    } else {
      // Query main table for global feed
      queryParams = {
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": "COMMUNITY#default",
          ":prefix": "POST#",
          ":statusActive": "active",
        },
        FilterExpression: "#status = :statusActive OR attribute_not_exists(#status)",
        ExpressionAttributeNames: { "#status": "status" },
        ScanIndexForward: false, // descending by SK (newest first)
        Limit: limit,
        ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
      };
    }

    const { items, lastEvaluatedKey } = await queryItems(queryParams);

    // For projection items (COMMUNITY#default feed), we need to fetch full post details
    // The projection items have the summary data we need
    const posts = items
      .filter((item) => (item.status || "active") === "active")
      .map(mapPostItem);

    let nextCursor = null;
    if (lastEvaluatedKey) {
      nextCursor = Buffer.from(JSON.stringify(lastEvaluatedKey)).toString("base64");
    }

    return ok({
      items: posts,
      nextCursor,
      count: posts.length,
    });
  } catch (err) {
    console.error("List posts error:", err);
    return serverError("Failed to retrieve posts");
  }
};
