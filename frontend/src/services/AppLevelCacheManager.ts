/**
 * App-Level Cache Manager
 * =======================
 * 
 * Centralized caching system for the entire application that:
 * 1. Caches recommendations across all pages
 * 2. Manages shared price data with WebSocket integration
 * 3. Provides real-time price updates to all components
 * 4. Handles background refresh intervals
 */

import { EventEmitter } from 'events';
import { API_CONFIG } from '../config/api';

export interface CachedRecommendation {
  id: string;
  strategy: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  symbols: string[];
  variants?: Record<string, string>;
}

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: number;
  source: 'websocket' | 'api' | 'cache';
}

export interface AppCacheStats {
  totalRecommendations: number;
  totalSymbols: number;
  activeWebSocketConnections: number;
  lastPriceUpdate: number;
  cacheHitRate: number;
  memoryUsage: string;
}

class AppLevelCacheManager extends EventEmitter {
  private static instance: AppLevelCacheManager;
  
  // Cache storage
  private recommendations: Map<string, CachedRecommendation> = new Map();
  private priceCache: Map<string, PriceData> = new Map();
  
  // WebSocket management
  private websocketConnections: Map<string, WebSocket> = new Map();
  private subscribedSymbols: Set<string> = new Set();
  private maxWebSocketConnections = 3; // Kite Connect limit
  private maxSymbolsPerConnection = API_CONFIG.WEBSOCKET.MAX_SUBSCRIPTIONS; // Kite Connect limit
  
  // Background refresh
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();
  private backgroundRefreshActive = false;
  
  // Statistics
  private cacheHits = 0;
  private cacheMisses = 0;
  private lastStatsReset = Date.now();

  private constructor() {
    super();
    this.initializeBackgroundRefresh();
    console.log('🚀 AppLevelCacheManager initialized');
  }

  public static getInstance(): AppLevelCacheManager {
    if (!AppLevelCacheManager.instance) {
      AppLevelCacheManager.instance = new AppLevelCacheManager();
    }
    return AppLevelCacheManager.instance;
  }

  // ==================== RECOMMENDATION CACHING ====================

  /**
   * Store recommendation data with automatic expiration
   */
  public cacheRecommendation(
    strategy: string,
    data: any,
    symbols: string[],
    variants?: Record<string, string>,
    cacheDuration: number = 15 * 60 * 1000 // 15 minutes default
  ): string {
    const id = this.generateRecommendationId(strategy, variants);
    const now = Date.now();
    
    const recommendation: CachedRecommendation = {
      id,
      strategy,
      data,
      timestamp: now,
      expiresAt: now + cacheDuration,
      symbols,
      variants
    };

    this.recommendations.set(id, recommendation);
    
    // Add symbols to global tracking
    symbols.forEach(symbol => this.subscribedSymbols.add(symbol));
    
    console.log(`💾 Cached recommendation: ${strategy}`, {
      symbols: symbols.length,
      expiresIn: `${cacheDuration / 1000}s`,
      totalCached: this.recommendations.size
    });

    // Emit cache update event
    this.emit('recommendationCached', { strategy, id, symbols });
    
    return id;
  }

  /**
   * Get cached recommendation if available and not expired
   */
  public getCachedRecommendation(
    strategy: string,
    variants?: Record<string, string>
  ): CachedRecommendation | null {
    const id = this.generateRecommendationId(strategy, variants);
    const recommendation = this.recommendations.get(id);
    
    if (!recommendation) {
      this.cacheMisses++;
      console.log(`🔍 Cache miss: ${strategy}`);
      return null;
    }

    const now = Date.now();
    if (now > recommendation.expiresAt) {
      this.recommendations.delete(id);
      this.cacheMisses++;
      console.log(`⏰ Cache expired: ${strategy}`);
      return null;
    }

    this.cacheHits++;
    console.log(`✅ Cache hit: ${strategy}`);
    return recommendation;
  }

  /**
   * Check if recommendation is cached and valid
   */
  public hasValidRecommendation(
    strategy: string,
    variants?: Record<string, string>
  ): boolean {
    const id = this.generateRecommendationId(strategy, variants);
    const recommendation = this.recommendations.get(id);
    
    if (!recommendation) return false;
    
    const now = Date.now();
    if (now > recommendation.expiresAt) {
      this.recommendations.delete(id);
      return false;
    }
    
    return true;
  }

  // ==================== PRICE MANAGEMENT ====================

  /**
   * Get current price for a symbol
   */
  public getPrice(symbol: string): PriceData | null {
    return this.priceCache.get(symbol) || null;
  }

  /**
   * Get prices for multiple symbols
   */
  public getPrices(symbols: string[]): PriceData[] {
    return symbols
      .map(symbol => this.priceCache.get(symbol))
      .filter(price => price !== undefined) as PriceData[];
  }

  /**
   * Update price data (called by WebSocket or API)
   */
  public updatePrice(priceData: PriceData): void {
    const existing = this.priceCache.get(priceData.symbol);
    this.priceCache.set(priceData.symbol, priceData);
    
    // Emit price update event
    this.emit('priceUpdated', priceData);
    
    // Log significant price changes
    if (existing && Math.abs(priceData.changePercent - existing.changePercent) > 1) {
      console.log(`📈 Price update: ${priceData.symbol}`, {
        price: priceData.price,
        change: priceData.changePercent.toFixed(2) + '%',
        source: priceData.source
      });
    }
  }

  /**
   * Batch update prices
   */
  public updatePrices(priceDataArray: PriceData[]): void {
    priceDataArray.forEach(priceData => {
      this.updatePrice(priceData);
    });
    
    // Emit batch update event
    this.emit('pricesBatchUpdated', priceDataArray);
  }

  // ==================== WEBSOCKET MANAGEMENT ====================

  /**
   * Initialize WebSocket connection for real-time price updates
   */
  public async initializeWebSocket(apiKey: string, accessToken: string): Promise<void> {
    try {
      // Close existing connections if at limit
      if (this.websocketConnections.size >= this.maxWebSocketConnections) {
        const oldestConnection = this.websocketConnections.keys().next().value;
        if (oldestConnection) {
          this.closeWebSocketConnection(oldestConnection);
        }
      }

      const wsUrl = `wss://ws.kite.trade/?api_key=${apiKey}&access_token=${accessToken}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('🔌 WebSocket connected for real-time prices');
        this.emit('websocketConnected');
        
        // Subscribe to all tracked symbols
        this.subscribeToSymbols(Array.from(this.subscribedSymbols));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('❌ WebSocket message parse error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.emit('websocketError', error);
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.emit('websocketDisconnected');
      };

      const connectionId = `kite_${Date.now()}`;
      this.websocketConnections.set(connectionId, ws);
      
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket:', error);
      throw error;
    }
  }

  /**
   * Subscribe to symbols for real-time updates
   */
  public subscribeToSymbols(symbols: string[]): void {
    const connection = this.getActiveWebSocketConnection();
    if (!connection) {
      console.warn('⚠️ No active WebSocket connection for symbol subscription');
      return;
    }

    // Group symbols by connection (max 3000 per connection)
    const symbolGroups = this.chunkArray(symbols, this.maxSymbolsPerConnection);
    
    symbolGroups.forEach((symbolGroup, index) => {
      const subscribeMessage = {
        a: 'subscribe',
        v: symbolGroup.map(symbol => ({
          instrument_token: this.getInstrumentToken(symbol), // You'll need to implement this
          exchange_token: symbol
        }))
      };
      
      connection.send(JSON.stringify(subscribeMessage));
      console.log(`📡 Subscribed to ${symbolGroup.length} symbols (group ${index + 1})`);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(data: any): void {
    if (data.type === 'ltp') {
      // Last traded price update
      const priceData: PriceData = {
        symbol: data.instrument_token, // You'll need to map this back to symbol
        price: data.last_price,
        change: data.change,
        changePercent: data.change_percent,
        volume: data.volume,
        lastUpdated: Date.now(),
        source: 'websocket'
      };
      
      this.updatePrice(priceData);
    }
  }

  // ==================== BACKGROUND REFRESH ====================

  /**
   * Start background refresh for recommendations
   */
  public startBackgroundRefresh(strategy: string, interval: number = 5 * 60 * 1000): void {
    if (this.refreshIntervals.has(strategy)) {
      this.stopBackgroundRefresh(strategy);
    }

    const intervalId = setInterval(() => {
      this.emit('backgroundRefresh', { strategy, timestamp: Date.now() });
    }, interval);

    this.refreshIntervals.set(strategy, intervalId);
    console.log(`🔄 Started background refresh for ${strategy} (${interval / 1000}s)`);
  }

  /**
   * Stop background refresh for a strategy
   */
  public stopBackgroundRefresh(strategy: string): void {
    const intervalId = this.refreshIntervals.get(strategy);
    if (intervalId) {
      clearInterval(intervalId);
      this.refreshIntervals.delete(strategy);
      console.log(`⏹️ Stopped background refresh for ${strategy}`);
    }
  }

  /**
   * Initialize background refresh for all strategies
   */
  private initializeBackgroundRefresh(): void {
    const refreshConfigs = [
      { strategy: 'long-buy', interval: 15 * 60 * 1000 }, // 15 minutes
      { strategy: 'swing-buy', interval: 30 * 60 * 1000 }, // 30 minutes
      { strategy: 'short-buy', interval: 2 * 60 * 1000 },  // 2 minutes
      { strategy: 'intraday-buy', interval: 30 * 1000 },   // 30 seconds
    ];

    refreshConfigs.forEach(config => {
      this.startBackgroundRefresh(config.strategy, config.interval);
    });
  }

  // ==================== UTILITY METHODS ====================

  private generateRecommendationId(strategy: string, variants?: Record<string, string>): string {
    if (variants) {
      const variantString = Object.entries(variants)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join('|');
      return `${strategy}-${variantString}`;
    }
    return strategy;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private getActiveWebSocketConnection(): WebSocket | null {
    const firstConnection = this.websocketConnections.values().next().value;
    return firstConnection || null;
  }

  private closeWebSocketConnection(connectionId: string): void {
    const connection = this.websocketConnections.get(connectionId);
    if (connection) {
      connection.close();
      this.websocketConnections.delete(connectionId);
    }
  }

  private getInstrumentToken(symbol: string): number {
    // This is a placeholder - you'll need to implement symbol to instrument token mapping
    // You can get this from Kite Connect API or maintain a mapping
    return 0;
  }

  // ==================== STATISTICS ====================

  /**
   * Get cache statistics
   */
  public getStats(): AppCacheStats {
    const totalHits = this.cacheHits + this.cacheMisses;
    const hitRate = totalHits > 0 ? (this.cacheHits / totalHits) * 100 : 0;
    
    return {
      totalRecommendations: this.recommendations.size,
      totalSymbols: this.subscribedSymbols.size,
      activeWebSocketConnections: this.websocketConnections.size,
      lastPriceUpdate: Math.max(...Array.from(this.priceCache.values()).map(p => p.lastUpdated), 0),
      cacheHitRate: hitRate,
      memoryUsage: `${(JSON.stringify(this.recommendations).length / 1024).toFixed(2)}KB`
    };
  }

  /**
   * Clear all cache
   */
  public clearCache(): void {
    this.recommendations.clear();
    this.priceCache.clear();
    this.subscribedSymbols.clear();
    console.log('🗑️ All cache cleared');
  }

  /**
   * Clean expired entries
   */
  public cleanExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [id, recommendation] of Array.from(this.recommendations.entries())) {
      if (now > recommendation.expiresAt) {
        this.recommendations.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired cache entries`);
    }
  }
}

export default AppLevelCacheManager; 