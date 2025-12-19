/**
 * JWT Authentication Provider Example
 *
 * This is a complete example of implementing JWT-based authentication.
 * Copy this file and customize it for your needs.
 *
 * ⚠️ NOTE: This file is an EXAMPLE only and will show lint errors until dependencies are installed.
 *
 * To use this example:
 * 1. Install dependencies: npm install @nestjs/jwt
 * 2. Copy this file to jwt-auth.provider.ts (remove .example.ts)
 * 3. Update partner-auth.module.ts to use this provider
 * 4. Configure JWT_SECRET in your environment
 */

import {Injectable, Logger, UnauthorizedException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {JwtService} from '@nestjs/jwt';
import {Request} from 'express';
import {IAuthProvider} from '../auth.interface';

interface JwtPayload {
  sub?: string; // Standard JWT subject claim
  userId?: string; // Alternative user ID field
  externalUserId?: string; // Direct external user ID
  // Add other fields your JWT contains
}

@Injectable()
export class JwtAuthProvider implements IAuthProvider {
  private readonly logger = new Logger(JwtAuthProvider.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async getUserId(req: Request): Promise<string> {
    try {
      // Extract JWT from Authorization header
      const token = this.extractTokenFromHeader(req);
      if (!token) {
        throw new UnauthorizedException('Missing authorization token');
      }

      // Verify and decode JWT
      const payload = await this.verifyToken(token);

      // Extract user ID from payload
      const userId = this.extractUserIdFromPayload(payload);
      if (!userId) {
        throw new UnauthorizedException('User ID not found in token');
      }

      this.logger.debug(`Authenticated user: ${userId}`);
      return userId;
    } catch (error) {
      this.logger.error(`Authentication failed: ${error.message}`);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Handle JWT-specific errors
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }

      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Extracts JWT token from Authorization header
   */
  private extractTokenFromHeader(req: Request): string | null {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return null;
    }

    // Support both "Bearer <token>" and just "<token>"
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return authHeader;
  }

  /**
   * Verifies JWT token and returns payload
   */
  private async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('jwtSecret'),
      });
    } catch (error) {
      throw error; // Re-throw to be handled by caller
    }
  }

  /**
   * Extracts user ID from JWT payload
   * Customize this based on your JWT structure
   */
  private extractUserIdFromPayload(payload: JwtPayload): string | null {
    // Try different common fields where user ID might be stored
    return payload.externalUserId || payload.userId || payload.sub || null;
  }
}

/**
 * Module configuration to use this provider:
 *
 * import { Module } from '@nestjs/common';
 * import { JwtModule } from '@nestjs/jwt';
 * import { ConfigModule, ConfigService } from '@nestjs/config';
 * import { JwtAuthProvider } from './jwt-auth.provider';
 * import { AUTH_PROVIDER } from './auth.constants';
 *
 * @Module({
 *   imports: [
 *     JwtModule.registerAsync({
 *       imports: [ConfigModule],
 *       useFactory: (configService: ConfigService) => ({
 *         secret: configService.get<string>('jwtSecret'),
 *         signOptions: { expiresIn: '1h' },
 *       }),
 *       inject: [ConfigService],
 *     }),
 *   ],
 *   providers: [
 *     {
 *       provide: AUTH_PROVIDER,
 *       useClass: JwtAuthProvider,
 *     },
 *   ],
 *   exports: [AUTH_PROVIDER],
 * })
 * export class AuthModule {}
 */
