import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email("Invalid email address").transform((v) => v.toLowerCase().trim()),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be at most 50 characters")
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").transform((v) => v.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address").transform((v) => v.toLowerCase().trim()),
  code: z.string().min(1, "Verification code is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const createPostSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be at most 200 characters"),
  category: z.enum(["news", "watch", "community", "photos"], {
    errorMap: () => ({ message: "Category must be one of: news, watch, community, photos" }),
  }),
  body: z
    .string()
    .max(10000, "Body must be at most 10000 characters")
    .optional()
    .default(""),
  urgency: z
    .enum(["info", "caution", "alert"], {
      errorMap: () => ({ message: "Urgency must be one of: info, caution, alert" }),
    })
    .optional(),
  imageKey: z.string().optional(),
}).refine(
  (data) => {
    if (data.urgency && data.category !== "watch") {
      return false;
    }
    return true;
  },
  { message: "Urgency can only be set for watch category posts" }
);

export const updatePostSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be at most 200 characters")
    .optional(),
  body: z
    .string()
    .max(10000, "Body must be at most 10000 characters")
    .optional(),
  urgency: z
    .enum(["info", "caution", "alert"], {
      errorMap: () => ({ message: "Urgency must be one of: info, caution, alert" }),
    })
    .optional(),
  imageKey: z.string().optional(),
});

export const createCommentSchema = z.object({
  body: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must be at most 2000 characters"),
  parentCommentId: z.string().optional(),
});

export const reportSchema = z.object({
  reason: z.enum(
    ["spam", "harassment", "misinformation", "inappropriate", "off-topic", "other"],
    {
      errorMap: () => ({
        message:
          "Reason must be one of: spam, harassment, misinformation, inappropriate, off-topic, other",
      }),
    }
  ),
});

export const updateMeSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be at most 50 characters")
    .trim(),
});

export const presignSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  contentType: z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"], {
    errorMap: () => ({
      message: "Content type must be one of: image/jpeg, image/png, image/gif, image/webp",
    }),
  }),
  size: z
    .number()
    .positive("Size must be a positive number")
    .max(10 * 1024 * 1024, "File size must be at most 10MB"),
  postId: z.string().min(1, "Post ID is required"),
});

export const adminUpdateStatusSchema = z.object({
  status: z.enum(["active", "hidden"], {
    errorMap: () => ({ message: "Status must be one of: active, hidden" }),
  }),
});

/**
 * Parse and validate JSON body against a Zod schema.
 * Throws an error with statusCode 400 on validation failure.
 */
export function parseBody(event, schema) {
  let rawBody;
  try {
    rawBody = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch {
    throw Object.assign(new Error("Invalid JSON body"), { statusCode: 400 });
  }

  if (!rawBody) {
    throw Object.assign(new Error("Request body is required"), { statusCode: 400 });
  }

  const result = schema.safeParse(rawBody);
  if (!result.success) {
    const messages = result.error.errors.map((e) => e.message).join("; ");
    throw Object.assign(new Error(messages), { statusCode: 400 });
  }

  return result.data;
}
