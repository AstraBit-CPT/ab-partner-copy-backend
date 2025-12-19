/**
 * API Key Authentication Provider Example
 *
 * This is a complete example of implementing API key-based authentication.
 * Copy this file and customize it for your needs.
 *
 * ⚠️ NOTE: This file is an EXAMPLE only.
 *
 * To use this example:
 * 1. Copy this file to api-key-auth.provider.ts (remove .example.ts)
 * 2. Implement your API key validation service
 * 3. Update partner-auth.module.ts to use this provider
 */

import {Injectable, Logger, UnauthorizedException} from '@nestjs/common';
import {Request} from 'express';
import {IAuthProvider} from '../auth.interface';

/**
 * Interface for API key validation service
 * Implement this based on your API key storage (database, cache, etc.)
 */
interface IApiKeyService {
  validateAndGetUserId(apiKey: string): Promise<string | null>;
}

@Injectable()
export class ApiKeyAuthProvider implements IAuthProvider {
  private readonly logger = new Logger(ApiKeyAuthProvider.name);

  constructor() {
    // Inject your API key validation service here
    // private readonly apiKeyService: IApiKeyService,
  }

  async getUserId(req: Request): Promise<string> {
    try {
      // Extract API key from header
      const apiKey = this.extractApiKey(req);
      if (!apiKey) {
        throw new UnauthorizedException('API key required');
      }

      // Validate API key and get associated user ID
      const userId = await this.validateApiKey(apiKey);
      if (!userId) {
        throw new UnauthorizedException('Invalid API key');
      }

      this.logger.debug(`Authenticated user via API key: ${userId}`);
      return userId;
    } catch (error) {
      this.logger.error(`API key authentication failed: ${error.message}`);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Extracts API key from request
   * Supports multiple header formats
   */
  private extractApiKey(req: Request): string | null {
    // Option 1: X-API-Key header
    const apiKeyHeader = req.headers['x-api-key'] as string;
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    // Option 2: Authorization header with "ApiKey" scheme
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('ApiKey ')) {
      return authHeader.substring(7);
    }

    // Option 3: Query parameter (less secure, not recommended for production)
    const apiKeyQuery = req.query.apiKey as string;
    if (apiKeyQuery) {
      this.logger.warn('API key provided in query parameter - not recommended');
      return apiKeyQuery;
    }

    return null;
  }

  /**
   * Validates API key and returns associated user ID
   * Implement this based on your storage mechanism
   */
  private async validateApiKey(apiKey: string): Promise<string | null> {
    // Example implementation using a service
    // return await this.apiKeyService.validateAndGetUserId(apiKey);

    // Example implementation using direct database query
    // const apiKeyRecord = await this.databaseService.findApiKey(apiKey);
    // if (!apiKeyRecord || !apiKeyRecord.isActive) {
    //   return null;
    // }
    // return apiKeyRecord.userId;

    // Example implementation using cache
    // const cachedUserId = await this.cacheService.get(`apikey:${apiKey}`);
    // if (cachedUserId) {
    //   return cachedUserId;
    // }
    // const userId = await this.databaseService.validateApiKey(apiKey);
    // if (userId) {
    //   await this.cacheService.set(`apikey:${apiKey}`, userId, 3600);
    // }
    // return userId;

    // Placeholder - replace with your implementation
    throw new Error('API key validation not implemented');
  }
}

/**
 * Example API Key Service implementation:
 *
 * import { Injectable } from '@nestjs/common';
 * import { InjectRepository } from '@nestjs/typeorm';
 * import { Repository } from 'typeorm';
 * import { ApiKey } from './entities/api-key.entity';
 *
 * @Injectable()
 * export class ApiKeyService implements IApiKeyService {
 *   constructor(
 *     @InjectRepository(ApiKey)
 *     private readonly apiKeyRepository: Repository<ApiKey>,
 *   ) {}
 *
 *   async validateAndGetUserId(apiKey: string): Promise<string | null> {
 *     const record = await this.apiKeyRepository.findOne({
 *       where: { key: apiKey, isActive: true },
 *       relations: ['user'],
 *     });
 *
 *     if (!record) {
 *       return null;
 *     }
 *
 *     // Update last used timestamp
 *     record.lastUsedAt = new Date();
 *     await this.apiKeyRepository.save(record);
 *
 *     return record.user.externalUserId;
 *   }
 * }
 */

/**
 * Module configuration to use this provider:
 *
 * import { Module } from '@nestjs/common';
 * import { ApiKeyAuthProvider } from './api-key-auth.provider';
 * import { ApiKeyService } from './api-key.service';
 * import { AUTH_PROVIDER } from './auth.constants';
 *
 * @Module({
 *   providers: [
 *     ApiKeyService,
 *     {
 *       provide: AUTH_PROVIDER,
 *       useClass: ApiKeyAuthProvider,
 *     },
 *   ],
 *   exports: [AUTH_PROVIDER],
 * })
 * export class AuthModule {}
 */
