/**
 * Market Context Service
 * Handles market intelligence, stock data, and trading analysis from Kite Services
 */

import axios, { AxiosResponse } from 'axios';
import { API_CONFIG } from '../config/api';
import { buildUrl } from '../config/openaiConfig';
import { logApiRequest, logApiResponse } from '../config/api';

// Market Intelligence Types
export interface MarketIntelligence {
  trading_environment_score: number;
  nifty_intelligence: {
    primary_trend: string;
    current_level: number;
    change_percent: number;
    support_levels: number[];
    resistance_levels: number[];
  };
  sector_leadership: Array<{
    sector: string;
    score: number;
    trend: string;
  }>;
  global_sentiment: {
    risk_on: boolean;
    sentiment_score: number;
    major_events: string[];
  };
  market_volatility: {
    vix_level: number;
    volatility_trend: string;
  };
  timestamp: string;
}

export interface MarketIntelligenceFeatures {
  features: Record<string, any>;
  timestamp: string;
}

// Stock Data Types
export interface StockDataRequest {
  symbols: string[];
  exchange: string;
}

export interface StockData {
  symbol: string;
  last_price: number;
  change: number;
  change_percent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
  timestamp: string;
}

export interface StockDataResponse {
  timestamp: string;
  successful_symbols: number;
  failed_symbols: number;
  stocks: StockData[];
  errors?: string[];
}

// Trading Analysis Types
export interface SwingAnalysis {
  symbol: string;
  analysis_timestamp: string;
  swing_signals: Array<{
    signal_type: string;
    strength: number;
    direction: string;
    entry_price: number;
    stop_loss: number;
    target_price: number;
    confidence: number;
  }>;
  technical_indicators: Record<string, any>;
  market_context: Record<string, any>;
}

export interface UnifiedAnalysisRequest {
  symbol: string;
  horizon: 'intraday' | 'swing' | 'positional';
}

export interface UnifiedAnalysis {
  symbol: string;
  horizon: string;
  analysis_timestamp: string;
  signals: Array<{
    type: string;
    strength: number;
    direction: string;
    confidence: number;
  }>;
  technical_analysis: Record<string, any>;
  fundamental_analysis: Record<string, any>;
  risk_assessment: Record<string, any>;
}

// Data Quality Types
export interface SystemHealth {
  system_quality_score: number | null;
  ml_readiness_score: number | null;
  data_freshness: number;
  system_status: string;
  timestamp: string;
}

export interface TechnicalAnalysisReadiness {
  indicators_available: string[];
  data_quality_score: number;
  technical_analysis_ready: boolean;
  timestamp: string;
}

export interface MLReadiness {
  features_available: string[];
  data_quality_score: number;
  ml_ready: boolean;
  timestamp: string;
}

// Intraday Trading Types
export interface IntradaySignals {
  symbol: string;
  signals_count: number;
  signals: Array<{
    type: string;
    strength: number;
    direction: string;
    entry_price: number;
    stop_loss: number;
    target_price: number;
    confidence: number;
  }>;
  timestamp: string;
}

export interface MomentumScanner {
  momentum_signals: Array<{
    symbol: string;
    momentum_score: number;
    direction: string;
    volume_spike: boolean;
    breakout_potential: number;
  }>;
  timestamp: string;
}

export interface ScalpingOpportunities {
  scalping_opportunities: Array<{
    symbol: string;
    entry_price: number;
    target_price: number;
    stop_loss: number;
    time_horizon: string;
    confidence: number;
  }>;
  timestamp: string;
}

class MarketContextService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.KITE_SERVICES_BASE_URL;
  }

  /**
   * Get V3 Market Intelligence
   */
  async getMarketIntelligence(horizon: 'intraday' | 'swing' | 'positional' = 'swing'): Promise<MarketIntelligence> {
    const endpoint = buildUrl('kite', 'v3MarketIntelligence', `horizon=${horizon}`);
    const requestId = logApiRequest('GET', endpoint);

    try {
      const response: AxiosResponse<MarketIntelligence> = await axios.get(endpoint, {
        timeout: API_CONFIG.REQUEST.TIMEOUT,
      });

      logApiResponse(requestId, response.status, response.data);
      return response.data;
    } catch (error) {
      const status = axios.isAxiosError(error) && error.response ? error.response.status : 500;
      const err = error instanceof Error ? error : new Error('Unknown error');
      logApiResponse(requestId, status, null, err);
      throw err;
    }
  }

  /**
   * Get V3 Market Intelligence Features Only
   */
  async getMarketIntelligenceFeatures(horizon: 'intraday' | 'swing' | 'positional' = 'swing'): Promise<MarketIntelligenceFeatures> {
    const endpoint = buildUrl('kite', 'v3FeaturesOnly', `horizon=${horizon}`);
    const requestId = logApiRequest('GET', endpoint);

    try {
      const response: AxiosResponse<MarketIntelligenceFeatures> = await axios.get(endpoint, {
        timeout: API_CONFIG.REQUEST.TIMEOUT,
      });

      logApiResponse(requestId, response.status, response.data);
      return response.data;
    } catch (error) {
      const status = axios.isAxiosError(error) && error.response ? error.response.status : 500;
      const err = error instanceof Error ? error : new Error('Unknown error');
      logApiResponse(requestId, status, null, err);
      throw err;
    }
  }

  /**
   * Get Real-time Stock Data
   */
  async getRealTimeStockData(request: StockDataRequest): Promise<StockDataResponse> {
    const endpoint = buildUrl('kite', 'stockDataRealTime');
    const requestId = logApiRequest('POST', endpoint, request);

    try {
      const response: AxiosResponse<StockDataResponse> = await axios.post(endpoint, request, {
        headers: { 'Content-Type': 'application/json' },
        timeout: API_CONFIG.REQUEST.TIMEOUT,
      });

      logApiResponse(requestId, response.status, response.data);
      return response.data;
    } catch (error) {
      const status = axios.isAxiosError(error) && error.response ? error.response.status : 500;
      const err = error instanceof Error ? error : new Error('Unknown error');
      logApiResponse(requestId, status, null, err);
      throw err;
    }
  }

  /**
   * Get Swing Trading Analysis
   */
  async getSwingAnalysis(symbol: string): Promise<SwingAnalysis> {
    const endpoint = buildUrl('kite', 'swingAnalysis', `symbol=${symbol}`);
    const requestId = logApiRequest('GET', endpoint);

    try {
      const response: AxiosResponse<SwingAnalysis> = await axios.get(endpoint, {
        timeout: API_CONFIG.REQUEST.TIMEOUT,
      });

      logApiResponse(requestId, response.status, response.data);
      return response.data;
    } catch (error) {
      const status = axios.isAxiosError(error) && error.response ? error.response.status : 500;
      const err = error instanceof Error ? error : new Error('Unknown error');
      logApiResponse(requestId, status, null, err);
      throw err;
    }
  }

  /**
   * Get Unified Trading Analysis
   */
  async getUnifiedAnalysis(request: UnifiedAnalysisRequest): Promise<UnifiedAnalysis> {
    const endpoint = buildUrl('kite', 'unifiedAnalyze');
    const requestId = logApiRequest('POST', endpoint, request);

    try {
      const response: AxiosResponse<UnifiedAnalysis> = await axios.post(endpoint, request, {
        headers: { 'Content-Type': 'application/json' },
        timeout: API_CONFIG.REQUEST.TIMEOUT,
      });

      logApiResponse(requestId, response.status, response.data);
      return response.data;
    } catch (error) {
      const status = axios.isAxiosError(error) && error.response ? error.response.status : 500;
      const err = error instanceof Error ? error : new Error('Unknown error');
      logApiResponse(requestId, status, null, err);
      throw err;
    }
  }

  /**
   * Get System Health Assessment
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const endpoint = buildUrl('kite', 'dataQualitySystem');
    const requestId = logApiRequest('GET', endpoint);

    try {
      const response: AxiosResponse<SystemHealth> = await axios.get(endpoint, {
        timeout: API_CONFIG.REQUEST.TIMEOUT,
      });

      logApiResponse(requestId, response.status, response.data);
      return response.data;
    } catch (error) {
      const status = axios.isAxiosError(error) && error.response ? error.response.status : 500;
      const err = error instanceof Error ? error : new Error('Unknown error');
      logApiResponse(requestId, status, null, err);
      throw err;
    }
  }

  /**
   * Get Technical Analysis Readiness
   */
  async getTechnicalAnalysisReadiness(): Promise<TechnicalAnalysisReadiness> {
    const endpoint = buildUrl('kite', 'dataQualityTechnical');
    const requestId = logApiRequest('GET', endpoint);

    try {
      const response: AxiosResponse<TechnicalAnalysisReadiness> = await axios.get(endpoint, {
        timeout: API_CONFIG.REQUEST.TIMEOUT,
      });

      logApiResponse(requestId, response.status, response.data);
      return response.data;
    } catch (error) {
      const status = axios.isAxiosError(error) && error.response ? error.response.status : 500;
      const err = error instanceof Error ? error : new Error('Unknown error');
      logApiResponse(requestId, status, null, err);
      throw err;
    }
  }

  /**
   * Get ML Readiness Assessment
   */
  async getMLReadiness(): Promise<MLReadiness> {
    const endpoint = buildUrl('kite', 'dataQualityML');
    const requestId = logApiRequest('GET', endpoint);

    try {
      const response: AxiosResponse<MLReadiness> = await axios.get(endpoint, {
        timeout: API_CONFIG.REQUEST.TIMEOUT,
      });

      logApiResponse(requestId, response.status, response.data);
      return response.data;
    } catch (error) {
      const status = axios.isAxiosError(error) && error.response ? error.response.status : 500;
      const err = error instanceof Error ? error : new Error('Unknown error');
      logApiResponse(requestId, status, null, err);
      throw err;
    }
  }

  /**
   * Get Intraday Trading Signals
   */
  async getIntradaySignals(symbol: string): Promise<IntradaySignals> {
    const endpoint = buildUrl('kite', 'intradaySignals', `symbol=${symbol}`);
    const requestId = logApiRequest('GET', endpoint);

    try {
      const response: AxiosResponse<IntradaySignals> = await axios.get(endpoint, {
        timeout: API_CONFIG.REQUEST.TIMEOUT,
      });

      logApiResponse(requestId, response.status, response.data);
      return response.data;
    } catch (error) {
      const status = axios.isAxiosError(error) && error.response ? error.response.status : 500;
      const err = error instanceof Error ? error : new Error('Unknown error');
      logApiResponse(requestId, status, null, err);
      throw err;
    }
  }

  /**
   * Get Momentum Scanner
   */
  async getMomentumScanner(): Promise<MomentumScanner> {
    const endpoint = buildUrl('kite', 'momentumScanner');
    const requestId = logApiRequest('GET', endpoint);

    try {
      const response: AxiosResponse<MomentumScanner> = await axios.get(endpoint, {
        timeout: API_CONFIG.REQUEST.TIMEOUT,
      });

      logApiResponse(requestId, response.status, response.data);
      return response.data;
    } catch (error) {
      const status = axios.isAxiosError(error) && error.response ? error.response.status : 500;
      const err = error instanceof Error ? error : new Error('Unknown error');
      logApiResponse(requestId, status, null, err);
      throw err;
    }
  }

  /**
   * Get Quick Scalping Opportunities
   */
  async getQuickScalp(symbol: string): Promise<ScalpingOpportunities> {
    const endpoint = buildUrl('kite', 'quickScalp', `symbol=${symbol}`);
    const requestId = logApiRequest('GET', endpoint);

    try {
      const response: AxiosResponse<ScalpingOpportunities> = await axios.get(endpoint, {
        timeout: API_CONFIG.REQUEST.TIMEOUT,
      });

      logApiResponse(requestId, response.status, response.data);
      return response.data;
    } catch (error) {
      const status = axios.isAxiosError(error) && error.response ? error.response.status : 500;
      const err = error instanceof Error ? error : new Error('Unknown error');
      logApiResponse(requestId, status, null, err);
      throw err;
    }
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<{ status: string }> {
    const endpoint = buildUrl('kite', 'health');
    const requestId = logApiRequest('GET', endpoint);

    try {
      const response: AxiosResponse<{ status: string }> = await axios.get(endpoint, {
        timeout: API_CONFIG.REQUEST.TIMEOUT,
      });

      logApiResponse(requestId, response.status, response.data);
      return response.data;
    } catch (error) {
      const status = axios.isAxiosError(error) && error.response ? error.response.status : 500;
      const err = error instanceof Error ? error : new Error('Unknown error');
      logApiResponse(requestId, status, null, err);
      throw err;
    }
  }

  /**
   * Get Service Information
   */
  getServiceInfo() {
    return {
      name: 'Market Context Service',
      baseUrl: this.baseURL,
      endpoints: {
        marketIntelligence: '/api/kite/v3/market-intelligence',
        stockData: '/api/kite/stock-data/real-time',
        swingAnalysis: '/api/kite/swing-trading/analysis',
        unifiedAnalysis: '/api/kite/trading/analyze',
        systemHealth: '/api/kite/data-quality/system-health',
        intradaySignals: '/api/kite/intraday-trading/signals',
        momentumScanner: '/api/kite/intraday-trading/momentum-scanner',
        quickScalp: '/api/kite/intraday-trading/quick-scalp',
        health: '/api/kite/health'
      }
    };
  }
}

// Export singleton instance
export const marketContextService = new MarketContextService();
export default marketContextService;
