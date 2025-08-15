/**
 * Long Term Trading API Service
 * Handles communication with the Long Term Trading API endpoints
 */

import { AbstractAPIService, BaseAPIRequest, BaseAPIResponse } from './BaseAPIService';

export interface LongTermRecommendation {
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
  longTermPotential: number;
  growthProjection: number;
  dividendYield?: number;
  peRatio?: number;
  bookValue?: number;
  debtToEquity?: number;
  roe?: number;
  roa?: number;
}

export interface LongTermRequest extends BaseAPIRequest {
  strategy?: 'value' | 'growth' | 'dividend' | 'momentum' | 'balanced';
  min_market_cap?: number;
  max_pe_ratio?: number;
  min_dividend_yield?: number;
  sector_filter?: string[];
  risk_tolerance?: 'conservative' | 'moderate' | 'aggressive';
  investment_horizon?: number; // months
}

export interface LongTermResponse extends BaseAPIResponse {
  data: {
    recommendations: LongTermRecommendation[];
    summary: {
      total_recommendations: number;
      average_score: number;
      market_sentiment: string;
      cache_status: string;
      generated_at: string;
      strategy_breakdown: {
        value: number;
        growth: number;
        dividend: number;
        momentum: number;
      };
    };
    metadata: {
      request_params: LongTermRequest;
      processing_time: number;
      cache_hit: boolean;
      market_context: {
        sentiment: string;
        vix: number;
        nifty_trend: string;
        sector_performance: Record<string, number>;
      };
    };
  };
}

export interface LongTermAnalysis {
  symbol: string;
  fundamentalAnalysis: {
    peRatio: number;
    pbRatio: number;
    debtToEquity: number;
    roe: number;
    roa: number;
    currentRatio: number;
    quickRatio: number;
    dividendYield: number;
    payoutRatio: number;
  };
  technicalAnalysis: {
    sma50: number;
    sma200: number;
    rsi: number;
    macd: string;
    bollingerBands: string;
    support: number;
    resistance: number;
  };
  growthAnalysis: {
    revenueGrowth: number;
    profitGrowth: number;
    epsGrowth: number;
    bookValueGrowth: number;
    projectedGrowth: number;
  };
  riskAnalysis: {
    beta: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    var95: number;
  };
}

export class LongTermAPIService extends AbstractAPIService {
  constructor() {
    super(
      'longterm-api',
      'Long Term Trading',
      8001,
      {
        HEALTH: '/health',
        STATUS: '/status',
        RECOMMENDATIONS: '/api/longterm/recommendations',
        ANALYSIS: '/api/longterm/analysis',
        STRATEGIES: '/api/longterm/strategies',
        SECTOR_PERFORMANCE: '/api/longterm/sector-performance',
        MARKET_SENTIMENT: '/api/longterm/market-sentiment',
        PORTFOLIO_OPTIMIZATION: '/api/longterm/portfolio-optimization',
        RISK_ANALYSIS: '/api/longterm/risk-analysis',
        GROWTH_PROJECTION: '/api/longterm/growth-projection',
        DIVIDEND_ANALYSIS: '/api/longterm/dividend-analysis'
      }
    );
  }

  /**
   * Get long-term trading recommendations
   */
  async getRecommendations(params: LongTermRequest = {}): Promise<LongTermResponse> {
    try {
      console.log('📈 Fetching long-term recommendations with params:', params);
      
      const response = await this.makePostRequest<LongTermResponse>(
        this.endpoints.RECOMMENDATIONS,
        {
          limit: params.limit || 50,
          min_score: params.min_score || 10.0,
          force_refresh: params.force_refresh || false,
          strategy: params.strategy || 'balanced',
          min_market_cap: params.min_market_cap,
          max_pe_ratio: params.max_pe_ratio,
          min_dividend_yield: params.min_dividend_yield,
          sector_filter: params.sector_filter,
          risk_tolerance: params.risk_tolerance || 'moderate',
          investment_horizon: params.investment_horizon || 24
        }
      );

      console.log('✅ Long-term recommendations response:', response);
      return response;
    } catch (error: any) {
      console.error('❌ Error fetching long-term recommendations:', error);
      throw new Error(`Failed to fetch long-term recommendations: ${error.message}`);
    }
  }

  /**
   * Get detailed analysis for a specific stock
   */
  async getAnalysis(symbol: string): Promise<{ success: boolean; data: LongTermAnalysis; error?: string }> {
    try {
      console.log('📊 Getting long-term analysis for:', symbol);
      
      const response = await this.makeGetRequest<{ success: boolean; data: LongTermAnalysis; error?: string }>(
        `${this.endpoints.ANALYSIS}/${symbol}`
      );

      return response;
    } catch (error: any) {
      console.error('❌ Error getting long-term analysis:', error);
      return {
        success: false,
        data: {} as LongTermAnalysis,
        error: error.message
      };
    }
  }

  /**
   * Get available strategies
   */
  async getStrategies(): Promise<{ success: boolean; data: any[]; error?: string }> {
    try {
      const response = await this.makeGetRequest<{ success: boolean; data: any[]; error?: string }>(
        this.endpoints.STRATEGIES
      );
      return response;
    } catch (error: any) {
      console.error('❌ Error getting strategies:', error);
      return {
        success: false,
        data: [],
        error: error.message
      };
    }
  }

  /**
   * Get sector performance analysis
   */
  async getSectorPerformance(): Promise<{ success: boolean; data: Record<string, number>; error?: string }> {
    try {
      const response = await this.makeGetRequest<{ success: boolean; data: Record<string, number>; error?: string }>(
        this.endpoints.SECTOR_PERFORMANCE
      );
      return response;
    } catch (error: any) {
      console.error('❌ Error getting sector performance:', error);
      return {
        success: false,
        data: {},
        error: error.message
      };
    }
  }

  /**
   * Get market sentiment analysis
   */
  async getMarketSentiment(): Promise<{ success: boolean; data: any; error?: string }> {
    try {
      const response = await this.makeGetRequest<{ success: boolean; data: any; error?: string }>(
        this.endpoints.MARKET_SENTIMENT
      );
      return response;
    } catch (error: any) {
      console.error('❌ Error getting market sentiment:', error);
      return {
        success: false,
        data: {},
        error: error.message
      };
    }
  }

  /**
   * Get portfolio optimization suggestions
   */
  async getPortfolioOptimization(
    currentPortfolio: Record<string, number>,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
  ): Promise<{ success: boolean; data: any; error?: string }> {
    try {
      const response = await this.makePostRequest<{ success: boolean; data: any; error?: string }>(
        this.endpoints.PORTFOLIO_OPTIMIZATION,
        {
          current_portfolio: currentPortfolio,
          risk_tolerance: riskTolerance
        }
      );
      return response;
    } catch (error: any) {
      console.error('❌ Error getting portfolio optimization:', error);
      return {
        success: false,
        data: {},
        error: error.message
      };
    }
  }

  /**
   * Get risk analysis for symbols
   */
  async getRiskAnalysis(symbols: string[]): Promise<{ success: boolean; data: Record<string, any>; error?: string }> {
    try {
      const response = await this.makePostRequest<{ success: boolean; data: Record<string, any>; error?: string }>(
        this.endpoints.RISK_ANALYSIS,
        { symbols }
      );
      return response;
    } catch (error: any) {
      console.error('❌ Error getting risk analysis:', error);
      return {
        success: false,
        data: {},
        error: error.message
      };
    }
  }

  /**
   * Get growth projections
   */
  async getGrowthProjection(symbol: string, years: number = 5): Promise<{ success: boolean; data: any; error?: string }> {
    try {
      const response = await this.makeGetRequest<{ success: boolean; data: any; error?: string }>(
        `${this.endpoints.GROWTH_PROJECTION}/${symbol}`,
        { years }
      );
      return response;
    } catch (error: any) {
      console.error('❌ Error getting growth projection:', error);
      return {
        success: false,
        data: {},
        error: error.message
      };
    }
  }

  /**
   * Get dividend analysis
   */
  async getDividendAnalysis(symbol: string): Promise<{ success: boolean; data: any; error?: string }> {
    try {
      const response = await this.makeGetRequest<{ success: boolean; data: any; error?: string }>(
        `${this.endpoints.DIVIDEND_ANALYSIS}/${symbol}`
      );
      return response;
    } catch (error: any) {
      console.error('❌ Error getting dividend analysis:', error);
      return {
        success: false,
        data: {},
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const longTermAPIService = new LongTermAPIService();
export default longTermAPIService; 