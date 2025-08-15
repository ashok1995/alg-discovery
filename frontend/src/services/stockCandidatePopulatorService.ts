/**
 * Stock Candidate Populator Service
 * Handles communication with the Stock Candidate Populator API
 */

import { API_CONFIG, getServiceUrl } from '../config/api';

export interface PopulationConfig {
  max_candidates?: number;
  min_market_cap?: number;
  max_market_cap?: number;
  include_nse_only?: boolean;
  exclude_etfs?: boolean;
  exclude_penny_stocks?: boolean;
  min_price?: number;
  max_price?: number;
  sectors_to_include?: string[];
  sectors_to_exclude?: string[];
  enable_real_time_pricing?: boolean;
  enable_metadata_enrichment?: boolean;
}

export interface PopulationResponse {
  total_candidates: number;
  filtered_candidates: number;
  population_time: number;
  cache_hit: boolean;
  candidates_count: number;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface CandidateDetail {
  symbol: string;
  name: string;
  sector: string;
  market_cap: number;
  current_price: number;
  exchange: string;
  theme: string;
  metadata: Record<string, any>;
}

export interface CandidatesResponse {
  candidates: CandidateDetail[];
  total_count: number;
  population_time: number;
  cache_hit: boolean;
  metadata: Record<string, any>;
}

export interface CacheStatsResponse {
  cache_size: number;
  cache_keys: string[];
  timestamps: Record<string, string>;
}

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  initialized: boolean;
}

export type TradingTheme = 'swing_buy' | 'intraday_buy' | 'long_term';

class StockCandidatePopulatorService {
  private baseUrl: string;

  constructor() {
    // Use the port from our running server
    this.baseUrl = getServiceUrl(API_CONFIG.PORTS.STOCK_CANDIDATE_POPULATOR_API);
  }

  /**
   * Get service health status
   */
  async getHealth(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }

  /**
   * Populate stock candidates with custom configuration
   */
  async populateCandidates(
    strategyName: string = 'default',
    config: PopulationConfig = {}
  ): Promise<PopulationResponse> {
    try {
      const params = new URLSearchParams({
        strategy_name: strategyName,
        ...Object.fromEntries(
          Object.entries(config).filter(([_, value]) => value !== undefined)
        )
      });

      const response = await fetch(`${this.baseUrl}/api/v1/candidates/populate?${params}`);
      if (!response.ok) {
        throw new Error(`Population failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Population error:', error);
      throw error;
    }
  }

  /**
   * Get candidates for a specific trading theme
   */
  async getCandidatesForTheme(
    theme: TradingTheme,
    limit: number = 100
  ): Promise<CandidatesResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/candidates/theme/${theme}?limit=${limit}`
      );
      if (!response.ok) {
        throw new Error(`Theme population failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Theme population error:', error);
      throw error;
    }
  }

  /**
   * Get available trading themes
   */
  async getAvailableThemes(): Promise<{ available_themes: TradingTheme[]; description: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/candidates/themes`);
      if (!response.ok) {
        throw new Error(`Themes fetch failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Themes fetch error:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStatsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/candidates/cache/stats`);
      if (!response.ok) {
        throw new Error(`Cache stats fetch failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Cache stats error:', error);
      throw error;
    }
  }

  /**
   * Clear the candidate cache
   */
  async clearCache(): Promise<{ message: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/candidates/cache/clear`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Cache clear failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Cache clear error:', error);
      throw error;
    }
  }

  /**
   * Get default configuration
   */
  async getDefaultConfig(): Promise<PopulationConfig> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/candidates/config/default`);
      if (!response.ok) {
        throw new Error(`Default config fetch failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Default config error:', error);
      throw error;
    }
  }

  /**
   * Test connection to the API
   */
  async testConnection(): Promise<boolean> {
    try {
      const health = await this.getHealth();
      return health.status === 'healthy' && health.initialized;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get comprehensive service status
   */
  async getServiceStatus() {
    try {
      const [health, cacheStats, themes] = await Promise.all([
        this.getHealth(),
        this.getCacheStats(),
        this.getAvailableThemes(),
      ]);

      return {
        health,
        cacheStats,
        themes,
        isConnected: true,
      };
    } catch (error) {
      console.error('Service status check failed:', error);
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const stockCandidatePopulatorService = new StockCandidatePopulatorService();
export default stockCandidatePopulatorService; 