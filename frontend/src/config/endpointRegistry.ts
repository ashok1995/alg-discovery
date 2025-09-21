import { API_CONFIG } from './api';

export type ApiDomain = 'core' | 'recommendation' | 'theme' | 'strategies' | 'seed' | 'chartink';

export type EndpointKey =
  | 'strategy.recommendations'
  | 'strategy.variants'
  | 'swing.recommendations'
  | 'swing.real_time_prices'
  | 'intraday.recommendations'
  | 'intraday.real_time_prices'
  | 'recommendation.recommendations.dynamic'
  | 'seed.recommendations.v2'
  | 'seed.health'
  | 'chartink.auth.session_status'
  | 'chartink.auth.browser_login'
  | 'chartink.health'
  | 'theme.strategies_available'
  | 'theme.strategies_theme'
  | 'health'
  | 'status';

type EndpointRegistry = Record<EndpointKey, { path: string; domain: ApiDomain }>

const REGISTRY: EndpointRegistry = {
  'strategy.recommendations': { path: API_CONFIG.ENDPOINTS.STRATEGY, domain: 'core' },
  'strategy.variants': { path: '/api/strategy/variants', domain: 'core' },
  'swing.recommendations': { path: API_CONFIG.ENDPOINTS.SWING.RECOMMENDATIONS, domain: 'core' },
  'swing.real_time_prices': { path: API_CONFIG.ENDPOINTS.SWING.REAL_TIME_PRICES, domain: 'core' },
  'intraday.recommendations': { path: API_CONFIG.ENDPOINTS.INTRADAY.RECOMMENDATIONS, domain: 'core' },
  'intraday.real_time_prices': { path: API_CONFIG.ENDPOINTS.INTRADAY.REAL_TIME_PRICES, domain: 'core' },
  // Dynamic v1 unified endpoint (dev preferred)
  'recommendation.recommendations.dynamic': { path: '/api/v1/recommendations/dynamic', domain: 'recommendation' },
  // Seed Service v2 API endpoints (port 8082)
  'seed.recommendations.v2': { path: '/api/v2/stocks/recommendations', domain: 'seed' },
  'seed.health': { path: '/health', domain: 'seed' },
  // Chartink Authentication Service endpoints (port 8181)
  'chartink.auth.session_status': { path: '/api/v1/auth/session-status', domain: 'chartink' },
  'chartink.auth.browser_login': { path: '/api/v1/auth/browser-login', domain: 'chartink' },
  'chartink.health': { path: '/health', domain: 'chartink' },
  'theme.strategies_available': { path: API_CONFIG.ENDPOINTS.THEME.STRATEGIES_AVAILABLE, domain: 'strategies' },
  'theme.strategies_theme': { path: API_CONFIG.ENDPOINTS.THEME.STRATEGIES_THEME, domain: 'strategies' },
  health: { path: '/health', domain: 'core' },
  status: { path: '/status', domain: 'core' },
};

export const getBaseUrlForDomain = (domain: ApiDomain): string => {
  switch (domain) {
    case 'recommendation':
      return API_CONFIG.RECOMMENDATION_API_BASE_URL;
    case 'seed':
      return API_CONFIG.SEED_API_BASE_URL;
    case 'chartink':
      return API_CONFIG.CHARTINK_AUTH_BASE_URL;
    case 'theme':
      return API_CONFIG.THEME_API_BASE_URL;
    case 'strategies':
      return API_CONFIG.STRATEGIES_API_BASE_URL;
    case 'core':
    default:
      return API_CONFIG.BASE_URL;
  }
};

export const getEndpointPath = (key: EndpointKey): string => REGISTRY[key].path;

export const getEndpointUrl = (key: EndpointKey): string => {
  const { domain, path } = REGISTRY[key];
  return `${getBaseUrlForDomain(domain)}${path}`;
};


