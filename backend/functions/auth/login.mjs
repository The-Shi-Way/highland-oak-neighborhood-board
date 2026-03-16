import { InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { getCognitoClient } from "../../lib/auth.mjs";
import { parseBody, loginSchema } from "../../lib/validate.mjs";
import { ok, badRequest, unauthorized, serverError } from "../../lib/response.mjs";

export const handler = async (event) => {
  try {
    const { email, password } = parseBody(event, loginSchema);

    const cognito = getCognitoClient();

    let authResult;
    try {
      const result = await cognito.send(
        new InitiateAuthCommand({
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: process.env.USER_POOL_CLIENT_ID,
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
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
      if (err.name === "UserNotConfirmedException") {
        return badRequest("Email address not verified. Please check your email for a verification link.");
      }
      throw err;
    }

    return ok({
      accessToken: authResult.AccessToken,
      idToken: authResult.IdToken,
      refreshToken: authResult.RefreshToken,
      expiresIn: authResult.ExpiresIn,
      tokenType: authResult.TokenType,
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return badRequest(err.message);
    }
    console.error("Login error:", err);
    return serverError("Failed to authenticate");
  }
};
