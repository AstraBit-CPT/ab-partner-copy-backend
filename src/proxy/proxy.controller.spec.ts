import {INestApplication} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import * as request from 'supertest';
import {AppModule} from '../app.module';
import {ProxyService} from './proxy.service';

describe('ProxyController versioning', () => {
  let app: INestApplication;

  const proxyService = {
    getSupportedVersions: jest.fn(() => ['v1']),
    resolveGatewayVersion: jest.fn((version: string) => version),
    proxyRequest: jest.fn().mockResolvedValue({
      data: {ok: true},
      status: 200,
      headers: {},
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ProxyService)
      .useValue(proxyService)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects requests without an API version', async () => {
    await request(app.getHttpServer())
      .get('/products')
      .expect(400)
      .expect(({body}) => {
        expect(body.message).toContain('API version required');
        expect(proxyService.proxyRequest).not.toHaveBeenCalled();
      });
  });

  it('rejects unsupported API versions', async () => {
    await request(app.getHttpServer())
      .get('/v9/products')
      .expect(400)
      .expect(({body}) => {
        expect(body.message).toContain('Unsupported API version');
        expect(body.supportedVersions).toEqual(['/v1']);
        expect(proxyService.proxyRequest).not.toHaveBeenCalled();
      });
  });

  it('proxies versioned requests using the gateway map', async () => {
    proxyService.resolveGatewayVersion.mockReturnValue('v1');

    await request(app.getHttpServer()).get('/v1/ping').expect(200);

    expect(proxyService.proxyRequest).toHaveBeenCalledWith('GET', '/v1/ping', expect.any(Object), {}, undefined, expect.any(Object));
  });
});
