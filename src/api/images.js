import { post } from "./client.js";

export async function getPresignedUrl({ filename, contentType, size, postId }) {
  return post("/images/presign", { filename, contentType, size, postId }, { auth: true });
}

// Upload file directly to S3 using presigned URL (no auth header needed)
export async function uploadToS3(uploadUrl, file) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
}
