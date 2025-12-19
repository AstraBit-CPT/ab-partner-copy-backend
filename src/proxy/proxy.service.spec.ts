import {Test, TestingModule} from '@nestjs/testing';
import {ConfigService} from '@nestjs/config';
import {ProxyService} from './proxy.service';
import {AUTH_PROVIDER, IAuthProvider} from '../auth';
import {Request} from 'express';
import {UnauthorizedException} from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ProxyService', () => {
  let service: ProxyService;
  let configService: ConfigService;
  let authProvider: IAuthProvider;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        copyGatewayUrl: 'http://localhost:3360',
        astrabitApiKey: 'test-api-key',
        astrabitApiSecret: 'test-api-secret',
        apiVersioning: {
          supportedVersions: ['v1', 'v2'],
          defaultVersion: 'v1',
          gatewayVersionMap: {v1: 'v1', v2: 'v2'},
        },
      };
      return config[key];
    }),
  };

  const mockAuthProvider = {
    getUserId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxyService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AUTH_PROVIDER,
          useValue: mockAuthProvider,
        },
      ],
    }).compile();

    service = module.get<ProxyService>(ProxyService);
    configService = module.get<ConfigService>(ConfigService);
    authProvider = module.get<IAuthProvider>(AUTH_PROVIDER);

    // Setup axios mock
    mockedAxios.create = jest.fn().mockReturnValue({
      request: jest.fn(),
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSupportedVersions', () => {
    it('should return supported versions from config', () => {
      const versions = service.getSupportedVersions();
      expect(versions).toEqual(['v1', 'v2']);
    });

    it('should return default v1 if config is missing', () => {
      const mockEmptyConfigService = {
        get: jest.fn(() => undefined),
      };
      const newService = new ProxyService(mockEmptyConfigService as any, authProvider);
      const versions = newService.getSupportedVersions();
      expect(versions).toEqual(['v1']);
    });
  });

  describe('resolveGatewayVersion', () => {
    it('should resolve gateway version from map', () => {
      const gatewayVersion = service.resolveGatewayVersion('v1');
      expect(gatewayVersion).toBe('v1');
    });

    it('should return default version if mapping not found', () => {
      const gatewayVersion = service.resolveGatewayVersion('v99' as any);
      expect(gatewayVersion).toBe('v1');
    });
  });

  describe('proxyRequest', () => {
    let mockRequest: Partial<Request>;
    let mockAxiosInstance: any;

    beforeEach(() => {
      mockRequest = {
        headers: {
          'content-type': 'application/json',
        },
      } as Partial<Request>;

      mockAxiosInstance = {
        request: jest.fn().mockResolvedValue({
          data: {success: true},
          status: 200,
          headers: {'content-type': 'application/json'},
        }),
      };

      mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);
      service = new ProxyService(configService, authProvider);
    });

    it('should successfully proxy a GET request', async () => {
      mockAuthProvider.getUserId.mockResolvedValue('user123');

      const result = await service.proxyRequest('GET', '/v1/copy-bots', {}, {}, {}, mockRequest as Request);

      expect(result.status).toBe(200);
      expect(result.data).toEqual({success: true});
      expect(mockAuthProvider.getUserId).toHaveBeenCalledWith(mockRequest);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'http://localhost:3360/v1/copy-bots',
          data: {},
        })
      );
    });

    it('should successfully proxy a POST request with body', async () => {
      mockAuthProvider.getUserId.mockResolvedValue('user456');
      const body = {name: 'Test Bot', strategy: 'aggressive'};

      const result = await service.proxyRequest('POST', '/v1/copy-bots', {}, {}, body, mockRequest as Request);

      expect(result.status).toBe(200);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'http://localhost:3360/v1/copy-bots',
          data: body,
        })
      );
    });

    it('should include query parameters in the URL', async () => {
      mockAuthProvider.getUserId.mockResolvedValue('user789');
      const query = {limit: '10', offset: '0'};

      await service.proxyRequest('GET', '/v1/copy-bots', {}, query, {}, mockRequest as Request);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3360/v1/copy-bots?limit=10&offset=0',
        })
      );
    });

    it('should add authentication headers', async () => {
      mockAuthProvider.getUserId.mockResolvedValue('user123');

      await service.proxyRequest('GET', '/v1/copy-bots', {}, {}, {}, mockRequest as Request);

      const callArgs = mockAxiosInstance.request.mock.calls[0][0];
      expect(callArgs.headers).toHaveProperty('X-ASTRABIT-API-KEY', 'test-api-key');
      expect(callArgs.headers).toHaveProperty('X-ASTRABIT-SIGNATURE');
      expect(callArgs.headers).toHaveProperty('X-ASTRABIT-TIMESTAMP');
      expect(callArgs.headers).toHaveProperty('X-ASTRABIT-RECV-WINDOW');
    });

    it('should encode external user ID in base64', async () => {
      mockAuthProvider.getUserId.mockResolvedValue('user123');

      await service.proxyRequest('GET', '/v1/copy-bots', {}, {}, {}, mockRequest as Request);

      const callArgs = mockAxiosInstance.request.mock.calls[0][0];
      const expectedBase64 = Buffer.from('user123').toString('base64');
      expect(callArgs.headers).toHaveProperty('X-ASTRABIT-USER-ID', expectedBase64);
    });

    it('should handle empty external user ID', async () => {
      mockAuthProvider.getUserId.mockResolvedValue('');

      await service.proxyRequest('GET', '/v1/copy-bots', {}, {}, {}, mockRequest as Request);

      const callArgs = mockAxiosInstance.request.mock.calls[0][0];
      expect(callArgs.headers).toHaveProperty('X-ASTRABIT-USER-ID', '');
    });

    it('should use custom recv window from headers', async () => {
      mockAuthProvider.getUserId.mockResolvedValue('user123');
      const headers = {'x-astrabit-recv-window': '10000'};

      await service.proxyRequest('GET', '/v1/copy-bots', headers, {}, {}, mockRequest as Request);

      const callArgs = mockAxiosInstance.request.mock.calls[0][0];
      expect(callArgs.headers).toHaveProperty('X-ASTRABIT-RECV-WINDOW', '10000');
    });

    it('should use default recv window if not provided', async () => {
      mockAuthProvider.getUserId.mockResolvedValue('user123');

      await service.proxyRequest('GET', '/v1/copy-bots', {}, {}, {}, mockRequest as Request);

      const callArgs = mockAxiosInstance.request.mock.calls[0][0];
      expect(callArgs.headers).toHaveProperty('X-ASTRABIT-RECV-WINDOW', '5000');
    });

    it('should generate valid HMAC signature', async () => {
      mockAuthProvider.getUserId.mockResolvedValue('user123');

      await service.proxyRequest('GET', '/v1/copy-bots', {}, {}, {}, mockRequest as Request);

      const callArgs = mockAxiosInstance.request.mock.calls[0][0];
      const signature = callArgs.headers['X-ASTRABIT-SIGNATURE'];
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64); // SHA256 hex is 64 characters
    });

    it('should handle axios errors', async () => {
      mockAuthProvider.getUserId.mockResolvedValue('user123');
      const error = new Error('Network error');
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(service.proxyRequest('GET', '/v1/copy-bots', {}, {}, {}, mockRequest as Request)).rejects.toThrow('Network error');
    });

    it('should handle authentication provider errors', async () => {
      mockAuthProvider.getUserId.mockRejectedValue(new UnauthorizedException('Invalid token'));

      await expect(service.proxyRequest('GET', '/v1/copy-bots', {}, {}, {}, mockRequest as Request)).rejects.toThrow('Invalid token');
    });

    it('should preserve content-type header', async () => {
      mockAuthProvider.getUserId.mockResolvedValue('user123');
      const headers = {'content-type': 'application/xml'};

      await service.proxyRequest('POST', '/v1/copy-bots', headers, {}, {}, mockRequest as Request);

      const callArgs = mockAxiosInstance.request.mock.calls[0][0];
      expect(callArgs.headers).toHaveProperty('Content-Type', 'application/xml');
    });

    it('should use default content-type if not provided', async () => {
      mockAuthProvider.getUserId.mockResolvedValue('user123');

      await service.proxyRequest('POST', '/v1/copy-bots', {}, {}, {}, mockRequest as Request);

      const callArgs = mockAxiosInstance.request.mock.calls[0][0];
      expect(callArgs.headers).toHaveProperty('Content-Type', 'application/json');
    });

    it('should handle empty body', async () => {
      mockAuthProvider.getUserId.mockResolvedValue('user123');

      await service.proxyRequest('GET', '/v1/copy-bots', {}, {}, {}, mockRequest as Request);

      const callArgs = mockAxiosInstance.request.mock.calls[0][0];
      expect(callArgs.data).toEqual({});
    });

    it('should handle complex query parameters', async () => {
      mockAuthProvider.getUserId.mockResolvedValue('user123');
      const query = {
        filter: 'active',
        sort: 'created_at',
        order: 'desc',
        tags: ['crypto', 'forex'],
      };

      await service.proxyRequest('GET', '/v1/copy-bots', {}, query, {}, mockRequest as Request);

      const callArgs = mockAxiosInstance.request.mock.calls[0][0];
      expect(callArgs.url).toContain('filter=active');
      expect(callArgs.url).toContain('sort=created_at');
      expect(callArgs.url).toContain('order=desc');
    });
  });
});
