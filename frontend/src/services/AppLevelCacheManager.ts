/**
 * App-Level Cache Manager - Centralized caching with WebSocket integration for real-time prices.
 */

import { EventEmitter } from 'events';
import { API_CONFIG } from '../config/api';
import type { CachedRecommendation, PriceData, AppCacheStats } from './cacheUtils';
import { generateRecommendationId, chunkArray, REFRESH_CONFIGS } from './cacheUtils';

export type { CachedRecommendation, PriceData, AppCacheStats };

class AppLevelCacheManager extends EventEmitter {
  private static instance: AppLevelCacheManager;

  private recommendations: Map<string, CachedRecommendation> = new Map();
  private priceCache: Map<string, PriceData> = new Map();

  private websocketConnections: Map<string, WebSocket> = new Map();
  private subscribedSymbols: Set<string> = new Set();
  private maxWebSocketConnections = 3;
  private maxSymbolsPerConnection = API_CONFIG.WEBSOCKET.MAX_SUBSCRIPTIONS;

  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();

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

  public cacheRecommendation(
    strategy: string,
    data: unknown,
    symbols: string[],
    variants?: Record<string, string>,
    cacheDuration: number = 15 * 60 * 1000
  ): string {
    const id = generateRecommendationId(strategy, variants);
    const now = Date.now();

    const recommendation: CachedRecommendation = {
      id,
      strategy,
      data,
      timestamp: now,
      expiresAt: now + cacheDuration,
      symbols,
      variants,
    };

    this.recommendations.set(id, recommendation);

    symbols.forEach((symbol) => this.subscribedSymbols.add(symbol));

    console.log(`💾 Cached recommendation: ${strategy}`, {
      symbols: symbols.length,
      expiresIn: `${cacheDuration / 1000}s`,
      totalCached: this.recommendations.size,
    });

    this.emit('recommendationCached', { strategy, id, symbols });

    return id;
  }

  public getCachedRecommendation(strategy: string, variants?: Record<string, string>): CachedRecommendation | null {
    const id = generateRecommendationId(strategy, variants);
    const rec = this.recommendations.get(id);
    if (!rec) { this.cacheMisses++; return null; }
    if (Date.now() > rec.expiresAt) {
      this.recommendations.delete(id);
      this.cacheMisses++;
      return null;
    }
    this.cacheHits++;
    return rec;
  }

  public hasValidRecommendation(strategy: string, variants?: Record<string, string>): boolean {
    const id = generateRecommendationId(strategy, variants);
    const rec = this.recommendations.get(id);
    if (!rec) return false;
    if (Date.now() > rec.expiresAt) { this.recommendations.delete(id); return false; }
    return true;
  }

  // ==================== PRICE MANAGEMENT ====================

  public getPrice(symbol: string): PriceData | null {
    return this.priceCache.get(symbol) || null;
  }

  public getPrices(symbols: string[]): PriceData[] {
    return symbols
      .map((symbol) => this.priceCache.get(symbol))
      .filter((price): price is PriceData => price !== undefined);
  }

  public updatePrice(priceData: PriceData): void {
    this.priceCache.set(priceData.symbol, priceData);
    this.emit('priceUpdated', priceData);
  }

  public updatePrices(priceDataArray: PriceData[]): void {
    priceDataArray.forEach((p) => this.updatePrice(p));
    this.emit('pricesBatchUpdated', priceDataArray);
  }

  // ==================== WEBSOCKET MANAGEMENT ====================

  public async initializeWebSocket(apiKey: string, accessToken: string): Promise<void> {
    if (this.websocketConnections.size >= this.maxWebSocketConnections) {
      const oldest = this.websocketConnections.keys().next().value;
      if (oldest) this.closeWebSocketConnection(oldest);
    }
    const ws = new WebSocket(`wss://ws.kite.trade/?api_key=${apiKey}&access_token=${accessToken}`);
    ws.onopen = () => { this.emit('websocketConnected'); this.subscribeToSymbols(Array.from(this.subscribedSymbols)); };
    ws.onmessage = (e) => { try { this.handleWebSocketMessage(JSON.parse(e.data)); } catch { /* parse error */ } };
    ws.onerror = (err) => this.emit('websocketError', err);
    ws.onclose = () => this.emit('websocketDisconnected');
    this.websocketConnections.set(`kite_${Date.now()}`, ws);
  }

  public subscribeToSymbols(symbols: string[]): void {
    const conn = this.getActiveWebSocketConnection();
    if (!conn) return;
    chunkArray(symbols, this.maxSymbolsPerConnection).forEach((group) => {
      conn.send(JSON.stringify({ a: 'subscribe', v: group.map((s) => ({ instrument_token: this.getInstrumentToken(s), exchange_token: s })) }));
    });
  }

  private handleWebSocketMessage(data: { type: string; [key: string]: unknown }): void {
    if (data.type === 'ltp') {
      this.updatePrice({
        symbol: String(data.instrument_token),
        price: data.last_price as number,
        change: data.change as number,
        changePercent: data.change_percent as number,
        volume: data.volume as number,
        lastUpdated: Date.now(),
        source: 'websocket',
      });
    }
  }

  // ==================== BACKGROUND REFRESH ====================

  public startBackgroundRefresh(strategy: string, interval: number = 5 * 60 * 1000): void {
    if (this.refreshIntervals.has(strategy)) this.stopBackgroundRefresh(strategy);
    this.refreshIntervals.set(strategy, setInterval(() => this.emit('backgroundRefresh', { strategy, timestamp: Date.now() }), interval));
  }

  public stopBackgroundRefresh(strategy: string): void {
    const id = this.refreshIntervals.get(strategy);
    if (id) { clearInterval(id); this.refreshIntervals.delete(strategy); }
  }

  private initializeBackgroundRefresh(): void {
    REFRESH_CONFIGS.forEach((c) => this.startBackgroundRefresh(c.strategy, c.interval));
  }

  // ==================== UTILITY METHODS ====================

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

  private getInstrumentToken(_symbol: string): number {
    return 0;
  }

  // ==================== STATISTICS ====================

  public getStats(): AppCacheStats {
    const totalHits = this.cacheHits + this.cacheMisses;
    const hitRate = totalHits > 0 ? (this.cacheHits / totalHits) * 100 : 0;

    return {
      totalRecommendations: this.recommendations.size,
      totalSymbols: this.subscribedSymbols.size,
      activeWebSocketConnections: this.websocketConnections.size,
      lastPriceUpdate: Math.max(...Array.from(this.priceCache.values()).map((p) => p.lastUpdated), 0),
      cacheHitRate: hitRate,
      memoryUsage: `${(JSON.stringify(this.recommendations).length / 1024).toFixed(2)}KB`,
    };
  }

  public clearCache(): void {
    this.recommendations.clear();
    this.priceCache.clear();
    this.subscribedSymbols.clear();
    console.log('🗑️ All cache cleared');
  }

  public cleanExpiredEntries(): void {
    const now = Date.now();
    for (const [id, rec] of Array.from(this.recommendations.entries())) {
      if (now > rec.expiresAt) this.recommendations.delete(id);
    }
  }
}

export default AppLevelCacheManager;
