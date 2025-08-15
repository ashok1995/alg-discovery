/**
 * Smart Refresh Service for managing background price updates
 * Uses centralized API client with comprehensive logging
 */

import ApiClient from './ApiClient';
import { API_CONFIG } from '../config/api';
import DataCacheManager from './DataCacheManager';

export interface RefreshConfig {
  strategyType: string;
  priceRefreshInterval: number; // in seconds
  recommendationRefreshInterval: number; // in seconds
  forceRefreshInterval: number; // in seconds
}

export class SmartRefreshService {
  private static instance: SmartRefreshService;
  private refreshConfigs: Map<string, RefreshConfig> = new Map();
  private activeIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isBackgroundMode: boolean = false;
  private apiClient: ApiClient;
  private cacheManager: DataCacheManager;
  
  // Rate limiting and error handling
  private lastPriceUpdate: number = 0;
  private lastPriceError: number = 0;
  private readonly MIN_PRICE_UPDATE_INTERVAL = API_CONFIG.REFRESH.MIN_INTERVAL;
  private readonly ERROR_BACKOFF_INTERVAL = 5000; // 5 seconds after error

  private constructor() {
    this.apiClient = ApiClient.getInstance();
    this.cacheManager = DataCacheManager.getInstance();
    this.initializeConfigs();
    console.log(`🎯 [${new Date().toISOString()}] SmartRefreshService initialized with config:`, {
      baseUrl: API_CONFIG.BASE_URL,
      refreshIntervals: API_CONFIG.REFRESH,
      requestConfig: API_CONFIG.REQUEST
    });
  }

  public static getInstance(): SmartRefreshService {
    if (!SmartRefreshService.instance) {
      SmartRefreshService.instance = new SmartRefreshService();
    }
    return SmartRefreshService.instance;
  }

  private initializeConfigs(): void {
    const configs: RefreshConfig[] = [
      {
        strategyType: 'intraday-buy',
        priceRefreshInterval: 5, // 5 seconds
        recommendationRefreshInterval: 120, // 2 minutes
        forceRefreshInterval: 300, // 5 minutes
      },
      {
        strategyType: 'intraday-sell',
        priceRefreshInterval: 5, // 5 seconds
        recommendationRefreshInterval: 120, // 2 minutes
        forceRefreshInterval: 300, // 5 minutes
      },
      {
        strategyType: 'swing-buy',
        priceRefreshInterval: 10, // 10 seconds
        recommendationRefreshInterval: 300, // 5 minutes
        forceRefreshInterval: 600, // 10 minutes
      },
      {
        strategyType: 'short-sell',
        priceRefreshInterval: 5, // 5 seconds
        recommendationRefreshInterval: 120, // 2 minutes
        forceRefreshInterval: 300, // 5 minutes
      }
    ];

    configs.forEach(config => {
      this.refreshConfigs.set(config.strategyType, config);
    });

    console.log(`📋 [${new Date().toISOString()}] Refresh configs initialized:`, 
      Object.fromEntries(this.refreshConfigs));
  }

  public startPriceRefresh(
    strategyType: string,
    symbols: string[] | null = null,
    onPriceUpdate: (prices: any) => void,
    onError?: (error: any) => void
  ): void {
    // If no symbols provided, get from cache
    let targetSymbols = symbols;
    if (!targetSymbols || targetSymbols.length === 0) {
      targetSymbols = this.cacheManager.getAllCachedSymbols();
      console.log(`📊 [${new Date().toISOString()}] Using cached symbols for ${strategyType}:`, {
        cachedSymbols: targetSymbols.length,
        sampleSymbols: targetSymbols.slice(0, 5)
      });
    }
    
    if (!targetSymbols.length) {
      console.warn(`⚠️ [${new Date().toISOString()}] No symbols available for ${strategyType} price refresh (neither provided nor cached)`);
      return;
    }

    const config = this.refreshConfigs.get(strategyType);
    if (!config) {
      console.error(`❌ [${new Date().toISOString()}] No refresh config found for strategy: ${strategyType}`);
      return;
    }

    const intervalKey = `price-${strategyType}`;
    
    // Clear existing interval
    this.stopRefresh(intervalKey);

    console.log(`🔄 [${new Date().toISOString()}] Starting price refresh for ${strategyType}:`, {
      symbols: targetSymbols.length,
      interval: `${config.priceRefreshInterval}s`,
      sampleSymbols: targetSymbols.slice(0, 3)
    });

    // Start new interval
    const intervalId = setInterval(async () => {
      // Always get fresh symbols from cache in case new data was added
      const currentSymbols = this.cacheManager.getAllCachedSymbols();
      const symbolsToUse = currentSymbols.length > 0 ? currentSymbols : targetSymbols;
      await this.fetchPrices(symbolsToUse || [], onPriceUpdate, onError);
    }, config.priceRefreshInterval * 1000);

    this.activeIntervals.set(intervalKey, intervalId);

    // Fetch immediately
    this.fetchPrices(targetSymbols || [], onPriceUpdate, onError);
  }

  private async fetchPrices(
    symbols: string[],
    onPriceUpdate: (prices: any) => void,
    onError?: (error: any) => void
  ): Promise<void> {
    if (!symbols.length) {
      console.warn(`⚠️ [${new Date().toISOString()}] No symbols provided for price refresh`);
      return;
    }

    const now = Date.now();

    // Rate limit price updates
    if (now - this.lastPriceUpdate < this.MIN_PRICE_UPDATE_INTERVAL) {
      console.log(`⏱️ [${new Date().toISOString()}] Skipping price update - too soon (${now - this.lastPriceUpdate}ms < ${this.MIN_PRICE_UPDATE_INTERVAL}ms)`);
      return;
    }

    // Back off after errors
    if (now - this.lastPriceError < this.ERROR_BACKOFF_INTERVAL) {
      console.log(`⏱️ [${new Date().toISOString()}] Skipping price update - backing off after error (${now - this.lastPriceError}ms < ${this.ERROR_BACKOFF_INTERVAL}ms)`);
      return;
    }

    try {
      console.log(`🔄 [${new Date().toISOString()}] SmartRefreshService: Fetching prices for ${symbols.length} symbols...`);
      
      const endpoint = `${API_CONFIG.ENDPOINTS.SWING.REAL_TIME_PRICES}?symbols=${symbols.join(',')}`;
      const response = await this.apiClient.request(endpoint, {
        method: 'GET',
        timeout: 10000 // 10 second timeout for price requests
      });

      if (response.success && response.data) {
        const priceData = response.data.data || response.data;
        console.log(`✅ [${new Date().toISOString()}] SmartRefreshService: Received prices for ${Object.keys(priceData).length} symbols (${response.duration}ms)`);
        
        if (Object.keys(priceData).length > 0) {
          console.log(`📊 [${new Date().toISOString()}] Sample price data:`, {
            firstSymbol: Object.entries(priceData)[0],
            totalSymbols: Object.keys(priceData).length,
            requestId: response.requestId
          });
        }

        // Reset error state on success
        this.lastPriceError = 0;
        this.lastPriceUpdate = now;
        onPriceUpdate(priceData);
      } else {
        throw new Error(response.error || `HTTP ${response.status}`);
      }
    } catch (error: any) {
      this.lastPriceError = now;
      console.error(`❌ [${new Date().toISOString()}] SmartRefreshService price fetch error:`, {
        error: error.message,
        symbolCount: symbols.length,
        sampleSymbols: symbols.slice(0, 3),
        timeSinceLastSuccess: now - this.lastPriceUpdate,
        willBackoff: `${this.ERROR_BACKOFF_INTERVAL}ms`
      });
      
      if (onError) {
        onError(error);
      }
    }
  }

  public stopRefresh(key: string): void {
    const intervalId = this.activeIntervals.get(key);
    if (intervalId) {
      clearInterval(intervalId);
      this.activeIntervals.delete(key);
      console.log(`🛑 [${new Date().toISOString()}] Stopped refresh interval: ${key}`);
    }
  }

  public stopPriceRefresh(strategyType: string): void {
    const intervalKey = `price-${strategyType}`;
    this.stopRefresh(intervalKey);
  }

  public stopAllRefresh(): void {
    console.log(`🛑 [${new Date().toISOString()}] Stopping all refresh intervals (${this.activeIntervals.size} active)`);
    
    Array.from(this.activeIntervals.entries()).forEach(([key, intervalId]) => {
      clearInterval(intervalId);
      console.log(`🛑 Stopped interval: ${key}`);
    });
    
    this.activeIntervals.clear();
    
    // Cancel any active API requests
    this.apiClient.cancelAllRequests();
  }

  public getActiveIntervals(): string[] {
    return Array.from(this.activeIntervals.keys());
  }

  public getStats(): any {
    return {
      activeIntervals: this.getActiveIntervals(),
      activeApiRequests: this.apiClient.getActiveRequestCount(),
      lastPriceUpdate: new Date(this.lastPriceUpdate).toISOString(),
      lastPriceError: this.lastPriceError ? new Date(this.lastPriceError).toISOString() : null,
      rateLimiting: {
        minInterval: this.MIN_PRICE_UPDATE_INTERVAL,
        errorBackoff: this.ERROR_BACKOFF_INTERVAL
      }
    };
  }
}

export default SmartRefreshService;