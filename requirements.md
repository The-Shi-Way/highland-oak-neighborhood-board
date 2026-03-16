# Community Bulletin Board — Product Requirements

## Overview
A neighborhood community bulletin board web application where residents can share local news, participate in neighborhood watch, and celebrate everyday beauty in their community. The platform prioritizes privacy, ease of use, and low-cost AWS deployment.

## Core Principles
- **Privacy-First**: No PII leakage. Display names are pseudonymous. No real names, addresses, or phone numbers exposed.
- **Low Friction**: Account creation in under 60 seconds. Posting in under 30 seconds.
- **Blog-Style Reading**: Content is easy to browse without logging in. Public-facing like a blog.
- **Low Cost**: Serverless-first architecture on AWS to minimize hosting costs.
- **Secure by Default**: HTTPS, hashed passwords, input sanitization, CSRF protection.

---

## User Stories

### US-1: Anonymous Browsing
**As a** visitor,  
**I want to** browse community posts without creating an account,  
**So that** I can see what's happening in the neighborhood before committing.

**Acceptance Criteria:**
- Homepage shows latest posts in reverse chronological order
- Posts are filterable by category (News, Watch, Community, Photos)
- No login required to read posts or view images
- Visitor cannot see author email or any PII — only display name

### US-2: Quick Account Creation
**As a** new neighbor,  
**I want to** create an account with minimal information,  
**So that** I can start posting quickly without sharing sensitive data.

**Acceptance Criteria:**
- Registration requires only: email, display name, password
- Display name must be unique and is the only public identifier
- Email is never displayed publicly, used only for login and password reset
- Password must be ≥ 8 characters with at least 1 number and 1 special character
- Account is created and user is logged in within one step
- Community code (optional) can gate registration to verified neighborhoods

### US-3: Secure Login
**As a** registered user,  
**I want to** log in securely,  
**So that** my account and posts are protected.

**Acceptance Criteria:**
- Login via email + password
- JWT-based session with 24h expiry and refresh token rotation
- Rate limiting on login attempts (5 per minute per IP)
- "Forgot password" sends a time-limited reset link to email
- Session invalidation on password change

### US-4: Create a Post
**As a** logged-in user,  
**I want to** create a post with a title, body, category, and optional image,  
**So that** I can share news, alerts, or community moments.

**Acceptance Criteria:**
- Post categories: 📰 News, 👁️ Neighborhood Watch, 🏘️ Community, 📸 Photos
- Title (required, max 120 chars), body (required, max 5000 chars, markdown supported)
- Optional image upload (max 5MB, jpg/png/webp)
- Posts appear immediately after submission
- Author shown as display name only
- Neighborhood Watch posts support urgency level (Info, Caution, Alert)

### US-5: Interact with Posts
**As a** logged-in user,  
**I want to** like and comment on posts,  
**So that** I can engage with my neighbors.

**Acceptance Criteria:**
- One like per user per post (toggle on/off)
- Comments support text only (max 1000 chars)
- Comments show display name and relative timestamp
- Post author can delete their own comments; any user can delete their own
- Nested replies (1 level deep only)

### US-6: Neighborhood Watch
**As a** concerned neighbor,  
**I want to** post and view safety alerts with urgency levels,  
**So that** the community stays informed about safety matters.

**Acceptance Criteria:**
- Watch posts have visual urgency indicators (green/yellow/red)
- Watch category has its own dedicated filtered view
- Optional: push notification for "Alert" level posts (future)

### US-7: Content Moderation
**As a** community admin,  
**I want to** moderate posts and comments,  
**So that** the board stays respectful and useful.

**Acceptance Criteria:**
- Admin role can hide/delete any post or comment
- Users can report posts (reason required)
- Reported posts flagged for admin review
- 3+ reports auto-hides a post pending review

### US-8: User Profile
**As a** user,  
**I want to** manage my profile and see my post history,  
**So that** I can control my presence on the board.

**Acceptance Criteria:**
- Edit display name, password
- View own post history
- Delete own posts
- Delete account (soft delete, data anonymized after 30 days)

---

## Non-Functional Requirements

### Security
- All passwords hashed with bcrypt (cost factor 12)
- JWT tokens signed with RS256
- All API inputs validated and sanitized (XSS, SQL injection)
- CORS restricted to frontend domain
- Rate limiting on all write endpoints
- Image uploads scanned and resized server-side
- No PII in logs or error messages

### Performance
- Homepage loads in < 2 seconds on 3G
- Pagination: 20 posts per page with infinite scroll
- Images lazy-loaded and served via CDN (CloudFront)
- API response time < 200ms p95

### Cost Optimization (AWS)
- Serverless compute: Lambda + API Gateway
- Database: DynamoDB (on-demand pricing) or Aurora Serverless v2
- Storage: S3 for images with lifecycle policies
- CDN: CloudFront for static assets and images
- Auth: Cognito for user management (free tier: 50k MAU)
- Estimated cost: < $10/month for communities under 500 users

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigable
- Screen reader friendly
- Color contrast ratios ≥ 4.5:1

---

## Technology Stack

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context + useReducer (simple enough, no Redux needed)
- **Routing**: React Router v6
- **Markdown**: react-markdown for post rendering
- **Image Handling**: Client-side compression before upload

### Backend (AWS Serverless)
- **Compute**: AWS Lambda (Node.js 20)
- **API**: API Gateway (REST)
- **Auth**: Amazon Cognito
- **Database**: DynamoDB
- **Storage**: S3 + CloudFront
- **IaC**: AWS CDK or SAM

### Kiro Spec-Driven Development
- Specs define all features before implementation
- Each user story maps to a task list
- Tasks are atomic, testable, and ordered
- Design docs cover architecture decisions
- All specs live in `/specs/` directory
