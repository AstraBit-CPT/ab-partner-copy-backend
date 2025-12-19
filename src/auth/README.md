# Authentication Module

## Overview

This module provides a **pluggable authentication system** that allows partners to integrate their own user identification mechanisms without modifying the core proxy logic.

The module's sole purpose is to extract the `externalUserId` from incoming requests, which is then used to authenticate requests to the copy-gateway service.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Partner Request                          │
│          (with partner-specific auth headers/cookies)        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  ProxyController                             │
│              (receives Express Request)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   ProxyService                               │
│         (calls PartnerAuthProvider.getUserId())              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              IAuthProvider                            │
│          (YOUR CUSTOM IMPLEMENTATION HERE)                   │
│                                                              │
│  • Validates authentication (JWT, session, API key, etc.)   │
│  • Extracts and returns externalUserId                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 Copy Gateway Request                         │
│      (with externalUserId in X-ASTRABIT-USER-ID header)     │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Default Implementation

The default implementation (`DefaultAuthProvider`) extracts the user ID from the `X-Partner-User-Id` header:

```typescript
// Example request
GET /api/positions
Headers:
  X-Partner-User-Id: user123
```

⚠️ **This is a placeholder implementation for testing purposes only.**

### Customizing Authentication

Follow these steps to implement your own authentication:

## Step-by-Step Guide

### 1. Create Your Authentication Provider

Create a new file in this directory (e.g., `jwt-auth.provider.ts`):

```typescript
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IAuthProvider } from './auth.interface';

@Injectable()
export class JwtAuthProvider implements IAuthProvider {
  private readonly logger = new Logger(JwtAuthProvider.name);

  constructor(private readonly jwtService: JwtService) {}

  async getUserId(req: Request): Promise<string> {
    try {
      // Extract JWT from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Missing or invalid authorization header');
      }

      const token = authHeader.substring(7);
      
      // Verify and decode JWT
      const payload = await this.jwtService.verifyAsync(token);
      
      // Extract user ID from payload
      const userId = payload.sub || payload.userId;
      if (!userId) {
        throw new UnauthorizedException('User ID not found in token');
      }

      this.logger.debug(`Authenticated user: ${userId}`);
      return userId;
    } catch (error) {
      this.logger.error(`Authentication failed: ${error.message}`);
      throw new UnauthorizedException('Invalid authentication token');
    }
  }
}
```

### 2. Update the Module Configuration

Edit `auth.module.ts` to use your provider:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthProvider } from './jwt-auth.provider';
import { AUTH_PROVIDER } from './auth.constants';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwtSecret'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    {
      provide: AUTH_PROVIDER,
      useClass: JwtAuthProvider, // <-- Your custom provider
    },
  ],
  exports: [AUTH_PROVIDER],
})
export class AuthModule {}
```

### 3. Install Required Dependencies (if needed)

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
```

### 4. Add Configuration

Update your environment variables:

```env
JWT_SECRET=your-secret-key
```

Update `config/main.config.ts` to include JWT configuration:

```typescript
export default () => ({
  // ... existing config
  jwtSecret: process.env.JWT_SECRET,
});
```

## Implementation Examples

### Example 1: JWT Authentication

See the example above in Step 1.

### Example 2: Session-Based Authentication

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { IAuthProvider } from './auth.interface';

@Injectable()
export class SessionAuthProvider implements IAuthProvider {
  async getUserId(req: Request): Promise<string> {
    const session = req.session as any;
    
    if (!session || !session.userId) {
      throw new UnauthorizedException('No active session');
    }

    return session.userId;
  }
}
```

### Example 3: API Key Authentication

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { IAuthProvider } from './auth.interface';

@Injectable()
export class ApiKeyAuthProvider implements IAuthProvider {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async getUserId(req: Request): Promise<string> {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    // Validate API key and get associated user
    const user = await this.apiKeyService.validateAndGetUser(apiKey);
    
    if (!user) {
      throw new UnauthorizedException('Invalid API key');
    }

    return user.externalUserId;
  }
}
```

### Example 4: OAuth2/OIDC

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { IAuthProvider } from './auth.interface';

@Injectable()
export class OAuthAuthProvider implements IAuthProvider {
  constructor(private readonly oauthService: OAuthService) {}

  async getUserId(req: Request): Promise<string> {
    const accessToken = req.headers.authorization?.split(' ')[1];
    
    if (!accessToken) {
      throw new UnauthorizedException('Access token required');
    }

    // Validate token with OAuth provider
    const userInfo = await this.oauthService.getUserInfo(accessToken);
    
    return userInfo.sub; // Subject claim from OAuth
  }
}
```

## Testing Your Implementation

### Unit Testing

Create a test file for your provider:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthProvider } from './jwt-auth.provider';

describe('JwtAuthProvider', () => {
  let provider: JwtAuthProvider;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthProvider,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    provider = module.get<JwtAuthProvider>(JwtAuthProvider);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should extract user ID from valid JWT', async () => {
    const mockRequest = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as any;

    jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: 'user123' });

    const userId = await provider.getUserId(mockRequest);
    expect(userId).toBe('user123');
  });

  it('should throw UnauthorizedException for invalid token', async () => {
    const mockRequest = {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    } as any;

    jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('Invalid token'));

    await expect(provider.getUserId(mockRequest)).rejects.toThrow(UnauthorizedException);
  });
});
```

### Integration Testing

Test with a real request:

```bash
# Using the default implementation
curl -X GET http://localhost:3000/api/positions \
  -H "X-Partner-User-Id: user123"

# Using JWT implementation
curl -X GET http://localhost:3000/api/positions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Best Practices

### Security

1. **Always validate authentication** - Never trust client input without verification
2. **Use HTTPS** - Ensure all communication is encrypted
3. **Don't log sensitive data** - Avoid logging tokens, passwords, or API keys
4. **Implement rate limiting** - Protect against brute force attacks
5. **Use strong secrets** - Ensure JWT secrets and API keys are cryptographically secure

### Error Handling

1. **Throw UnauthorizedException** - For authentication failures
2. **Provide clear error messages** - Help clients understand what went wrong (without exposing security details)
3. **Log authentication failures** - For security monitoring and debugging

### Performance

1. **Cache validation results** - If validating tokens against external services
2. **Use connection pooling** - For database or external API calls
3. **Implement timeouts** - Prevent hanging requests

### Maintainability

1. **Keep it simple** - Only implement what you need
2. **Document your implementation** - Explain any non-obvious logic
3. **Write tests** - Ensure your authentication works correctly
4. **Use TypeScript strictly** - Avoid `any` types

## Troubleshooting

### Common Issues

#### "User authentication required" error

**Cause**: The authentication provider couldn't extract a user ID from the request.

**Solution**: 
- Verify the request includes the expected authentication headers/cookies
- Check your provider's `getUserId` implementation
- Review logs for detailed error messages

#### "Invalid authentication token" error

**Cause**: Token validation failed (expired, invalid signature, etc.)

**Solution**:
- Verify the token is valid and not expired
- Check JWT secret configuration
- Ensure token format matches your implementation

#### Provider not being used

**Cause**: Module configuration issue.

**Solution**:
- Verify `auth.module.ts` is correctly configured
- Ensure `AuthModule` is imported in `app.module.ts`
- Check that the provider is exported from the module

## Support

For questions or issues:

1. Check this README for implementation examples
2. Review the interface definition in `auth.interface.ts`
3. Examine the default implementation in `default-auth.provider.ts`
4. Check application logs for detailed error messages

## Files in This Module

- **`auth.interface.ts`** - Interface definition (contract)
- **`auth.constants.ts`** - Injection token
- **`auth.module.ts`** - Module configuration (customize this)
- **`default-auth.provider.ts`** - Default implementation (replace this)
- **`index.ts`** - Public exports
- **`README.md`** - This documentation

## Key Points

✅ **DO**:
- Implement the `IAuthProvider` interface
- Throw `UnauthorizedException` for auth failures
- Log authentication events (without sensitive data)
- Write tests for your implementation
- Keep the implementation focused on user identification

❌ **DON'T**:
- Modify files outside this directory
- Log sensitive data (tokens, passwords, keys)
- Make external API calls without timeouts
- Use `any` types unnecessarily
- Overcomplicate the implementation

---

**Remember**: This module has one job - extract the external user ID from incoming requests. Keep it simple, secure, and well-tested.

