import {All, Body, Controller, Logger, Query, Req, Res} from '@nestjs/common';
import {ApiExcludeController} from '@nestjs/swagger';
import {Request, Response} from 'express';
import {ProxyService} from './proxy.service';
import {ApiVersion, formatSupportedVersions, isSupportedVersion} from '../versioning';

@ApiExcludeController()
@Controller()
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(private readonly proxyService: ProxyService) {}

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response, @Body() body: any, @Query() query: Record<string, any>) {
    // Extract path (exclude query string)
    const path = req.path;

    // Exclude health check endpoints and Swagger docs from proxying
    if (
      path === '/heartbeat' ||
      path.startsWith('/health-check') ||
      path === '/' ||
      path.startsWith('/api-json') ||
      path.startsWith('/api-yaml') ||
      path.startsWith('/_swagger')
    ) {
      return res.status(200).json({status: 'ok'});
    }

    const versionMatch = path.match(/^\/?(v[0-9]+)(\/.*)?$/);
    const supportedVersions = this.proxyService.getSupportedVersions();

    if (!versionMatch) {
      return res.status(400).json({
        message: 'API version required. Prefix requests with /v1.',
        supportedVersions: formatSupportedVersions(supportedVersions),
      });
    }

    const requestedVersion = versionMatch[1].toLowerCase();
    const remainingPath = versionMatch[2] || '';

    if (!isSupportedVersion(requestedVersion, supportedVersions)) {
      return res.status(400).json({
        message: `Unsupported API version '${requestedVersion}'.`,
        supportedVersions: formatSupportedVersions(supportedVersions),
      });
    }

    const gatewayVersion = this.proxyService.resolveGatewayVersion(requestedVersion as ApiVersion);
    const targetPath = `/${gatewayVersion}${remainingPath}`;

    this.logger.debug(`Proxying ${req.method} ${targetPath} to copy-gateway (requested ${requestedVersion})`);

    try {
      // Proxy the request to copy-gateway
      const response = await this.proxyService.proxyRequest(
        req.method,
        targetPath,
        req.headers as Record<string, string>,
        query,
        body,
        req
      );

      // Forward response headers (excluding hop-by-hop headers)
      const headersToExclude = ['connection', 'keep-alive', 'transfer-encoding', 'upgrade'];
      Object.keys(response.headers).forEach((key) => {
        if (!headersToExclude.includes(key.toLowerCase())) {
          res.setHeader(key, response.headers[key]);
        }
      });

      // Send response
      return res.status(response.status).json(response.data);
    } catch (error) {
      this.logger.error(`Error proxying request: ${error.message}`, error.stack);
      if (error.response) {
        // Forward error response from copy-gateway
        return res.status(error.response.status || 500).json(error.response.data || {message: error.message});
      }
      return res.status(500).json({message: 'Internal server error while proxying request'});
    }
  }
}
