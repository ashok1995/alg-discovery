/**
 * Recommendation API Service
 * =========================
 * 
 * Comprehensive service for all 4 recommendation scenarios:
 * 1. Swing Trading - Medium-term positions (3-10 days)
 * 2. Long-term Buy - Long-term investing (weeks to months)
 * 3. Intraday Buy - Same-day buying opportunities
 * 4. Intraday Sell - Same-day selling opportunities
 * 
 * Based on the CURL commands reference for the recommendation API
 */

import axios, { AxiosInstance } from 'axios';
import { API_CONFIG } from '../config/api';
import { getEndpointPath, getBaseUrlForDomain, getEndpointUrl } from '../config/endpointRegistry';
import { getMetaHeaders } from '../utils/meta';
import attachAxiosLogging from './httpLogger';
import { 
  UniversalRecommendationRequest, 
  DynamicRecommendationResponse, 
  StrategyType, 
  UIRecommendationRequest, 
  UIRecommendationResponse, 
  SortDirection, 
  MarketCondition, 
  MarketSession,
  SeedRecommendationRequest,
  SeedRecommendationResponse,
  SeedStrategyType,
  SeedRiskLevel,
  SeedHealthResponse,
  SHORT_SELL_ARMS,
  BUY_ARMS,
  SWING_ARMS,
  LONG_TERM_ARMS
} from '../types/apiModels';

// API base URL for recommendations - use Nginx proxy for production
const RECOMMENDATION_API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? '' 
  : (process.env.NODE_ENV === 'production' 
    ? '' // Use relative URL to go through Nginx proxy
    : getBaseUrlForDomain('recommendation'));

// Endpoint keys - now pointing to Seed Service
const ENDPOINT_KEYS = {
  RECOMMENDATIONS: '/api/v2/stocks/recommendations', // Direct Seed Service endpoint
  HEALTH: 'health',
} as const;

// Risk profile types
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

// Recommendation request interface (supports canonical and legacy aliases)
export interface RecommendationRequest {
  max_recommendations?: number;
  max_items?: number; // canonical
  min_score?: number;
  risk_profile?: RiskProfile;
  risk?: RiskProfile; // canonical
  include_metadata?: boolean;
}

// Analysis scores interface
export interface AnalysisScores {
  technical_score: number;
  fundamental_score: number;
  sentiment_score: number;
}

// Metadata interface
export interface RecommendationMetadata {
  pe_ratio?: number;
  pb_ratio?: number;
  debt_to_equity?: number;
  [key: string]: any;
}

// Individual recommendation interface
export interface Recommendation {
  symbol: string;
  name: string;
  company_name?: string; // API returns this field
  score: number;
  price: number; // normalized to number (0 if missing)
  change_percent: number;
  volume: number;
  market_cap: number;
  sector: string;
  analysis: AnalysisScores; // normalized (zeros if missing)
  metadata?: RecommendationMetadata & { source?: string; fetched_at?: string };
}

// Recommendation response interface
export interface RecommendationResponse {
  status: 'success' | 'error';
  timestamp: string;
  recommendations: Recommendation[];
  total_count: number;
  execution_time: number; // seconds
  error?: string;
}

// Health check response interface
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  environment: string;
  version: string;
}

// Service status interface
export interface ServiceStatus {
  connected: boolean;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  lastCheck: string;
}

class RecommendationAPIService {
  private static instance: RecommendationAPIService;
  private api: AxiosInstance;
  private lastHealthCheck: number = 0;
  private healthCheckCache: boolean | null = null;

  private constructor() {
    this.api = axios.create({
      baseURL: RECOMMENDATION_API_BASE_URL,
      timeout: API_CONFIG.REQUEST.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    attachAxiosLogging(this.api, 'RecommendationAPI');

    // Add request interceptors for logging
    this.api.interceptors.request.use(
      (config) => {
        const mergedHeaders = { ...((config.headers || {}) as any), ...getMetaHeaders('/recommendations') };
        (config as any).headers = mergedHeaders;
        console.log(`🚀 [RecommendationAPI] ${config.method?.toUpperCase()} ${config.url}`, config.data);
        return config;
      },
      (error) => {
        console.error('❌ [RecommendationAPI] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptors for logging
    this.api.interceptors.response.use(
      (response) => {
        console.log(`✅ [RecommendationAPI] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ [RecommendationAPI] Response error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RecommendationAPIService {
    if (!RecommendationAPIService.instance) {
      RecommendationAPIService.instance = new RecommendationAPIService();
    }
    return RecommendationAPIService.instance;
  }

  // ================= Seed Service API Integration =================
  
  /** Transform frontend strategy to Seed API strategy */
  private mapToSeedStrategy(strategy: string): SeedStrategyType {
    const strategyMap: Record<string, SeedStrategyType> = {
      'swing': SeedStrategyType.SWING,
      'swing-buy': SeedStrategyType.SWING,
      'swing_buy': SeedStrategyType.SWING,
      'intraday': SeedStrategyType.INTRADAY,
      'intraday-buy': SeedStrategyType.INTRADAY,
      'intraday_buy': SeedStrategyType.INTRADAY,
      'intraday-sell': SeedStrategyType.INTRADAY,
      'intraday_sell': SeedStrategyType.INTRADAY,
      'long_term': SeedStrategyType.LONG_TERM,
      'long-term': SeedStrategyType.LONG_TERM,
      'long-buy': SeedStrategyType.LONG_TERM,
      'balanced': SeedStrategyType.BALANCED,
      'aggressive': SeedStrategyType.AGGRESSIVE,
      'conservative': SeedStrategyType.CONSERVATIVE
    };
    
    return strategyMap[strategy.toLowerCase()] || SeedStrategyType.SWING;
  }

  /** Get ARM strategies based on request type */
  private getArmStrategies(type: string): string[] {
    switch (type.toLowerCase()) {
      case 'intraday-sell':
      case 'short-sell':
        return SHORT_SELL_ARMS;
      case 'intraday-buy':
      case 'intraday':
        return BUY_ARMS;
      case 'swing':
      case 'swing-buy':
        return SWING_ARMS;
      case 'long-term':
      case 'long-buy':
        return LONG_TERM_ARMS;
      default:
        return []; // Let the service decide
    }
  }

  /** Transform frontend risk level to Seed API risk level */
  private mapToSeedRiskLevel(riskLevel: string): SeedRiskLevel {
    const riskMap: Record<string, SeedRiskLevel> = {
      'low': SeedRiskLevel.LOW,
      'conservative': SeedRiskLevel.LOW,
      'medium': SeedRiskLevel.MODERATE,
      'moderate': SeedRiskLevel.MODERATE,
      'high': SeedRiskLevel.HIGH,
      'aggressive': SeedRiskLevel.HIGH
    };
    
    return riskMap[riskLevel.toLowerCase()] || SeedRiskLevel.MODERATE;
  }

  /** Call Seed Service API for recommendations */
  async getSeedServiceRecommendations(request: Partial<SeedRecommendationRequest>): Promise<SeedRecommendationResponse> {
    try {
      // Ensure mandatory strategy field is provided
      if (!request.strategy) {
        throw new Error('Strategy is required for Seed Service API');
      }

      // Use proxy endpoint for development to avoid CORS issues
      const seedServiceUrl = '/api/seed/recommendations';
      
      console.log(`🌱 [SeedService] Making proxy call to: ${seedServiceUrl}`);
      console.log(`🌱 [SeedService] Request:`, request);
      console.log(`🌱 [SeedService] Request JSON:`, JSON.stringify(request, null, 2));
      
      const response = await axios.post(seedServiceUrl, request, {
        headers: { 
          'X-Trace-ID': `seed_req_${Date.now()}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      console.log(`✅ [SeedService] Response received:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ [SeedService] Error:`, error);
      throw this.handleError(error, 'Seed Service recommendations');
    }
  }

  /** Check Seed Service health */
  async getSeedServiceHealth(): Promise<SeedHealthResponse> {
    try {
      // Use different health endpoints for dev vs prod
      const isProduction = process.env.NODE_ENV === 'production' || 
                          process.env.REACT_APP_NODE_ENV === 'production' ||
                          (typeof window !== 'undefined' && window.location.hostname !== 'localhost');
      
      const healthPath = isProduction ? '/api/v2/stocks/health' : '/health';
      const seedHealthUrl = `${API_CONFIG.SEED_API_BASE_URL}${healthPath}`;
      
      const response = await axios.get(seedHealthUrl, { timeout: 10000 });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Seed Service health check');
    }
  }

  /** Transform Seed Service response to DynamicRecommendationResponse format */
  private transformSeedResponse(seedResponse: SeedRecommendationResponse, strategy: string): DynamicRecommendationResponse {
    // Handle empty recommendations array
    if (!seedResponse.recommendations || seedResponse.recommendations.length === 0) {
      return {
        timestamp: new Date().toISOString(),
        items: [],
        recommendations: [],
        total_count: 0,
        execution_time: 0,
        strategy: strategy,
        risk_profile: 'moderate',
        success: true
      };
    }

    const items = seedResponse.recommendations.map((rec: any, index: number) => {
      const priceVal = Number(rec.current_price ?? rec.price ?? rec.close ?? rec.ltp);
      const hasPrice = Number.isFinite(priceVal);
      return ({
      symbol: rec.symbol || 'UNKNOWN',
      nsecode: rec.symbol || 'UNKNOWN',
      company_name: rec.name || rec.symbol || 'Unknown Company',
      last_price: hasPrice ? priceVal : 0,
      current_price: hasPrice ? priceVal : 0,
      change_percent: rec.change_percent ?? rec.change_percentage ?? rec.per_change ?? 0,
      score: (rec.overall_score || 0.5) * 100, // Convert to 0-100 scale
      combined_score: (rec.overall_score || 0.5) * 100,
      technical_score: 60, // Default technical score
      fundamental_score: 70, // Default value
      rank: index + 1, // Set rank based on order
      volume: rec.volume ?? 0,
      market_cap: 10000, // Default market cap
      sector: rec.sector || 'Unknown',
      industry: null,
      rsi: rec.technical_analysis?.rsi ?? 50,
      sma_20: hasPrice ? priceVal * 0.99 : 0, // Approximate SMA 20
      sma_50: hasPrice ? priceVal * 0.98 : 0, // Approximate SMA 50
      macd: 'neutral', // Default MACD
      bollinger_bands: null,
      pe_ratio: 15, // Default value
      pb_ratio: 2, // Default value
      debt_to_equity: 0.3, // Default value
      roe: 15, // Default value
      roa: null,
      indicators: {
        rsi: rec.technical_analysis?.rsi || 50,
        sma_20: rec.technical_analysis?.sma_20 || rec.current_price,
        sma_50: rec.current_price * 0.98
      },
      metadata: {
        dominant_arm: rec.selected_by_arm || 'unknown',
        selected_arms: [rec.selected_by_arm || 'unknown'],
        arm_scores: {},
        risk_assessment: rec.risk_level || 'moderate',
        reasoning: rec.reasoning || 'ARM-based recommendation',
        data_source: rec.data_source || seedResponse.data_source || 'seed-service',
        arm_name: (seedResponse as any)?.debug_info?.arm_name || rec.selected_by_arm || 'unknown',
        predicted_return: rec.confidence || 0.8,
        market_condition_fit: rec.confidence || 0.8
      },
      confidence: rec.confidence > 0.8 ? 'high' : rec.confidence > 0.6 ? 'medium' : 'low',
      source: rec.data_source || seedResponse.data_source || 'seed-service',
      fetched_at: new Date().toISOString(),
      strategy_type: strategy,
      risk_level: rec.risk_level || 'moderate'
    })
    });

    // Set ranks
    items.forEach((item, index) => {
      item.rank = index + 1;
    });

    return {
      timestamp: new Date().toISOString(),
      items,
      recommendations: items,
      total_count: items.length,
      execution_time: ((seedResponse as any).processing_time_ms || 1000) / 1000, // Convert to seconds
      strategy: strategy,
      risk_profile: 'moderate',
      success: true
    };
  }

  /** Build canonical request payload from mixed aliases */
  private toCanonicalPayload(req: RecommendationRequest) {
    return {
      max_items: req.max_items ?? req.max_recommendations ?? 50,
      min_score: req.min_score ?? 70,
      risk: req.risk ?? req.risk_profile ?? 'moderate',
    };
  }

  /** Normalize backend response (items) to RecommendationResponse (recommendations) */
  private normalizeResponse(raw: any): RecommendationResponse {
    const items = raw.items ?? raw.recommendations ?? raw.data ?? [];
    const recommendations: Recommendation[] = items.map((it: any) => ({
      symbol: it.symbol,
      name: it.company_name ?? it.name ?? '',
      score: typeof it.score === 'number' ? it.score : 0,
      price: typeof (it.last_price ?? it.price) === 'number' ? (it.last_price ?? it.price) : 0,
      change_percent: typeof it.change_percent === 'number' ? it.change_percent : (it.analysis?.change_percent ?? 0),
      volume: typeof it.volume === 'number' ? it.volume : 0,
      market_cap: typeof it.market_cap === 'number' ? it.market_cap : 0,
      sector: it.sector ?? 'Unknown',
      analysis: {
        technical_score: it.indicators?.technical_score ?? it.analysis?.technical_score ?? 0,
        fundamental_score: it.indicators?.fundamental_score ?? it.analysis?.fundamental_score ?? 0,
        sentiment_score: it.indicators?.sentiment_score ?? it.analysis?.sentiment_score ?? 0,
      },
      metadata: it.metadata,
    }));

    return {
      status: 'success',
      timestamp: raw.timestamp ?? new Date().toISOString(),
      recommendations,
      total_count: raw.total_count ?? recommendations.length,
      execution_time: raw.execution_time ?? 0,
    };
  }

  /** Normalize strategy aliases for dynamic endpoint */
  private normalizeStrategyName(strategy: any): string {
    const s = String(strategy || '').toLowerCase();
    if (s === 'swing-buy' || s === 'swing_buy') return 'swing';
    return s;
  }

  /** Production API endpoint method - now uses Seed Service directly */
  async getProductionRecommendations(request: {
    strategy: string;
    risk_level: string;
    market_condition?: string;
    market_cap?: string;
    sector?: string;
    min_price?: number;
    max_price?: number;
    min_volume?: number;
    rsi_min?: number;
    rsi_max?: number;
    min_score?: number;
    limit?: number;
  }): Promise<any> {
    try {
      // Convert to Seed Service format
      const seedStrategy = this.mapToSeedStrategy(request.strategy);
      const seedRiskLevel = this.mapToSeedRiskLevel(request.risk_level);

      const seedRequest: SeedRecommendationRequest = {
        strategy: seedStrategy,
        risk_level: seedRiskLevel,
        limit: request.limit || 20,
        min_price: request.min_price || 10.0,
        max_price: request.max_price || 10000.0,
        min_volume: request.min_volume || 100000,
        include_technical_analysis: true,
        include_reasoning: true,
        include_arm_details: true
      };

      console.log(`🔄 [ProductionAPI] Using Seed Service for production request`);
      const seedResponse = await this.getSeedServiceRecommendations(seedRequest);
      
      // Transform to expected production format
      return {
        success: true,
        stocks: seedResponse.recommendations?.map(rec => ({
          symbol: rec.symbol,
          name: rec.symbol,
          price: rec.current_price,
          change_percentage: 0,
          overall_score: rec.overall_score,
          technical_score: 80,
          fundamental_score: 70,
          sector: rec.sector,
          volume: 0,
          market_cap: 0,
          rsi: rec.technical_analysis?.rsi || 50,
          macd: rec.technical_analysis?.momentum || 'neutral',
          sma_20: rec.technical_analysis?.sma_20 || rec.current_price,
          sma_50: rec.current_price * 0.98,
          entry_signal: rec.entry_signal,
          timestamp: rec.data_timestamp
        })) || [],
        total_count: seedResponse.recommendations?.length || 0,
        execution_time: seedResponse.processing_time_ms / 1000,
        timestamp: seedResponse.timestamp
      };
    } catch (error) {
      throw this.handleError(error, 'production recommendations');
    }
  }

  /** Dynamic unified endpoint (dev) */
  // New UI endpoint method - now uses Seed Service
  async getUIRecommendations(request: UIRecommendationRequest): Promise<UIRecommendationResponse> {
    try {
      // Use Seed Service instead of proxy
      const seedStrategy = this.mapToSeedStrategy(request.strategy);
      const seedRiskLevel = this.mapToSeedRiskLevel(request.risk_level);

      const seedRequest: SeedRecommendationRequest = {
        strategy: seedStrategy,
        risk_level: seedRiskLevel,
        limit: request.limit || 20,
        min_price: request.min_price || 10.0,
        max_price: request.max_price || 10000.0,
        min_volume: request.min_volume || 100000,
        include_technical_analysis: true,
        include_reasoning: true
      };

      const seedResponse = await this.getSeedServiceRecommendations(seedRequest);
      
      // Transform to UI format with proper typing
      const stocks = seedResponse.recommendations?.map(rec => ({
        symbol: rec.symbol,
        score: rec.overall_score * 100,
        price: rec.current_price,
        sector: undefined as any, // Fix type issue
        market_cap: undefined as any,
        rsi: rec.technical_analysis?.rsi,
        trend: rec.entry_signal,
        volume: 0,
        change_percent: 0,
        market_cap_value: 0,
        pe_ratio: 15,
        pb_ratio: 2,
        debt_to_equity: 0.3,
        roe: 15
      })) || [];

      return {
        success: true,
        stocks: stocks as any, // Fix type issue
        total_count: stocks.length,
        avg_score: stocks.length > 0 ? stocks.reduce((sum, s) => sum + s.score, 0) / stocks.length : 0,
        strategy_used: seedStrategy as any, // Fix type issue
        execution_time: seedResponse.processing_time_ms || 0
      };
    } catch (error) {
      throw this.handleError(error, 'UI recommendations');
    }
  }

  // Quick recommendations endpoint - now uses Seed Service
  async getQuickRecommendations(request: any): Promise<UIRecommendationResponse> {
    const { strategy, risk_level, limit = 10 } = request;
    try {
      // Use Seed Service instead of proxy
      const seedStrategy = this.mapToSeedStrategy(strategy);
      const seedRiskLevel = this.mapToSeedRiskLevel(risk_level);

      const seedRequest: SeedRecommendationRequest = {
        strategy: seedStrategy,
        risk_level: seedRiskLevel,
        limit: limit,
        include_technical_analysis: true,
        include_reasoning: true
      };

      const seedResponse = await this.getSeedServiceRecommendations(seedRequest);
      
      // Transform to UI format with proper typing
      const stocks = seedResponse.recommendations?.map(rec => ({
        symbol: rec.symbol,
        score: rec.overall_score * 100,
        price: rec.current_price,
        sector: undefined as any, // Fix type issue
        market_cap: undefined as any,
        rsi: rec.technical_analysis?.rsi,
        trend: rec.entry_signal,
        volume: 0,
        change_percent: 0,
        market_cap_value: 0,
        pe_ratio: 15,
        pb_ratio: 2,
        debt_to_equity: 0.3,
        roe: 15
      })) || [];

      return {
        success: true,
        stocks: stocks as any, // Fix type issue
        total_count: stocks.length,
        avg_score: stocks.length > 0 ? stocks.reduce((sum, s) => sum + s.score, 0) / stocks.length : 0,
        strategy_used: seedStrategy as any, // Fix type issue
        execution_time: seedResponse.processing_time_ms || 0
      };
    } catch (error) {
      throw this.handleError(error, 'quick recommendations');
    }
  }

  async getDynamicRecommendations(request: UniversalRecommendationRequest): Promise<DynamicRecommendationResponse> {
    try {
      // Normalize strategy type for backend consistency
      let strategy = request.strategy;
      if (['swing-buy', 'swing_buy'].includes(strategy)) {
        strategy = StrategyType.SWING;
      }
      const payload = { ...request, strategy }; // Use the normalized strategy
      
      // Try the production endpoint first
      try {
        const response = await this.api.post(ENDPOINT_KEYS.RECOMMENDATIONS, payload, {
          headers: { 'X-Trace-ID': request.trace?.request_id || `trace_${Date.now()}` }
        });
        
        // Transform the response to match the expected format
        const backendData = response.data || {};
        return {
          timestamp: backendData.timestamp || new Date().toISOString(),
          items: backendData.recommendations || backendData.items || [],
          total_count: backendData.total_count || 0,
          execution_time: backendData.execution_time || 0,
          strategy: backendData.strategy || strategy,
          risk_profile: backendData.risk_profile || 'moderate',
          success: backendData.success !== false
        };
      } catch (dynamicError) {
        // NO MORE MOCK DATA - Return empty response for real stocks only
        console.warn('Dynamic endpoint failed, returning empty response (no mock data)');
        
        return {
          timestamp: new Date().toISOString(),
          items: [],
          total_count: 0,
          execution_time: 0,
          strategy: strategy,
          risk_profile: 'moderate',
          success: false
        };
      }
    } catch (error) {
      throw this.handleError(error, 'dynamic recommendations');
    }
  }

  /** Get recommendations by type - now uses Seed Service as primary source */
  async getRecommendationsByType(
    type: 'swing' | 'long-buy' | 'intraday-buy' | 'intraday-sell',
    request: RecommendationRequest = {}
  ): Promise<DynamicRecommendationResponse> {
    // Map legacy types to Seed Service strategy types
    const strategyMap = {
      'swing': 'swing',
      'long-buy': 'long_term',
      'intraday-buy': 'intraday',
      'intraday-sell': 'intraday'
    };

    const strategy = strategyMap[type];
    if (!strategy) {
      throw new Error(`Invalid recommendation type: ${type}`);
    }

    try {
      // First, try Seed Service API
      const seedStrategy = this.mapToSeedStrategy(strategy);
      const seedRiskLevel = this.mapToSeedRiskLevel(request.risk_profile || 'moderate');

      // Get specific ARM strategies for this request type
      const specificArms = this.getArmStrategies(type);
      
      // Use minimal request to avoid empty results from complex parameters
      const seedRequest: SeedRecommendationRequest = {
        strategy: seedStrategy,
        risk_level: seedRiskLevel,
        limit: request.max_recommendations || 10,
        specific_arms: specificArms && specificArms.length > 0 ? specificArms : undefined,
        include_technical_analysis: true,
        include_reasoning: true,
        include_arm_details: true
      };

      console.log(`🌱 [RecommendationAPI] Using Seed Service for ${type} recommendations`);
      console.log(`🌱 [RecommendationAPI] Seed request:`, seedRequest);
      const seedResponse = await this.getSeedServiceRecommendations(seedRequest);
      console.log(`🌱 [RecommendationAPI] Seed response:`, seedResponse);
      
      // Transform Seed response to expected format
      const transformedResponse = this.transformSeedResponse(seedResponse, strategy);
      console.log(`✅ [RecommendationAPI] Seed Service returned ${transformedResponse.recommendations?.length || 0} recommendations`);
      
      return transformedResponse;
    } catch (seedError) {
      console.warn(`⚠️ [RecommendationAPI] Seed Service failed for ${type}:`, seedError);
      
      try {
        // Fallback to production API
        console.log(`🔄 [RecommendationAPI] Falling back to production API for ${type}`);
        
        const riskLevelMap = {
          'conservative': 'low',
          'moderate': 'medium',
          'aggressive': 'high'
        };

        const riskLevel = riskLevelMap[request.risk_profile as keyof typeof riskLevelMap] || 'medium';

        const productionRequest = {
          strategy,
          risk_level: riskLevel,
          min_score: request.min_score || 60,
          limit: request.max_recommendations || 50,
          min_price: 10,
          max_price: 10000,
          min_volume: 100000
        };

        const response = await this.getProductionRecommendations(productionRequest);
        
        const transformedItems = response.stocks?.map((stock: any) => ({
          symbol: stock.symbol,
          company_name: stock.name,
          current_price: stock.price,
          last_price: stock.price,
          change_percent: stock.change_percentage,
          volume: stock.volume,
          sector: stock.sector || 'Unknown',
          score: stock.overall_score,
          technical_score: stock.technical_score,
          fundamental_score: stock.fundamental_score,
          risk_level: riskLevel,
          rsi: stock.rsi,
          macd: stock.macd,
          sma_20: stock.sma_20,
          sma_50: stock.sma_50,
          entry_signal: stock.entry_signal,
          entry_price: stock.entry_price,
          stop_loss: stock.stop_loss,
          target_price: stock.target_price,
          metadata: {
            timestamp: stock.timestamp,
            market_cap: stock.market_cap
          }
        })) || [];

        return {
          timestamp: response.timestamp || new Date().toISOString(),
          items: transformedItems,
          recommendations: transformedItems,
          total_count: response.total_count || transformedItems.length,
          execution_time: response.execution_time || 0,
          strategy: strategy,
          risk_profile: riskLevel,
          success: response.success !== false
        };
      } catch (productionError) {
        // NO MORE MOCK DATA - Return empty response for real stocks only
        console.warn(`⚠️ [RecommendationAPI] All services failed for ${type}, returning empty response (no mock data)`);
        
        return {
          timestamp: new Date().toISOString(),
          items: [],
          recommendations: [],
          total_count: 0,
          execution_time: 0,
          strategy: strategy,
          risk_profile: 'moderate',
          success: false
        };
      }
    }
  }

  /** Health check for the recommendation service */
  async healthCheck(): Promise<HealthResponse> {
    try {
      const response = await this.api.get(getEndpointPath(ENDPOINT_KEYS.HEALTH));
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'health check');
    }
  }

  /** Check if service is available (with caching) - prioritizes Seed Service */
  async isServiceAvailable(): Promise<boolean> {
    const now = Date.now();
    const cacheExpiry = 30000; // 30 seconds

    if (this.healthCheckCache !== null && (now - this.lastHealthCheck) < cacheExpiry) {
      return this.healthCheckCache;
    }

    try {
      // First try Seed Service health check
      const seedHealth = await this.getSeedServiceHealth();
      if (seedHealth.status === 'healthy') {
        this.healthCheckCache = true;
        this.lastHealthCheck = now;
        return true;
      }
    } catch (seedError) {
      console.warn('⚠️ Seed Service health check failed:', seedError);
    }

    try {
      // Fallback to original health check
      const health = await this.healthCheck();
      this.healthCheckCache = health.status === 'healthy';
      this.lastHealthCheck = now;
      return this.healthCheckCache;
    } catch (_error) {
      this.healthCheckCache = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  /** Get service status */
  async getServiceStatus(): Promise<ServiceStatus> {
    const isAvailable = await this.isServiceAvailable();
    return {
      connected: isAvailable,
      url: RECOMMENDATION_API_BASE_URL,
      status: isAvailable ? 'connected' : 'disconnected',
      lastCheck: new Date().toISOString()
    };
  }

  /** Test connection */
  async testConnection(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'healthy';
    } catch (error) {
      console.error('❌ Recommendation service connection test failed:', error);
      return false;
    }
  }

  /** Get all recommendation types at once - now uses Seed Service */
  async getFullRecommendations(request: any): Promise<UIRecommendationResponse> {
    try {
      // Use Seed Service instead of proxy
      const seedStrategy = this.mapToSeedStrategy(request.strategy || 'swing');
      const seedRiskLevel = this.mapToSeedRiskLevel(request.risk_level || 'moderate');

      const seedRequest: SeedRecommendationRequest = {
        strategy: seedStrategy,
        risk_level: seedRiskLevel,
        limit: request.limit || 20,
        min_price: request.min_price || 10.0,
        max_price: request.max_price || 10000.0,
        min_volume: request.min_volume || 100000,
        include_technical_analysis: true,
        include_reasoning: true
      };

      const seedResponse = await this.getSeedServiceRecommendations(seedRequest);
      
      // Transform to UI format with proper typing
      const stocks = seedResponse.recommendations?.map(rec => ({
        symbol: rec.symbol,
        score: rec.overall_score * 100,
        price: rec.current_price,
        sector: undefined as any, // Fix type issue
        market_cap: undefined as any,
        rsi: rec.technical_analysis?.rsi,
        trend: rec.entry_signal,
        volume: 0,
        change_percent: 0,
        market_cap_value: 0,
        pe_ratio: 15,
        pb_ratio: 2,
        debt_to_equity: 0.3,
        roe: 15
      })) || [];

      return {
        success: true,
        stocks: stocks as any, // Fix type issue
        total_count: stocks.length,
        avg_score: stocks.length > 0 ? stocks.reduce((sum, s) => sum + s.score, 0) / stocks.length : 0,
        score_range: stocks.length > 0 ? [Math.min(...stocks.map(s => s.score)), Math.max(...stocks.map(s => s.score))] : [0, 0],
        strategy_used: seedStrategy as any, // Fix type issue
        execution_time: seedResponse.processing_time_ms || 0
      };
    } catch (error) {
      console.warn('⚠️ Seed Service failed, using fallback');
      throw this.handleError(error, 'full recommendations');
    }
  }

  async getOptions(): Promise<any> {
    try {
      const response = await this.api.get('/api/options');
      return response.data || {
        strategies: [
          { value: 'swing', label: 'Swing Trading' },
          { value: 'intraday_buy', label: 'Intraday Buy' },
          { value: 'intraday_sell', label: 'Intraday Sell' },
          { value: 'long_term', label: 'Long Term' }
        ],
        risk_levels: [
          { value: 'low', label: 'Low Risk' },
          { value: 'medium', label: 'Medium Risk' },
          { value: 'high', label: 'High Risk' }
        ],
        investment_horizons: [
          { value: 'short_term', label: 'Short Term (1-3 days)' },
          { value: 'medium_term', label: 'Medium Term (1-4 weeks)' },
          { value: 'long_term', label: 'Long Term (1+ months)' }
        ],
        sectors: [],
        market_caps: [],
        market_conditions: [],
        sort_options: [],
        sort_directions: []
      };
    } catch (error) {
      // Return default options if API fails
      return {
        strategies: [
          { value: 'swing', label: 'Swing Trading' },
          { value: 'intraday_buy', label: 'Intraday Buy' },
          { value: 'intraday_sell', label: 'Intraday Sell' },
          { value: 'long_term', label: 'Long Term' }
        ],
        risk_levels: [
          { value: 'low', label: 'Low Risk' },
          { value: 'medium', label: 'Medium Risk' },
          { value: 'high', label: 'High Risk' }
        ],
        investment_horizons: [
          { value: 'short_term', label: 'Short Term (1-3 days)' },
          { value: 'medium_term', label: 'Medium Term (1-4 weeks)' },
          { value: 'long_term', label: 'Long Term (1+ months)' }
        ],
        sectors: [],
        market_caps: [],
        market_conditions: [],
        sort_options: [],
        sort_directions: []
      };
    }
  }

  async getAllRecommendations(request: RecommendationRequest = {}): Promise<{
    swing: DynamicRecommendationResponse;
    longBuy: DynamicRecommendationResponse;
    intradayBuy: DynamicRecommendationResponse;
    intradaySell: DynamicRecommendationResponse;
  }> {
    try {
      const [swing, longBuy, intradayBuy, intradaySell] = await Promise.all([
        this.getRecommendationsByType('swing', request),
        this.getRecommendationsByType('long-buy', request),
        this.getRecommendationsByType('intraday-buy', request),
        this.getRecommendationsByType('intraday-sell', request)
      ]);

      return {
        swing,
        longBuy,
        intradayBuy,
        intradaySell
      };
    } catch (error) {
      console.error('❌ Error fetching all recommendations:', error);
      throw this.handleError(error, 'all recommendations');
    }
  }

  /** Get recommendations with enhanced error handling and retries */
  async getRecommendationsWithRetry(
    type: 'swing' | 'long-buy' | 'intraday-buy' | 'intraday-sell',
    request: RecommendationRequest = {},
    retries: number = API_CONFIG.REQUEST.RETRY_ATTEMPTS
  ): Promise<DynamicRecommendationResponse> {
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.getRecommendationsByType(type, request);
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Attempt ${attempt}/${retries} failed for ${type} recommendations:`, error);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, API_CONFIG.REQUEST.RETRY_DELAY * attempt));
        }
      }
    }

    throw lastError;
  }

  /** Handle API errors consistently */
  private handleError(error: any, operation: string): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      return new Error(`Recommendation API ${operation} failed (${status}): ${data?.detail || data?.message || 'Unknown error'}`);
    } else if (error.request) {
      return new Error(`Recommendation API ${operation} failed: No response from server`);
    } else {
      return new Error(`Recommendation API ${operation} failed: ${error.message}`);
    }
  }

  /** Get short sell opportunities using production ARM strategies */
  async getShortSellOpportunities(limit: number = 10): Promise<DynamicRecommendationResponse> {
    const seedRequest: SeedRecommendationRequest = {
      strategy: SeedStrategyType.INTRADAY,
      risk_level: SeedRiskLevel.HIGH,
      specific_arms: SHORT_SELL_ARMS,
      limit: limit,
      include_technical_analysis: true,
      include_reasoning: true,
      include_arm_details: true
    };

    try {
      const seedResponse = await this.getSeedServiceRecommendations(seedRequest);
      return this.transformSeedResponse(seedResponse, 'intraday_sell');
    } catch (error) {
      console.error('❌ Short sell opportunities failed:', error);
      return {
        timestamp: new Date().toISOString(),
        items: [],
        recommendations: [],
        total_count: 0,
        execution_time: 0,
        strategy: 'intraday_sell',
        risk_profile: 'high',
        success: false
      };
    }
  }

  /** Get buy opportunities using production ARM strategies */
  async getBuyOpportunities(limit: number = 10): Promise<DynamicRecommendationResponse> {
    const seedRequest: SeedRecommendationRequest = {
      strategy: SeedStrategyType.INTRADAY,
      risk_level: SeedRiskLevel.MODERATE,
      specific_arms: BUY_ARMS,
      limit: limit,
      include_technical_analysis: true,
      include_reasoning: true,
      include_arm_details: true
    };

    try {
      const seedResponse = await this.getSeedServiceRecommendations(seedRequest);
      return this.transformSeedResponse(seedResponse, 'intraday_buy');
    } catch (error) {
      console.error('❌ Buy opportunities failed:', error);
      return {
        timestamp: new Date().toISOString(),
        items: [],
        recommendations: [],
        total_count: 0,
        execution_time: 0,
        strategy: 'intraday_buy',
        risk_profile: 'moderate',
        success: false
      };
    }
  }

  /** Get service information */
  getServiceInfo() {
    return {
      name: 'Recommendation API Service (Seed Service Integration)',
      primaryService: {
        name: 'Production Seed Service API (algodiscovery.com:8182)',
        baseUrl: API_CONFIG.SEED_API_BASE_URL,
        endpoints: {
          RECOMMENDATIONS: '/api/v2/stocks/recommendations',
          HEALTH: '/health',
          ARMS: '/api/v2/stocks/arms',
          DOCS: '/docs'
        },
        features: ['32 ARM Strategies', 'Short Sell Support', 'Real-time Data', 'AI-Powered']
      },
      fallbackService: {
        name: 'Legacy Recommendation API',
        baseUrl: RECOMMENDATION_API_BASE_URL,
        endpoints: {
          RECOMMENDATIONS: ENDPOINT_KEYS.RECOMMENDATIONS,
          HEALTH: getEndpointPath(ENDPOINT_KEYS.HEALTH),
        }
      },
      timeout: API_CONFIG.REQUEST.TIMEOUT,
      retryAttempts: API_CONFIG.REQUEST.RETRY_ATTEMPTS,
      retryDelay: API_CONFIG.REQUEST.RETRY_DELAY
    };
  }
}

// Export singleton instance
export const recommendationAPIService = RecommendationAPIService.getInstance();
