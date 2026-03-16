function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
  };
}

export const ok = (body) => ({
  statusCode: 200,
  headers: corsHeaders(),
  body: JSON.stringify(body),
});

export const created = (body) => ({
  statusCode: 201,
  headers: corsHeaders(),
  body: JSON.stringify(body),
});

export const noContent = () => ({
  statusCode: 204,
  headers: corsHeaders(),
  body: "",
});

export const badRequest = (msg) => ({
  statusCode: 400,
  headers: corsHeaders(),
  body: JSON.stringify({ error: msg || "Bad request" }),
});

export const unauthorized = () => ({
  statusCode: 401,
  headers: corsHeaders(),
  body: JSON.stringify({ error: "Unauthorized" }),
});

export const forbidden = () => ({
  statusCode: 403,
  headers: corsHeaders(),
  body: JSON.stringify({ error: "Forbidden" }),
});

export const notFound = (msg = "Not found") => ({
  statusCode: 404,
  headers: corsHeaders(),
  body: JSON.stringify({ error: msg }),
});

export const conflict = (msg) => ({
  statusCode: 409,
  headers: corsHeaders(),
  body: JSON.stringify({ error: msg || "Conflict" }),
});

export const tooManyRequests = () => ({
  statusCode: 429,
  headers: corsHeaders(),
  body: JSON.stringify({ error: "Too many requests. Please slow down." }),
});

export const serverError = (msg = "Internal server error") => ({
  statusCode: 500,
  headers: corsHeaders(),
  body: JSON.stringify({ error: msg }),
});
