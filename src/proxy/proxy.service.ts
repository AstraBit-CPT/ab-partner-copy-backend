import {Inject, Injectable, Logger} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import axios, {AxiosInstance, AxiosRequestConfig} from 'axios';
import * as crypto from 'crypto';
import * as qs from 'qs';
import {Request} from 'express';
import {RECV_WINDOW_DEFAULT, RECV_WINDOW_HEADER, SIGNATURE_HEADER, TIMESTAMP_HEADER, TOKEN_HEADER, TOKEN_USER_HEADER} from '../constants';
import {AUTH_PROVIDER, IAuthProvider} from '../auth';
import {ApiVersion, VersioningConfig} from '../versioning';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly copyGatewayUrl: string;
  private readonly versioning: VersioningConfig;

  constructor(
    private readonly configService: ConfigService,
    @Inject(AUTH_PROVIDER) private readonly authProvider: IAuthProvider
  ) {
    this.copyGatewayUrl = this.configService.get<string>('copyGatewayUrl');
    this.versioning = this.configService.get<VersioningConfig>('apiVersioning') ?? {
      supportedVersions: ['v1'],
      defaultVersion: 'v1',
      gatewayVersionMap: {v1: 'v1'},
    };
    this.axiosInstance = axios.create({
      timeout: 30000,
      validateStatus: () => true, // Don't throw on any status
    });
  }

  getSupportedVersions(): ApiVersion[] {
    return this.versioning.supportedVersions;
  }

  resolveGatewayVersion(version: ApiVersion): ApiVersion {
    return this.versioning.gatewayVersionMap[version] ?? this.versioning.defaultVersion;
  }

  async proxyRequest(
    method: string,
    path: string,
    headers: Record<string, string>,
    query: Record<string, any>,
    body: any = {},
    req: Request
  ): Promise<{data: any; status: number; headers: any}> {
    const timestamp = Date.now().toString();

    // Use recvWindow from header if provided, otherwise use default
    const recvWindowHeader = headers[RECV_WINDOW_HEADER.toLowerCase()];
    const recvWindow = recvWindowHeader ? parseInt(recvWindowHeader, 10) || RECV_WINDOW_DEFAULT : RECV_WINDOW_DEFAULT;

    // Build the original URL with query params using qs library to properly handle nested objects
    // qs.stringify handles bracket notation like filter[businessPublicId]=value correctly
    const queryString = Object.keys(query).length > 0 ? qs.stringify(query, {encode: false}) : '';
    const originalUrl = path + (queryString ? '?' + queryString : '');
    const encodedUrl = encodeURIComponent(originalUrl);

    // Build body string (same format as signature-validation.ts)
    const bodyString = !body || Object.keys(body).length === 0 ? '' : JSON.stringify(body);

    // Build message to sign (same format as signature-validation.ts)
    const message = `${method}|${encodedUrl}|${bodyString}|${timestamp}|${recvWindow}`;

    this.logger.debug(`Signing message: ${message}`);

    // Create HMAC signature (same as signature-validation.ts)
    const hmac = crypto.createHmac('sha256', this.configService.get<string>('astrabitApiSecret'));
    const signature = hmac.update(message).digest('hex');

    // Build target URL with query params (matching what was used for signature)
    const targetUrl = `${this.copyGatewayUrl}${originalUrl}`;

    // Extract external user ID using authentication provider
    const externalUserId = await this.authProvider.getUserId(req);

    // Prepare request config
    const requestConfig: AxiosRequestConfig = {
      method: method as any,
      url: targetUrl,
      data: body,
      headers: {
        [TOKEN_HEADER]: this.configService.get<string>('astrabitApiKey'),
        [SIGNATURE_HEADER]: signature,
        [TIMESTAMP_HEADER]: timestamp,
        [RECV_WINDOW_HEADER]: recvWindow.toString(),
        [TOKEN_USER_HEADER]: externalUserId ? Buffer.from(externalUserId).toString('base64') : '',
        'Content-Type': headers['content-type'] || 'application/json',
      },
    };

    this.logger.debug(`Proxying ${method} ${targetUrl} to copy-gateway`);

    try {
      const response = await this.axiosInstance.request(requestConfig);
      return {
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      this.logger.error(`Error proxying request to copy-gateway: ${error.message}`, error.stack);
      throw error;
    }
  }
}
