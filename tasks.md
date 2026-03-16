# Community Bulletin Board — Implementation Tasks

## Phase 1: Frontend Foundation & UI Prototype

### Task 1.1: Project Scaffolding
- [ ] Initialize React + Vite project
- [ ] Install dependencies: tailwindcss, react-router-dom, react-markdown, lucide-react
- [ ] Configure Tailwind with custom theme (community/neighborhood aesthetic)
- [ ] Set up folder structure: `/src/{pages,components,hooks,context,utils,api}`
- [ ] Configure path aliases

### Task 1.2: Layout & Navigation
- [ ] Create `Layout` component with header, sidebar, main content area
- [ ] Implement responsive navigation (hamburger on mobile)
- [ ] Build category sidebar with post counts
- [ ] Add footer with community info
- [ ] Implement React Router with all routes

### Task 1.3: Authentication UI
- [ ] Build `LoginPage` with email + password form
- [ ] Build `SignupPage` with email + display name + password + confirm
- [ ] Add client-side validation (password strength, email format)
- [ ] Build `ForgotPasswordPage` with email input
- [ ] Create `AuthContext` for managing auth state
- [ ] Implement protected route wrapper

### Task 1.4: Post Feed (Homepage)
- [ ] Build `PostCard` component (title, excerpt, category badge, author, time, likes)
- [ ] Build `PostFeed` with infinite scroll pagination
- [ ] Add category filter tabs (All, News, Watch, Community, Photos)
- [ ] Implement search bar (client-side initially)
- [ ] Add loading skeletons
- [ ] Build empty state for no posts

### Task 1.5: Post Detail Page
- [ ] Build `PostDetail` with full markdown rendering
- [ ] Image display with lightbox
- [ ] Like button with animation
- [ ] Comment section with nested replies (1 level)
- [ ] Comment input form
- [ ] Report button (modal with reason)

### Task 1.6: Create Post Page
- [ ] Build post creation form (title, category, body, urgency for Watch)
- [ ] Integrate markdown editor with live preview
- [ ] Image upload with drag-and-drop + preview
- [ ] Client-side image compression (< 1MB before upload)
- [ ] Form validation and submission

### Task 1.7: Neighborhood Watch Dashboard
- [ ] Dedicated Watch page with urgency-sorted posts
- [ ] Color-coded urgency badges (green=Info, yellow=Caution, red=Alert)
- [ ] Alert banner for active "Alert" level posts
- [ ] Map placeholder (future: integrate Leaflet/Mapbox)

### Task 1.8: User Profile Page
- [ ] Display user info (display name, join date, post count)
- [ ] List user's own posts
- [ ] Edit display name form
- [ ] Change password form
- [ ] Delete account button with confirmation

### Task 1.9: Admin Dashboard
- [ ] Moderation queue (reported posts)
- [ ] Post management (hide/delete/restore)
- [ ] User management (view users, ban)
- [ ] Basic analytics (post count, user count, reports)

---

## Phase 2: Backend (AWS Serverless)

### Task 2.1: AWS Infrastructure Setup
- [ ] Initialize SAM/CDK project
- [ ] Define Cognito User Pool with custom attributes
- [ ] Define DynamoDB table with GSIs
- [ ] Define S3 bucket with CORS policy
- [ ] Define API Gateway with Cognito authorizer
- [ ] Define Lambda functions
- [ ] Define CloudFront distribution

### Task 2.2: Authentication Lambda Functions
- [ ] POST /auth/signup — register user in Cognito + create DynamoDB profile
- [ ] POST /auth/login — authenticate and return tokens
- [ ] POST /auth/refresh — refresh access token
- [ ] POST /auth/forgot-password — trigger Cognito forgot password
- [ ] POST /auth/reset-password — confirm reset with code
- [ ] Implement rate limiting middleware

### Task 2.3: Post CRUD Lambda Functions
- [ ] GET /posts — query DynamoDB with pagination + category filter
- [ ] GET /posts/:id — fetch post detail
- [ ] POST /posts — create post (validate, sanitize, save)
- [ ] PUT /posts/:id — edit post (owner only)
- [ ] DELETE /posts/:id — soft delete (owner or admin)
- [ ] POST /posts/:id/like — toggle like (atomic counter)

### Task 2.4: Comment Lambda Functions
- [ ] POST /posts/:id/comments — add comment
- [ ] DELETE /posts/:id/comments/:cid — delete own comment
- [ ] Implement nested reply support

### Task 2.5: Image Upload Pipeline
- [ ] Generate presigned S3 upload URL from Lambda
- [ ] Frontend uploads directly to S3 (no Lambda data pass-through)
- [ ] S3 trigger Lambda for: EXIF stripping, resize (max 1200px), WebP conversion
- [ ] Return CloudFront URL for processed image

### Task 2.6: Moderation System
- [ ] POST /posts/:id/report — create report record
- [ ] Auto-hide logic (3+ reports)
- [ ] Admin endpoints for report management
- [ ] Content filtering (basic profanity check)

### Task 2.7: Security Hardening
- [ ] Enable WAF on API Gateway
- [ ] Configure CORS properly
- [ ] Add input validation middleware (joi/zod)
- [ ] Implement request logging (sanitized, no PII)
- [ ] Set up CloudWatch alarms
- [ ] Enable DynamoDB encryption at rest
- [ ] S3 bucket policy (no public listing)

---

## Phase 3: Integration & Deployment

### Task 3.1: Frontend-Backend Integration
- [ ] Create API client module with interceptors (auth headers, refresh logic)
- [ ] Connect auth flows to Cognito
- [ ] Connect post CRUD to API
- [ ] Connect comments to API
- [ ] Connect image upload to S3 presigned URLs
- [ ] Error handling and retry logic

### Task 3.2: Testing
- [ ] Unit tests for Lambda functions (Jest)
- [ ] Unit tests for React components (Vitest + React Testing Library)
- [ ] Integration tests for API endpoints
- [ ] E2E tests (Playwright) for critical flows: signup → login → create post → comment

### Task 3.3: CI/CD Pipeline
- [ ] GitHub Actions workflow for frontend (build + deploy to S3)
- [ ] GitHub Actions workflow for backend (SAM deploy)
- [ ] Environment-specific configs (dev, staging, prod)
- [ ] Automated CloudFront invalidation post-deploy

### Task 3.4: Production Readiness
- [ ] Custom domain setup (Route 53 + ACM certificate)
- [ ] Enable CloudFront HTTPS
- [ ] Set up monitoring dashboard (CloudWatch)
- [ ] Configure backup strategy (DynamoDB PITR)
- [ ] Load testing (Artillery or k6)
- [ ] Security audit checklist
- [ ] Privacy policy page
- [ ] Terms of service page

---

## Kiro Workflow Notes

### Spec-Driven Process
1. **Spec**: Write requirements and design docs FIRST (this file + requirements.md + design.md)
2. **Task**: Break specs into ordered, atomic tasks (this file)
3. **Implement**: Work through tasks in order, referencing specs
4. **Verify**: Each task has clear acceptance criteria from the specs
5. **Iterate**: Update specs when requirements evolve

### File Organization
```
/specs/
  requirements.md      — User stories + acceptance criteria
  design.md            — Architecture + API + database design
  tasks.md             — This file — ordered implementation tasks
/frontend/
  /src/
    /pages/            — Route-level components
    /components/       — Reusable UI components
    /hooks/            — Custom React hooks
    /context/          — Auth + App context providers
    /utils/            — Helpers, validators, formatters
    /api/              — API client + endpoint functions
/backend/
  /functions/          — Lambda handler files
  /lib/                — Shared utilities
  /middleware/         — Auth, validation, rate limiting
  template.yaml        — SAM template
/infrastructure/
  /cdk/               — CDK stack definitions (if using CDK)
```
