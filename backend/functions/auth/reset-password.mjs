import { ConfirmForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { getCognitoClient } from "../../lib/auth.mjs";
import { parseBody, resetPasswordSchema } from "../../lib/validate.mjs";
import { ok, badRequest, serverError } from "../../lib/response.mjs";

export const handler = async (event) => {
  try {
    const { email, code, newPassword } = parseBody(event, resetPasswordSchema);

    const cognito = getCognitoClient();

    try {
      await cognito.send(
        new ConfirmForgotPasswordCommand({
          ClientId: process.env.USER_POOL_CLIENT_ID,
          Username: email,
          ConfirmationCode: code,
          Password: newPassword,
        })
      );
    } catch (err) {
      if (err.name === "CodeMismatchException") {
        return badRequest("Invalid or expired verification code");
      }
      if (err.name === "ExpiredCodeException") {
        return badRequest("Verification code has expired. Please request a new one.");
      }
      if (err.name === "UserNotFoundException") {
        return badRequest("Invalid or expired verification code");
      }
      if (err.name === "InvalidPasswordException") {
        return badRequest("Password does not meet requirements: minimum 8 characters");
      }
      throw err;
    }

    return ok({ message: "Password has been reset successfully" });
  } catch (err) {
    if (err.statusCode === 400) {
      return badRequest(err.message);
    }
    console.error("Reset password error:", err);
    return serverError("Failed to reset password");
  }
};
