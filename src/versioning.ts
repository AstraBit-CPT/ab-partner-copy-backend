export type ApiVersion = `v${number}`;

export interface VersioningConfig {
  supportedVersions: ApiVersion[];
  defaultVersion: ApiVersion;
  gatewayVersionMap: Record<ApiVersion, ApiVersion>;
}

export const isSupportedVersion = (version: string | undefined, supportedVersions: ApiVersion[]): version is ApiVersion => {
  if (!version) {
    return false;
  }
  return supportedVersions.includes(version as ApiVersion);
};

export const formatSupportedVersions = (supported: ApiVersion[]): string[] => supported.map((version) => `/${version}`);
