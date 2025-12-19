import "dotenv/config";

type ApiVersion = `v${number}`;

const parseSupportedVersions = (value?: string): ApiVersion[] => {
  if (!value) {
    return ["v1"];
  }

  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => /^v\d+$/.test(entry)) as ApiVersion[];
};

const parseGatewayVersionMap = (
  value: string | undefined,
  supportedVersions: ApiVersion[],
): Record<ApiVersion, ApiVersion> => {
  const defaultMap = supportedVersions.reduce(
    (map, version) => ({ ...map, [version]: version }),
    {} as Record<ApiVersion, ApiVersion>,
  );

  if (!value) {
    return defaultMap;
  }

  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    const entries = Object.entries(parsed).reduce(
      (map, [key, targetVersion]) => {
        const source = key.toLowerCase();
        const target = targetVersion.toLowerCase();
        if (/^v\d+$/.test(source) && /^v\d+$/.test(target)) {
          map[source as ApiVersion] = target as ApiVersion;
        }
        return map;
      },
      {} as Record<ApiVersion, ApiVersion>,
    );

    return { ...defaultMap, ...entries };
  } catch {
    return defaultMap;
  }
};

export default () => ({
  appName: "COPY-PARTNER-PROXY",
  appEnv: process.env.APP_ENV || process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",

  // App config
  appListenHost: process.env.APP_LISTEN_HOST || "0.0.0.0",
  appListenPort: parseInt(process.env.APP_LISTEN_PORT, 10) || 8810,
  corsAllowOrigin: process.env.CORS_ALLOW_ORIGIN,

  // Copy Gateway target URL
  copyGatewayUrl: process.env.COPY_GATEWAY_URL || "http://localhost:3360",

  astrabitApiKey: process.env.ASTRABIT_API_KEY || "",
  astrabitApiSecret: process.env.ASTRABIT_API_SECRET || "",

  apiVersioning: (() => {
    const supportedVersions = parseSupportedVersions(
      process.env.API_SUPPORTED_VERSIONS,
    );
    const defaultVersion =
      (process.env.API_DEFAULT_VERSION as ApiVersion) ||
      supportedVersions[0] ||
      "v1";

    return {
      supportedVersions,
      defaultVersion: supportedVersions.includes(defaultVersion)
        ? defaultVersion
        : "v1",
      gatewayVersionMap: parseGatewayVersionMap(
        process.env.API_GATEWAY_VERSION_MAP,
        supportedVersions,
      ),
    };
  })(),
});
