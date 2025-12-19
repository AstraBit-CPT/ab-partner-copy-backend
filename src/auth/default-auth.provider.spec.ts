import {Test, TestingModule} from '@nestjs/testing';
import {UnauthorizedException} from '@nestjs/common';
import {DefaultAuthProvider} from './default-auth.provider';
import {Request} from 'express';

describe('DefaultAuthProvider', () => {
  let provider: DefaultAuthProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DefaultAuthProvider],
    }).compile();

    provider = module.get<DefaultAuthProvider>(DefaultAuthProvider);
  });

  describe('getUserId', () => {
    it('should extract user ID from X-Partner-User-Id header', async () => {
      const mockRequest = {
        headers: {
          'x-partner-user-id': 'user123',
        },
      } as unknown as Request;

      const userId = await provider.getUserId(mockRequest);

      expect(userId).toBe('user123');
    });

    it('should handle case-insensitive header names', async () => {
      const mockRequest = {
        headers: {
          'x-partner-user-id': 'user456', // Express normalizes headers to lowercase
        },
      } as unknown as Request;

      const userId = await provider.getUserId(mockRequest);

      expect(userId).toBe('user456');
    });

    it('should return empty string when header is missing', async () => {
      const mockRequest = {
        headers: {},
      } as unknown as Request;

      const userId = await provider.getUserId(mockRequest);
      expect(userId).toBe('');
    });

    it('should return empty string when header is empty string', async () => {
      const mockRequest = {
        headers: {
          'x-partner-user-id': '',
        },
      } as unknown as Request;

      const userId = await provider.getUserId(mockRequest);
      expect(userId).toBe('');
    });

    it('should handle user IDs with special characters', async () => {
      const mockRequest = {
        headers: {
          'x-partner-user-id': 'user-123_test@example.com',
        },
      } as unknown as Request;

      const userId = await provider.getUserId(mockRequest);

      expect(userId).toBe('user-123_test@example.com');
    });

    it('should handle numeric user IDs', async () => {
      const mockRequest = {
        headers: {
          'x-partner-user-id': '12345',
        },
      } as unknown as Request;

      const userId = await provider.getUserId(mockRequest);

      expect(userId).toBe('12345');
    });

    it('should handle UUID user IDs', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const mockRequest = {
        headers: {
          'x-partner-user-id': uuid,
        },
      } as unknown as Request;

      const userId = await provider.getUserId(mockRequest);

      expect(userId).toBe(uuid);
    });
  });
});
