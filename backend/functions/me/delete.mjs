import { AdminDeleteUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { getUserFromEvent, getCognitoClient } from "../../lib/auth.mjs";
import { getItem, deleteItem, queryItems, updateItem } from "../../lib/dynamo.mjs";
import { noContent, unauthorized, notFound, serverError } from "../../lib/response.mjs";

const BATCH_SIZE = 25;

export const handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const { userId, email } = user;

    // Verify profile exists
    const profile = await getItem(`USER#${userId}`, "PROFILE");
    if (!profile) {
      return notFound("User profile not found");
    }

    const now = new Date().toISOString();

    // 1. Anonymize all posts by this user
    // Query user's post projections
    const { items: userPostItems } = await queryItems({
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":prefix": "POST#",
      },
    });

    // For each post projection, update the actual post detail to anonymize
    const anonymizationPromises = userPostItems.map(async (postProjection) => {
      const postId = postProjection.postId;
      if (!postId) return;

      try {
        await updateItem(`POST#${postId}`, "DETAIL", {
          authorDisplayName: "Deleted User",
          authorId: "deleted",
          updatedAt: now,
        });

        // Also update community feed projection
        try {
          if (postProjection.createdAt || postProjection.SK) {
            // Reconstruct community feed SK from user projection SK
            // User projection SK: POST#<timestamp>#<postId>
            // Community feed SK:  POST#<timestamp>#<postId>
            const postSK = postProjection.SK; // e.g., POST#2024-01-01T00:00:00.000Z#<uuid>
            await updateItem("COMMUNITY#default", postSK, {
              authorDisplayName: "Deleted User",
              updatedAt: now,
            });
          }
        } catch (projErr) {
          console.warn(`Failed to update community feed projection for post ${postId}:`, projErr.message);
        }
      } catch (postErr) {
        console.warn(`Failed to anonymize post ${postId}:`, postErr.message);
      }
    });

    // Process anonymizations in parallel batches
    for (let i = 0; i < anonymizationPromises.length; i += BATCH_SIZE) {
      await Promise.allSettled(anonymizationPromises.slice(i, i + BATCH_SIZE));
    }

    // 2. Delete user post projections
    const deleteProjectionPromises = userPostItems.map(async (item) => {
      try {
        await deleteItem(`USER#${userId}`, item.SK);
      } catch (err) {
        console.warn(`Failed to delete user post projection ${item.SK}:`, err.message);
      }
    });
    await Promise.allSettled(deleteProjectionPromises);

    // 3. Delete the DynamoDB user profile
    await deleteItem(`USER#${userId}`, "PROFILE");

    // 4. Delete user from Cognito
    const cognito = getCognitoClient();
    try {
      await cognito.send(
        new AdminDeleteUserCommand({
          UserPoolId: process.env.USER_POOL_ID,
          Username: email,
        })
      );
    } catch (cognitoErr) {
      // If Cognito delete fails, log but don't block — profile is already removed
      console.error("Failed to delete Cognito user:", cognitoErr.message);
      // Still return 204 since the data has been cleaned up
    }

    return noContent();
  } catch (err) {
    if (err.statusCode === 401) {
      return unauthorized();
    }
    console.error("Delete me error:", err);
    return serverError("Failed to delete account");
  }
};
