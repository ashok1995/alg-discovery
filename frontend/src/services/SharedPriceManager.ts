/**
 * Shared Price Manager
 * ====================
 *
 * Centralized price management system that:
 * 1. Collects stocks from all pages
 * 2. Batches price requests to minimize API calls
 * 3. Distributes prices to all components
 * 4. Manages WebSocket connections for real-time updates
 * 5. Handles automatic cleanup of unused symbols
 */

import { EventEmitter } from 'events';
import { getApiUrl } from '../config/api';
import AppLevelCacheManager, { PriceData } from './AppLevelCacheManager';
import type { SymbolRequest, PriceManagerStats } from './priceUtils';
import { createBatches } from './priceUtils';

class SharedPriceManager extends EventEmitter {
  private static instance: SharedPriceManager;

  private symbolRequests: Map<string, SymbolRequest> = new Map();
  private pendingSymbols: Set<string> = new Set();
  private lastBatchUpdate = 0;
  private batchUpdateInterval = 2000;
  private maxBatchSize = 100;

  private apiCallCount = 0;
  private cacheHits = 0;
  private cacheMisses = 0;

  private cacheManager: AppLevelCacheManager;

  private batchProcessor: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.cacheManager = AppLevelCacheManager.getInstance();

    this.initializeBackgroundProcessing();
    console.log('🚀 SharedPriceManager initialized');
  }

  public static getInstance(): SharedPriceManager {
    if (!SharedPriceManager.instance) {
      SharedPriceManager.instance = new SharedPriceManager();
    }
    return SharedPriceManager.instance;
  }

  // ==================== SYMBOL MANAGEMENT ====================

  public requestSymbol(
    symbol: string,
    requestedBy: string,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): void {
    const now = Date.now();
    const existingRequest = this.symbolRequests.get(symbol);

    if (existingRequest) {
      existingRequest.requestedBy = requestedBy;
      existingRequest.priority = priority;
      existingRequest.lastRequested = now;
    } else {
      const symbolRequest: SymbolRequest = {
        symbol,
        requestedBy,
        priority,
        lastRequested: now,
      };

      this.symbolRequests.set(symbol, symbolRequest);
      this.pendingSymbols.add(symbol);

      console.log(`📋 New symbol request: ${symbol} from ${requestedBy} (${priority} priority)`);
    }
  }

  public releaseSymbol(symbol: string, requestedBy: string): void {
    const req = this.symbolRequests.get(symbol);
    if (req?.requestedBy === requestedBy) {
      this.symbolRequests.delete(symbol);
      this.pendingSymbols.delete(symbol);
    }
  }

  public getRequestedSymbols(): string[] {
    return Array.from(this.symbolRequests.keys());
  }

  public getSymbolsByPriority(priority: 'high' | 'normal' | 'low'): string[] {
    return Array.from(this.symbolRequests.values())
      .filter((request) => request.priority === priority)
      .map((request) => request.symbol);
  }

  // ==================== BATCH PRICE UPDATES ====================

  private async processBatchUpdates(): Promise<void> {
    if (this.pendingSymbols.size === 0) {
      return;
    }

    const symbols = Array.from(this.pendingSymbols);
    const batches = createBatches(symbols, this.maxBatchSize);

    console.log(`🔄 Processing ${symbols.length} symbols in ${batches.length} batches`);

    for (const batch of batches) {
      await this.fetchBatchPrices(batch);
    }

    this.pendingSymbols.clear();
    this.lastBatchUpdate = Date.now();
  }

  private async fetchBatchPrices(symbols: string[]): Promise<void> {
    try {
      console.log(`📡 Fetching prices for batch: ${symbols.length} symbols`);

      const cachedPrices = this.cacheManager.getPrices(symbols);
      const cachedSymbols = new Set(cachedPrices.map((p) => p.symbol));
      const uncachedSymbols = symbols.filter((s) => !cachedSymbols.has(s));

      if (cachedPrices.length > 0) {
        this.cacheHits += cachedPrices.length;
        console.log(`✅ Cache hit: ${cachedPrices.length} symbols`);

        this.emit('pricesUpdated', cachedPrices);
      }

      if (uncachedSymbols.length > 0) {
        this.cacheMisses += uncachedSymbols.length;
        console.log(`🔍 Cache miss: ${uncachedSymbols.length} symbols, fetching from API`);

        const apiPrices = await this.fetchPricesFromAPI(uncachedSymbols);

        if (apiPrices.length > 0) {
          this.cacheManager.updatePrices(apiPrices);
          this.emit('pricesUpdated', apiPrices);
          console.log(`✅ API fetch complete: ${apiPrices.length} prices updated`);
        }
      }

      this.apiCallCount++;
    } catch (error) {
      console.error('❌ Error fetching batch prices:', error);
      this.emit('priceFetchError', { symbols, error });
    }
  }

  private async fetchPricesFromAPI(symbols: string[]): Promise<PriceData[]> {
    try {
      const res = await fetch(getApiUrl(`/api/swing/real-time-prices?symbols=${symbols.join(',')}`));
      const response = await res.json();

      if (response?.success && response.prices) {
        return response.prices.map((price: Record<string, unknown>) => ({
          symbol: price.symbol as string,
          price: price.price as number,
          change: price.change as number,
          changePercent: price.changePercent as number,
          volume: price.volume as number,
          lastUpdated: Date.now(),
          source: 'api' as const,
        }));
      }

      return [];
    } catch (error) {
      console.error('❌ API fetch error:', error);
      return [];
    }
  }

  // ==================== WEBSOCKET INTEGRATION ====================

  public async initializeWebSocket(apiKey: string, accessToken: string): Promise<void> {
    try {
      await this.cacheManager.initializeWebSocket(apiKey, accessToken);

      const symbols = this.getRequestedSymbols();
      if (symbols.length > 0) {
        this.cacheManager.subscribeToSymbols(symbols);
      }

      console.log('🔌 WebSocket initialized for shared price manager');
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket:', error);
      throw error;
    }
  }

  public subscribeToSymbols(symbols: string[]): void {
    this.cacheManager.subscribeToSymbols(symbols);
  }

  // ==================== BACKGROUND PROCESSING ====================

  private initializeBackgroundProcessing(): void {
    this.batchProcessor = setInterval(() => {
      this.processBatchUpdates();
    }, this.batchUpdateInterval);

    this.cleanupInterval = setInterval(() => {
      this.cleanupUnusedSymbols();
    }, 5 * 60 * 1000);

    console.log('🔄 Background processing initialized');
  }

  private cleanupUnusedSymbols(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000;

    let cleanedCount = 0;

    for (const [symbol, request] of Array.from(this.symbolRequests.entries())) {
      if (now - request.lastRequested > maxAge) {
        this.symbolRequests.delete(symbol);
        this.pendingSymbols.delete(symbol);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} unused symbols`);
    }
  }

  // ==================== STATISTICS ====================

  public getStats(): PriceManagerStats {
    const totalHits = this.cacheHits + this.cacheMisses;
    const hitRate = totalHits > 0 ? (this.cacheHits / totalHits) * 100 : 0;

    return {
      totalSymbols: this.symbolRequests.size,
      activeRequests: this.pendingSymbols.size,
      lastBatchUpdate: this.lastBatchUpdate,
      websocketConnected: false,
      apiCallCount: this.apiCallCount,
      cacheHitRate: hitRate,
    };
  }

  public resetStats(): void {
    this.apiCallCount = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log('📊 Statistics reset');
  }

  // ==================== UTILITY METHODS ====================

  public getPrice(symbol: string): PriceData | null {
    return this.cacheManager.getPrice(symbol);
  }

  public getPrices(symbols: string[]): PriceData[] {
    return this.cacheManager.getPrices(symbols);
  }

  public async forcePriceUpdate(symbols: string[]): Promise<void> {
    console.log(`⚡ Force updating prices for ${symbols.length} symbols`);

    symbols.forEach((symbol) => this.pendingSymbols.add(symbol));

    await this.processBatchUpdates();
  }

  public stop(): void {
    if (this.batchProcessor) {
      clearInterval(this.batchProcessor);
      this.batchProcessor = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    console.log('⏹️ SharedPriceManager stopped');
  }

  public cleanup(): void {
    this.symbolRequests.clear();
    this.pendingSymbols.clear();
    this.resetStats();

    console.log('🗑️ SharedPriceManager cleaned up');
  }
}

export default SharedPriceManager;
