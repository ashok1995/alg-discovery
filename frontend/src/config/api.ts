/**
 * Centralized API configuration for frontend
 * No hardcoded URLs - all from environment variables or current domain
 */

// Helper function to determine if we're in production
const isProduction = () => {
  return process.env.NODE_ENV === 'production' || 
         process.env.REACT_APP_NODE_ENV === 'production' ||
         (typeof window !== 'undefined' && window.location.hostname !== 'localhost');
};

// Helper function to get the current domain for production
const getCurrentDomain = () => {
  if (typeof window !== 'undefined') {
    // In browser, use current domain
    return window.location.origin;
  }
  // Fallback to environment variable or default
  return process.env.REACT_APP_API_BASE_URL || 'http://localhost:8002';
};

export const API_CONFIG = {
  // Base URL from environment or current domain
  BASE_URL: process.env.REACT_APP_API_BASE_URL || getCurrentDomain(),
  
  // Recommendation API URL - Use DNS-based approach for production
  RECOMMENDATION_API_BASE_URL:
    process.env.REACT_APP_RECOMMENDATION_API_BASE_URL ||
    (isProduction() ? 'http://recommendations.algodiscovery.prod:8183' : 'http://localhost:8183'),

  // Chartink Authentication Service URL (port 8081)
  CHARTINK_AUTH_BASE_URL: process.env.REACT_APP_CHARTINK_AUTH_BASE_URL || 
                          (isProduction() ? 'http://algodiscovery.com:8081' : 'http://localhost:8081'),

  // Seed service API URL (primary recommendations service) 
  SEED_API_BASE_URL: process.env.REACT_APP_SEED_API_BASE_URL || 
                     (isProduction() ? 'http://algodiscovery.com:8082' : 'http://localhost:8082'),

  // Theme recommendations API URLs (legacy naming, kept for ThemeRecommendationsService)
  THEME_API_BASE_URL: process.env.REACT_APP_THEME_API_BASE_URL || 
                      (isProduction() ? 'https://algodiscovery.com' : 'http://localhost:8020'),
  STRATEGIES_API_BASE_URL: process.env.REACT_APP_STRATEGIES_API_BASE_URL || 
                           (isProduction() ? 'https://algodiscovery.com' : 'http://localhost:8030'),
  // Query service (v1) base URL (must include the version prefix, e.g., /api/v1)
  QUERY_API_BASE_URL: process.env.REACT_APP_QUERY_API_BASE_URL || `${getCurrentDomain()}/api/v1`,
  // Zerodha v1 service (separate container)
  ZERODHA_V1_BASE_URL: (process.env.REACT_APP_ZERODHA_V1_BASE_URL || getCurrentDomain()),
  ZERODHA_V1_PREFIX: (process.env.REACT_APP_ZERODHA_V1_PREFIX || '/api/v1'),
  // Kite services (proxy path or target URL)
  KITE_SERVICES_BASE_URL: process.env.REACT_APP_KITE_SERVICES_BASE_URL || process.env.REACT_APP_KITE_SERVICES_TARGET || '',

  // Service Ports
  PORTS: {
    ALGORITHM_API: parseInt(process.env.REACT_APP_ALGORITHM_API_PORT || '8013'),
    CHARTINK_API: parseInt(process.env.REACT_APP_CHARTINK_API_PORT || '8001'),
    SWING_API: parseInt(process.env.REACT_APP_SWING_API_PORT || '8002'),
    LONGTERM_API: parseInt(process.env.REACT_APP_LONGTERM_API_PORT || '8001'),
    UNIFIED_STRATEGY_API: parseInt(process.env.REACT_APP_UNIFIED_STRATEGY_API_PORT || '8002'),
    STOCK_CANDIDATE_POPULATOR_API: parseInt(process.env.REACT_APP_STOCK_CANDIDATE_POPULATOR_API_PORT || '8018'),
    ZERODHA_API: parseInt(process.env.REACT_APP_ZERODHA_API_PORT || '8013'),
  },
  
  // API endpoints
  ENDPOINTS: {
    STRATEGY: '/api/strategy/recommendations',
    SWING: {
      RECOMMENDATIONS: '/api/swing/recommendations',
      REAL_TIME_PRICES: '/api/swing/real-time-prices'
    },
    INTRADAY: {
      RECOMMENDATIONS: '/api/intraday/recommendations',
      REAL_TIME_PRICES: '/api/intraday/real-time-prices'
    },
    // Theme recommendations endpoints
    THEME: {
      RECOMMENDATIONS: '/api/theme-recommendations',
      STRATEGIES_AVAILABLE: '/api/v1/strategies/available',
      STRATEGIES_THEME: '/api/v1/strategies/theme'
    }
  },
  
  // Request configuration
  REQUEST: {
    TIMEOUT: parseInt(process.env.REACT_APP_REQUEST_TIMEOUT || '30000'),
    RETRY_ATTEMPTS: parseInt(process.env.REACT_APP_REQUEST_RETRY_ATTEMPTS || '3'),
    RETRY_DELAY: parseInt(process.env.REACT_APP_REQUEST_RETRY_DELAY || '1000')
  },
  
  // Refresh intervals
  REFRESH: {
    RECOMMENDATIONS: parseInt(process.env.REACT_APP_REFRESH_RECOMMENDATIONS || '120000'),
    PRICES: parseInt(process.env.REACT_APP_REFRESH_PRICES || '5000'),
    MIN_INTERVAL: parseInt(process.env.REACT_APP_REFRESH_MIN_INTERVAL || '2000'),
    DEFAULT: parseInt(process.env.REACT_APP_REFRESH_DEFAULT || '30000'),
    LONG_TERM: parseInt(process.env.REACT_APP_REFRESH_LONG_TERM || '180000'),
    SHORT_TERM: parseInt(process.env.REACT_APP_REFRESH_SHORT_TERM || '30000')
  },
  
  // WebSocket Configuration
  WEBSOCKET: {
    MAX_SUBSCRIPTIONS: parseInt(process.env.REACT_APP_KITE_MAX_SUBSCRIPTIONS || '3000'),
    HEARTBEAT_INTERVAL: parseInt(process.env.REACT_APP_KITE_HEARTBEAT_INTERVAL || '30000')
  },
  
  // UI Configuration
  UI: {
    AUTO_HIDE_DURATION: parseInt(process.env.REACT_APP_AUTO_HIDE_DURATION || '3000'),
    SAVE_STATUS_TIMEOUT: parseInt(process.env.REACT_APP_SAVE_STATUS_TIMEOUT || '3000')
  },
  
  // External Services
  EXTERNAL: {
    CHARTINK: {
      BASE_URL: process.env.REACT_APP_CHARTINK_BASE_URL || 'https://chartink.com',
      STOCKS_URL: process.env.REACT_APP_CHARTINK_STOCKS_URL || 'https://chartink.com/stocks-new'
    },
    ZERODHA: {
      CHART_BASE_URL: process.env.REACT_APP_ZERODHA_CHART_BASE_URL || 'https://kite.zerodha.com/chart/ext/tvc/NSE',
      CHART_THEME: process.env.REACT_APP_ZERODHA_CHART_THEME || 'dark'
    }
  },
  
  // Proxy Configuration
  PROXY: {
    TARGET: process.env.REACT_APP_PROXY_TARGET || 
            (isProduction() ? 'https://algodiscovery.com' : 'http://127.0.0.1:8183')
  }
};

/**
 * Get full API URL
 */
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

/**
 * Get theme API URL
 */
export const getThemeApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.THEME_API_BASE_URL}${endpoint}`;
};

/**
 * Get recommendation API URL (new naming)
 */
export const getRecommendationApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.RECOMMENDATION_API_BASE_URL}${endpoint}`;
};

/**
 * Get strategies API URL
 */
export const getStrategiesApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.STRATEGIES_API_BASE_URL}${endpoint}`;
};

/**
 * Get seed API URL
 */
export const getSeedApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.SEED_API_BASE_URL}${endpoint}`;
};

/**
 * Get service URL by port
 */
export const getServiceUrl = (port: number, endpoint: string = ''): string => {
  return `http://localhost:${port}${endpoint}`;
};

/**
 * Get Chartink URL for a symbol
 */
export const getChartinkUrl = (symbol: string): string => {
  return `${API_CONFIG.EXTERNAL.CHARTINK.STOCKS_URL}?symbol=${symbol}`;
};

/**
 * Get Zerodha chart URL for a symbol
 */
export const getZerodhaChartUrl = (symbol: string): string => {
  return `${API_CONFIG.EXTERNAL.ZERODHA.CHART_BASE_URL}/${symbol}?theme=${API_CONFIG.EXTERNAL.ZERODHA.CHART_THEME}`;
};

/**
 * Log API request details
 */
export const logApiRequest = (method: string, url: string, payload?: any, requestId?: string) => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    method,
    url,
    payload: payload ? JSON.stringify(payload) : null,
    userAgent: navigator.userAgent
  };
  
  console.log(`🚀 [${timestamp}] API Request:`, logData);
  return logData.requestId;
};

/**
 * Log API response details
 */
export const logApiResponse = (requestId: string, status: number, data?: any, error?: any, duration?: number) => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    requestId,
    status,
    duration: duration ? `${duration}ms` : null,
    success: status >= 200 && status < 300,
    dataSize: data ? JSON.stringify(data).length : 0,
    error: error ? error.message || error : null
  };
  
  if (logData.success) {
    console.log(`✅ [${timestamp}] API Response Success:`, logData);
  } else {
    console.error(`❌ [${timestamp}] API Response Error:`, logData);
  }
};