# Partner Customization Guide

## Overview

This proxy service is designed to be easily customizable by partners who fork this repository. The main customization point is the **authentication module**, which allows you to integrate your own user identification mechanism.

## What You Need to Customize

### 1. Authentication Module (Required)

**Location**: `src/auth/`

**Purpose**: Extract the external user ID from incoming requests based on your authentication system.

**What to do**:
1. Create your own authentication provider implementing `IAuthProvider`
2. Update `auth.module.ts` to use your provider
3. Add any required dependencies (JWT, Passport, etc.)

**See**: [src/auth/README.md](src/auth/README.md) for detailed instructions and examples.

### 2. Environment Configuration (Required)

**Location**: `config/main.config.ts` and `.env`

**What to do**:
1. Set your Astrabit API credentials:
   ```env
   ASTRABIT_API_KEY=your-api-key
   ASTRABIT_API_SECRET=your-api-secret
   COPY_GATEWAY_URL=https://gateway.astrabit.com
   ```
2. Add any authentication-specific configuration (JWT secrets, OAuth endpoints, etc.)

## What NOT to Change

To ensure compatibility with Astrabit's copy-gateway service, **do not modify**:

- ❌ `src/proxy/proxy.service.ts` (except for the authentication integration already done)
- ❌ `src/proxy/proxy.controller.ts` (except for the authentication integration already done)
- ❌ `src/auth/auth.constants.ts` (Astrabit gateway headers)
- ❌ Signature generation logic in `proxy.service.ts`
- ❌ Request/response forwarding logic

## Quick Start

### Step 1: Fork the Repository

```bash
git clone <your-fork-url>
cd copy-partner-proxy
npm install
```

### Step 2: Implement Your Authentication

Choose one of the examples from [src/auth/README.md](src/auth/README.md) or create your own:

```typescript
// src/auth/my-auth.provider.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { IAuthProvider } from './auth.interface';

@Injectable()
export class MyAuthProvider implements IAuthProvider {
  async getUserId(req: Request): Promise<string> {
    // Your authentication logic here
    const userId = extractUserIdFromRequest(req);
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return userId;
  }
}
```

### Step 3: Update the Module

```typescript
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { MyAuthProvider } from './my-auth.provider';
import { AUTH_PROVIDER } from './auth.constants';

@Module({
  providers: [
    {
      provide: AUTH_PROVIDER,
      useClass: MyAuthProvider, // <-- Your provider
    },
  ],
  exports: [AUTH_PROVIDER],
})
export class AuthModule {}
```

### Step 4: Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### Step 5: Test

```bash
# Run tests
npm test

# Start development server
npm run start:dev

# Test with a real request
curl -X GET http://localhost:3000/api/positions \
  -H "Authorization: Bearer your-token"
```

### Step 6: Deploy

```bash
# Build for production
npm run build:prod

# Run production server
npm run start:prod
```

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      Partner Frontend                         │
│               (Your application with your auth)               │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ HTTP Request (with your auth headers)
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                  Copy Partner Proxy (This Service)            │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Your Custom Authentication Module            │    │
│  │     (Validates auth & extracts externalUserId)       │    │
│  └─────────────────────────────────────────────────────┘    │
│                         │                                     │
│                         ▼                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Proxy Service                           │    │
│  │  • Adds Astrabit authentication headers              │    │
│  │  • Signs request with HMAC                           │    │
│  │  • Forwards to copy-gateway                          │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ Signed Request (with Astrabit headers)
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   Astrabit Copy Gateway                       │
│              (Validates signature & processes)                │
└──────────────────────────────────────────────────────────────┘
```

## Key Concepts

### External User ID

The `externalUserId` is your unique identifier for the user. This is what your authentication module must extract from incoming requests. It will be:
- Encoded in base64
- Sent to Astrabit's copy-gateway in the `X-ASTRABIT-USER-ID` header
- Used to associate copy trading operations with your users

### Request Signing

The proxy automatically signs all requests to Astrabit's copy-gateway using HMAC-SHA256. This ensures request integrity and authenticity. **You don't need to implement this** - it's already done.

### Stateless Design

The proxy is designed to be stateless and horizontally scalable. Your authentication module should also be stateless or use external state (Redis, database, etc.).

## Testing Your Implementation

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:e2e
```

### Manual Testing

```bash
# Health check
curl http://localhost:3000/health-check

# Test your authentication
curl -X GET http://localhost:3000/api/positions \
  -H "Authorization: Bearer your-test-token"
```

## Common Customization Scenarios

### Scenario 1: JWT Authentication

You have a JWT-based authentication system.

**Solution**: Use the JWT example from [src/auth/README.md](src/auth/README.md#example-1-jwt-authentication)

### Scenario 2: Session-Based Authentication

You use Express sessions.

**Solution**: Use the Session example from [src/auth/README.md](src/auth/README.md#example-2-session-based-authentication)

### Scenario 3: API Key Authentication

You use API keys for authentication.

**Solution**: Use the API Key example from [src/auth/README.md](src/auth/README.md#example-3-api-key-authentication)

### Scenario 4: OAuth2/OIDC

You use OAuth2 or OpenID Connect.

**Solution**: Use the OAuth example from [src/auth/README.md](src/auth/README.md#example-4-oauth2oidc)

## Support & Documentation

- **Authentication Module**: [src/auth/README.md](src/auth/README.md)
- **API Documentation**: Available at `/api-json` when running the service
- **Health Check**: Available at `/health-check`

## Best Practices

1. **Keep authentication logic isolated** - Only modify files in `src/auth/`
2. **Use environment variables** - Never hardcode secrets
3. **Write tests** - Ensure your authentication works correctly
4. **Follow TypeScript best practices** - Use strict typing
5. **Log appropriately** - Log auth events but never log sensitive data
6. **Handle errors gracefully** - Throw `UnauthorizedException` for auth failures

## Deployment Checklist

- [ ] Authentication module implemented and tested
- [ ] Environment variables configured
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] Logs reviewed (no sensitive data logged)
- [ ] Health check endpoint working
- [ ] Docker image built and tested (if using containers)
- [ ] Production configuration reviewed

## Getting Help

If you encounter issues:

1. Check [src/auth/README.md](src/auth/README.md) for detailed examples
2. Review application logs for error messages
3. Verify your authentication headers are being sent correctly
4. Test with the default implementation first to isolate issues
5. Contact Astrabit support for gateway-related issues

---

**Remember**: The only thing you need to customize is the authentication module. Everything else is already configured to work with Astrabit's copy-gateway service.

