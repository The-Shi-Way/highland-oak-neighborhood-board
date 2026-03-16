import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { forbidden } from "./response.mjs";

export function getCognitoClient() {
  return new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || "us-east-1",
  });
}

/**
 * Extracts user info from the JWT claims injected by API Gateway HTTP API authorizer.
 * Returns { userId, email, isAdmin }
 */
export function getUserFromEvent(event) {
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  if (!claims) {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }

  const userId = claims.sub;
  const email = claims.email;
  const role = claims["custom:role"] || "member";
  const isAdmin = role === "admin";

  if (!userId) {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }

  return { userId, email, isAdmin };
}

/**
 * Throws a 403 forbidden response if the user is not an admin.
 */
export function requireAdmin(event) {
  const user = getUserFromEvent(event);
  if (!user.isAdmin) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }
  return user;
}
