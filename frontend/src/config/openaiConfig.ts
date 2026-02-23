import configJson from './openai.json';

export type EnvironmentName = 'development' | 'production';

interface ServiceConfig {
  baseUrl: string;
  proxyPrefix: string;
  endpoints: Record<string, string>;
}

interface OpenAIConfig {
  environments: Record<EnvironmentName, Record<string, ServiceConfig>>;
}

const rawConfig = configJson as unknown as OpenAIConfig;

export const getEnvName = (): EnvironmentName => {
  const isProd = process.env.NODE_ENV === 'production' || process.env.REACT_APP_NODE_ENV === 'production';
  return isProd ? 'production' : 'development';
};

export type ServiceName = 'kite' | 'unified' | 'recommendationsV2';

export const getServiceConfig = (service: ServiceName, env: EnvironmentName = getEnvName()): ServiceConfig => {
  const envConfig = rawConfig.environments[env];
  const svc = envConfig[service];
  if (!svc) {
    throw new Error(`Service config not found for ${service} in ${env}`);
  }
  return svc;
};

export const buildUrl = (service: ServiceName, endpointKey: string, query?: string): string => {
  const svc = getServiceConfig(service);
  const path = svc.endpoints[endpointKey];
  if (!path) {
    throw new Error(`Endpoint ${endpointKey} not defined for service ${service}`);
  }
  const prefix = svc.proxyPrefix || '';
  return `${prefix}${path}${query ? `?${query}` : ''}`;
};

/** Base URL for recommendations V2: env override or from openai.json (baseUrl or proxy). */
const getRecommendationsV2BaseUrl = (): string => {
  const envUrl = process.env.REACT_APP_RECOMMENDATION_V2_API_BASE_URL;
  if (envUrl !== undefined && envUrl !== '') return envUrl;
  const svc = getServiceConfig('recommendationsV2');
  if (svc.baseUrl) return svc.baseUrl;
  return ''; // use same-origin proxy (proxyPrefix + path)
};

export type RecommendationsV2EndpointKey = 'recommendations' | 'health' | 'observabilityDb' | 'pipelineHealth' | 'scoreBinPerformance';

/**
 * Full URL for recommendations V2 API.
 * Recommendations: GET with query params (trade_type, limit, min_score).
 * Uses openai.json endpoints; base URL from env or openai.json.
 */
export const getRecommendationsV2Url = (endpointKey: RecommendationsV2EndpointKey, query?: string): string => {
  const svc = getServiceConfig('recommendationsV2');
  const path = svc.endpoints[endpointKey];
  if (!path) throw new Error(`Endpoint ${endpointKey} not defined for recommendationsV2`);
  const base = getRecommendationsV2BaseUrl();
  const fullPath = `${path}${query ? `?${query}` : ''}`;
  if (base) return `${base.replace(/\/$/, '')}${fullPath}`;
  return `${svc.proxyPrefix || ''}${fullPath}`;
};
