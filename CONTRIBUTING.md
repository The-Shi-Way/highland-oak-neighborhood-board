# Contributing to Highland Oak Neighborhood Board

## Development Setup

### Frontend
```bash
bun install
bun run dev   # http://localhost:3002
```

### Backend (local)
```bash
# Start DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local

# Create local table
cd backend && bash scripts/create-local-table.sh

# Start SAM local API (port 3001)
cd backend
sam build --use-container
sam local start-api --port 3001 --warm-containers EAGER
```

### Running Tests
```bash
# Frontend unit tests
bun test

# Frontend E2E (dev server must be running)
bun run test:e2e

# Backend unit tests
cd backend && npm test
```

## Code Style
- Frontend: React with inline styles, CSS variables for theming
- Backend: ESM modules (.mjs), AWS SDK v3, zod for validation
- All user input must be sanitized before storage

## Secrets
Never commit:
- `.env.local`
- `env.local.json`
- `samconfig.toml` production values
- Any AWS credentials
