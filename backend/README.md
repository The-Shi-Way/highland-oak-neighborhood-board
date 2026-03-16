# Highland Oak Neighborhood Board — Backend

AWS Serverless backend for the Highland Oak Neighborhood Board app, built with:
- **AWS SAM** for infrastructure as code
- **Node.js 20** with ES Modules (.mjs)
- **AWS SDK v3**
- **API Gateway HTTP API** (v2) — faster and cheaper than REST API v1
- **DynamoDB single-table design**
- **Cognito User Pool** for authentication
- **S3 + Lambda** for image upload and processing (sharp)
- **CloudFront CDN** in front of everything
- **WAFv2** for rate limiting and common rule protection

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20.x+ | https://nodejs.org |
| AWS CLI | 2.x+ | https://aws.amazon.com/cli |
| SAM CLI | 1.100+ | https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html |
| Docker | any | Required for `sam local` and building native modules |

Configure AWS credentials before deploying:

```bash
aws configure
# or use SSO:
aws sso login --profile your-profile
```

---

## Project Structure

```
backend/
├── template.yaml              # SAM IaC template
├── package.json               # Shared dependencies
├── .env.example               # Environment variable reference
├── lib/
│   ├── auth.mjs               # Cognito client + JWT claim helpers
│   ├── dynamo.mjs             # DynamoDB DocumentClient wrapper
│   ├── ratelimit.mjs          # DynamoDB-backed rate limiting
│   ├── response.mjs           # HTTP response helpers
│   ├── sanitize.mjs           # HTML/text sanitization
│   └── validate.mjs           # Zod schemas + body parser
├── functions/
│   ├── auth/
│   │   ├── signup.mjs
│   │   ├── login.mjs
│   │   ├── refresh.mjs
│   │   ├── forgot-password.mjs
│   │   ├── reset-password.mjs
│   │   └── logout.mjs
│   ├── posts/
│   │   ├── list.mjs
│   │   ├── get.mjs
│   │   ├── create.mjs
│   │   ├── update.mjs
│   │   ├── delete.mjs
│   │   └── like.mjs
│   ├── comments/
│   │   ├── create.mjs
│   │   └── delete.mjs
│   ├── images/
│   │   ├── presign.mjs
│   │   └── process.mjs
│   ├── moderation/
│   │   ├── report.mjs
│   │   ├── admin-list-reports.mjs
│   │   ├── admin-update-status.mjs
│   │   └── admin-delete-post.mjs
│   └── me/
│       ├── get.mjs
│       ├── update.mjs
│       └── delete.mjs
└── layers/
    └── sharp/                 # Sharp native module layer (see below)
```

---

## Sharp Layer Setup

`sharp` is a native module that must be compiled for the Lambda architecture (arm64 / Amazon Linux 2023). You **cannot** simply `npm install` it locally on macOS/Windows and upload it.

### Option 1: Build the layer with Docker (recommended)

```bash
mkdir -p backend/layers/sharp/nodejs
cd backend/layers/sharp/nodejs

# Use the official Lambda Docker image to install sharp for arm64
docker run --rm \
  -v "$(pwd)":/var/task \
  --platform linux/arm64 \
  public.ecr.aws/lambda/nodejs:20-arm64 \
  bash -c "npm install --prefix /var/task sharp@0.33"
```

This creates `backend/layers/sharp/nodejs/node_modules/sharp` compiled for arm64 Linux.

### Option 2: Use SAM build (automatic)

The `SharpLayer` in `template.yaml` uses `BuildMethod: nodejs20.x`, so `sam build` will automatically compile it in a Docker container:

```bash
cd backend
sam build --use-container
```

### Option 3: Use a public Lambda layer

Pre-built sharp layers are available at: https://github.com/Umkus/lambda-layer-sharp

---

## Local Development

### Start DynamoDB Local

```bash
docker run -p 8000:8000 amazon/dynamodb-local

# Create the local table
aws dynamodb create-table \
  --table-name CommunityBoard-dev \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    "IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000
```

### Start local API

```bash
cd backend

# Build first (compiles sharp layer)
sam build --use-container

# Start with local DynamoDB override
sam local start-api \
  --port 3001 \
  --env-vars env.local.json \
  --warm-containers EAGER
```

Create `env.local.json` to override environment variables for local dev:

```json
{
  "Parameters": {
    "TABLE_NAME": "CommunityBoard-dev",
    "IMAGES_BUCKET": "highland-oak-images-dev-local",
    "USER_POOL_ID": "us-east-1_XXXXXXXXX",
    "USER_POOL_CLIENT_ID": "XXXXXXXXXXXXXXXXXXXXXXXXXX",
    "ALLOWED_ORIGIN": "http://localhost:3002",
    "AWS_REGION": "us-east-1"
  }
}
```

> Note: `sam local` uses real AWS Cognito. For fully offline dev, consider using [Cognito Local](https://github.com/jagregory/cognito-local).

---

## Deployment

### First deployment (guided)

```bash
cd backend
npm install
sam build --use-container
sam deploy --guided
```

The guided deploy will prompt for:
- Stack name (e.g., `highland-oak-dev`)
- AWS region (e.g., `us-east-1`)
- Stage parameter (`dev` or `prod`)
- AllowedOrigin parameter (e.g., `https://yourdomain.com`)
- Confirm IAM role creation: `Y`
- Save to samconfig.toml: `Y`

### Subsequent deployments

```bash
cd backend
sam build --use-container
sam deploy
```

### Destroy a stack

```bash
sam delete --stack-name highland-oak-dev
```

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `STAGE` | Deployment stage | `dev` / `prod` |
| `TABLE_NAME` | DynamoDB table name | `CommunityBoard-dev` |
| `IMAGES_BUCKET` | S3 bucket name | `highland-oak-images-dev-123456789` |
| `USER_POOL_ID` | Cognito User Pool ID | `us-east-1_AbCdEfGhI` |
| `USER_POOL_CLIENT_ID` | Cognito App Client ID | `abc123def456...` |
| `ALLOWED_ORIGIN` | CORS allowed origin | `https://yourdomain.com` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `CLOUDFRONT_DOMAIN` | CloudFront URL (output) | `https://d1234.cloudfront.net` |

These are set automatically via SAM Globals and Parameters. Update `AllowedOrigin` in `template.yaml` or via `--parameter-overrides` flag.

---

## API Endpoint Reference

All authenticated routes require `Authorization: Bearer <accessToken>` header.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/signup` | No | Create account |
| POST | `/auth/login` | No | Login, returns tokens |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/forgot-password` | No | Send reset code |
| POST | `/auth/reset-password` | No | Confirm password reset |
| POST | `/auth/logout` | Yes | Global sign out |

### Posts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/posts` | No | List posts (query: `?category=watch&limit=20&cursor=...`) |
| GET | `/posts/{id}` | No | Get single post with comments |
| POST | `/posts` | Yes | Create post |
| PUT | `/posts/{id}` | Yes | Update post (owner/admin) |
| DELETE | `/posts/{id}` | Yes | Soft-delete post (owner/admin) |
| POST | `/posts/{id}/like` | Yes | Toggle like |
| POST | `/posts/{id}/comments` | Yes | Add comment |
| DELETE | `/posts/{id}/comments/{cid}` | Yes | Delete comment (owner/admin) |
| POST | `/posts/{id}/report` | Yes | Report post |

### Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | Yes | Get my profile |
| PUT | `/me` | Yes | Update display name |
| DELETE | `/me` | Yes | Delete account |

### Images

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/images/presign` | Yes | Get presigned S3 PUT URL |

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/reports` | Yes (admin) | List reported posts |
| PUT | `/admin/posts/{id}/status` | Yes (admin) | Set status active/hidden |
| DELETE | `/admin/posts/{id}` | Yes (admin) | Hard-delete post |

To grant admin access, add the `custom:role = admin` attribute to a Cognito user:

```bash
aws cognito-idp admin-update-user-attributes \
  --user-pool-id <USER_POOL_ID> \
  --username user@example.com \
  --user-attributes Name=custom:role,Value=admin
```

---

## DynamoDB Data Model

Single-table design with the following access patterns:

| PK | SK | Description |
|----|-----|-------------|
| `USER#{userId}` | `PROFILE` | User profile |
| `USER#{userId}` | `POST#{ts}#{postId}` | User's post projection |
| `POST#{postId}` | `DETAIL` | Full post item |
| `POST#{postId}` | `COMMENT#{ts}#{commentId}` | Comment |
| `POST#{postId}` | `LIKE#{userId}` | Like record |
| `COMMUNITY#default` | `POST#{ts}#{postId}` | Global feed projection |
| `REPORT#{postId}` | `USER#{userId}` | Report record |
| `ALERTS#active` | `POST#{ts}#{postId}` | Active watch alerts |
| `RATELIMIT#{userId}#{action}` | `WINDOW#{ts}` | Rate limit counter (TTL) |

GSI1 enables category-filtered feeds:
- `GSI1PK = CAT#{category}`, `GSI1SK = {timestamp}#{postId}`

---

## Image Upload Flow

1. Client calls `POST /images/presign` with `{ filename, contentType, size, postId }`
2. Backend returns `{ uploadUrl, key }` — a presigned S3 PUT URL (expires in 5 minutes)
3. Client uploads directly to S3 using the presigned URL
4. S3 triggers `ImageProcessorFunction` via Lambda notification
5. Lambda processes the image: auto-rotate, resize to max 1200px wide, convert to WebP, strip EXIF
6. Processed image saved to `processed/{postId}/{uuid}.webp`
7. Original upload deleted from `uploads/` prefix
8. Client stores the `key` and posts it in the post body via `POST /posts`

Processed images are served through CloudFront via the S3 origin.
