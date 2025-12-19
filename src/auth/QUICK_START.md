# Quick Start - Authentication

## 5-Minute Setup

### Step 1: Choose Your Authentication Method

Pick the example that matches your system:

- **JWT** → `examples/jwt-auth.provider.example.ts`
- **Session** → `examples/session-auth.provider.example.ts`
- **API Key** → `examples/api-key-auth.provider.example.ts`
- **Custom** → Implement `IAuthProvider` interface

### Step 2: Install Dependencies (if needed)

```bash
# For JWT
npm install @nestjs/jwt

# For Session
npm install express-session @types/express-session

# For API Key (no dependencies needed)
```

### Step 3: Create Your Provider

```bash
# Copy the example you chose
cp src/auth/examples/jwt-auth.provider.example.ts \
   src/auth/jwt-auth.provider.ts

# Edit it for your needs
```

### Step 4: Update Module Configuration

Edit `src/auth/auth.module.ts`:

```typescript
import { JwtAuthProvider } from './jwt-auth.provider'; // Your provider

@Module({
  imports: [
    // Add any dependencies your provider needs
    JwtModule.register({ secret: process.env.JWT_SECRET }),
  ],
  providers: [
    {
      provide: AUTH_PROVIDER,
      useClass: JwtAuthProvider, // ← Change this line
    },
  ],
  exports: [AUTH_PROVIDER],
})
export class AuthModule {}
```

### Step 5: Test

```bash
# Start the service
npm run start:dev

# Test your authentication
curl -X GET http://localhost:3000/api/positions \
  -H "Authorization: Bearer your-token"
```

## The Interface You Need to Implement

```typescript
export interface IAuthProvider {
  getUserId(req: Request): Promise<string>;
}
```

That's it! One method that extracts the user ID from the request.

## Minimal Example

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { IAuthProvider } from './auth.interface';

@Injectable()
export class MyAuthProvider implements IAuthProvider {
  async getUserId(req: Request): Promise<string> {
    // Your logic here
    const userId = extractUserIdSomehow(req);
    
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    return userId;
  }
}
```

## Common Patterns

### Extract from JWT

```typescript
const token = req.headers.authorization?.split(' ')[1];
const payload = await this.jwtService.verifyAsync(token);
return payload.userId;
```

### Extract from Session

```typescript
if (!req.session?.userId) {
  throw new UnauthorizedException('No session');
}
return req.session.userId;
```

### Extract from Header

```typescript
const userId = req.headers['x-user-id'] as string;
if (!userId) {
  throw new UnauthorizedException('Missing user ID header');
}
return userId;
```

### Extract from API Key

```typescript
const apiKey = req.headers['x-api-key'] as string;
const user = await this.validateApiKey(apiKey);
return user.userId;
```

## Testing Your Implementation

### Unit Test

```typescript
const mockReq = { headers: { authorization: 'Bearer token' } };
const userId = await provider.getUserId(mockReq as any);
expect(userId).toBe('expected-user-id');
```

### Integration Test

```bash
curl -X GET http://localhost:3000/api/positions \
  -H "Your-Auth-Header: value"
```

## Troubleshooting

### "User authentication required" error

→ Your `getUserId()` method is throwing an exception. Check:
- Is the auth header/cookie present?
- Is the token/session valid?
- Is your validation logic correct?

### "Cannot find module" error

→ Install the required dependency:
```bash
npm install @nestjs/jwt  # or whatever module is missing
```

### Build errors in examples/

→ This is normal. Example files are excluded from build. They're just templates.

## Need More Details?

- **Full Documentation**: [README.md](./README.md)
- **Examples**: [examples/README.md](./examples/README.md)
- **Partner Guide**: [../../PARTNER_CUSTOMIZATION.md](../../PARTNER_CUSTOMIZATION.md)

## Key Points

✅ Only implement ONE method: `getUserId(req: Request): Promise<string>`
✅ Throw `UnauthorizedException` if authentication fails
✅ Return the user ID as a string
✅ Don't modify any other files in the repo
✅ Test thoroughly before deploying

---

**That's it!** You're ready to integrate your authentication system.

