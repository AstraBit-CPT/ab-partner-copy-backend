# Copy Partner BFF

Backend for Frontend (BFF) service for copy trading partner frontend applications.

## Overview

This service acts as a proxy between partner frontend applications (Angular) and the copy-gateway service. It handles
partner authentication by adding the necessary signature headers required by copy-gateway, allowing partners to make
requests without exposing their API keys and secrets in the frontend.

## Features

- **Partner Authentication**: Manages partner credentials securely on the backend
- **Request Proxying**: Forwards all requests to copy-gateway with proper authentication headers
- **Signature Generation**: Automatically generates HMAC SHA256 signatures based on request parameters
- **Health Checks**: Provides health check endpoints for monitoring

## API Versioning

- Path-based versioning is required. Requests without a `/vX` prefix are rejected with `400`.
- Supported partner-facing version is `v1` (current default).
- Proxy-to-gateway mapping is config-driven so a proxy release can pin to a specific gateway major:  
  `API_GATEWAY_VERSION_MAP='{\"v1\":\"v1\"}'` keeps proxy `v1` calls on gateway `v1`.
- Health endpoints (`/health-check`, `/heartbeat`) return supported, default, and mapping metadata.

## Architecture

### Technology Stack

- **Framework**: NestJS 11.x
- **Communication**: HTTP REST API
- **Language**: TypeScript
- **Logging**: Winston (via nest-winston)
- **HTTP Client**: Axios
- **All dependencies**: Public npm packages only (no private packages)

### Request Flow

1. Frontend sends request to BFF
2. BFF retrieves partner credentials (API key and secret) from configuration
3. BFF generates signature using the same logic as copy-gateway's signature-validation middleware
4. BFF adds required headers (`X-ASTRABIT-API-KEY`, `X-ASTRABIT-SIGNATURE`, `X-ASTRABIT-TIMESTAMP`,
   `X-ASTRABIT-RECV-WINDOW`)
5. BFF forwards request to copy-gateway
6. BFF returns response to frontend

## Configuration

### Environment Variables

All configuration is done via environment variables. See `.env.template` for a complete list of available options.

**Required Variables:**

- `ASTRABIT_API_KEY`: Your AstraBit API key (required)
- `ASTRABIT_API_SECRET`: Your AstraBit API secret (required)

**Optional Variables (with defaults):**

- `APP_ENV` or `NODE_ENV`: Application environment (default: `development`)
- `LOG_LEVEL`: Logging level (default: `info`)
- `APP_LISTEN_HOST`: Host to listen on (default: `0.0.0.0`)
- `APP_LISTEN_PORT`: Port to listen on (default: `8810`)
- `CORS_ALLOW_ORIGIN`: CORS allowed origin regex (default: `(.*)`)
- `COPY_GATEWAY_URL`: URL of the copy-gateway service (default: `http://localhost:3360`)
- `API_SUPPORTED_VERSIONS`: Comma-separated list of partner-facing versions (default: `v1`)
- `API_DEFAULT_VERSION`: Default partner-facing version (default: `v1`)
- `API_GATEWAY_VERSION_MAP`: JSON map from partner versions to gateway versions (default: each maps to itself)

### Setup

1. Copy the template file:

```bash
cp .env.template .env
```

2. Edit `.env` and fill in your credentials:

```bash
ASTRABIT_API_KEY=your-api-key-here
ASTRABIT_API_SECRET=your-api-secret-here
COPY_GATEWAY_URL=http://copy-gateway:3360
```

## API Endpoints

### Proxy Endpoints

All requests are automatically proxied to copy-gateway with authentication headers added. The service uses the
configured `ASTRABIT_API_KEY` and `ASTRABIT_API_SECRET` to authenticate all requests.

The BFF service automatically:

- Adds the required authentication headers (`X-ASTRABIT-API-KEY`, `X-ASTRABIT-SIGNATURE`, `X-ASTRABIT-TIMESTAMP`)
- Signs the request with HMAC SHA256
- Forwards the request to copy-gateway
- Returns the response to the client

#### List Whitelabel Bots

Get a paginated list of whitelabel bots owned by the authenticated user.

```bash
# Get all whitelabel bots (with pagination)
curl -X GET "http://localhost:8810/v1/private/whitelabel-bots?page=1&limit=10" \
  -H "Content-Type: application/json" \
  -H "X-Partner-User-Id: user123"

# Response
{
  "data": [
    {
      "botPublicId": "ABCDEF12345678",
      "name": "My Trading Bot",
      "status": "active",
      "strategyPublicId": "STRATEGY123",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

#### Create Whitelabel Bot

Create a new whitelabel bot that follows a specific strategy.

```bash
# Create a new whitelabel bot
curl -X POST http://localhost:8810/v1/private/whitelabel-bots \
  -H "Content-Type: application/json" \
  -H "X-Partner-User-Id: user123" \
  -d '{
    "name": "My Trading Bot",
    "strategyPublicId": "STRATEGY123",
    "exchangeAccountPublicId": "EXCHANGE456",
    "riskLevel": "medium"
  }'

# Response
{
  "botPublicId": "NEWBOT789",
  "name": "My Trading Bot",
  "status": "pending",
  "strategyPublicId": "STRATEGY123",
  "exchangeAccountPublicId": "EXCHANGE456",
  "createdAt": "2025-01-15T11:00:00Z"
}
```

#### Update Whitelabel Bot

Update settings for an existing whitelabel bot.

```bash
# Update whitelabel bot settings
curl -X PATCH http://localhost:8810/v1/private/whitelabel-bots/ABCDEF12345678 \
  -H "Content-Type: application/json" \
  -H "X-Partner-User-Id: user123" \
  -d '{
    "name": "Updated Bot Name",
    "status": "paused"
  }'

# Response
{
  "botPublicId": "ABCDEF12345678",
  "name": "Updated Bot Name",
  "status": "paused",
  "updatedAt": "2025-01-15T12:00:00Z"
}
```

#### Delete Whitelabel Bot

Delete a whitelabel bot.

```bash
# Delete a whitelabel bot
curl -X DELETE http://localhost:8810/v1/private/whitelabel-bots/ABCDEF12345678 \
  -H "X-Partner-User-Id: user123"

# Response
{
  "status": true
}
```

### Health Check Endpoints

#### Health Check

Returns detailed health status with API versioning information.

```bash
curl -X GET http://localhost:8810/health-check

# Response
{
  "status": "ok",
  "versions": {
    "supported": ["v1"],
    "default": "v1",
    "gatewayMap": {
      "v1": "v1"
    }
  }
}
```

#### Heartbeat

Simple heartbeat endpoint for basic health monitoring.

```bash
curl -X GET http://localhost:8810/heartbeat

# Response
{
  "status": "ok"
}
```

### Swagger Documentation

Interactive API documentation is available at:

```bash
# Swagger UI
http://localhost:8810/

# OpenAPI JSON
http://localhost:8810/api-json

# OpenAPI YAML
http://localhost:8810/api-yaml
```

## Signature Generation

The service generates signatures using the same logic as copy-gateway's signature-validation middleware:

1. Build message: `{method}|{encodedUrl}|{body}|{timestamp}|{recvWindow}`
2. Create HMAC SHA256 signature using partner's API secret
3. Add signature and other required headers to request

## Version bump playbook

- **New major (vX)**: Add the new version to `API_SUPPORTED_VERSIONS`, expose `/vX` routes in copy-gateway, and update
  `API_GATEWAY_VERSION_MAP` so proxy builds pin the correct gateway major. Keep prior majors live until EOL and return
  deprecation notices in responses and docs.
- **Backward-compatible minors**: Add optional fields/behaviors guarded by validation tolerating absence; never
  repurpose required fields. Promote minor features by updating swagger/docs and contract tests while ensuring earlier
  minors still pass.
- **Release safety**: Update health metadata (proxy `/health-check`, gateway `/heartbeat`), refresh OpenAPI/proto
  artifacts per version, and run the versioned Jest suites before tagging images.

## Development

### Prerequisites

- Node.js 18.x
- npm

### Installation

```bash
npm install
```

### Running the Service

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

