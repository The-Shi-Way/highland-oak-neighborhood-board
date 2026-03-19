# Implementation Plan: AWS Deployment

## Overview

Modify the existing SAM template to add SPA hosting, make WAF conditional, add optional custom domain support, then create deployment tooling (IAM policy, verification script, secrets checklist). All CI/CD workflows are already correct — they just need the right GitHub secrets configured after first deploy.

## Tasks

- [x] 1. Add SPA hosting to SAM template
  - [x] 1.1 Add SpaBucket S3 resource and SpaBucketPolicy to `backend/template.yaml`
    - Create `AWS::S3::Bucket` named `highland-oak-spa-{stage}-{accountId}` with public access blocked
    - Create `AWS::S3::BucketPolicy` granting `s3:GetObject` to the existing CloudFrontOAI
    - Add `SpaBucketName` to Outputs section
    - _Requirements: 1.1, 3.2_

  - [x] 1.2 Reconfigure CloudFront origins and cache behaviors
    - Add `SpaOrigin` pointing to SpaBucket
    - Change `DefaultCacheBehavior` to target `SpaOrigin` (currently targets images S3Origin)
    - Add `/images/*` CacheBehavior targeting the existing images S3Origin with CachingOptimized policy
    - Keep existing `/api/*` CacheBehavior unchanged
    - Verify `CustomErrorResponses` (403→200, 404→200 → /index.html) still work for SPA routing
    - _Requirements: 1.2, 1.3_

  - [ ]* 1.3 Write unit tests for SPA hosting template changes
    - Parse template.yaml and verify SpaBucket resource exists with correct config
    - Verify CloudFront has 3 origins (SPA, images, API)
    - Verify DefaultCacheBehavior targets SpaOrigin
    - Verify `/images/*` and `/api/*` behaviors target correct origins
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Make WAF conditional and add custom domain support
  - [x] 2.1 Make WAF resources conditional on Stage=prod
    - Add `Condition: IsProd` to WebACL resource (IsProd condition already exists)
    - Change CloudFront `WebACLId` to `!If [IsProd, !GetAtt WebACL.Arn, !Ref "AWS::NoValue"]`
    - _Requirements: 6.4, 6.5_

  - [x] 2.2 Add optional custom domain parameters and CloudFront alias config
    - Add `DomainName` (String, default "") and `CertificateArn` (String, default "") parameters
    - Add `HasCustomDomain` condition: `!Not [!Equals [!Ref DomainName, ""]]`
    - Add conditional `Aliases` and `ViewerCertificate` to CloudFront using `!If [HasCustomDomain, ...]`
    - Update `AllowedOrigin` default description to note it should be the custom domain if used
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 2.3 Write unit tests for conditional WAF and custom domain
    - Verify WebACL has `Condition: IsProd`
    - Verify CloudFront WebACLId uses `!If` with IsProd
    - Verify DomainName and CertificateArn parameters exist with empty defaults
    - Verify HasCustomDomain condition exists
    - _Requirements: 6.4, 6.5, 7.1, 7.2_

- [x] 3. Checkpoint - Validate SAM template
  - Ensure `sam validate` passes on the modified template
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create IAM deployer policy
  - [x] 4.1 Create `backend/deployment/deployer-policy.json`
    - Write minimum-privilege IAM policy covering CloudFormation, S3, Lambda, API Gateway, DynamoDB, Cognito, CloudFront, WAFv2, IAM (scoped), and CloudWatch Logs
    - Scope all resource ARNs to `highland-oak*` patterns where possible
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 4.2 Write property test for deployer policy completeness and scoping
    - **Property 1: Deployer policy completeness and scoping**
    - Parse the policy JSON, verify all required service actions are present
    - Verify all resource ARN patterns contain "highland-oak" or use scoped patterns
    - **Validates: Requirements 2.1, 2.2**

- [x] 5. Create verification script and secrets checklist
  - [x] 5.1 Create `backend/deployment/verify-deployment.sh`
    - Accept stack name as argument (default: `highland-oak-prod`)
    - Query CloudFormation outputs and verify non-empty
    - Curl API `/posts` endpoint for HTTP 200
    - Curl CloudFront root for index.html content
    - Check SPA bucket for index.html via `aws s3 ls`
    - Output pass/fail per check with remediation hints on failure
    - Exit code 0 if all pass, 1 if any fail
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 5.2 Write property test for verification script output validation
    - **Property 3: Verification script output validation**
    - Generate random sets of stack outputs (some empty, some populated)
    - Verify the parsing logic correctly identifies empty outputs as failures
    - **Validates: Requirements 8.1**

  - [ ]* 5.3 Write property test for verification script error reporting
    - **Property 4: Verification script error reporting**
    - Generate random failure scenarios
    - Verify error output contains component name and remediation suggestion
    - **Validates: Requirements 8.5**

  - [x] 5.4 Create `backend/deployment/secrets-checklist.md`
    - List every GitHub Actions secret with source (Stack Output or manual) and purpose
    - Include step-by-step instructions for populating secrets after first deploy
    - _Requirements: 5.4_

- [x] 6. Update environment configuration files
  - [x] 6.1 Update `.env.example` with documented frontend variables
    - Add `VITE_API_URL` and `VITE_CDN_URL` with descriptions and example values
    - Reference Stack Outputs as the source for production values
    - _Requirements: 5.1, 5.3_

  - [x] 6.2 Update `backend/.env.example` with documented backend variables
    - Ensure all variables have descriptions
    - Add `CLOUDFRONT_DOMAIN` with description referencing Stack Output
    - _Requirements: 5.2_

- [ ] 7. Verify Lambda cost optimization settings
  - [ ]* 7.1 Write property test for Lambda cost optimization configuration
    - **Property 2: Lambda cost optimization configuration**
    - Parse all Lambda function resources from template.yaml
    - Verify each has arm64 architecture, memory ≤ 256MB (except image processor ≤ 1024MB), timeout ≤ 29s (except image processor ≤ 60s), and `AWS_NODEJS_CONNECTION_REUSE_ENABLED=1`
    - **Validates: Requirements 6.1, 6.7**

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify `sam validate` passes
  - Confirm all deployment artifacts are created and documented

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The existing CI/CD workflows (`.github/workflows/`) need no code changes — they already handle backend SAM deploy and frontend S3 sync + CloudFront invalidation correctly
- After first `sam deploy`, the developer populates GitHub secrets from Stack Outputs using the secrets checklist
- WAF is the biggest cost driver (~$5/mo) — making it prod-only saves money in dev environments
- Property tests validate the SAM template YAML and IAM policy JSON as structured data
