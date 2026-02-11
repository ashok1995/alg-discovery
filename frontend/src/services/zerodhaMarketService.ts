/**
 * Zerodha Market Data Service
 * 
 * Service for fetching market data, top gainers/losers, and other market-related information
 * from the Zerodha container.
 */

import { containerConfigService, MarketData, TopGainersLosers } from './containerConfigService';

export interface MarketDataRequest {
  symbol: string;
  timeframe?: string;
}

export interface TopGainersLosersRequest {
  timeframe?: string;
  limit?: number;
}

export interface MarketDataResponse {
  success: boolean;
  data: MarketData | null;
  error?: string;
  timestamp: string;
}

export interface TopGainersLosersResponse {
  success: boolean;
  data: TopGainersLosers | null;
  error?: string;
  timestamp: string;
}

class ZerodhaMarketService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = containerConfigService.getBaseUrl();
  }

  /**
   * Get market data for a specific symbol
   */
  async getMarketData(symbol: string): Promise<MarketDataResponse> {
    try {
      const data = await containerConfigService.getMarketData(symbol);
      
      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching market data:', error);
      
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get top gainers and losers
   */
  async getTopGainersLosers(): Promise<TopGainersLosersResponse> {
    try {
      const data = await containerConfigService.getTopGainersLosers();
      
      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching top gainers and losers:', error);
      
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get market data for multiple symbols
   */
  async getMultipleMarketData(symbols: string[]): Promise<{
    [symbol: string]: MarketDataResponse;
  }> {
    const results: { [symbol: string]: MarketDataResponse } = {};
    
    // Fetch data for all symbols in parallel
    const promises = symbols.map(async (symbol) => {
      const result = await this.getMarketData(symbol);
      results[symbol] = result;
    });
    
    await Promise.all(promises);
    
    return results;
  }

  /**
   * Get market summary with top gainers, losers, and specific symbols
   */
  async getMarketSummary(symbols: string[] = []): Promise<{
    topGainersLosers: TopGainersLosersResponse;
    marketData: { [symbol: string]: MarketDataResponse };
    summary: {
      totalSymbols: number;
      successfulRequests: number;
      failedRequests: number;
      timestamp: string;
    };
  }> {
    const timestamp = new Date().toISOString();
    
    // Get top gainers and losers
    const topGainersLosers = await this.getTopGainersLosers();
    
    // Get market data for specific symbols
    const marketData = await this.getMultipleMarketData(symbols);
    
    // Calculate summary
    const successfulRequests = Object.values(marketData).filter(r => r.success).length;
    const failedRequests = Object.values(marketData).filter(r => !r.success).length;
    
    return {
      topGainersLosers,
      marketData,
      summary: {
        totalSymbols: symbols.length,
        successfulRequests,
        failedRequests,
        timestamp
      }
    };
  }

  /**
   * Get real-time price for a symbol
   */
  async getRealTimePrice(symbol: string): Promise<{
    symbol: string;
    price: number | null;
    change: number | null;
    changePercent: number | null;
    timestamp: string;
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await this.getMarketData(symbol);
      
      if (response.success && response.data) {
        return {
          symbol,
          price: response.data.quote.last_price,
          change: response.data.quote.change,
          changePercent: response.data.quote.change_percent,
          timestamp: response.data.timestamp,
          success: true
        };
      } else {
        return {
          symbol,
          price: null,
          change: null,
          changePercent: null,
          timestamp: new Date().toISOString(),
          success: false,
          error: response.error
        };
      }
    } catch (error) {
      return {
        symbol,
        price: null,
        change: null,
        changePercent: null,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get market breadth information
   */
  async getMarketBreadth(): Promise<{
    advancing: number;
    declining: number;
    unchanged: number;
    total: number;
    breadthRatio: number;
    timestamp: string;
  } | null> {
    try {
      const response = await this.getTopGainersLosers();
      
      if (response.success && response.data) {
        const { advancing, declining, unchanged } = response.data.market_breadth;
        const total = advancing + declining + unchanged;
        const breadthRatio = total > 0 ? advancing / total : 0;
        
        return {
          advancing,
          declining,
          unchanged,
          total,
          breadthRatio,
          timestamp: response.data.timestamp
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching market breadth:', error);
      return null;
    }
  }

  /**
   * Get top gainers for display
   */
  async getTopGainers(limit: number = 5): Promise<Array<{
    symbol: string;
    price: string;
    change: string;
    changePercent: string;
    volume: number;
    rank: number;
  }>> {
    try {
      const response = await this.getTopGainersLosers();
      
      if (response.success && response.data) {
        return response.data.top_gainers
          .slice(0, limit)
          .map(item => ({
            symbol: item.tradingsymbol,
            price: item.last_price,
            change: item.change,
            changePercent: item.percentage_change,
            volume: item.volume,
            rank: item.rank
          }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching top gainers:', error);
      return [];
    }
  }

  /**
   * Get top losers for display
   */
  async getTopLosers(limit: number = 5): Promise<Array<{
    symbol: string;
    price: string;
    change: string;
    changePercent: string;
    volume: number;
    rank: number;
  }>> {
    try {
      const response = await this.getTopGainersLosers();
      
      if (response.success && response.data) {
        return response.data.top_losers
          .slice(0, limit)
          .map(item => ({
            symbol: item.tradingsymbol,
            price: item.last_price,
            change: item.change,
            changePercent: item.percentage_change,
            volume: item.volume,
            rank: item.rank
          }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching top losers:', error);
      return [];
    }
  }
}

// Export singleton instance
export const zerodhaMarketService = new ZerodhaMarketService(); 