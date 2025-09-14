/**
 * Theme Recommendations Service
 * Handles communication with the theme recommendations API endpoints
 * 
 * Endpoints:
 * - POST /api/theme-recommendations/{strategy} - Get theme-based recommendations
 * - GET /api/v1/strategies/available - Get available strategies
 */

import axios, { AxiosInstance } from 'axios';

// API base URLs for different services - use relative URLs in development to work with proxy
const THEME_API_BASE_URL = process.env.NODE_ENV === 'development' ? '' : (process.env.REACT_APP_THEME_API_BASE_URL || 'http://localhost:8020');
const STRATEGIES_API_BASE_URL = process.env.NODE_ENV === 'development' ? '' : (process.env.REACT_APP_STRATEGIES_API_BASE_URL || 'http://localhost:8030');

// Endpoint configuration
const ENDPOINT_CONFIG = {
  THEME_RECOMMENDATIONS: '/api/theme-recommendations',
  STRATEGIES_AVAILABLE: '/api/v1/strategies/available',
  STRATEGIES_THEME: '/api/v1/strategies/theme'
};

// Theme recommendation request interface
export interface ThemeRecommendationRequest {
  market_condition?: 'bullish' | 'bearish' | 'neutral';
  risk_tolerance?: 'low' | 'moderate' | 'high';
  time_period?: 'short_term' | 'medium_term' | 'long_term';
  max_recommendations?: number;
  include_real_time_analysis?: boolean;
  include_metadata?: boolean;
}

// Theme recommendation response interface
export interface ThemeRecommendationResponse {
  success: boolean;
  recommendations?: any[];
  metadata?: {
    strategy_type?: string;
    market_condition?: string;
    risk_tolerance?: string;
    time_period?: string;
    total_recommendations?: number;
    timestamp?: string;
    [key: string]: any;
  };
  error?: string;
}

// Available strategies response interface
export interface AvailableStrategiesResponse {
  success: boolean;
  strategies?: string[];
  error?: string;
}

class ThemeRecommendationsService {
  private static instance: ThemeRecommendationsService;
  private themeApi: AxiosInstance;
  private strategiesApi: AxiosInstance;

  private constructor() {
    // Theme recommendations API client
    this.themeApi = axios.create({
      baseURL: THEME_API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Strategies API client
    this.strategiesApi = axios.create({
      baseURL: STRATEGIES_API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptors for logging
    this.themeApi.interceptors.request.use(
      (config) => {
        console.log(`🚀 [ThemeAPI] ${config.method?.toUpperCase()} ${config.url}`, config.data);
        return config;
      },
      (error) => {
        console.error('❌ [ThemeAPI] Request error:', error);
        return Promise.reject(error);
      }
    );

    this.strategiesApi.interceptors.request.use(
      (config) => {
        console.log(`🚀 [StrategiesAPI] ${config.method?.toUpperCase()} ${config.url}`, config.data);
        return config;
      },
      (error) => {
        console.error('❌ [StrategiesAPI] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptors for logging
    this.themeApi.interceptors.response.use(
      (response) => {
        console.log(`✅ [ThemeAPI] Response received:`, response.data);
        return response;
      },
      (error) => {
        console.error('❌ [ThemeAPI] Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );

    this.strategiesApi.interceptors.response.use(
      (response) => {
        console.log(`✅ [StrategiesAPI] Response received:`, response.data);
        return response;
      },
      (error) => {
        console.error('❌ [StrategiesAPI] Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  static getInstance(): ThemeRecommendationsService {
    if (!ThemeRecommendationsService.instance) {
      ThemeRecommendationsService.instance = new ThemeRecommendationsService();
    }
    return ThemeRecommendationsService.instance;
  }

  /**
   * Get theme recommendations for a specific strategy
   * Updated to use default values and set include_real_time_analysis to false
   */
  async getThemeRecommendations(
    strategy: 'swing' | 'intraday' | 'longterm' | 'shortterm',
    request: ThemeRecommendationRequest = {}
  ): Promise<ThemeRecommendationResponse> {
    try {
      console.log(`🎯 [ThemeRecommendations] Getting ${strategy} recommendations with:`, request);

      // Default payload with include_real_time_analysis set to false
      const defaultPayload = {
        market_condition: request.market_condition || 'neutral',
        risk_tolerance: request.risk_tolerance || 'moderate',
        time_period: request.time_period || 'medium_term',
        max_recommendations: request.max_recommendations || 10,
        include_real_time_analysis: false, // Set to false as requested
        include_metadata: request.include_metadata ?? true
      };

      console.log(`📤 [ThemeRecommendations] Sending payload to ${strategy}:`, defaultPayload);

      const response = await this.themeApi.post(
        `${ENDPOINT_CONFIG.THEME_RECOMMENDATIONS}/${strategy}`,
        defaultPayload
      );

      console.log(`✅ [ThemeRecommendations] Response received:`, response.data);

      return {
        success: true,
        recommendations: response.data.recommendations || response.data.data?.recommendations || [],
        metadata: response.data.metadata || response.data.data?.metadata || {}
      };
    } catch (error: any) {
      console.error(`❌ [ThemeRecommendations] Failed to get ${strategy} recommendations:`, error);
      
      // Log detailed error information
      if (error.response) {
        console.error(`❌ [ThemeRecommendations] Error response:`, {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error(`❌ [ThemeRecommendations] No response received:`, error.request);
      } else {
        console.error(`❌ [ThemeRecommendations] Error setting up request:`, error.message);
      }

      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch recommendations'
      };
    }
  }

  /**
   * Get available strategies from the strategies API
   */
  async getAvailableStrategies(): Promise<AvailableStrategiesResponse> {
    try {
      console.log('🎯 [ThemeRecommendations] Getting available strategies');

      const response = await this.strategiesApi.get(ENDPOINT_CONFIG.STRATEGIES_AVAILABLE);

      return {
        success: true,
        strategies: response.data.strategies || response.data.data?.strategies || []
      };
    } catch (error: any) {
      console.error('❌ [ThemeRecommendations] Failed to get available strategies:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch strategies'
      };
    }
  }

  /**
   * Get theme recommendations using the strategies API
   * Updated to use default values and set include_real_time_analysis to false
   */
  async getStrategiesThemeRecommendations(
    strategy: string,
    request: ThemeRecommendationRequest = {}
  ): Promise<ThemeRecommendationResponse> {
    try {
      console.log(`🎯 [ThemeRecommendations] Getting strategies theme recommendations for ${strategy}:`, request);

      const response = await this.strategiesApi.post(
        `${ENDPOINT_CONFIG.STRATEGIES_THEME}/${strategy}/recommend`,
        {
          market_condition: request.market_condition || 'neutral',
          risk_tolerance: request.risk_tolerance || 'moderate',
          time_period: request.time_period || 'medium_term',
          max_recommendations: request.max_recommendations || 10,
          include_real_time_analysis: false, // Set to false as requested
          include_metadata: request.include_metadata ?? true
        }
      );

      return {
        success: true,
        recommendations: response.data.recommendations || response.data.data?.recommendations || [],
        metadata: response.data.metadata || response.data.data?.metadata || {}
      };
    } catch (error: any) {
      console.error(`❌ [ThemeRecommendations] Failed to get strategies theme recommendations for ${strategy}:`, error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch strategies theme recommendations'
      };
    }
  }

  /**
   * Health check for theme recommendations API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.themeApi.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('❌ [ThemeRecommendations] Health check failed:', error);
      return false;
    }
  }

  /**
   * Health check for strategies API
   */
  async strategiesHealthCheck(): Promise<boolean> {
    try {
      const response = await this.strategiesApi.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('❌ [ThemeRecommendations] Strategies health check failed:', error);
      return false;
    }
  }

  /**
   * Test connections to both APIs
   */
  async testConnections(): Promise<{
    themeApi: boolean;
    strategiesApi: boolean;
  }> {
    const [themeApi, strategiesApi] = await Promise.allSettled([
      this.healthCheck(),
      this.strategiesHealthCheck()
    ]);

    return {
      themeApi: themeApi.status === 'fulfilled' ? themeApi.value : false,
      strategiesApi: strategiesApi.status === 'fulfilled' ? strategiesApi.value : false
    };
  }

  /**
   * Get service status for both APIs
   */
  async getServiceStatus(): Promise<{
    themeApi: {
      url: string;
      status: 'connected' | 'disconnected' | 'error';
    };
    strategiesApi: {
      url: string;
      status: 'connected' | 'disconnected' | 'error';
    };
  }> {
    const connections = await this.testConnections();

    return {
      themeApi: {
        url: THEME_API_BASE_URL,
        status: connections.themeApi ? 'connected' : 'disconnected'
      },
      strategiesApi: {
        url: STRATEGIES_API_BASE_URL,
        status: connections.strategiesApi ? 'connected' : 'disconnected'
      }
    };
  }
}

export default ThemeRecommendationsService; 