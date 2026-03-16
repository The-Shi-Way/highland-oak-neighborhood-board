import { ForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { getCognitoClient } from "../../lib/auth.mjs";
import { parseBody, forgotPasswordSchema } from "../../lib/validate.mjs";
import { ok, badRequest, serverError } from "../../lib/response.mjs";

export const handler = async (event) => {
  try {
    const { email } = parseBody(event, forgotPasswordSchema);

    const cognito = getCognitoClient();

    try {
      await cognito.send(
        new ForgotPasswordCommand({
          ClientId: process.env.USER_POOL_CLIENT_ID,
          Username: email,
        })
      );
    } catch (err) {
      // Intentionally swallow all errors to prevent email enumeration attacks.
      // We always return 200 to the client regardless of whether the email exists.
      console.error("ForgotPassword Cognito error (suppressed):", err.name);
    }

    // Always return success to prevent email enumeration
    return ok({
      message:
        "If an account with that email exists, a password reset code has been sent.",
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return badRequest(err.message);
    }
    console.error("Forgot password error:", err);
    return serverError("Failed to process request");
  }
};
