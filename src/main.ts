import {NestApplication, NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import configuration from '../config/main.config';
import {WINSTON_MODULE_NEST_PROVIDER} from 'nest-winston';
import {DocumentBuilder, SwaggerDocumentOptions, SwaggerModule} from '@nestjs/swagger';
import {NestExpressApplication} from '@nestjs/platform-express';
import {Logger} from '@nestjs/common';
import {json, urlencoded} from 'express';
import helmet from 'helmet';

async function bootstrap() {
  const config = configuration();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.set('query parser', 'extended');
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.enableShutdownHooks();

  // Body size limits
  app.use(json({limit: '100kb'}));
  app.use(urlencoded({extended: true, limit: '100kb'}));

  // Add security headers (Helmet provides comprehensive security headers)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
          scriptSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false, // May need adjustment for Swagger
      crossOriginResourcePolicy: {policy: 'same-site'},
      referrerPolicy: {policy: 'strict-origin-when-cross-origin'},
    })
  );

  // CORS configuration
  app.enableCors({
    origin: config.corsAllowOrigin ? new RegExp(config.corsAllowOrigin) : true,
    credentials: true,
    methods: ['GET', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Preload', 'Fields', 'X-Partner-Id', 'x-partner-user-id'],
    exposedHeaders: ['Link'],
  });

  // Warn if CORS is configured to allow all origins in production
  const corsOrigin = config.corsAllowOrigin;
  if (corsOrigin === '(.*)' && config.appEnv === 'production') {
    Logger.warn('CORS is configured to allow all origins in production!', 'Security');
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Copy Trading Partner BFF API')
    .setDescription(
      `Backend for Frontend (BFF) service for copy trading partner frontend applications.
      
This service acts as a secure proxy between partner frontend applications and the AstraBit Copy Gateway. 
It handles partner authentication by adding the necessary signature headers required by copy-gateway, 
allowing partners to make requests without exposing their API keys and secrets in the frontend.

## Features
- **Partner Authentication**: Manages partner credentials securely on the backend
- **Request Proxying**: Forwards all requests to copy-gateway with proper authentication headers
- **Signature Generation**: Automatically generates HMAC SHA256 signatures based on request parameters
- **API Versioning**: Path-based versioning with configurable gateway mapping
- **Health Checks**: Provides health check endpoints for monitoring

## Authentication
All requests are automatically authenticated using the configured ASTRABIT_API_KEY and ASTRABIT_API_SECRET.
Partners must implement their own user identification mechanism in the authentication module.

## API Versioning
All API requests must include a version prefix (e.g., /v1/copy-bots).
Requests without a version prefix will be rejected with a 400 error.

Current supported versions: ${config.apiVersioning?.supportedVersions?.join(', ') || 'v1'}
Default version: ${config.apiVersioning?.defaultVersion || 'v1'}`
    )
    .setVersion('1.0.0')
    .setContact('AstraBit Support', 'https://astrabit.io', 'support@astrabit.io')
    .setLicense('Proprietary', '')
    .addTag('Health Check', 'Health check and monitoring endpoints')
    .addTag('Proxy', 'Proxy endpoints for copy trading operations')
    .addServer(`http://${config.appListenHost}:${config.appListenPort}`, 'Local Development')
    .build();

  const options: SwaggerDocumentOptions = {
    operationIdFactory: (_: string, methodKey: string) => methodKey,
  };
  const document = SwaggerModule.createDocument(app, swaggerConfig, options);
  SwaggerModule.setup('_swagger', app, document);

  await app.listen(config.appListenPort, config.appListenHost, () =>
    Logger.log(
      `🚀 Service started on: http://${config.appListenHost}:${config.appListenPort}/ (${config.appEnv} mode)`,
      NestApplication.name
    )
  );
}
bootstrap();
