# GitHub Actions Secrets Checklist

This document lists every GitHub Actions secret required for CI/CD, where each value comes from, and step-by-step instructions for populating them after your first SAM deploy.

## Secrets Reference

| Secret | Source | Purpose |
|--------|--------|---------|
| `AWS_ACCESS_KEY_ID` | IAM console → Deployer user | AWS authentication for CI/CD |
| `AWS_SECRET_ACCESS_KEY` | IAM console → Deployer user | AWS authentication for CI/CD |
| `AWS_REGION` | Manual (e.g., `us-east-1`) | Target AWS region for all operations |
| `S3_BUCKET_NAME` | Stack output: `SpaBucketName` | S3 bucket for frontend deploy (`aws s3 sync`) |
| `CLOUDFRONT_DISTRIBUTION_ID` | Stack output: `CloudFrontDistributionId` | CloudFront cache invalidation after frontend deploy |
| `CLOUDFRONT_DOMAIN` | Stack output: `CloudFrontDomain` | Base URL for E2E tests |
| `VITE_API_URL` | Stack output: `ApiUrl` | Frontend API endpoint (baked into build) |
| `VITE_CDN_URL` | Stack output: `CloudFrontDomain` | Frontend CDN URL for images (baked into build) |
| `ALLOWED_ORIGIN` | CloudFront domain or custom domain | CORS origin header for backend Lambda functions |

## Step-by-Step Setup

### 1. Deploy the stack (first time)

Run the initial SAM deploy from the `backend/` directory:

```bash
sam build --use-container
sam deploy --guided
```

Follow the guided prompts. Use `highland-oak-prod` as the stack name (or your preferred name). Once the deploy completes, the terminal will print the stack outputs.

### 2. Retrieve stack outputs

If you need to retrieve the outputs again after the deploy:

```bash
aws cloudformation describe-stacks \
  --stack-name highland-oak-prod \
  --query "Stacks[0].Outputs" \
  --output table
```

You will see output values for:

- `ApiUrl` — use for `VITE_API_URL`
- `SpaBucketName` — use for `S3_BUCKET_NAME`
- `CloudFrontDistributionId` — use for `CLOUDFRONT_DISTRIBUTION_ID`
- `CloudFrontDomain` — use for `CLOUDFRONT_DOMAIN`, `VITE_CDN_URL`, and `ALLOWED_ORIGIN`

### 3. Create the IAM deployer user

1. Open the [IAM console](https://console.aws.amazon.com/iam/).
2. Go to **Users** → **Create user**.
3. Name the user `highland-oak-deployer` (or similar).
4. Select **Attach policies directly**.
5. Choose **Create policy**, switch to the **JSON** tab, and paste the contents of [`deployer-policy.json`](./deployer-policy.json).
6. Name the policy `highland-oak-deployer-policy` and create it.
7. Attach the new policy to the deployer user and finish creating the user.
8. Go to the user → **Security credentials** → **Create access key**.
9. Select **Third-party service** as the use case.
10. Copy the **Access key ID** and **Secret access key** — you will need both for the next step.

> These credentials are shown only once. Store them securely.

### 4. Set secrets in GitHub

1. Go to your GitHub repository.
2. Navigate to **Settings** → **Secrets and variables** → **Actions**.
3. Click **New repository secret** for each secret below:

| Secret name | Value to enter |
|-------------|----------------|
| `AWS_ACCESS_KEY_ID` | Access key ID from step 3 |
| `AWS_SECRET_ACCESS_KEY` | Secret access key from step 3 |
| `AWS_REGION` | Your target region, e.g., `us-east-1` |
| `S3_BUCKET_NAME` | `SpaBucketName` output from step 2 |
| `CLOUDFRONT_DISTRIBUTION_ID` | `CloudFrontDistributionId` output from step 2 |
| `CLOUDFRONT_DOMAIN` | `CloudFrontDomain` output from step 2 |
| `VITE_API_URL` | `ApiUrl` output from step 2 |
| `VITE_CDN_URL` | `CloudFrontDomain` output from step 2 (same as `CLOUDFRONT_DOMAIN`) |
| `ALLOWED_ORIGIN` | See note below |

### 5. Setting `ALLOWED_ORIGIN`

The `ALLOWED_ORIGIN` secret controls the CORS `Access-Control-Allow-Origin` header on backend responses.

- **If you are NOT using a custom domain:** set this to the CloudFront domain from the stack outputs, prefixed with `https://`. For example: `https://d1234abcdef.cloudfront.net`
- **If you ARE using a custom domain:** set this to your custom domain, e.g., `https://highlandoak.example.com`

This value must exactly match the origin your users visit in their browser. A mismatch will cause CORS errors on all API requests from the frontend.

## Verification

After setting all secrets, push a commit to `main` (or trigger the workflows manually) and confirm both the backend and frontend pipelines complete successfully. You can also run the verification script locally:

```bash
bash backend/deployment/verify-deployment.sh highland-oak-prod
```
