import {Module} from '@nestjs/common';
import {DefaultAuthProvider} from './default-auth.provider';
import {AUTH_PROVIDER} from './auth.constants';

/**
 * Authentication Module
 *
 * This module provides the authentication mechanism for identifying external users.
 * Partners should customize this module to integrate their own authentication system.
 *
 * HOW TO CUSTOMIZE:
 * ================
 *
 * 1. Create your own authentication provider implementing IAuthProvider
 *    Example: jwt-auth.provider.ts, session-auth.provider.ts, etc.
 *
 * 2. Replace DefaultAuthProvider with your implementation in the providers array below
 *
 * 3. Add any additional dependencies your provider needs (JwtModule, PassportModule, etc.)
 */
@Module({
  imports: [
    // Add your authentication dependencies here (JwtModule, PassportModule, etc.)
  ],
  providers: [
    {
      provide: AUTH_PROVIDER,
      useClass: DefaultAuthProvider, // Replace with your custom provider
    },
  ],
  exports: [AUTH_PROVIDER],
})
export class AuthModule {}
