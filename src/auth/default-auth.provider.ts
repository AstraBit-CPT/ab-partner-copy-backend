import {Injectable, Logger} from '@nestjs/common';
import {Request} from 'express';
import {IAuthProvider} from './auth.interface';

/**
 * Default implementation of authentication.
 *
 * !!! THIS IS A PLACEHOLDER IMPLEMENTATION !!!
 *
 * Partners should replace this file with their own authentication logic.
 * This default implementation extracts user ID from a custom header for demonstration purposes.
 *
 * To implement your own authentication:
 * 1. Create a new file (e.g., jwt-auth.provider.ts)
 * 2. Implement the IAuthProvider interface
 * 3. Update auth.module.ts to use your provider instead of this one
 *
 * @example
 * // In your custom implementation:
 * import { Injectable } from '@nestjs/common';
 * import { IAuthProvider } from './auth.interface';
 *
 * @Injectable()
 * export class JwtAuthProvider implements IAuthProvider {
 *   async getUserId(req: Request): Promise<string> {
 *     // Your JWT validation logic here
 *     const token = req.headers.authorization?.split(' ')[1];
 *     const decoded = this.jwtService.verify(token);
 *     return decoded.userId;
 *   }
 * }
 */
@Injectable()
export class DefaultAuthProvider implements IAuthProvider {
  private readonly logger = new Logger(DefaultAuthProvider.name);

  /**
   * Default implementation: extracts user ID from X-Partner-User-Id header.
   *
   * !!!️ Replace this with your actual authentication logic !!!
   */
  async getUserId(req: Request): Promise<string> {
    // Example: Extract from custom header (case-insensitive)
    const userId = req.headers['x-partner-user-id'] as string;

    if (!userId) {
      this.logger.warn('No user ID found in request headers');
      return ''; // Return empty string for optional authentication
    }

    this.logger.debug(`Extracted user ID: ${userId}`);
    return userId;
  }
}
