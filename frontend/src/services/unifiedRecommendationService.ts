/**
 * Unified Recommendation Service
 * =============================
 * 
 * A comprehensive service that provides real-time recommendations with Zerodha integration
 * for all recommendation scenarios: Swing Buy, Swing Buy AI, Intraday, Long-term, etc.
 * 
 * Features:
 * - Real-time price integration with Zerodha
 * - Support for multiple recommendation types
 * - Enhanced technical indicators and alerts
 * - Unified API interface for all recommendation pages
 * - Automatic subscription management
 * - Comprehensive data aggregation
 */

import axios, { AxiosInstance } from 'axios';
import { getMetaHeaders } from '../utils/meta';
import attachAxiosLogging from './httpLogger';

// API base URL configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8002')
  : '';

// Unified endpoint configuration for all recommendation types
const ENDPOINT_CONFIG = {
  // Core recommendation endpoints
  SWING_AI_RECOMMENDATIONS: '/api/swing/ai-recommendations',
  SWING_RECOMMENDATIONS: '/api/swing/recommendations',
  INTRADAY_RECOMMENDATIONS: '/api/intraday/recommendations',
  LONGTERM_RECOMMENDATIONS: '/api/longterm/recommendations',
  SHORTTERM_RECOMMENDATIONS: '/api/shortterm/recommendations',
  
  // Real-time data endpoints
  REAL_TIME_PRICES: '/api/swing/real-time-prices',
  TRACKING_STATUS: '/api/swing/tracking-status',
  SUBSCRIBE_STOCKS: '/api/swing/subscribe-stocks',
  UNSUBSCRIBE_STOCKS: '/api/swing/unsubscribe-stocks',
  
  // Enhanced features
  TECHNICAL_INDICATORS: '/api/swing/technical-indicators',
  AI_SCORE_UPDATE: '/api/swing/ai-score-update',
  PRICE_ALERTS: '/api/swing/price-alerts',
  VOLUME_ALERTS: '/api/swing/volume-alerts',
  
  // Health and status
  HEALTH_CHECK: '/api/swing/health',
  STATUS: '/api/swing/status'
};

// Recommendation types
export enum RecommendationType {
  SWING_AI = 'swing_ai',
  SWING = 'swing',
  INTRADAY = 'intraday',
  LONGTERM = 'longterm',
  SHORTTERM = 'shortterm'
}

// Unified request interface
export interface UnifiedRecommendationRequest {
  type: RecommendationType;
  limit?: number;
  min_score?: number;
  force_refresh?: boolean;
  include_real_time_prices?: boolean;
  include_technical_indicators?: boolean;
  include_alerts?: boolean;
  update_interval?: number; // seconds
  // Strategy-specific parameters
  strategy_params?: {
    momentum_threshold?: number;
    volume_threshold?: number;
    risk_level?: 'low' | 'medium' | 'high';
    holding_period?: number; // days
    [key: string]: any;
  };
}

// Enhanced real-time price data
export interface EnhancedRealTimePrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  bid: number;
  ask: number;
  timestamp: string;
  realTime: boolean;
  
  // Enhanced features
  priceAlert?: boolean;
  volumeAlert?: boolean;
  technicalIndicators?: {
    rsi: number;
    macd: string;
    bollingerBands: string;
    movingAverages: string;
    support: number;
    resistance: number;
  };
  aiScore?: number;
  recommendation?: 'buy' | 'sell' | 'hold';
  riskLevel?: 'low' | 'medium' | 'high';
  confidence?: number;
  
  // Alert details
  alerts?: {
    priceChange?: {
      threshold: number;
      triggered: boolean;
      message: string;
    };
    volumeSpike?: {
      threshold: number;
      triggered: boolean;
      message: string;
    };
    technicalSignal?: {
      type: string;
      triggered: boolean;
      message: string;
    };
  };
}

// Unified recommendation interface
export interface UnifiedRecommendation {
  symbol: string;
  companyName: string;
  score: number;
  target: number;
  stopLoss: number;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: string;
  sector: string;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  lastUpdated: string;
  technicalSignals: string[];
  fundamentalScore: number;
  technicalScore: number;
  momentumScore: number;
  volumeScore: number;
  realTimeData?: boolean;
  chartUrl?: string;
  
  // Strategy-specific data
  strategyType: RecommendationType;
  holdingPeriod?: number; // days
  entryPrice?: number;
  exitStrategy?: string;
  
  // Enhanced real-time data
  enhancedPriceData?: EnhancedRealTimePrice;
  priceAlert?: boolean;
  volumeAlert?: boolean;
  technicalIndicators?: {
    rsi: number;
    macd: string;
    bollingerBands: string;
    movingAverages: string;
  };
  aiScore?: number;
  recommendation?: 'buy' | 'sell' | 'hold';
}

// Unified response interface
export interface UnifiedRecommendationResponse {
  success: boolean;
  data: {
    recommendations: UnifiedRecommendation[];
    summary: {
      total_recommendations: number;
      average_score: number;
      market_sentiment: string;
      cache_status: string;
      generated_at: string;
      strategy_type: RecommendationType;
    };
    metadata: {
      request_params: UnifiedRecommendationRequest;
      processing_time: number;
      cache_hit: boolean;
      market_context: {
        sentiment: string;
        vix: number;
        nifty_trend: string;
      };
      real_time_data: {
        symbols_with_real_time: number;
        total_symbols: number;
        last_update: string;
      };
    };
  };
  error?: string;
}

// Connection status interface
export interface ConnectionStatus {
  connected: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastUpdate: string;
  ticksReceived: number;
  activeSubscriptions: number;
  errors: number;
  serviceStats?: {
    websocket_state: string;
    active_subscriptions: number;
    connection_manager: {
      ticks_received: number;
      ticks_distributed: number;
      errors: number;
    };
  };
}

// Subscription request interface
export interface StockSubscriptionRequest {
  symbols: string[];
  category: string;
  subscriberId: string;
  priority?: number;
  strategy_type?: RecommendationType;
}

// Health response interface
export interface HealthResponse {
  success: boolean;
  data: {
    status: string;
    timestamp: string;
    services: {
      chartink: boolean;
      weighted_ranker: boolean;
      market_context: boolean;
      zerodha_connection: boolean;
      ohlc_cache: boolean;
      stock_metadata: boolean;
    };
  };
  error?: string;
}

class UnifiedRecommendationService {
  private api: AxiosInstance;
  private activeSubscriptions: Set<string> = new Set();
  private priceUpdateCallbacks: Map<string, Set<(data: EnhancedRealTimePrice) => void>> = new Map();

  constructor() {
    console.log('🔧 Initializing UnifiedRecommendationService with base URL:', API_BASE_URL);
    
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    attachAxiosLogging(this.api, 'UnifiedRecommendationAPI');

    // Request interceptor for logging + meta headers
    this.api.interceptors.request.use((config) => {
      const mergedHeaders = { ...((config.headers || {}) as any), ...getMetaHeaders('/unified') };
      (config as any).headers = mergedHeaders;
      console.log('📡 API Request:', config.method?.toUpperCase(), config.url, config.params);
      return config;
    });

    // Response interceptor for logging
    this.api.interceptors.response.use(
      (response) => {
        console.log('✅ API Response:', response.status, response.config.url);
        return response;
      },
      (error) => {
        console.error('❌ API Error:', error.response?.status, error.response?.data, error.config?.url);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get unified recommendations for any strategy type
   */
  async getRecommendations(request: UnifiedRecommendationRequest): Promise<UnifiedRecommendationResponse> {
    try {
      console.log('🎯 Fetching unified recommendations:', request);
      
      // Determine the appropriate endpoint based on recommendation type
      const endpoint = this.getEndpointForType(request.type);
      
      const response = await this.api.get(endpoint, {
        params: {
          limit: request.limit || 50,
          min_score: request.min_score || 10.0,
          force_refresh: request.force_refresh || false,
          include_real_time_prices: request.include_real_time_prices || false,
          include_technical_indicators: request.include_technical_indicators || false,
          include_alerts: request.include_alerts || false,
          ...request.strategy_params
        }
      });

      // Transform the response to unified format
      const unifiedResponse = this.transformToUnifiedFormat(response.data, request.type);
      
      // If real-time prices are requested, enhance the data
      if (request.include_real_time_prices && unifiedResponse.success) {
        await this.enhanceWithRealTimeData(unifiedResponse.data.recommendations);
      }

      return unifiedResponse;
    } catch (error: any) {
      console.error('❌ Error fetching unified recommendations:', error);
      // Construct a unified error response
      return {
        success: false,
        data: {
            recommendations: [],
            summary: {
                total_recommendations: 0,
                average_score: 0,
                market_sentiment: 'unknown',
                cache_status: 'error',
                generated_at: new Date().toISOString(),
                strategy_type: request.type
            },
            metadata: {
                request_params: request,
                processing_time: 0,
                cache_hit: false,
                market_context: { sentiment: 'unknown', vix: 0, nifty_trend: 'unknown' },
                real_time_data: { symbols_with_real_time: 0, total_symbols: 0, last_update: '' }
            }
        },
        error: `Failed to fetch ${request.type} recommendations: ${error.message}`
      };
    }
  }

  /**
   * Get real-time prices for symbols
   */
  async getRealTimePrices(symbols: string[]): Promise<{ success: boolean; data: Record<string, EnhancedRealTimePrice>; error?: string }> {
    try {
      const symbolsParam = symbols.join(',');
      const response = await this.api.get(ENDPOINT_CONFIG.REAL_TIME_PRICES, {
        params: { symbols: symbolsParam }
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching real-time prices:', error);
      return { success: false, data: {}, error: error.message };
    }
  }

  /**
   * Subscribe to real-time stock updates
   */
  async subscribeStocks(request: StockSubscriptionRequest): Promise<{ success: boolean; data: any; error?: string }> {
    try {
      const response = await this.api.post(ENDPOINT_CONFIG.SUBSCRIBE_STOCKS, request);
      
      // Track active subscriptions
      request.symbols.forEach(symbol => this.activeSubscriptions.add(symbol));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Error subscribing to stocks:', error);
      return { success: false, data: {}, error: error.message };
    }
  }

  /**
   * Unsubscribe from real-time stock updates
   */
  async unsubscribeStocks(request: StockSubscriptionRequest): Promise<{ success: boolean; data: any; error?: string }> {
    try {
      const response = await this.api.delete(ENDPOINT_CONFIG.UNSUBSCRIBE_STOCKS, {
        data: request
      });
      
      // Remove from active subscriptions
      request.symbols.forEach(symbol => this.activeSubscriptions.delete(symbol));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Error unsubscribing from stocks:', error);
      return { success: false, data: {}, error: error.message };
    }
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(): Promise<ConnectionStatus> {
    try {
      const response = await this.api.get(ENDPOINT_CONFIG.TRACKING_STATUS);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching connection status:', error);
      throw new Error('Failed to fetch connection status');
    }
  }

  /**
   * Check API health
   */
  async healthCheck(): Promise<HealthResponse> {
    try {
      const response = await this.api.get(ENDPOINT_CONFIG.HEALTH_CHECK);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error checking health:', error);
      throw new Error('Failed to check health status');
    }
  }

  /**
   * Subscribe to price updates for a specific symbol
   */
  subscribeToPriceUpdates(symbol: string, callback: (data: EnhancedRealTimePrice) => void): void {
    if (!this.priceUpdateCallbacks.has(symbol)) {
      this.priceUpdateCallbacks.set(symbol, new Set());
    }
    this.priceUpdateCallbacks.get(symbol)!.add(callback);
  }

  /**
   * Unsubscribe from price updates for a specific symbol
   */
  unsubscribeFromPriceUpdates(symbol: string, callback: (data: EnhancedRealTimePrice) => void): void {
    const callbacks = this.priceUpdateCallbacks.get(symbol);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.priceUpdateCallbacks.delete(symbol);
      }
    }
  }

  /**
   * Get comprehensive data for symbols (prices + indicators + alerts)
   */
  async getComprehensiveData(symbols: string[]): Promise<{ success: boolean; data: Record<string, EnhancedRealTimePrice>; error?: string }> {
    try {
      console.log('🔍 Getting comprehensive data for symbols:', symbols);
      
      // Get real-time prices
      const priceResponse = await this.getRealTimePrices(symbols);
      if (!priceResponse.success) {
        return priceResponse;
      }

      const enhancedData = priceResponse.data;

      // Get technical indicators for each symbol
      const technicalPromises = symbols.map(symbol => this.getTechnicalIndicators(symbol));
      const technicalResults = await Promise.allSettled(technicalPromises);

      // Get AI score updates for each symbol
      const aiScorePromises = symbols.map(symbol => this.getAIScoreUpdate(symbol));
      const aiScoreResults = await Promise.allSettled(aiScorePromises);

      // Get alerts
      const alertsPromises = [
        this.getPriceAlerts(symbols),
        this.getVolumeAlerts(symbols)
      ];
      const alertsResults = await Promise.allSettled(alertsPromises);

      // Combine all data
      symbols.forEach((symbol, index) => {
        if (enhancedData[symbol]) {
          // Add technical indicators
          if (technicalResults[index].status === 'fulfilled') {
            const techData = (technicalResults[index] as PromiseFulfilledResult<any>).value;
            if (techData.success) {
              enhancedData[symbol].technicalIndicators = {
                rsi: techData.data.indicators.rsi,
                macd: techData.data.indicators.macd.trend,
                bollingerBands: techData.data.indicators.bollingerBands.position,
                movingAverages: techData.data.indicators.movingAverages.trend,
                support: techData.data.indicators.support,
                resistance: techData.data.indicators.resistance
              };
            }
          }

          // Add AI score
          if (aiScoreResults[index].status === 'fulfilled') {
            const aiData = (aiScoreResults[index] as PromiseFulfilledResult<any>).value;
            if (aiData.success) {
              enhancedData[symbol].aiScore = aiData.data.aiScore;
              enhancedData[symbol].recommendation = aiData.data.recommendation;
              enhancedData[symbol].confidence = aiData.data.confidence;
            }
          }
        }
      });

      // Add alerts
      if (alertsResults[0].status === 'fulfilled') {
        const priceAlerts = (alertsResults[0] as PromiseFulfilledResult<any>).value;
        if (priceAlerts.success) {
          Object.entries(priceAlerts.data).forEach(([symbol, alertData]: [string, any]) => {
            if (enhancedData[symbol]) {
              enhancedData[symbol].priceAlert = alertData.triggered;
              enhancedData[symbol].alerts = {
                ...enhancedData[symbol].alerts,
                priceChange: alertData
              };
            }
          });
        }
      }

      if (alertsResults[1].status === 'fulfilled') {
        const volumeAlerts = (alertsResults[1] as PromiseFulfilledResult<any>).value;
        if (volumeAlerts.success) {
          Object.entries(volumeAlerts.data).forEach(([symbol, alertData]: [string, any]) => {
            if (enhancedData[symbol]) {
              enhancedData[symbol].volumeAlert = alertData.triggered;
              enhancedData[symbol].alerts = {
                ...enhancedData[symbol].alerts,
                volumeSpike: alertData
              };
            }
          });
        }
      }

      return { success: true, data: enhancedData };
    } catch (error: any) {
      console.error('❌ Error getting comprehensive data:', error);
      return { success: false, data: {}, error: error.message };
    }
  }

  /**
   * Get technical indicators for a symbol
   */
  async getTechnicalIndicators(symbol: string): Promise<any> {
    try {
      const response = await this.api.get(ENDPOINT_CONFIG.TECHNICAL_INDICATORS, {
        params: { symbol }
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error getting technical indicators:', error);
      return { success: false, data: {}, error: error.message };
    }
  }

  /**
   * Get AI score update for a symbol
   */
  async getAIScoreUpdate(symbol: string): Promise<any> {
    try {
      const response = await this.api.get(ENDPOINT_CONFIG.AI_SCORE_UPDATE, {
        params: { symbol }
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error getting AI score update:', error);
      return { success: false, data: {}, error: error.message };
    }
  }

  /**
   * Get price alerts for symbols
   */
  async getPriceAlerts(symbols: string[]): Promise<any> {
    try {
      const symbolList = symbols.join(',');
      const response = await this.api.get(ENDPOINT_CONFIG.PRICE_ALERTS, {
        params: { symbols: symbolList }
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error getting price alerts:', error);
      return { success: false, data: {}, error: error.message };
    }
  }

  /**
   * Get volume alerts for symbols
   */
  async getVolumeAlerts(symbols: string[]): Promise<any> {
    try {
      const symbolList = symbols.join(',');
      const response = await this.api.get(ENDPOINT_CONFIG.VOLUME_ALERTS, {
        params: { symbols: symbolList }
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error getting volume alerts:', error);
      return { success: false, data: {}, error: error.message };
    }
  }

  /**
   * Get endpoint for recommendation type
   */
  private getEndpointForType(type: RecommendationType): string {
    switch (type) {
      case RecommendationType.SWING_AI:
        return ENDPOINT_CONFIG.SWING_AI_RECOMMENDATIONS;
      case RecommendationType.SWING:
        return ENDPOINT_CONFIG.SWING_RECOMMENDATIONS;
      case RecommendationType.INTRADAY:
        return ENDPOINT_CONFIG.INTRADAY_RECOMMENDATIONS;
      case RecommendationType.LONGTERM:
        return ENDPOINT_CONFIG.LONGTERM_RECOMMENDATIONS;
      case RecommendationType.SHORTTERM:
        return ENDPOINT_CONFIG.SHORTTERM_RECOMMENDATIONS;
      default:
        return ENDPOINT_CONFIG.SWING_AI_RECOMMENDATIONS;
    }
  }

  /**
   * Transform response to unified format
   */
  private transformToUnifiedFormat(response: any, type: RecommendationType): UnifiedRecommendationResponse {
    if (!response.success) {
      return {
        success: false,
        data: {
          recommendations: [],
          summary: {
            total_recommendations: 0,
            average_score: 0,
            market_sentiment: 'unknown',
            cache_status: 'unknown',
            generated_at: new Date().toISOString(),
            strategy_type: type
          },
          metadata: {
            request_params: { type },
            processing_time: 0,
            cache_hit: false,
            market_context: {
              sentiment: 'unknown',
              vix: 0,
              nifty_trend: 'unknown'
            },
            real_time_data: {
              symbols_with_real_time: 0,
              total_symbols: 0,
              last_update: new Date().toISOString()
            }
          }
        },
        error: response.error
      };
    }

    const recommendations: UnifiedRecommendation[] = response.data.recommendations.map((rec: any) => ({
      ...rec,
      strategyType: type,
      enhancedPriceData: undefined, // Will be populated later if needed
      priceAlert: false,
      volumeAlert: false,
      technicalIndicators: undefined,
      aiScore: undefined,
      recommendation: undefined
    }));

    return {
      success: true,
      data: {
        recommendations,
        summary: {
          ...response.data.summary,
          strategy_type: type
        },
        metadata: {
          ...response.data.metadata,
          request_params: { type, ...response.data.metadata?.request_params },
          real_time_data: {
            symbols_with_real_time: 0,
            total_symbols: recommendations.length,
            last_update: new Date().toISOString()
          }
        }
      }
    };
  }

  /**
   * Enhance recommendations with real-time data
   */
  private async enhanceWithRealTimeData(recommendations: UnifiedRecommendation[]): Promise<void> {
    const symbols = recommendations.map(rec => rec.symbol);
    const realTimeData = await this.getRealTimePrices(symbols);
    
    if (realTimeData.success) {
      recommendations.forEach(rec => {
        if (realTimeData.data[rec.symbol]) {
          rec.enhancedPriceData = realTimeData.data[rec.symbol];
          rec.realTimeData = true;
          
          // Update current price if real-time data is available
          if (realTimeData.data[rec.symbol].price > 0) {
            rec.currentPrice = realTimeData.data[rec.symbol].price;
            rec.change = realTimeData.data[rec.symbol].change;
            rec.changePercent = realTimeData.data[rec.symbol].changePercent;
            rec.volume = realTimeData.data[rec.symbol].volume;
          }
        }
      });
    }
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions(): Set<string> {
    return new Set(this.activeSubscriptions);
  }

  /**
   * Test connection to the API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.api.get(ENDPOINT_CONFIG.HEALTH_CHECK);
      return response.status === 200;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const unifiedRecommendationService = new UnifiedRecommendationService();

export default unifiedRecommendationService; 