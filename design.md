# Community Bulletin Board — Architecture Design

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CloudFront CDN                     │
│         (Static Assets + Image Delivery)              │
└──────────────┬──────────────────┬────────────────────┘
               │                  │
    ┌──────────▼──────┐  ┌───────▼────────┐
    │   S3 Bucket     │  │  API Gateway   │
    │ (React SPA +    │  │  (REST API)    │
    │  Uploaded Images)│  │               │
    └─────────────────┘  └───────┬────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    AWS Lambda Functions  │
                    │  (Node.js 20 handlers)   │
                    └──┬──────────┬──────────┬┘
                       │          │          │
              ┌────────▼──┐  ┌───▼────┐  ┌──▼───────┐
              │  Cognito   │  │DynamoDB│  │    S3    │
              │(User Auth) │  │(Data)  │  │(Images)  │
              └────────────┘  └────────┘  └──────────┘
```

## AWS Services & Cost Breakdown

### Compute
- **AWS Lambda**: Pay-per-request. Free tier = 1M requests/month + 400K GB-seconds.
- **API Gateway**: REST API. Free tier = 1M calls/month for 12 months.

### Authentication
- **Amazon Cognito**: Managed user pools. Free tier = 50,000 MAU.
  - Handles signup, login, password reset, JWT issuance.
  - MFA support built-in (optional, can enable later).
  - No PII exposure — Cognito stores email encrypted at rest.

### Database
- **DynamoDB**: On-demand capacity mode.
  - Free tier = 25 GB storage, 25 WCU, 25 RCU.
  - Single-table design for efficient access patterns.

### Storage & CDN
- **S3**: Image storage. Free tier = 5 GB, 20K GET, 2K PUT.
- **CloudFront**: CDN. Free tier = 1 TB transfer, 10M requests/month.

### Estimated Monthly Cost (< 500 users)
| Service       | Estimated Cost |
|---------------|---------------|
| Lambda        | $0 (free tier) |
| API Gateway   | $0 (free tier) |
| Cognito       | $0 (free tier) |
| DynamoDB      | $0–$2         |
| S3            | $0.50–$1      |
| CloudFront    | $0–$1         |
| Route 53      | $0.50         |
| **Total**     | **$1–$5/mo**  |

---

## DynamoDB Single-Table Design

### Access Patterns
| Pattern                          | PK              | SK                    |
|----------------------------------|-----------------|-----------------------|
| Get user profile                 | USER#<userId>   | PROFILE               |
| List posts (newest first)        | COMMUNITY#<id>  | POST#<timestamp>#<id> |
| List posts by category           | CAT#<category>  | POST#<timestamp>#<id> |
| Get single post                  | POST#<postId>   | DETAIL                |
| List comments on post            | POST#<postId>   | COMMENT#<timestamp>   |
| List user's posts                | USER#<userId>   | POST#<timestamp>#<id> |
| Get like count / check user like | POST#<postId>   | LIKE#<userId>         |
| List reported posts              | REPORTS         | POST#<postId>         |

### GSI-1 (Category + Time)
- PK: `CAT#<category>`
- SK: `<timestamp>#<postId>`
- Use: Filter posts by category with time-based pagination

### Item Schema Examples

**Post Item:**
```json
{
  "PK": "POST#abc123",
  "SK": "DETAIL",
  "GSI1PK": "CAT#news",
  "GSI1SK": "2025-03-15T10:00:00Z#abc123",
  "title": "New Park Opening This Weekend",
  "body": "The community park on Elm St...",
  "category": "news",
  "authorId": "user456",
  "authorDisplayName": "FriendlyNeighbor",
  "imageKey": "uploads/abc123/park.webp",
  "likeCount": 12,
  "commentCount": 3,
  "urgency": null,
  "status": "active",
  "createdAt": "2025-03-15T10:00:00Z",
  "updatedAt": "2025-03-15T10:00:00Z"
}
```

**Comment Item:**
```json
{
  "PK": "POST#abc123",
  "SK": "COMMENT#2025-03-15T11:00:00Z#comm789",
  "body": "Can't wait for the opening!",
  "authorId": "user789",
  "authorDisplayName": "ParkLover",
  "parentCommentId": null,
  "status": "active",
  "createdAt": "2025-03-15T11:00:00Z"
}
```

---

## API Design

### Public Endpoints (No Auth)
```
GET  /posts                    — List posts (paginated, filterable by category)
GET  /posts/:id                — Get single post with comments
```

### Authenticated Endpoints
```
POST   /posts                  — Create post
PUT    /posts/:id              — Edit own post
DELETE /posts/:id              — Delete own post
POST   /posts/:id/like         — Toggle like
POST   /posts/:id/comments     — Add comment
DELETE /posts/:id/comments/:cid — Delete own comment
POST   /posts/:id/report       — Report post
GET    /me                     — Get own profile
PUT    /me                     — Update profile
DELETE /me                     — Delete account
```

### Admin Endpoints
```
GET    /admin/reports           — List reported posts
PUT    /admin/posts/:id/status  — Hide/restore post
DELETE /admin/posts/:id         — Hard delete post
```

### Auth Endpoints (Cognito-backed)
```
POST   /auth/signup             — Register
POST   /auth/login              — Login (returns JWT)
POST   /auth/refresh            — Refresh token
POST   /auth/forgot-password    — Request reset
POST   /auth/reset-password     — Complete reset
POST   /auth/logout             — Invalidate session
```

---

## Security Architecture

### Authentication Flow
1. User signs up → Cognito creates user, sends verification email
2. User logs in → Cognito returns ID token + access token + refresh token
3. Frontend stores tokens in httpOnly secure cookies (NOT localStorage)
4. Every API request includes access token in Authorization header
5. API Gateway validates JWT via Cognito authorizer
6. Token refresh happens automatically before expiry

### Privacy Controls
- Display names are the ONLY public identifier
- Email stored in Cognito only — never in DynamoDB post/comment items
- User deletion anonymizes all posts (author becomes "Deleted User")
- No IP logging in application code
- CloudFront logs disabled or auto-deleted after 24h
- S3 image metadata stripped (EXIF removal)

### Input Validation
- All text inputs sanitized (DOMPurify on frontend, validator.js on backend)
- File uploads: type checking, size limiting, virus scanning (optional)
- Rate limiting: API Gateway throttling + per-user Lambda-level checks
- CORS: Restricted to specific frontend domain

---

## Frontend Architecture

### Route Structure
```
/                       — Homepage (post feed)
/category/:name         — Filtered by category
/post/:id               — Single post view
/watch                  — Neighborhood Watch dashboard
/login                  — Login page
/signup                 — Registration page
/profile                — User profile & settings
/create                 — Create new post
/admin                  — Admin dashboard (if admin role)
```

### Component Tree
```
App
├── Layout
│   ├── Header (nav, auth status, create post button)
│   ├── Sidebar (categories, community info)
│   └── Footer
├── Pages
│   ├── HomePage (PostFeed + filters)
│   ├── PostDetail (full post + comments)
│   ├── CreatePost (form with markdown editor)
│   ├── WatchDashboard (filtered + urgency indicators)
│   ├── AuthPages (Login, Signup, ForgotPassword)
│   ├── Profile (settings, post history)
│   └── AdminDashboard (moderation queue)
└── Shared
    ├── PostCard (preview card for feed)
    ├── CommentThread (nested comments)
    ├── CategoryBadge
    ├── UrgencyBadge
    ├── ImageUpload
    ├── MarkdownRenderer
    └── LoadingStates
```

---

## Deployment Pipeline

### CI/CD
1. Push to `main` → GitHub Actions triggered
2. Run lint + unit tests + integration tests
3. Build React app → deploy to S3
4. Deploy Lambda functions via SAM/CDK
5. Invalidate CloudFront cache
6. Smoke tests against staging

### Environments
- **Dev**: Local (Vite dev server + DynamoDB Local + SAM Local)
- **Staging**: AWS (separate stack, same architecture)
- **Production**: AWS (with CloudFront, WAF, monitoring)

### Infrastructure as Code
- AWS SAM or CDK for all resources
- Parameter Store for secrets (no hardcoded values)
- Separate stacks per environment
