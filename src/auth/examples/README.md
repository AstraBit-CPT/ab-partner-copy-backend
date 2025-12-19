# Authentication Provider Examples

This directory contains complete, working examples of different authentication strategies that partners can use as templates.

## Available Examples

### 1. JWT Authentication (`jwt-auth.provider.example.ts`)

**Use when**: You have a JWT-based authentication system.

**Dependencies**: `@nestjs/jwt`

**Features**:
- Extracts JWT from Authorization header
- Verifies token signature
- Handles token expiration
- Extracts user ID from JWT payload

### 2. Session Authentication (`session-auth.provider.example.ts`)

**Use when**: You use Express sessions for authentication.

**Dependencies**: `express-session`, `@types/express-session`

**Features**:
- Extracts user ID from Express session
- Supports Redis-backed sessions
- Session validation

### 3. API Key Authentication (`api-key-auth.provider.example.ts`)

**Use when**: You use API keys for authentication.

**Dependencies**: None (implement your own validation service)

**Features**:
- Multiple header format support
- Extensible validation logic
- Caching support example

## How to Use These Examples

1. **Choose the example** that matches your authentication system
2. **Install required dependencies** (if any)
3. **Copy the example file** and remove `.example.ts` extension
4. **Customize the implementation** for your specific needs
5. **Update `auth.module.ts`** to use your provider
6. **Test thoroughly** with your authentication system

## Example: Using JWT Authentication

```bash
# 1. Install dependencies
npm install @nestjs/jwt

# 2. Copy the example
cp src/auth/examples/jwt-auth.provider.example.ts src/auth/jwt-auth.provider.ts

# 3. Edit auth.module.ts
# Replace DefaultAuthProvider with JwtAuthProvider

# 4. Configure environment
echo "JWT_SECRET=your-secret-key" >> .env

# 5. Test
npm run start:dev
```

## Customization Tips

### Extracting User ID

All examples show how to extract the user ID from different sources. Customize the extraction logic based on where your user ID is stored:

```typescript
// From JWT payload
const userId = payload.sub || payload.userId;

// From session
const userId = req.session.userId;

// From database
const userId = await this.userService.getUserIdByApiKey(apiKey);
```

### Error Handling

Always throw `UnauthorizedException` for authentication failures:

```typescript
if (!userId) {
  throw new UnauthorizedException('User not authenticated');
}
```

### Logging

Log authentication events (without sensitive data):

```typescript
this.logger.debug(`Authenticated user: ${userId}`);
this.logger.warn('Authentication failed: invalid token');
```

### Validation

Add any additional validation your system requires:

```typescript
// Check if user is active
if (!user.isActive) {
  throw new UnauthorizedException('User account is inactive');
}

// Check permissions
if (!user.hasPermission('copy-trading')) {
  throw new UnauthorizedException('User not authorized for copy trading');
}
```

## Testing Your Implementation

Create a test file for your provider:

```typescript
// jwt-auth.provider.spec.ts
import { Test } from '@nestjs/testing';
import { JwtAuthProvider } from './jwt-auth.provider';

describe('JwtAuthProvider', () => {
  let provider: JwtAuthProvider;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [JwtAuthProvider, /* mock dependencies */],
    }).compile();

    provider = module.get(JwtAuthProvider);
  });

  it('should extract user ID from valid JWT', async () => {
    const req = { headers: { authorization: 'Bearer valid-token' } };
    const userId = await provider.getUserId(req as any);
    expect(userId).toBe('expected-user-id');
  });

  it('should throw for invalid token', async () => {
    const req = { headers: { authorization: 'Bearer invalid' } };
    await expect(provider.getUserId(req as any)).rejects.toThrow();
  });
});
```

## Need Help?

- Review the main [README.md](../README.md) for detailed documentation
- Check the [IAuthProvider interface](../auth.interface.ts) for the contract
- Look at the [DefaultAuthProvider](../default-auth.provider.ts) for a simple example

## Note on Lint Errors

These example files may show lint errors because they import packages that aren't installed by default. This is expected. Once you install the required dependencies and copy the file for use, the errors will resolve.

