import { GlobalSignOutCommand } from "@aws-sdk/client-cognito-identity-provider";
import { getCognitoClient } from "../../lib/auth.mjs";
import { getUserFromEvent } from "../../lib/auth.mjs";
import { noContent, badRequest, unauthorized, serverError } from "../../lib/response.mjs";

export const handler = async (event) => {
  try {
    // Verify user is authenticated
    getUserFromEvent(event);

    // Extract access token from Authorization header
    const authHeader =
      event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return unauthorized();
    }

    const accessToken = authHeader.slice(7); // remove "Bearer " prefix

    const cognito = getCognitoClient();

    try {
      await cognito.send(
        new GlobalSignOutCommand({
          AccessToken: accessToken,
        })
      );
    } catch (err) {
      if (err.name === "NotAuthorizedException") {
        // Token already expired or invalid — treat as already logged out
        return noContent();
      }
      throw err;
    }

    return noContent();
  } catch (err) {
    if (err.statusCode === 401) {
      return unauthorized();
    }
    console.error("Logout error:", err);
    return serverError("Failed to logout");
  }
};
