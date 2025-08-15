/**
 * Enhanced Intraday Trading API Service
 * Handles communication with the Intraday Trading API endpoints
 * Now with enhanced real-time price functionality and comprehensive logging
 */

import axios, { AxiosInstance } from 'axios';
import { getEndpointPath } from '../config/endpointRegistry';
import type { EndpointKey } from '../config/endpointRegistry';
import { getMetaHeaders, withMetaQuery } from '../utils/meta';
import attachAxiosLogging from './httpLogger';

// API base URL - use relative URLs in development to work with proxy
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8002')
  : '';

// Environment-based endpoint configuration
const ENDPOINT_KEYS = {
  UNIFIED_RECOMMENDATIONS: 'strategy.recommendations',
  REAL_TIME_PRICES: 'swing.real_time_prices',
  HEALTH_CHECK: 'health',
  STATUS: 'status',
  VARIANTS: 'strategy.variants',
} as const satisfies Record<string, EndpointKey>;

export interface IntradayRequest {
  strategy_type: string;
  limit?: number;
  force_refresh?: boolean;
  combination?: Record<string, string>;
  limit_per_query?: number;
  min_score?: number;
  top_recommendations?: number;
  chartink_theme?: string;
}

export interface IntradayRecommendation {
  symbol: string;
  companyName: string;
  score: number;
  currentPrice: number;
  target: number;
  stopLoss: number;
  change: number;
  changePercent: number;
  volume: number;
  sector: string;
  riskLevel: 'low' | 'medium' | 'high';
  entryTime: string;
  exitTime: string;
  technicalSignals: string[];
  volumeSurge: number;
  gapUp: number;
  momentum: number;
  price_source?: string;
  chart_url?: string;
  lastUpdated?: string;
  realTimeData?: boolean;
}

export interface RealTimePrice {
  price: number;
  change: number;
  changePercent: number;
  realTime: boolean;
  timestamp: string;
}

export interface RealTimePricesResponse {
  success: boolean;
  data: Record<string, RealTimePrice>;
  error?: string;
}

export interface IntradayResponse {
  status: string;
  recommendations: IntradayRecommendation[];
  metadata: {
    strategy_type: string;
    data_source: string;
    total_stocks_analyzed: number;
    final_recommendations: number;
    cache_hit: boolean;
    fresh_analysis: boolean;
    real_time_data: boolean;
    price_source: string;
    timing_breakdown?: Record<string, number>;
    cache_key?: string;
  };
}

export interface ConnectionStatus {
  connected: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastUpdate: string;
  ticksReceived: number;
  activeSubscriptions: number;
  errors: number;
}

class IntradayAPIService {
  private api: AxiosInstance;

  constructor() {
    console.log('🔧 Initializing IntradayAPIService with base URL:', API_BASE_URL);
    
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    attachAxiosLogging(this.api, 'IntradayAPI');

    // Add request interceptor for logging
    this.api.interceptors.request.use(
      (config) => {
        const mergedHeaders = { ...((config.headers || {}) as any), ...getMetaHeaders('/intraday') };
        (config as any).headers = mergedHeaders;
        console.log(`🚀 [IntradayAPI] ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data
        });
        return config;
      },
      (error) => {
        console.error('❌ [IntradayAPI] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.api.interceptors.response.use(
      (response) => {
        console.log(`✅ [IntradayAPI] ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
        return response;
      },
      (error) => {
        console.error('❌ [IntradayAPI] Response error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get intraday recommendations from the unified strategy API
   */
  async getRecommendations(params: IntradayRequest = { strategy_type: 'intraday-buy' }): Promise<IntradayResponse> {
    try {
      console.log('📊 [IntradayAPI] Getting recommendations with params:', params);
      
      const requestBody = {
        strategy_type: params.strategy_type || 'intraday-buy',
        limit: params.limit || 10,
        force_refresh: params.force_refresh || false,
        combination: params.combination || null,
        limit_per_query: params.limit_per_query || 50,
        min_score: params.min_score || 35.0,
        top_recommendations: params.top_recommendations || 20,
        chartink_theme: params.chartink_theme || 'intraday_buy'
      };

      const response = await this.api.post(getEndpointPath(ENDPOINT_KEYS.UNIFIED_RECOMMENDATIONS), requestBody);
      
      if (response.data.status === 'success') {
        console.log(`✅ [IntradayAPI] Successfully fetched ${response.data.recommendations?.length || 0} recommendations`);
        console.log(`📊 [IntradayAPI] Cache hit: ${response.data.metadata?.cache_hit}, Real-time data: ${response.data.metadata?.real_time_data}`);
        
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch recommendations');
      }
    } catch (error: any) {
      console.error('❌ [IntradayAPI] Error getting recommendations:', error);
      throw new Error(`Failed to fetch intraday recommendations: ${error.message}`);
    }
  }

  /**
   * Get real-time prices for symbols
   */
  async getRealTimePrices(symbols: string[]): Promise<RealTimePricesResponse> {
    try {
      console.log('💰 [IntradayAPI] Getting real-time prices for symbols:', symbols);
      
      if (!symbols.length) {
        return { success: true, data: {} };
      }

      const symbolList = symbols.join(',');
      const response = await this.api.get(getEndpointPath(ENDPOINT_KEYS.REAL_TIME_PRICES), {
        params: withMetaQuery({ symbols: symbolList }, '/intraday')
      });

      if (response.data.success) {
        console.log(`✅ [IntradayAPI] Successfully fetched real-time prices for ${Object.keys(response.data.data).length} symbols`);
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch real-time prices');
      }
    } catch (error: any) {
      console.error('❌ [IntradayAPI] Error getting real-time prices:', error);
      return { success: false, data: {}, error: error.message };
    }
  }

  /**
   * Get available variants for a strategy type
   */
  async getVariants(strategyType: string): Promise<any> {
    try {
      console.log('🔧 [IntradayAPI] Getting variants for strategy:', strategyType);
      
      const response = await this.api.get(getEndpointPath(ENDPOINT_KEYS.VARIANTS), {
        params: { strategy_type: strategyType }
      });

      if (response.data.status === 'success') {
        console.log(`✅ [IntradayAPI] Successfully fetched variants for ${strategyType}`);
        return response.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch variants');
      }
    } catch (error: any) {
      console.error('❌ [IntradayAPI] Error getting variants:', error);
      throw new Error(`Failed to fetch variants: ${error.message}`);
    }
  }

  /**
   * Health check for the API
   */
  async healthCheck(): Promise<boolean> {
    try {
      console.log('🏥 [IntradayAPI] Performing health check');
      
      const response = await this.api.get(getEndpointPath(ENDPOINT_KEYS.HEALTH_CHECK));
      const isHealthy = response.status === 200;
      
      console.log(`🏥 [IntradayAPI] Health check result: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      return isHealthy;
    } catch (error: any) {
      console.error('❌ [IntradayAPI] Health check failed:', error);
      return false;
    }
  }

  /**
   * Test connection to the API
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔌 [IntradayAPI] Testing connection');
      
      const isHealthy = await this.healthCheck();
      if (isHealthy) {
        console.log('✅ [IntradayAPI] Connection test successful');
        return true;
      } else {
        console.log('❌ [IntradayAPI] Connection test failed - API unhealthy');
        return false;
      }
    } catch (error: any) {
      console.error('❌ [IntradayAPI] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get API status information
   */
  async getStatus(): Promise<any> {
    try {
      console.log('📊 [IntradayAPI] Getting API status');
      
      const response = await this.api.get(getEndpointPath(ENDPOINT_KEYS.STATUS));
      console.log('✅ [IntradayAPI] Status retrieved successfully');
      return response.data;
    } catch (error: any) {
      console.error('❌ [IntradayAPI] Error getting status:', error);
      throw new Error(`Failed to get API status: ${error.message}`);
    }
  }
}

export const intradayAPIService = new IntradayAPIService();
export default intradayAPIService; 