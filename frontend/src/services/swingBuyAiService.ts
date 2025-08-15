/**
 * Enhanced Swing Buy AI Service
 * Handles communication with the Swing Buy AI API endpoints
 * Now with enhanced real-time price functionality
 */

import axios, { AxiosInstance } from 'axios';

// API base URL - use relative URLs in development to work with proxy
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8002')
  : '';

// Environment-based endpoint configuration
const ENDPOINT_CONFIG = {
  SWING_RECOMMENDATIONS: '/api/strategy/recommendations',
  AI_RECOMMENDATIONS: '/api/swing/ai-recommendations',
  TRACKING_STATUS: '/api/swing/tracking-status',
  REAL_TIME_PRICES: '/api/swing/real-time-prices',
  SUBSCRIBE_STOCKS: '/api/swing/subscribe-stocks',
  UNSUBSCRIBE_STOCKS: '/api/swing/unsubscribe-stocks',
  HEALTH_CHECK: '/api/swing/health',
  STATUS: '/api/swing/status',
  // NEW: Enhanced endpoints
  TECHNICAL_INDICATORS: '/api/swing/technical-indicators',
  AI_SCORE_UPDATE: '/api/swing/ai-score-update',
  PRICE_ALERTS: '/api/swing/price-alerts',
  VOLUME_ALERTS: '/api/swing/volume-alerts'
};

export interface SwingBuyAIRequest {
  limit?: number;
  min_score?: number;
  force_refresh?: boolean;
  combination?: Record<string, string>;
  limit_per_query?: number;
  top_recommendations?: number;
  // NEW: Enhanced parameters
  include_technical_indicators?: boolean;
  include_price_alerts?: boolean;
  include_volume_alerts?: boolean;
  update_interval?: number; // seconds
}

// NEW: Enhanced real-time price data interface
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
  // NEW: Enhanced features
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
  // NEW: Alert details
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

// NEW: Price alert configuration
export interface PriceAlertConfig {
  symbol: string;
  priceThreshold: number;
  volumeThreshold: number;
  rsiThreshold: number;
  enabled: boolean;
}

// NEW: Technical indicators response
export interface TechnicalIndicatorsResponse {
  success: boolean;
  data: {
    symbol: string;
    indicators: {
      rsi: number;
      macd: {
        value: number;
        signal: number;
        histogram: number;
        trend: 'bullish' | 'bearish' | 'neutral';
      };
      bollingerBands: {
        upper: number;
        middle: number;
        lower: number;
        position: 'upper' | 'middle' | 'lower';
      };
      movingAverages: {
        sma20: number;
        sma50: number;
        ema12: number;
        ema26: number;
        trend: 'bullish' | 'bearish' | 'neutral';
      };
      support: number;
      resistance: number;
    };
    timestamp: string;
  };
  error?: string;
}

// NEW: AI score update response
export interface AIScoreUpdateResponse {
  success: boolean;
  data: {
    symbol: string;
    aiScore: number;
    recommendation: 'buy' | 'sell' | 'hold';
    confidence: number;
    factors: {
      technical: number;
      fundamental: number;
      sentiment: number;
      momentum: number;
    };
    timestamp: string;
  };
  error?: string;
}

export interface SwingBuyAIRecommendation {
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
  priceDetails?: {
    bid?: number;
    ask?: number;
    high?: number;
    low?: number;
    open?: number;
  };
  // NEW: Enhanced features
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

export interface SwingBuyAIResponse {
  success: boolean;
  data: {
    recommendations: SwingBuyAIRecommendation[];
    summary: {
      total_recommendations: number;
      average_score: number;
      market_sentiment: string;
      cache_status: string;
      generated_at: string;
    };
    metadata: {
      request_params: SwingBuyAIRequest;
      processing_time: number;
      cache_hit: boolean;
      market_context: {
        sentiment: string;
        vix: number;
        nifty_trend: string;
      };
    };
  };
  error?: string;
}

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

export interface StockSubscriptionRequest {
  symbols: string[];
  category: string;
  subscriberId: string;
  priority?: number;
}

export interface StockSubscriptionResponse {
  success: boolean;
  data: {
    subscribed_symbols: string[];
    total_subscriptions: number;
    message: string;
  };
  error?: string;
}

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

class SwingBuyAIService {
  private api: AxiosInstance;

  constructor() {
    console.log('🔧 Initializing SwingBuyAIService with base URL:', API_BASE_URL);
    console.log('🔧 Node environment:', process.env.NODE_ENV);
    
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Request interceptor for logging
    this.api.interceptors.request.use((config) => {
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
   * Get AI-powered swing trading recommendations
   */
  async getAIRecommendations(params: SwingBuyAIRequest = {}): Promise<SwingBuyAIResponse> {
    try {
      console.log('🤖 Fetching AI recommendations with params:', params);
      console.log('🤖 Using endpoint:', ENDPOINT_CONFIG.AI_RECOMMENDATIONS);
      
      const response = await this.api.get(ENDPOINT_CONFIG.AI_RECOMMENDATIONS, {
        params: {
          limit: params.limit || 50,
          min_score: params.min_score || 10.0,
          force_refresh: params.force_refresh || false
        }
      });

      console.log('✅ AI recommendations response:', response.status, response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching AI recommendations:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      throw new Error(`Failed to fetch AI recommendations: ${error.message}`);
    }
  }

  /**
   * Get swing recommendations from cache (legacy endpoint)
   */
  async getSwingRecommendations(params: SwingBuyAIRequest = {}): Promise<SwingBuyAIResponse> {
    try {
      const defaultParams: SwingBuyAIRequest = {
        limit: 50,
        min_score: 70.0,
        force_refresh: false,
        ...params
      };

      const response = await this.api.post(ENDPOINT_CONFIG.SWING_RECOMMENDATIONS, {
        strategy_type: 'swing-buy',
        ...defaultParams
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching swing recommendations:', error);
      throw new Error('Failed to fetch swing recommendations');
    }
  }

  /**
   * Get real-time connection status
   */
  async getTrackingStatus(): Promise<ConnectionStatus> {
    try {
      const response = await this.api.get(ENDPOINT_CONFIG.TRACKING_STATUS);
      return response.data;
    } catch (error) {
      console.error('Error fetching tracking status:', error);
      throw new Error('Failed to fetch tracking status');
    }
  }

  /**
   * Get real-time prices for symbols
   */
  async getRealTimePrices(symbols: string[]): Promise<RealTimePricesResponse> {
    try {
      const symbolsParam = symbols.join(',');
      const response = await this.api.get(ENDPOINT_CONFIG.REAL_TIME_PRICES, {
        params: { symbols: symbolsParam }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching real-time prices:', error);
      throw new Error('Failed to fetch real-time prices');
    }
  }

  /**
   * Subscribe to real-time stock updates
   */
  async subscribeStocks(request: StockSubscriptionRequest): Promise<StockSubscriptionResponse> {
    try {
      const response = await this.api.post(ENDPOINT_CONFIG.SUBSCRIBE_STOCKS, request);
      return response.data;
    } catch (error) {
      console.error('Error subscribing to stocks:', error);
      throw new Error('Failed to subscribe to stocks');
    }
  }

  /**
   * Unsubscribe from real-time stock updates
   */
  async unsubscribeStocks(request: StockSubscriptionRequest): Promise<StockSubscriptionResponse> {
    try {
      const response = await this.api.delete(ENDPOINT_CONFIG.UNSUBSCRIBE_STOCKS, {
        data: request
      });
      return response.data;
    } catch (error) {
      console.error('Error unsubscribing from stocks:', error);
      throw new Error('Failed to unsubscribe from stocks');
    }
  }

  /**
   * Check API health status
   */
  async healthCheck(): Promise<HealthResponse> {
    try {
      const response = await this.api.get(ENDPOINT_CONFIG.HEALTH_CHECK);
      return response.data;
    } catch (error) {
      console.error('Error checking health:', error);
      throw new Error('Failed to check health status');
    }
  }

  /**
   * Get detailed service status
   */
  async getStatus(): Promise<any> {
    try {
      const response = await this.api.get(ENDPOINT_CONFIG.STATUS);
      return response.data;
    } catch (error) {
      console.error('Error fetching status:', error);
      throw new Error('Failed to fetch status');
    }
  }

  /**
   * Test connection to the API
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing connection to Swing Buy AI API...');
      console.log('🔍 Using base URL:', API_BASE_URL);
      console.log('🔍 Health check endpoint:', ENDPOINT_CONFIG.HEALTH_CHECK);
      
      const response = await this.api.get(ENDPOINT_CONFIG.HEALTH_CHECK);
      console.log('✅ Connection test successful:', response.status, response.data);
      return true;
    } catch (error: any) {
      console.error('❌ Connection test failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      return false;
    }
  }

  /**
   * Get enhanced real-time prices with technical indicators and alerts
   */
  async getEnhancedRealTimePrices(symbols: string[]): Promise<{ success: boolean; data: Record<string, EnhancedRealTimePrice>; error?: string }> {
    try {
      console.log('📊 Getting enhanced real-time prices for symbols:', symbols);
      
      const symbolList = symbols.join(',');
      const response = await this.api.get(ENDPOINT_CONFIG.REAL_TIME_PRICES, {
        params: { symbols: symbolList }
      });

      // Transform the response to include enhanced features
      const enhancedData: Record<string, EnhancedRealTimePrice> = {};
      
      for (const [symbol, priceData] of Object.entries(response.data.data)) {
        const data = priceData as any;
        enhancedData[symbol] = {
          symbol,
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          volume: data.volume,
          high: data.high,
          low: data.low,
          open: data.open,
          bid: data.bid,
          ask: data.ask,
          timestamp: data.timestamp,
          realTime: data.realTime,
          // Enhanced features will be populated by separate API calls
          priceAlert: false,
          volumeAlert: false,
          aiScore: 0,
          recommendation: 'hold'
        };
      }

      return { success: true, data: enhancedData };
    } catch (error: any) {
      console.error('❌ Error getting enhanced real-time prices:', error);
      return { success: false, data: {}, error: error.message };
    }
  }

  /**
   * Get technical indicators for a symbol
   */
  async getTechnicalIndicators(symbol: string): Promise<TechnicalIndicatorsResponse> {
    try {
      console.log('📈 Getting technical indicators for:', symbol);
      
      const response = await this.api.get(ENDPOINT_CONFIG.TECHNICAL_INDICATORS, {
        params: { symbol }
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Error getting technical indicators:', error);
      return {
        success: false,
        data: {
          symbol,
          indicators: {
            rsi: 0,
            macd: { value: 0, signal: 0, histogram: 0, trend: 'neutral' },
            bollingerBands: { upper: 0, middle: 0, lower: 0, position: 'middle' },
            movingAverages: { sma20: 0, sma50: 0, ema12: 0, ema26: 0, trend: 'neutral' },
            support: 0,
            resistance: 0
          },
          timestamp: new Date().toISOString()
        },
        error: error.message
      };
    }
  }

  /**
   * Get AI score update for a symbol
   */
  async getAIScoreUpdate(symbol: string): Promise<AIScoreUpdateResponse> {
    try {
      console.log('🤖 Getting AI score update for:', symbol);
      
      const response = await this.api.get(ENDPOINT_CONFIG.AI_SCORE_UPDATE, {
        params: { symbol }
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Error getting AI score update:', error);
      return {
        success: false,
        data: {
          symbol,
          aiScore: 0,
          recommendation: 'hold',
          confidence: 0,
          factors: { technical: 0, fundamental: 0, sentiment: 0, momentum: 0 },
          timestamp: new Date().toISOString()
        },
        error: error.message
      };
    }
  }

  /**
   * Get price alerts for symbols
   */
  async getPriceAlerts(symbols: string[]): Promise<{ success: boolean; data: Record<string, any>; error?: string }> {
    try {
      console.log('🚨 Getting price alerts for symbols:', symbols);
      
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
  async getVolumeAlerts(symbols: string[]): Promise<{ success: boolean; data: Record<string, any>; error?: string }> {
    try {
      console.log('📊 Getting volume alerts for symbols:', symbols);
      
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
   * Get comprehensive enhanced data for symbols (prices + indicators + alerts)
   */
  async getComprehensiveData(symbols: string[]): Promise<{ success: boolean; data: Record<string, EnhancedRealTimePrice>; error?: string }> {
    try {
      console.log('🔍 Getting comprehensive data for symbols:', symbols);
      
      // Get enhanced real-time prices
      const priceResponse = await this.getEnhancedRealTimePrices(symbols);
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
            const techData = (technicalResults[index] as PromiseFulfilledResult<TechnicalIndicatorsResponse>).value;
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
            const aiData = (aiScoreResults[index] as PromiseFulfilledResult<AIScoreUpdateResponse>).value;
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
   * Set up price alert configuration
   */
  async setPriceAlertConfig(config: PriceAlertConfig): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      console.log('🔔 Setting price alert config for:', config.symbol);
      
      const response = await this.api.post(ENDPOINT_CONFIG.PRICE_ALERTS, config);
      return { success: true, message: response.data.message };
    } catch (error: any) {
      console.error('❌ Error setting price alert config:', error);
      return { success: false, message: 'Failed to set alert config', error: error.message };
    }
  }

  /**
   * Get endpoint configuration
   */
  getEndpointConfig() {
    return ENDPOINT_CONFIG;
  }
}

// Export singleton instance
export const swingBuyAIService = new SwingBuyAIService();

export default swingBuyAIService; 