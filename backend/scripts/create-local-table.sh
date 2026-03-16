#!/usr/bin/env bash
set -e

ENDPOINT="${DYNAMODB_ENDPOINT:-http://localhost:8000}"
TABLE_NAME="${TABLE_NAME:-CommunityBoard-dev}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

echo "Creating DynamoDB table '$TABLE_NAME' at $ENDPOINT..."

aws dynamodb create-table \
  --table-name "$TABLE_NAME" \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    '[{"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"},{"AttributeName":"GSI1SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url "$ENDPOINT" \
  --region "$REGION" 2>/dev/null || echo "Table already exists, skipping."

echo "✅ Table ready."
