/**
 * Session-Based Authentication Provider Example
 *
 * This is a complete example of implementing session-based authentication.
 * Copy this file and customize it for your needs.
 *
 * ⚠️ NOTE: This file is an EXAMPLE only and may show lint errors until dependencies are installed.
 *
 * To use this example:
 * 1. Install dependencies: npm install express-session @types/express-session
 * 2. Copy this file to session-auth.provider.ts (remove .example.ts)
 * 3. Configure session middleware in main.ts
 * 4. Update partner-auth.module.ts to use this provider
 */

import {Injectable, Logger, UnauthorizedException} from '@nestjs/common';
import {Request} from 'express';
import {IAuthProvider} from '../auth.interface';

/**
 * Extend Express Session interface to include your custom session data
 */
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    externalUserId?: string;
    // Add other session fields you use
  }
}

@Injectable()
export class SessionAuthProvider implements IAuthProvider {
  private readonly logger = new Logger(SessionAuthProvider.name);

  async getUserId(req: Request): Promise<string> {
    try {
      // Check if session exists
      if (!req.session) {
        this.logger.warn('No session found in request');
        throw new UnauthorizedException('Session not initialized');
      }

      // Extract user ID from session
      const userId = req.session.externalUserId || req.session.userId;

      if (!userId) {
        this.logger.warn('No user ID found in session');
        throw new UnauthorizedException('User not authenticated. Please log in.');
      }

      this.logger.debug(`Authenticated user from session: ${userId}`);
      return userId;
    } catch (error) {
      this.logger.error(`Session authentication failed: ${error.message}`);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Authentication failed');
    }
  }
}

/**
 * Session middleware configuration in main.ts:
 *
 * import * as session from 'express-session';
 * import * as RedisStore from 'connect-redis';
 * import { createClient } from 'redis';
 *
 * async function bootstrap() {
 *   const app = await NestFactory.create(AppModule);
 *
 *   // Configure Redis client (optional, for production)
 *   const redisClient = createClient({
 *     url: process.env.REDIS_URL,
 *   });
 *   await redisClient.connect();
 *
 *   // Configure session middleware
 *   app.use(
 *     session({
 *       store: new RedisStore({ client: redisClient }), // Use Redis in production
 *       secret: process.env.SESSION_SECRET,
 *       resave: false,
 *       saveUninitialized: false,
 *       cookie: {
 *         secure: process.env.NODE_ENV === 'production', // HTTPS only in production
 *         httpOnly: true,
 *         maxAge: 24 * 60 * 60 * 1000, // 24 hours
 *       },
 *     }),
 *   );
 *
 *   await app.listen(3000);
 * }
 */

/**
 * Module configuration to use this provider:
 *
 * import { Module } from '@nestjs/common';
 * import { SessionAuthProvider } from './session-auth.provider';
 * import { AUTH_PROVIDER } from './auth.constants';
 *
 * @Module({
 *   providers: [
 *     {
 *       provide: AUTH_PROVIDER,
 *       useClass: SessionAuthProvider,
 *     },
 *   ],
 *   exports: [AUTH_PROVIDER],
 * })
 * export class AuthModule {}
 */
