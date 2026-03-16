import { getUserFromEvent } from "../../lib/auth.mjs";
import { putItem, updateItemExpression, transactWrite } from "../../lib/dynamo.mjs";
import { parseBody, createPostSchema } from "../../lib/validate.mjs";
import { sanitizeText, sanitizeHtml } from "../../lib/sanitize.mjs";
import { enforceRateLimit } from "../../lib/ratelimit.mjs";
import { created, badRequest, unauthorized, serverError } from "../../lib/response.mjs";
import { getItem } from "../../lib/dynamo.mjs";

export const handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const { userId } = user;

    // Rate limit: max 10 posts per 10 minutes
    const rateLimitResult = await enforceRateLimit(userId, "create-post", 10, 600);
    if (rateLimitResult) return rateLimitResult;

    const { title, category, body, urgency, imageKey } = parseBody(event, createPostSchema);

    // Sanitize inputs
    const sanitizedTitle = sanitizeText(title);
    const sanitizedBody = sanitizeHtml(body);

    if (!sanitizedTitle || sanitizedTitle.length < 3) {
      return badRequest("Title must be at least 3 characters after sanitization");
    }

    // Fetch user profile for display name
    const userProfile = await getItem(`USER#${userId}`, "PROFILE");
    const authorDisplayName = userProfile?.displayName || "Unknown User";

    const postId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Build the canonical post detail item
    const postDetail = {
      PK: `POST#${postId}`,
      SK: "DETAIL",
      postId,
      title: sanitizedTitle,
      category,
      body: sanitizedBody,
      urgency: category === "watch" ? (urgency || "info") : undefined,
      imageKey: imageKey || null,
      authorId: userId,
      authorDisplayName,
      createdAt: now,
      updatedAt: now,
      likeCount: 0,
      commentCount: 0,
      reportCount: 0,
      status: "active",
      GSI1PK: `CAT#${category}`,
      GSI1SK: `${now}#${postId}`,
    };

    // Build the community feed projection item
    const communityFeedItem = {
      PK: "COMMUNITY#default",
      SK: `POST#${now}#${postId}`,
      postId,
      title: sanitizedTitle,
      category,
      urgency: postDetail.urgency,
      imageKey: imageKey || null,
      authorDisplayName,
      createdAt: now,
      updatedAt: now,
      likeCount: 0,
      commentCount: 0,
      status: "active",
      GSI1PK: `CAT#${category}`,
      GSI1SK: `${now}#${postId}`,
    };

    // Build user feed projection item
    const userFeedItem = {
      PK: `USER#${userId}`,
      SK: `POST#${now}#${postId}`,
      postId,
      title: sanitizedTitle,
      category,
      urgency: postDetail.urgency,
      createdAt: now,
      status: "active",
    };

    // Use transactWrite to atomically write all items
    const transactItems = [
      {
        Put: {
          TableName: process.env.TABLE_NAME,
          Item: postDetail,
        },
      },
      {
        Put: {
          TableName: process.env.TABLE_NAME,
          Item: communityFeedItem,
        },
      },
      {
        Put: {
          TableName: process.env.TABLE_NAME,
          Item: userFeedItem,
        },
      },
    ];

    // If watch category with alert urgency, also write to ALERTS#active
    if (category === "watch" && urgency === "alert") {
      transactItems.push({
        Put: {
          TableName: process.env.TABLE_NAME,
          Item: {
            PK: "ALERTS#active",
            SK: `POST#${now}#${postId}`,
            postId,
            title: sanitizedTitle,
            urgency: "alert",
            authorDisplayName,
            createdAt: now,
          },
        },
      });
    }

    await transactWrite(transactItems);

    // Increment user post count (outside transaction to avoid complexity)
    await updateItemExpression(
      `USER#${userId}`,
      "PROFILE",
      "ADD #postCount :one",
      { "#postCount": "postCount" },
      { ":one": 1 }
    );

    return created({
      postId,
      title: sanitizedTitle,
      category,
      body: sanitizedBody,
      urgency: postDetail.urgency,
      imageKey: imageKey || null,
      authorDisplayName,
      createdAt: now,
      likeCount: 0,
      commentCount: 0,
      status: "active",
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return badRequest(err.message);
    }
    if (err.statusCode === 401) {
      return unauthorized();
    }
    console.error("Create post error:", err);
    return serverError("Failed to create post");
  }
};
