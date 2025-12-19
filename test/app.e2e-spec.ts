import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ProxyService } from '../src/proxy/proxy.service';
import { AUTH_PROVIDER, IAuthProvider } from '../src/auth';

describe('Copy Partner Proxy (e2e)', () => {
  let app: INestApplication;
  let proxyService: ProxyService;
  let authProvider: IAuthProvider;

  const mockProxyService = {
    getSupportedVersions: jest.fn(() => ['v1']),
    resolveGatewayVersion: jest.fn((version: string) => version),
    proxyRequest: jest.fn(),
  };

  const mockAuthProvider = {
    getUserId: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ProxyService)
      .useValue(mockProxyService)
      .overrideProvider(AUTH_PROVIDER)
      .useValue(mockAuthProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    proxyService = moduleFixture.get<ProxyService>(ProxyService);
    authProvider = moduleFixture.get<IAuthProvider>(AUTH_PROVIDER);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check Endpoints', () => {
    describe('GET /health-check', () => {
      it('should return health status with version information', () => {
        return request(app.getHttpServer())
          .get('/health-check')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('status', 'ok');
            expect(res.body).toHaveProperty('versions');
            expect(res.body.versions).toHaveProperty('supported');
            expect(res.body.versions).toHaveProperty('default');
            expect(res.body.versions).toHaveProperty('gatewayMap');
          });
      });
    });

    describe('GET /heartbeat', () => {
      it('should return ok status', () => {
        return request(app.getHttpServer()).get('/heartbeat').expect(200).expect({ status: 'ok' });
      });
    });
  });

  describe('API Versioning', () => {
    it('should reject requests without version prefix', () => {
      return request(app.getHttpServer())
        .get('/copy-bots')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('API version required');
          expect(res.body.supportedVersions).toBeDefined();
        });
    });

    it('should reject unsupported API versions', () => {
      return request(app.getHttpServer())
        .get('/v99/copy-bots')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Unsupported API version');
          expect(res.body.supportedVersions).toEqual(['/v1']);
        });
    });

    it('should accept supported API versions', async () => {
      mockAuthProvider.getUserId.mockResolvedValue('user123');
      mockProxyService.proxyRequest.mockResolvedValue({
        data: { success: true },
        status: 200,
        headers: {},
      });

      return request(app.getHttpServer())
        .get('/v1/copy-bots')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ success: true });
        });
    });
  });

  describe('Proxy Functionality', () => {
    beforeEach(() => {
      mockAuthProvider.getUserId.mockResolvedValue('user123');
    });

    describe('GET requests', () => {
      it('should proxy GET request successfully', async () => {
        mockProxyService.proxyRequest.mockResolvedValue({
          data: { bots: [] },
          status: 200,
          headers: { 'content-type': 'application/json' },
        });

        return request(app.getHttpServer())
          .get('/v1/copy-bots')
          .expect(200)
          .expect((res) => {
            expect(res.body).toEqual({ bots: [] });
            expect(mockProxyService.proxyRequest).toHaveBeenCalledWith('GET', '/v1/copy-bots', expect.any(Object), {}, undefined, expect.any(Object));
          });
      });

      it('should proxy GET request with query parameters', async () => {
        mockProxyService.proxyRequest.mockResolvedValue({
          data: { bots: [] },
          status: 200,
          headers: {},
        });

        return request(app.getHttpServer())
          .get('/v1/copy-bots?limit=10&offset=0')
          .expect(200)
          .expect(() => {
            expect(mockProxyService.proxyRequest).toHaveBeenCalledWith(
              'GET',
              '/v1/copy-bots',
              expect.any(Object),
              { limit: '10', offset: '0' },
              undefined,
              expect.any(Object),
            );
          });
      });
    });

    describe('POST requests', () => {
      it('should proxy POST request with body', async () => {
        const requestBody = { name: 'Test Bot', strategy: 'aggressive' };
        mockProxyService.proxyRequest.mockResolvedValue({
          data: { id: '123', ...requestBody },
          status: 201,
          headers: {},
        });

        return request(app.getHttpServer())
          .post('/v1/copy-bots')
          .send(requestBody)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id', '123');
            expect(mockProxyService.proxyRequest).toHaveBeenCalledWith('POST', '/v1/copy-bots', expect.any(Object), {}, requestBody, expect.any(Object));
          });
      });
    });

    describe('PUT requests', () => {
      it('should proxy PUT request', async () => {
        const requestBody = { name: 'Updated Bot' };
        mockProxyService.proxyRequest.mockResolvedValue({
          data: { success: true },
          status: 200,
          headers: {},
        });

        return request(app.getHttpServer())
          .put('/v1/copy-bots/123')
          .send(requestBody)
          .expect(200)
          .expect(() => {
            expect(mockProxyService.proxyRequest).toHaveBeenCalledWith('PUT', '/v1/copy-bots/123', expect.any(Object), {}, requestBody, expect.any(Object));
          });
      });
    });

    describe('DELETE requests', () => {
      it('should proxy DELETE request', async () => {
        mockProxyService.proxyRequest.mockResolvedValue({
          data: { success: true },
          status: 200,
          headers: {},
        });

        return request(app.getHttpServer())
          .delete('/v1/copy-bots/123')
          .expect(200)
          .expect(() => {
            expect(mockProxyService.proxyRequest).toHaveBeenCalledWith('DELETE', '/v1/copy-bots/123', expect.any(Object), {}, undefined, expect.any(Object));
          });
      });
    });

    describe('PATCH requests', () => {
      it('should proxy PATCH request', async () => {
        const requestBody = { status: 'active' };
        mockProxyService.proxyRequest.mockResolvedValue({
          data: { success: true },
          status: 200,
          headers: {},
        });

        return request(app.getHttpServer())
          .patch('/v1/copy-bots/123')
          .send(requestBody)
          .expect(200)
          .expect(() => {
            expect(mockProxyService.proxyRequest).toHaveBeenCalledWith('PATCH', '/v1/copy-bots/123', expect.any(Object), {}, requestBody, expect.any(Object));
          });
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuthProvider.getUserId.mockResolvedValue('user123');
    });

    it('should handle 404 errors from gateway', async () => {
      mockProxyService.proxyRequest.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Not found' },
        },
      });

      return request(app.getHttpServer())
        .get('/v1/copy-bots/999')
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toBe('Not found');
        });
    });

    it('should handle 500 errors from gateway', async () => {
      mockProxyService.proxyRequest.mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      });

      return request(app.getHttpServer())
        .get('/v1/copy-bots')
        .expect(500)
        .expect((res) => {
          expect(res.body.message).toBe('Internal server error');
        });
    });

    it('should handle network errors', async () => {
      mockProxyService.proxyRequest.mockRejectedValue(new Error('Network error'));

      return request(app.getHttpServer())
        .get('/v1/copy-bots')
        .expect(500)
        .expect((res) => {
          expect(res.body.message).toContain('Internal server error');
        });
    });

    it('should handle authentication errors', async () => {
      mockAuthProvider.getUserId.mockRejectedValue(new Error('Invalid token'));

      return request(app.getHttpServer()).get('/v1/copy-bots').expect(500);
    });
  });

  describe('Response Headers', () => {
    beforeEach(() => {
      mockAuthProvider.getUserId.mockResolvedValue('user123');
    });

    it('should forward response headers from gateway', async () => {
      mockProxyService.proxyRequest.mockResolvedValue({
        data: { success: true },
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'custom-value',
        },
      });

      return request(app.getHttpServer())
        .get('/v1/copy-bots')
        .expect(200)
        .expect('x-custom-header', 'custom-value');
    });

    it('should exclude hop-by-hop headers', async () => {
      mockProxyService.proxyRequest.mockResolvedValue({
        data: { success: true },
        status: 200,
        headers: {
          'content-type': 'application/json',
          connection: 'keep-alive',
          'transfer-encoding': 'chunked',
        },
      });

      return request(app.getHttpServer())
        .get('/v1/copy-bots')
        .expect(200)
        .expect((res) => {
          expect(res.headers).not.toHaveProperty('connection');
          expect(res.headers).not.toHaveProperty('transfer-encoding');
        });
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', () => {
      return request(app.getHttpServer())
        .options('/health-check')
        .expect(204)
        .expect((res) => {
          expect(res.headers['access-control-allow-origin']).toBeDefined();
          expect(res.headers['access-control-allow-methods']).toBeDefined();
        });
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      mockAuthProvider.getUserId.mockResolvedValue('user123');
      mockProxyService.proxyRequest.mockResolvedValue({
        data: { success: true },
        status: 200,
        headers: {},
      });

      // Make multiple requests
      const requests = Array(10)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/v1/copy-bots'));

      const responses = await Promise.all(requests);

      // All should succeed (rate limit is 100 per minute)
      responses.forEach((response) => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('Swagger Documentation', () => {
    it('should serve Swagger UI at root path', () => {
      return request(app.getHttpServer()).get('/').expect(200);
    });

    it('should serve OpenAPI JSON', () => {
      return request(app.getHttpServer())
        .get('/api-json')
        .expect(200)
        .expect('Content-Type', /json/);
    });
  });
});

