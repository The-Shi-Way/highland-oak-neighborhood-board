import { requireAdmin } from "../../lib/auth.mjs";
import { scanItems, queryItems } from "../../lib/dynamo.mjs";
import { ok, unauthorized, forbidden, serverError } from "../../lib/response.mjs";

export const handler = async (event) => {
  try {
    const user = requireAdmin(event);

    const params = event.queryStringParameters || {};
    const cursorParam = params.cursor;
    const limitParam = parseInt(params.limit || "20", 10);
    const limit = Math.min(isNaN(limitParam) || limitParam < 1 ? 20 : limitParam, 100);

    let exclusiveStartKey;
    if (cursorParam) {
      try {
        const decoded = Buffer.from(cursorParam, "base64").toString("utf-8");
        exclusiveStartKey = JSON.parse(decoded);
      } catch {
        // Ignore invalid cursor
      }
    }

    // Scan for post DETAIL items that have reportCount > 0 or status = hidden
    const { items, lastEvaluatedKey } = await scanItems({
      FilterExpression:
        "SK = :sk AND (#reportCount > :zero OR #status = :hidden)",
      ExpressionAttributeNames: {
        "#reportCount": "reportCount",
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":sk": "DETAIL",
        ":zero": 0,
        ":hidden": "hidden",
      },
      Limit: limit * 5, // over-fetch to compensate for filter
      ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
    });

    // For each reported post, get the individual reports
    const reportedPosts = await Promise.all(
      items.slice(0, limit).map(async (post) => {
        let reportReasons = [];
        try {
          const { items: reportItems } = await queryItems({
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
            ExpressionAttributeValues: {
              ":pk": `REPORT#${post.postId}`,
              ":prefix": "USER#",
            },
          });
          reportReasons = reportItems.map((r) => ({
            userId: r.userId,
            reason: r.reason,
            reportedAt: r.reportedAt,
          }));
        } catch (err) {
          console.warn(`Failed to fetch reports for post ${post.postId}:`, err.message);
        }

        return {
          postId: post.postId,
          title: post.title,
          category: post.category,
          authorDisplayName: post.authorDisplayName,
          createdAt: post.createdAt,
          status: post.status || "active",
          reportCount: post.reportCount || 0,
          reports: reportReasons,
        };
      })
    );

    // Sort by reportCount descending
    reportedPosts.sort((a, b) => (b.reportCount || 0) - (a.reportCount || 0));

    let nextCursor = null;
    if (lastEvaluatedKey) {
      nextCursor = Buffer.from(JSON.stringify(lastEvaluatedKey)).toString("base64");
    }

    return ok({
      items: reportedPosts,
      nextCursor,
      count: reportedPosts.length,
    });
  } catch (err) {
    if (err.statusCode === 401) {
      return unauthorized();
    }
    if (err.statusCode === 403) {
      return forbidden();
    }
    console.error("Admin list reports error:", err);
    return serverError("Failed to retrieve reports");
  }
};
