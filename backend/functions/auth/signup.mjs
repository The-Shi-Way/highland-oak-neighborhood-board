import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { getCognitoClient } from "../../lib/auth.mjs";
import { putItem } from "../../lib/dynamo.mjs";
import { parseBody, signupSchema } from "../../lib/validate.mjs";
import { sanitizeText } from "../../lib/sanitize.mjs";
import { created, conflict, badRequest, serverError } from "../../lib/response.mjs";

export const handler = async (event) => {
  try {
    const { email, displayName, password } = parseBody(event, signupSchema);
    const sanitizedDisplayName = sanitizeText(displayName);

    if (!sanitizedDisplayName || sanitizedDisplayName.length < 2) {
      return badRequest("Display name must be at least 2 characters after sanitization");
    }

    const cognito = getCognitoClient();
    const userPoolId = process.env.USER_POOL_ID;
    const clientId = process.env.USER_POOL_CLIENT_ID;

    let cognitoUser;
    try {
      const createResult = await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: email,
          MessageAction: "SUPPRESS", // suppress welcome email
          UserAttributes: [
            { Name: "email", Value: email },
            { Name: "email_verified", Value: "true" },
            { Name: "custom:displayName", Value: sanitizedDisplayName },
            { Name: "custom:role", Value: "member" },
          ],
          TemporaryPassword: password + "_Temp1!",
        })
      );
      cognitoUser = createResult.User;
    } catch (err) {
      if (err.name === "UsernameExistsException") {
        return conflict("An account with this email already exists");
      }
      throw err;
    }

    const userId = cognitoUser.Attributes.find((a) => a.Name === "sub")?.Value;
    if (!userId) {
      return serverError("Failed to retrieve user ID from Cognito");
    }

    // Set permanent password (bypasses forced password change)
    await cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: email,
        Password: password,
        Permanent: true,
      })
    );

    // Create user profile in DynamoDB
    const now = new Date().toISOString();
    await putItem({
      PK: `USER#${userId}`,
      SK: "PROFILE",
      userId,
      displayName: sanitizedDisplayName,
      email, // store only in profile, never expose publicly
      createdAt: now,
      updatedAt: now,
      postCount: 0,
      role: "member",
      GSI1PK: "USERS#ALL",
      GSI1SK: `CREATED#${now}#${userId}`,
    });

    return created({
      userId,
      displayName: sanitizedDisplayName,
      message: "Account created successfully",
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return badRequest(err.message);
    }
    console.error("Signup error:", err);
    return serverError("Failed to create account");
  }
};
