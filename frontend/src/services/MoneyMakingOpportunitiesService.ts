/**
 * Money Making Opportunities Service
 * =================================
 *
 * Service for accessing the Money Making Opportunities API from seed-stocks-service.
 * Provides ranking and analysis of stocks based on money-making potential.
 */

import axios, { AxiosInstance } from 'axios';
import { API_CONFIG } from '../config/api';
import { getMetaHeaders } from '../utils/meta';
import attachAxiosLogging from './httpLogger';

export interface OpportunityRequest {
  min_price?: number;
  max_price?: number;
  min_volume?: number;
  max_volume?: number;
  min_opportunity_score?: number;
  max_risk_level?: string;
  opportunity_types?: string[];
  min_daily_change?: number;
  max_daily_change?: number;
  min_volume_ratio?: number;
  sectors?: string[];
  market_cap_categories?: string[];
  limit?: number;
  include_analysis?: boolean;
  include_volume_analysis?: boolean;
}

export interface OpportunityResponse {
  symbol: string;
  current_price: number;
  previous_close: number;
  daily_change_pct: number;
  intraday_change_pct: number;
  opportunity_type: string;
  risk_level: string;
  opportunity_score: number;
  confidence_score: number;
  entry_price: number;
  entry_reason: string;
  target_price?: number;
  stop_loss?: number;
  risk_reward_ratio?: number;
  volume: number;
  value_traded: number;
  daily_range_pct: number;
  sector?: string;
  market_cap_category?: string;
  analysis_timestamp: string;
  rank: number;
  technical_analysis?: any;
  volume_analysis?: any;
}

export interface OpportunitiesSummary {
  total_opportunities: number;
  average_score: number;
  score_range: { min: number; max: number };
  opportunity_types: Record<string, number>;
  risk_levels: Record<string, number>;
  sectors: Record<string, number>;
  top_performers: string[];
  analysis_timestamp: string;
}

export interface OpportunitiesResponse {
  opportunities: OpportunityResponse[];
  summary: OpportunitiesSummary;
  request_parameters: any;
  processing_time_ms: number;
}

export interface OpportunityTypeInfo {
  breakout: string;
  momentum: string;
  reversal: string;
  support_bounce: string;
  volume_surge: string;
  gap_up: string;
  technical_setup: string;
}

export interface RiskLevelInfo {
  low: string;
  medium: string;
  high: string;
  very_high: string;
}

export interface OpportunityServiceInfo {
  opportunity_types: OpportunityTypeInfo;
  risk_levels: RiskLevelInfo;
  analysis_features: {
    technical_analysis: string;
    volume_analysis: string;
    entry_analysis: string;
    risk_assessment: string;
  };
  scoring_methodology: {
    opportunity_score: string;
    confidence_score: string;
    risk_adjustment: string;
  };
}

class MoneyMakingOpportunitiesService {
  private static instance: MoneyMakingOpportunitiesService;
  private api: AxiosInstance;

  private constructor() {
    // Use seed API base URL for money making opportunities
    const baseURL = API_CONFIG.SEED_API_BASE_URL;

    this.api = axios.create({
      baseURL,
      timeout: API_CONFIG.REQUEST.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    attachAxiosLogging(this.api, 'MoneyMakingOpportunities');
  }

  static getInstance(): MoneyMakingOpportunitiesService {
    if (!MoneyMakingOpportunitiesService.instance) {
      MoneyMakingOpportunitiesService.instance = new MoneyMakingOpportunitiesService();
    }
    return MoneyMakingOpportunitiesService.instance;
  }

  /**
   * Rank stocks by money-making opportunity potential
   */
  async rankOpportunities(request: OpportunityRequest = {}): Promise<OpportunitiesResponse> {
    try {
      console.log(`🎯 [MoneyMakingOpportunities] Ranking opportunities with request:`, request);

      const response = await this.api.post('/opportunities/rank', request, {
        headers: {
          ...getMetaHeaders('/opportunities/rank'),
          'X-Trace-ID': `opportunities_${Date.now()}`,
        },
      });

      console.log(`✅ [MoneyMakingOpportunities] Retrieved ${response.data.opportunities?.length || 0} opportunities`);
      return response.data;
    } catch (error) {
      console.error('❌ [MoneyMakingOpportunities] Error ranking opportunities:', error);
      throw this.handleError(error, 'rank opportunities');
    }
  }

  /**
   * Get available opportunity types
   */
  async getOpportunityTypes(): Promise<string[]> {
    try {
      const response = await this.api.get('/opportunities/types');
      return response.data;
    } catch (error) {
      console.error('❌ [MoneyMakingOpportunities] Error getting opportunity types:', error);
      throw this.handleError(error, 'get opportunity types');
    }
  }

  /**
   * Get available risk levels
   */
  async getRiskLevels(): Promise<string[]> {
    try {
      const response = await this.api.get('/opportunities/risk-levels');
      return response.data;
    } catch (error) {
      console.error('❌ [MoneyMakingOpportunities] Error getting risk levels:', error);
      throw this.handleError(error, 'get risk levels');
    }
  }

  /**
   * Get service information and analysis features
   */
  async getServiceInfo(): Promise<OpportunityServiceInfo> {
    try {
      const response = await this.api.get('/opportunities/summary');
      return response.data;
    } catch (error) {
      console.error('❌ [MoneyMakingOpportunities] Error getting service info:', error);
      throw this.handleError(error, 'get service info');
    }
  }

  /**
   * Get quick opportunities with default settings
   */
  async getQuickOpportunities(limit: number = 10): Promise<OpportunitiesResponse> {
    return this.rankOpportunities({
      min_opportunity_score: 40,
      limit,
      include_analysis: true,
      include_volume_analysis: true,
    });
  }

  /**
   * Get high-confidence opportunities only
   */
  async getHighConfidenceOpportunities(limit: number = 10): Promise<OpportunitiesResponse> {
    return this.rankOpportunities({
      min_opportunity_score: 60,
      limit,
      include_analysis: true,
      include_volume_analysis: true,
    });
  }

  /**
   * Get low-risk opportunities
   */
  async getLowRiskOpportunities(limit: number = 10): Promise<OpportunitiesResponse> {
    return this.rankOpportunities({
      max_risk_level: 'medium',
      min_opportunity_score: 30,
      limit,
      include_analysis: true,
      include_volume_analysis: true,
    });
  }

  /**
   * Get momentum opportunities
   */
  async getMomentumOpportunities(limit: number = 10): Promise<OpportunitiesResponse> {
    return this.rankOpportunities({
      opportunity_types: ['momentum', 'breakout'],
      min_opportunity_score: 40,
      limit,
      include_analysis: true,
      include_volume_analysis: true,
    });
  }

  /**
   * Get volume surge opportunities
   */
  async getVolumeSurgeOpportunities(limit: number = 10): Promise<OpportunitiesResponse> {
    return this.rankOpportunities({
      opportunity_types: ['volume_surge'],
      min_opportunity_score: 40,
      min_volume_ratio: 1.5,
      limit,
      include_analysis: true,
      include_volume_analysis: true,
    });
  }

  /**
   * Handle API errors consistently
   */
  private handleError(error: any, operation: string): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      return new Error(`Money Making Opportunities ${operation} failed (${status}): ${data?.detail || data?.message || 'Unknown error'}`);
    } else if (error.request) {
      return new Error(`Money Making Opportunities ${operation} failed: No response from server`);
    } else {
      return new Error(`Money Making Opportunities ${operation} failed: ${error.message}`);
    }
  }

  /**
   * Get service information
   */
  getServiceDetails() {
    return {
      name: 'Money Making Opportunities Service',
      baseUrl: API_CONFIG.SEED_API_BASE_URL,
      endpoints: {
        RANK_OPPORTUNITIES: '/opportunities/rank',
        OPPORTUNITY_TYPES: '/opportunities/types',
        RISK_LEVELS: '/opportunities/risk-levels',
        SUMMARY: '/opportunities/summary',
      },
      features: [
        'Opportunity-based stock ranking',
        'Technical analysis integration',
        'Volume analysis',
        'Risk assessment',
        'Entry/exit recommendations',
        'Multi-factor scoring (0-100)',
        'Real-time opportunity detection',
        'Confidence scoring'
      ],
      opportunityTypes: [
        'Breakout - Price breaking through resistance',
        'Momentum - Strong price momentum',
        'Reversal - Potential trend reversals',
        'Support Bounce - Price bouncing off support',
        'Volume Surge - Unusual volume activity',
        'Gap Up - Price gapping up',
        'Technical Setup - Good technical setup'
      ],
      riskLevels: [
        'Low - Established companies, stable',
        'Medium - Balanced risk-reward',
        'High - Higher volatility, speculative',
        'Very High - Extreme risk, high uncertainty'
      ]
    };
  }
}

// Export singleton instance
export const moneyMakingOpportunitiesService = MoneyMakingOpportunitiesService.getInstance();
export default moneyMakingOpportunitiesService;

