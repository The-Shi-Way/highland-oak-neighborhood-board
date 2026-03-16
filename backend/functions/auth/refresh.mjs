import { InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { getCognitoClient } from "../../lib/auth.mjs";
import { parseBody, refreshSchema } from "../../lib/validate.mjs";
import { ok, badRequest, unauthorized, serverError } from "../../lib/response.mjs";

export const handler = async (event) => {
  try {
    const { refreshToken } = parseBody(event, refreshSchema);

    const cognito = getCognitoClient();

    let authResult;
    try {
      const result = await cognito.send(
        new InitiateAuthCommand({
          AuthFlow: "REFRESH_TOKEN_AUTH",
          ClientId: process.env.USER_POOL_CLIENT_ID,
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
          },
        })
      );
      authResult = result.AuthenticationResult;
    } catch (err) {
      if (
        err.name === "NotAuthorizedException" ||
        err.name === "UserNotFoundException"
      ) {
        return unauthorized();
      }
      throw err;
    }

    return ok({
      accessToken: authResult.AccessToken,
      idToken: authResult.IdToken,
      expiresIn: authResult.ExpiresIn,
      tokenType: authResult.TokenType,
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return badRequest(err.message);
    }
    console.error("Refresh error:", err);
    return serverError("Failed to refresh token");
  }
};
