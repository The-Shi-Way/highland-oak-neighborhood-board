# Requirements Document

## Introduction

This specification covers the end-to-end deployment of the Highland Oak Neighborhood Board application to AWS. The app consists of a React 19 SPA frontend (built with Vite/Bun) and an AWS SAM serverless backend (Lambda, API Gateway, DynamoDB, Cognito, S3, CloudFront). The existing SAM template defines backend infrastructure but lacks SPA hosting. The goal is to produce a complete, cost-optimized deployment that a single developer can execute from scratch, targeting under $5/month for a small community of fewer than 500 users.

## Glossary

- **SAM_Template**: The AWS SAM `backend/template.yaml` file that defines all backend infrastructure as code
- **SPA_Bucket**: An S3 bucket dedicated to hosting the React single-page application static files (HTML, JS, CSS)
- **Images_Bucket**: The existing S3 bucket (`highland-oak-images-{stage}-{accountId}`) used for user-uploaded images
- **CloudFront_Distribution**: The existing CloudFront CDN distribution that serves content to end users
- **CI_CD_Pipeline**: The GitHub Actions workflows (`.github/workflows/`) that automate testing and deployment
- **Deployer_Role**: An IAM role or user with the minimum permissions required to deploy the full stack
- **Stack_Outputs**: The CloudFormation output values (API URL, User Pool ID, CloudFront domain, etc.) produced after a successful SAM deploy
- **WAF_WebACL**: The AWS WAFv2 Web Access Control List attached to CloudFront for rate limiting and managed rule protection

## Requirements

### Requirement 1: SPA Hosting Infrastructure

**User Story:** As a developer, I want the SAM template to include an S3 bucket and CloudFront origin for hosting the React SPA, so that the frontend is served through the same CDN as the API and images.

#### Acceptance Criteria

1. WHEN the SAM template is deployed, THE SAM_Template SHALL create an SPA_Bucket with public access blocked and a bucket policy granting read access only to the CloudFront OAI
2. WHEN the CloudFront_Distribution is configured, THE SAM_Template SHALL include an S3 origin for the SPA_Bucket as the default origin, an S3 origin for the Images_Bucket under the `/images/*` path, and the API origin under the `/api/*` path
3. WHEN a user requests a path that does not match a file in the SPA_Bucket, THE CloudFront_Distribution SHALL return `index.html` with HTTP status 200 to support client-side routing
4. WHEN static assets (JS, CSS, fonts) are served, THE CloudFront_Distribution SHALL set a cache-control header with a max-age of at least 86400 seconds
5. WHEN `index.html` is served, THE CloudFront_Distribution SHALL set a cache-control header that prevents caching (no-cache, no-store, must-revalidate)

### Requirement 2: IAM Deployment Permissions

**User Story:** As a developer, I want a documented minimum-privilege IAM policy for deployment, so that I can deploy the full stack without granting overly broad permissions.

#### Acceptance Criteria

1. THE Deployer_Role SHALL have permissions to manage CloudFormation stacks, Lambda functions, API Gateway APIs, DynamoDB tables, S3 buckets, Cognito user pools, CloudFront distributions, WAFv2 WebACLs, IAM roles (scoped to the stack), and CloudWatch log groups
2. WHEN the Deployer_Role is used by the CI_CD_Pipeline, THE Deployer_Role SHALL be scoped to resources tagged with `Project: highland-oak` or prefixed with `highland-oak`
3. THE Deployer_Role SHALL be defined as an IAM policy JSON document stored in the repository at `backend/deployment/deployer-policy.json`

### Requirement 3: First-Time Deployment Process

**User Story:** As a developer deploying for the first time, I want a clear sequence of steps to go from a fresh AWS account to a running application, so that I can get the app live without guesswork.

#### Acceptance Criteria

1. WHEN a developer runs `sam build --use-container` followed by `sam deploy --guided` in the `backend/` directory, THE SAM_Template SHALL deploy all resources (Cognito, DynamoDB, S3 buckets, Lambda functions, API Gateway, CloudFront, WAF) in a single stack
2. WHEN the SAM deploy completes, THE SAM_Template SHALL output the API URL, User Pool ID, User Pool Client ID, SPA_Bucket name, CloudFront domain, and CloudFront distribution ID as Stack_Outputs
3. WHEN the developer builds the frontend with the correct `VITE_API_URL` and `VITE_CDN_URL` environment variables, THE frontend build SHALL produce a `dist/` directory that can be synced to the SPA_Bucket
4. WHEN the developer syncs the `dist/` directory to the SPA_Bucket and creates a CloudFront invalidation, THE application SHALL be accessible at the CloudFront domain URL

### Requirement 4: CI/CD Pipeline Configuration

**User Story:** As a developer, I want the GitHub Actions workflows to deploy both backend and frontend automatically on push to main, so that I have continuous delivery without manual steps.

#### Acceptance Criteria

1. WHEN code is pushed to the `main` branch with changes in `backend/`, THE CI_CD_Pipeline SHALL run backend tests, execute `sam build`, and execute `sam deploy` with the production stack name and parameters
2. WHEN code is pushed to the `main` branch with changes in frontend paths (`src/`, `index.html`, `vite.config.js`, `package.json`), THE CI_CD_Pipeline SHALL build the frontend, sync the `dist/` directory to the SPA_Bucket, and invalidate the CloudFront cache
3. WHEN the CI_CD_Pipeline runs, THE CI_CD_Pipeline SHALL use GitHub Actions secrets for `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`, `CLOUDFRONT_DISTRIBUTION_ID`, `VITE_API_URL`, and `VITE_CDN_URL`
4. WHEN a pull request is opened against `main`, THE CI_CD_Pipeline SHALL run lint checks and build verification without deploying

### Requirement 5: Environment Configuration

**User Story:** As a developer, I want clear documentation of all required environment variables and secrets, so that I can configure local development and production environments correctly.

#### Acceptance Criteria

1. THE repository SHALL contain an `.env.example` file at the root with all frontend environment variables documented with descriptions
2. THE repository SHALL contain a `backend/.env.example` file with all backend environment variables documented with descriptions
3. WHEN the SAM deploy completes, THE Stack_Outputs SHALL provide all values needed to populate the frontend `.env` file and the GitHub Actions secrets
4. THE repository SHALL contain a `backend/deployment/secrets-checklist.md` file listing every GitHub Actions secret, its source (Stack_Outputs field or manual entry), and its purpose

### Requirement 6: Cost Optimization

**User Story:** As a developer running a small community app, I want the deployment to minimize AWS costs, so that the monthly bill stays under $5 for fewer than 500 users.

#### Acceptance Criteria

1. THE SAM_Template SHALL configure all Lambda functions with arm64 architecture and a memory size of 256 MB or less (except the image processor which uses 1024 MB)
2. THE SAM_Template SHALL configure DynamoDB in PAY_PER_REQUEST billing mode
3. THE SAM_Template SHALL configure CloudFront with PriceClass_100 (cheapest edge locations)
4. THE SAM_Template SHALL make the WAF_WebACL conditional on the Stage parameter, enabling WAF only when Stage is `prod`
5. WHEN Stage is `dev`, THE SAM_Template SHALL skip WAF_WebACL creation to save approximately $5/month in development environments
6. THE SAM_Template SHALL configure S3 lifecycle rules to expire uploaded originals after 30 days and processed images after 365 days
7. THE SAM_Template SHALL set Lambda function timeout to 29 seconds or less and enable `AWS_NODEJS_CONNECTION_REUSE_ENABLED`

### Requirement 7: Custom Domain Setup

**User Story:** As a developer, I want optional instructions for connecting a custom domain via Route 53, so that the app can be served from a branded URL.

#### Acceptance Criteria

1. WHERE a custom domain is desired, THE SAM_Template SHALL accept `DomainName` and `CertificateArn` parameters that default to empty strings
2. WHERE `DomainName` is provided, THE SAM_Template SHALL configure the CloudFront_Distribution with the custom domain as an alias and attach the ACM certificate
3. WHERE `DomainName` is provided, THE SAM_Template SHALL output the CloudFront distribution domain name for use as a Route 53 alias target
4. WHERE `DomainName` is not provided, THE CloudFront_Distribution SHALL use the default `*.cloudfront.net` domain with no alias configuration

### Requirement 8: Post-Deployment Verification

**User Story:** As a developer, I want a verification script that checks all deployed services are healthy, so that I can confirm the deployment succeeded.

#### Acceptance Criteria

1. WHEN the verification script is executed with the stack name as input, THE script SHALL query CloudFormation for Stack_Outputs and verify each output value is non-empty
2. WHEN the verification script checks the API, THE script SHALL make an HTTP GET request to the `/posts` endpoint and verify a 200 response status
3. WHEN the verification script checks CloudFront, THE script SHALL make an HTTP GET request to the CloudFront domain root and verify the response contains the SPA `index.html` content
4. WHEN the verification script checks the SPA_Bucket, THE script SHALL verify that `index.html` exists in the bucket
5. IF any verification check fails, THEN THE script SHALL output a clear error message identifying the failing component and a suggested remediation step
