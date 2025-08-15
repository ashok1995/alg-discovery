/**
 * Short Term Trading API Service
 * Handles communication with the Short Term Trading API endpoints
 */

import { AbstractAPIService, BaseAPIRequest, BaseAPIResponse } from './BaseAPIService';

export interface ShortTermRecommendation {
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
  momentumScore: number;
  volatilityScore: number;
  shortTermPotential: number;
}

export interface ShortTermRequest extends BaseAPIRequest {
  strategy?: 'momentum' | 'breakout' | 'mean_reversion' | 'scalping';
  timeFrame?: '1h' | '4h' | '1d' | '1w';
  min_volume?: number;
  max_volatility?: number;
}

export interface ShortTermResponse extends BaseAPIResponse {
  data: {
    recommendations: ShortTermRecommendation[];
    summary: {
      total_recommendations: number;
      average_score: number;
      market_sentiment: string;
      cache_status: string;
      generated_at: string;
    };
    metadata: {
      request_params: ShortTermRequest;
      processing_time: number;
      cache_hit: boolean;
    };
  };
}

export class ShortTermAPIService extends AbstractAPIService {
  constructor() {
    super(
      'shortterm-api',
      'Short Term Trading',
      8003,
      {
        HEALTH: '/health',
        STATUS: '/status',
        RECOMMENDATIONS: '/api/shortterm/recommendations',
        ANALYSIS: '/api/shortterm/analysis',
        MOMENTUM: '/api/shortterm/momentum',
        BREAKOUT: '/api/shortterm/breakout',
        MEAN_REVERSION: '/api/shortterm/mean-reversion'
      }
    );
  }

  /**
   * Get short-term trading recommendations
   */
  async getRecommendations(params: ShortTermRequest = {}): Promise<ShortTermResponse> {
    try {
      console.log('📈 Fetching short-term recommendations with params:', params);
      
      const response = await this.makePostRequest<ShortTermResponse>(
        this.endpoints.RECOMMENDATIONS,
        {
          limit: params.limit || 50,
          min_score: params.min_score || 10.0,
          force_refresh: params.force_refresh || false,
          strategy: params.strategy || 'momentum',
          timeFrame: params.timeFrame || '1d',
          min_volume: params.min_volume,
          max_volatility: params.max_volatility
        }
      );

      console.log('✅ Short-term recommendations response:', response);
      return response;
    } catch (error: any) {
      console.error('❌ Error fetching short-term recommendations:', error);
      throw new Error(`Failed to fetch short-term recommendations: ${error.message}`);
    }
  }

  /**
   * Get momentum analysis
   */
  async getMomentumAnalysis(symbol: string): Promise<{ success: boolean; data: any; error?: string }> {
    try {
      const response = await this.makeGetRequest<{ success: boolean; data: any; error?: string }>(
        `${this.endpoints.MOMENTUM}/${symbol}`
      );
      return response;
    } catch (error: any) {
      console.error('❌ Error getting momentum analysis:', error);
      return {
        success: false,
        data: {},
        error: error.message
      };
    }
  }

  /**
   * Get breakout analysis
   */
  async getBreakoutAnalysis(symbol: string): Promise<{ success: boolean; data: any; error?: string }> {
    try {
      const response = await this.makeGetRequest<{ success: boolean; data: any; error?: string }>(
        `${this.endpoints.BREAKOUT}/${symbol}`
      );
      return response;
    } catch (error: any) {
      console.error('❌ Error getting breakout analysis:', error);
      return {
        success: false,
        data: {},
        error: error.message
      };
    }
  }

  /**
   * Get mean reversion analysis
   */
  async getMeanReversionAnalysis(symbol: string): Promise<{ success: boolean; data: any; error?: string }> {
    try {
      const response = await this.makeGetRequest<{ success: boolean; data: any; error?: string }>(
        `${this.endpoints.MEAN_REVERSION}/${symbol}`
      );
      return response;
    } catch (error: any) {
      console.error('❌ Error getting mean reversion analysis:', error);
      return {
        success: false,
        data: {},
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const shortTermAPIService = new ShortTermAPIService();
export default shortTermAPIService; 