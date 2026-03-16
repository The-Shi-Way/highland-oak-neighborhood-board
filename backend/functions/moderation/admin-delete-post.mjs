import { requireAdmin } from "../../lib/auth.mjs";
import { getItem, queryItems, transactWrite } from "../../lib/dynamo.mjs";
import { noContent, badRequest, unauthorized, forbidden, notFound, serverError } from "../../lib/response.mjs";

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  try {
    const user = requireAdmin(event);

    const postId = event.pathParameters?.id;
    if (!postId) {
      return badRequest("Post ID is required");
    }

    // Verify post exists
    const post = await getItem(`POST#${postId}`, "DETAIL");
    if (!post) {
      return notFound("Post not found");
    }

    const authorId = post.authorId;
    const category = post.category;
    const createdAt = post.createdAt;

    // Collect all items to delete in a transact write
    const deleteOps = [];

    // 1. Delete the post detail item
    deleteOps.push({
      Delete: {
        TableName: TABLE_NAME,
        Key: { PK: `POST#${postId}`, SK: "DETAIL" },
      },
    });

    // 2. Delete the community feed projection
    if (createdAt) {
      deleteOps.push({
        Delete: {
          TableName: TABLE_NAME,
          Key: {
            PK: "COMMUNITY#default",
            SK: `POST#${createdAt}#${postId}`,
          },
        },
      });
    }

    // 3. Delete the user feed projection
    if (authorId && authorId !== "deleted" && createdAt) {
      deleteOps.push({
        Delete: {
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${authorId}`,
            SK: `POST#${createdAt}#${postId}`,
          },
        },
      });
    }

    // 4. Delete alerts entry if it was a watch/alert post
    if (category === "watch" && createdAt) {
      deleteOps.push({
        Delete: {
          TableName: TABLE_NAME,
          Key: {
            PK: "ALERTS#active",
            SK: `POST#${createdAt}#${postId}`,
          },
        },
      });
    }

    // TransactWrite supports max 100 items; execute in batches if needed
    // For the first batch (post detail + projections), execute now
    const BATCH_SIZE = 25;
    for (let i = 0; i < deleteOps.length; i += BATCH_SIZE) {
      const batch = deleteOps.slice(i, i + BATCH_SIZE);
      try {
        await transactWrite(batch);
      } catch (err) {
        // If transact fails due to missing items (e.g., projection already gone), continue
        console.warn("TransactWrite partial failure:", err.message);
      }
    }

    // 5. Hard-delete all LIKE items for this post (query first, then delete in batches)
    const { items: likeItems } = await queryItems({
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `POST#${postId}`,
        ":prefix": "LIKE#",
      },
    });

    for (let i = 0; i < likeItems.length; i += BATCH_SIZE) {
      const batch = likeItems.slice(i, i + BATCH_SIZE).map((item) => ({
        Delete: {
          TableName: TABLE_NAME,
          Key: { PK: item.PK, SK: item.SK },
        },
      }));
      await transactWrite(batch);
    }

    // 6. Hard-delete all COMMENT items for this post
    const { items: commentItems } = await queryItems({
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `POST#${postId}`,
        ":prefix": "COMMENT#",
      },
    });

    for (let i = 0; i < commentItems.length; i += BATCH_SIZE) {
      const batch = commentItems.slice(i, i + BATCH_SIZE).map((item) => ({
        Delete: {
          TableName: TABLE_NAME,
          Key: { PK: item.PK, SK: item.SK },
        },
      }));
      await transactWrite(batch);
    }

    // 7. Hard-delete all REPORT items for this post
    const { items: reportItems } = await queryItems({
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `REPORT#${postId}`,
        ":prefix": "USER#",
      },
    });

    for (let i = 0; i < reportItems.length; i += BATCH_SIZE) {
      const batch = reportItems.slice(i, i + BATCH_SIZE).map((item) => ({
        Delete: {
          TableName: TABLE_NAME,
          Key: { PK: item.PK, SK: item.SK },
        },
      }));
      await transactWrite(batch);
    }

    return noContent();
  } catch (err) {
    if (err.statusCode === 401) {
      return unauthorized();
    }
    if (err.statusCode === 403) {
      return forbidden();
    }
    console.error("Admin delete post error:", err);
    return serverError("Failed to delete post");
  }
};
