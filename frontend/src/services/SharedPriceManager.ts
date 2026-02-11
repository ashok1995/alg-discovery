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
import AppLevelCacheManager, { PriceData } from './AppLevelCacheManager';
import ApiClient from './ApiClient';

export interface SymbolRequest {
  symbol: string;
  requestedBy: string; // Component/page that requested this symbol
  priority: 'high' | 'normal' | 'low';
  lastRequested: number;
}

export interface BatchPriceRequest {
  symbols: string[];
  batchId: string;
  timestamp: number;
  source: 'api' | 'websocket';
}

export interface PriceManagerStats {
  totalSymbols: number;
  activeRequests: number;
  lastBatchUpdate: number;
  websocketConnected: boolean;
  apiCallCount: number;
  cacheHitRate: number;
}

class SharedPriceManager extends EventEmitter {
  private static instance: SharedPriceManager;
  
  // Symbol tracking
  private symbolRequests: Map<string, SymbolRequest> = new Map();
  private pendingSymbols: Set<string> = new Set();
  private batchQueue: BatchPriceRequest[] = [];
  
  // Price update management
  private lastBatchUpdate = 0;
  private batchUpdateInterval = 2000; // 2 seconds
  private maxBatchSize = 100; // Max symbols per API call
  
  // Statistics
  private apiCallCount = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  
  // Services
  private cacheManager: AppLevelCacheManager;
  private apiClient: ApiClient;
  
  // Background processing
  private batchProcessor: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.cacheManager = AppLevelCacheManager.getInstance();
    this.apiClient = ApiClient.getInstance();
    
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

  /**
   * Request price for a symbol from a specific component
   */
  public requestSymbol(
    symbol: string, 
    requestedBy: string, 
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): void {
    const now = Date.now();
    const existingRequest = this.symbolRequests.get(symbol);
    
    if (existingRequest) {
      // Update existing request
      existingRequest.requestedBy = requestedBy;
      existingRequest.priority = priority;
      existingRequest.lastRequested = now;
    } else {
      // Create new request
      const symbolRequest: SymbolRequest = {
        symbol,
        requestedBy,
        priority,
        lastRequested: now
      };
      
      this.symbolRequests.set(symbol, symbolRequest);
      this.pendingSymbols.add(symbol);
      
      console.log(`📋 New symbol request: ${symbol} from ${requestedBy} (${priority} priority)`);
    }
  }

  /**
   * Release symbol request (when component unmounts or no longer needs it)
   */
  public releaseSymbol(symbol: string, requestedBy: string): void {
    const request = this.symbolRequests.get(symbol);
    
    if (request && request.requestedBy === requestedBy) {
      this.symbolRequests.delete(symbol);
      this.pendingSymbols.delete(symbol);
      
      console.log(`🗑️ Released symbol: ${symbol} by ${requestedBy}`);
    }
  }

  /**
   * Get all currently requested symbols
   */
  public getRequestedSymbols(): string[] {
    return Array.from(this.symbolRequests.keys());
  }

  /**
   * Get symbols by priority
   */
  public getSymbolsByPriority(priority: 'high' | 'normal' | 'low'): string[] {
    return Array.from(this.symbolRequests.values())
      .filter(request => request.priority === priority)
      .map(request => request.symbol);
  }

  // ==================== BATCH PRICE UPDATES ====================

  /**
   * Process pending symbols in batches
   */
  private async processBatchUpdates(): Promise<void> {
    if (this.pendingSymbols.size === 0) {
      return;
    }

    const symbols = Array.from(this.pendingSymbols);
    const batches = this.createBatches(symbols);
    
    console.log(`🔄 Processing ${symbols.length} symbols in ${batches.length} batches`);
    
    for (const batch of batches) {
      await this.fetchBatchPrices(batch);
    }
    
    this.pendingSymbols.clear();
    this.lastBatchUpdate = Date.now();
  }

  /**
   * Create batches of symbols for API calls
   */
  private createBatches(symbols: string[]): string[][] {
    const batches: string[][] = [];
    
    for (let i = 0; i < symbols.length; i += this.maxBatchSize) {
      batches.push(symbols.slice(i, i + this.maxBatchSize));
    }
    
    return batches;
  }

  /**
   * Fetch prices for a batch of symbols
   */
  private async fetchBatchPrices(symbols: string[]): Promise<void> {
    try {
      console.log(`📡 Fetching prices for batch: ${symbols.length} symbols`);
      
      // Check cache first
      const cachedPrices = this.cacheManager.getPrices(symbols);
      const cachedSymbols = new Set(cachedPrices.map(p => p.symbol));
      const uncachedSymbols = symbols.filter(s => !cachedSymbols.has(s));
      
      if (cachedPrices.length > 0) {
        this.cacheHits += cachedPrices.length;
        console.log(`✅ Cache hit: ${cachedPrices.length} symbols`);
        
        // Emit cached prices
        this.emit('pricesUpdated', cachedPrices);
      }
      
      if (uncachedSymbols.length > 0) {
        this.cacheMisses += uncachedSymbols.length;
        console.log(`🔍 Cache miss: ${uncachedSymbols.length} symbols, fetching from API`);
        
        // Fetch from API
        const apiPrices = await this.fetchPricesFromAPI(uncachedSymbols);
        
        if (apiPrices.length > 0) {
          // Cache the new prices
          this.cacheManager.updatePrices(apiPrices);
          
          // Emit new prices
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

  /**
   * Fetch prices from API
   */
  private async fetchPricesFromAPI(symbols: string[]): Promise<PriceData[]> {
    try {
      // Use the existing API client to fetch prices
      const response = await this.apiClient.request(`/api/swing/real-time-prices?symbols=${symbols.join(',')}`, {
        method: 'GET'
      });
      
      if (response.data && response.data.success) {
        return response.data.prices.map((price: any) => ({
          symbol: price.symbol,
          price: price.price,
          change: price.change,
          changePercent: price.changePercent,
          volume: price.volume,
          lastUpdated: Date.now(),
          source: 'api' as const
        }));
      }
      
      return [];
      
    } catch (error) {
      console.error('❌ API fetch error:', error);
      return [];
    }
  }

  // ==================== WEBSOCKET INTEGRATION ====================

  /**
   * Initialize WebSocket for real-time price updates
   */
  public async initializeWebSocket(apiKey: string, accessToken: string): Promise<void> {
    try {
      await this.cacheManager.initializeWebSocket(apiKey, accessToken);
      
      // Subscribe to all requested symbols
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

  /**
   * Subscribe to symbols via WebSocket
   */
  public subscribeToSymbols(symbols: string[]): void {
    this.cacheManager.subscribeToSymbols(symbols);
  }

  // ==================== BACKGROUND PROCESSING ====================

  /**
   * Initialize background processing
   */
  private initializeBackgroundProcessing(): void {
    // Process batches every 2 seconds
    this.batchProcessor = setInterval(() => {
      this.processBatchUpdates();
    }, this.batchUpdateInterval);
    
    // Clean up unused symbols every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupUnusedSymbols();
    }, 5 * 60 * 1000);
    
    console.log('🔄 Background processing initialized');
  }

  /**
   * Clean up symbols that haven't been requested recently
   */
  private cleanupUnusedSymbols(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    
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

  /**
   * Get price manager statistics
   */
  public getStats(): PriceManagerStats {
    const totalHits = this.cacheHits + this.cacheMisses;
    const hitRate = totalHits > 0 ? (this.cacheHits / totalHits) * 100 : 0;
    
    return {
      totalSymbols: this.symbolRequests.size,
      activeRequests: this.pendingSymbols.size,
      lastBatchUpdate: this.lastBatchUpdate,
      websocketConnected: false, // TODO: Get from cache manager
      apiCallCount: this.apiCallCount,
      cacheHitRate: hitRate
    };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.apiCallCount = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log('📊 Statistics reset');
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get price for a symbol
   */
  public getPrice(symbol: string): PriceData | null {
    return this.cacheManager.getPrice(symbol);
  }

  /**
   * Get prices for multiple symbols
   */
  public getPrices(symbols: string[]): PriceData[] {
    return this.cacheManager.getPrices(symbols);
  }

  /**
   * Force immediate price update for symbols
   */
  public async forcePriceUpdate(symbols: string[]): Promise<void> {
    console.log(`⚡ Force updating prices for ${symbols.length} symbols`);
    
    // Add to pending symbols
    symbols.forEach(symbol => this.pendingSymbols.add(symbol));
    
    // Process immediately
    await this.processBatchUpdates();
  }

  /**
   * Stop background processing
   */
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

  /**
   * Clean up all data
   */
  public cleanup(): void {
    this.symbolRequests.clear();
    this.pendingSymbols.clear();
    this.batchQueue = [];
    this.resetStats();
    
    console.log('🗑️ SharedPriceManager cleaned up');
  }
}

export default SharedPriceManager; 