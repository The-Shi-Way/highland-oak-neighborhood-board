import { AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import { getUserFromEvent, getCognitoClient } from "../../lib/auth.mjs";
import { getItem, updateItem } from "../../lib/dynamo.mjs";
import { parseBody, updateMeSchema } from "../../lib/validate.mjs";
import { sanitizeText } from "../../lib/sanitize.mjs";
import { ok, badRequest, unauthorized, notFound, serverError } from "../../lib/response.mjs";

export const handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const { userId, email } = user;

    const { displayName } = parseBody(event, updateMeSchema);
    const sanitizedDisplayName = sanitizeText(displayName);

    if (!sanitizedDisplayName || sanitizedDisplayName.length < 2) {
      return badRequest("Display name must be at least 2 characters after sanitization");
    }

    // Verify profile exists
    const profile = await getItem(`USER#${userId}`, "PROFILE");
    if (!profile) {
      return notFound("User profile not found");
    }

    const now = new Date().toISOString();

    // Update DynamoDB profile
    const updatedProfile = await updateItem(`USER#${userId}`, "PROFILE", {
      displayName: sanitizedDisplayName,
      updatedAt: now,
    });

    // Update Cognito custom attribute
    const cognito = getCognitoClient();
    try {
      await cognito.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: process.env.USER_POOL_ID,
          Username: email,
          UserAttributes: [
            { Name: "custom:displayName", Value: sanitizedDisplayName },
          ],
        })
      );
    } catch (cognitoErr) {
      // Cognito update failure is non-critical since DynamoDB is source of truth
      console.warn("Failed to update Cognito displayName attribute:", cognitoErr.message);
    }

    return ok({
      userId: updatedProfile.userId,
      displayName: updatedProfile.displayName,
      createdAt: updatedProfile.createdAt,
      updatedAt: updatedProfile.updatedAt,
      postCount: updatedProfile.postCount || 0,
      role: updatedProfile.role || "member",
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return badRequest(err.message);
    }
    if (err.statusCode === 401) {
      return unauthorized();
    }
    console.error("Update me error:", err);
    return serverError("Failed to update profile");
  }
};
