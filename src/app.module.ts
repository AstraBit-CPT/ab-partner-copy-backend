import {Module} from '@nestjs/common';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {ThrottlerModule, ThrottlerGuard} from '@nestjs/throttler';
import {APP_GUARD} from '@nestjs/core';
import {WinstonModule} from 'nest-winston';
import * as winston from 'winston';
import configuration from '../config/main.config';
import {AuthModule} from './auth';
import {HealthCheckController} from './health-check/health-check.controller';
import {ProxyController} from './proxy/proxy.controller';
import {ProxyService} from './proxy/proxy.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute window
        limit: 100, // 100 requests per minute
      },
    ]),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const appEnv = configService.get<string>('appEnv') || 'development';
        const logLevel = configService.get<string>('logLevel') || 'info';

        return {
          level: logLevel,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({stack: true}),
            winston.format.splat(),
            winston.format.json()
          ),
          transports: [
            new winston.transports.Console({
              format: appEnv === 'production' ? winston.format.json() : winston.format.cli(),
            }),
          ],
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
  ],
  controllers: [HealthCheckController, ProxyController], // HealthCheckController first to ensure its routes are registered before the catch-all proxy
  providers: [
    ProxyService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
