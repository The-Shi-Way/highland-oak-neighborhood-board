#!/usr/bin/env bash
# verify-deployment.sh — Post-deployment verification for Highland Oak
# Usage: ./verify-deployment.sh [stack-name]
# Exit code 0 if all checks pass, 1 if any fail.

set -euo pipefail

STACK_NAME="${1:-highland-oak-prod}"
FAILURES=0

# ─── Helpers ────────────────────────────────────────────────────────────────

pass() {
  echo "[PASS] $1"
}

fail() {
  echo "[FAIL] $1"
  if [[ -n "${2:-}" ]]; then
    echo "  → Remediation: $2"
  fi
  FAILURES=$((FAILURES + 1))
}

# ─── 1. Fetch Stack Outputs ────────────────────────────────────────────────

echo "Verifying deployment for stack: ${STACK_NAME}"
echo "-------------------------------------------"

STACK_JSON=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs" \
  --output json 2>&1) || {
  fail "Stack Query - Could not describe stack '${STACK_NAME}'" \
       "Verify the stack name is correct and your AWS credentials have cloudformation:DescribeStacks permission."
  echo ""
  echo "Result: 1 check failed. Cannot continue without stack outputs."
  exit 1
}

get_output() {
  local key="$1"
  echo "${STACK_JSON}" | python3 -c "
import sys, json
outputs = json.load(sys.stdin)
for o in outputs:
    if o['OutputKey'] == '${key}':
        print(o['OutputValue'])
        sys.exit(0)
print('')
"
}

# ─── 2. Verify Stack Outputs ───────────────────────────────────────────────

REQUIRED_OUTPUTS=(
  ApiUrl
  CloudFrontDomain
  SpaBucketName
  UserPoolId
  UserPoolClientId
  TableName
  ImagesBucketName
  CloudFrontDistributionId
)

MISSING_OUTPUTS=()

for key in "${REQUIRED_OUTPUTS[@]}"; do
  value=$(get_output "${key}")
  if [[ -z "${value}" ]]; then
    MISSING_OUTPUTS+=("${key}")
  fi
done

if [[ ${#MISSING_OUTPUTS[@]} -eq 0 ]]; then
  pass "Stack Outputs - All ${#REQUIRED_OUTPUTS[@]} outputs present"
else
  fail "Stack Outputs - Missing outputs: ${MISSING_OUTPUTS[*]}" \
       "Check the SAM template Outputs section. Re-run 'sam deploy' if outputs were recently added."
fi

# Extract values for subsequent checks
API_URL=$(get_output "ApiUrl")
CF_DOMAIN=$(get_output "CloudFrontDomain")
SPA_BUCKET=$(get_output "SpaBucketName")

# ─── 3. API Health Check ───────────────────────────────────────────────────

if [[ -n "${API_URL}" ]]; then
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/posts" --max-time 10 2>/dev/null) || HTTP_STATUS="000"

  if [[ "${HTTP_STATUS}" == "200" ]]; then
    pass "API Health Check - GET /posts returned HTTP 200"
  else
    fail "API Health Check - GET /posts returned HTTP ${HTTP_STATUS}" \
         "Check Lambda function logs in CloudWatch. Verify DynamoDB table exists and API Gateway stage is deployed."
  fi
else
  fail "API Health Check - Skipped, ApiUrl output is empty" \
       "Ensure the SAM template outputs ApiUrl and the stack deployed successfully."
fi

# ─── 4. CloudFront SPA Check ───────────────────────────────────────────────

if [[ -n "${CF_DOMAIN}" ]]; then
  CF_BODY=$(curl -s "${CF_DOMAIN}" --max-time 10 2>/dev/null) || CF_BODY=""

  if echo "${CF_BODY}" | grep -q '<div id="root">' 2>/dev/null; then
    pass "CloudFront SPA - Root request contains index.html content"
  else
    fail "CloudFront SPA - Root request did not return expected index.html content" \
         "Verify frontend was deployed to SPA bucket. Run: aws s3 ls s3://${SPA_BUCKET}/ | head"
  fi
else
  fail "CloudFront SPA - Skipped, CloudFrontDomain output is empty" \
       "Ensure the SAM template outputs CloudFrontDomain and CloudFront distribution is deployed."
fi

# ─── 5. SPA Bucket index.html Check ────────────────────────────────────────

if [[ -n "${SPA_BUCKET}" ]]; then
  S3_LS=$(aws s3 ls "s3://${SPA_BUCKET}/index.html" 2>&1) || S3_LS=""

  if echo "${S3_LS}" | grep -q "index.html" 2>/dev/null; then
    pass "SPA Bucket - index.html exists in s3://${SPA_BUCKET}/"
  else
    fail "SPA Bucket - index.html not found in s3://${SPA_BUCKET}/" \
         "Build the frontend and sync to the bucket: cd frontend && bun run build && aws s3 sync dist/ s3://${SPA_BUCKET}/"
  fi
else
  fail "SPA Bucket - Skipped, SpaBucketName output is empty" \
       "Ensure the SAM template outputs SpaBucketName and the SPA bucket was created."
fi

# ─── Summary ────────────────────────────────────────────────────────────────

echo ""
echo "-------------------------------------------"
TOTAL_CHECKS=$(( ${#REQUIRED_OUTPUTS[@]} > 0 ? 1 : 0 ))  # outputs count as 1 check
TOTAL_CHECKS=$((TOTAL_CHECKS + 3))  # API + CloudFront + S3

if [[ ${FAILURES} -eq 0 ]]; then
  echo "Result: All checks passed."
  exit 0
else
  echo "Result: ${FAILURES} check(s) failed."
  exit 1
fi
