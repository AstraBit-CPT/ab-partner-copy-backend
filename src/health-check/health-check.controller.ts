import {Controller, Get} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {ApiOperation, ApiResponse, ApiTags} from '@nestjs/swagger';

@ApiTags('Health Check')
@Controller()
export class HealthCheckController {
  constructor(private readonly configService: ConfigService) {}

  @ApiOperation({
    summary: 'Health check endpoint',
    description:
      'Returns the health status of the service along with API versioning information. ' +
      'Use this endpoint for monitoring and to verify the service is running correctly.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'ok',
          description: 'Health status of the service',
        },
        versions: {
          type: 'object',
          properties: {
            supported: {
              type: 'array',
              items: {type: 'string'},
              example: ['v1'],
              description: 'List of supported API versions',
            },
            default: {
              type: 'string',
              example: 'v1',
              description: 'Default API version',
            },
            gatewayMap: {
              type: 'object',
              example: {v1: 'v1'},
              description: 'Mapping of partner API versions to gateway versions',
            },
          },
        },
      },
    },
  })
  @Get('health-check')
  healthCheck() {
    const versioning = this.configService.get<{
      supportedVersions: string[];
      defaultVersion: string;
      gatewayVersionMap: Record<string, string>;
    }>('apiVersioning');

    return {
      status: 'ok',
      versions: {
        supported: versioning?.supportedVersions ?? [],
        default: versioning?.defaultVersion ?? 'v1',
        gatewayMap: versioning?.gatewayVersionMap ?? {},
      },
    };
  }

  @ApiOperation({
    summary: 'Heartbeat endpoint',
    description: 'Simple heartbeat endpoint for basic health monitoring. Returns a minimal response to verify the service is responsive.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'ok',
        },
      },
    },
  })
  @Get('heartbeat')
  heartbeat() {
    return {status: 'ok'};
  }
}
