import { getUserFromEvent } from "../../lib/auth.mjs";
import { getItem } from "../../lib/dynamo.mjs";
import { ok, unauthorized, notFound, serverError } from "../../lib/response.mjs";

export const handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const { userId } = user;

    const profile = await getItem(`USER#${userId}`, "PROFILE");
    if (!profile) {
      return notFound("User profile not found");
    }

    // Return profile without sensitive fields
    return ok({
      userId: profile.userId,
      displayName: profile.displayName,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      postCount: profile.postCount || 0,
      role: profile.role || "member",
    });
  } catch (err) {
    if (err.statusCode === 401) {
      return unauthorized();
    }
    console.error("Get me error:", err);
    return serverError("Failed to retrieve profile");
  }
};
