/**
 * Centralized Price Manager
 * =========================
 * 
 * Manages real-time price updates for all stocks across the application.
 * Integrates with Kite Connect WebSocket for live price streaming.
 * Provides a single source of truth for stock prices across all pages.
 */

import { EventEmitter } from 'events';
import { API_CONFIG } from '../config/api';
import KiteWebSocketService, { KiteWebSocketConfig, KitePriceData } from './KiteWebSocketService';

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: number;
  source: 'websocket' | 'api' | 'cache';
  instrumentToken?: number;
}

export interface PriceManagerStats {
  totalSymbols: number;
  activeSubscriptions: number;
  lastUpdate: number;
  websocketConnected: boolean;
  cacheHitRate: number;
  memoryUsage: string;
}

export interface SymbolMapping {
  symbol: string;
  instrumentToken: number;
  exchange: string;
  companyName?: string;
  isin?: string;
  faceValue?: number;
  lotSize?: number;
  tickSize?: number;
}

class CentralizedPriceManager extends EventEmitter {
  private static instance: CentralizedPriceManager;
  
  // Price storage
  private priceCache: Map<string, StockPrice> = new Map();
  private symbolMappings: Map<string, SymbolMapping> = new Map();
  
  // WebSocket management
  private kiteService: KiteWebSocketService | null = null;
  private subscribedSymbols: Set<string> = new Set();
  private maxSubscriptions = API_CONFIG.WEBSOCKET.MAX_SUBSCRIPTIONS; // Kite Connect limit
  
  // Statistics
  private cacheHits = 0;
  private cacheMisses = 0;
  private lastStatsReset = Date.now();
  private updateCount = 0;

  private constructor() {
    super();
    console.log('🚀 CentralizedPriceManager initialized');
  }

  public static getInstance(): CentralizedPriceManager {
    if (!CentralizedPriceManager.instance) {
      CentralizedPriceManager.instance = new CentralizedPriceManager();
    }
    return CentralizedPriceManager.instance;
  }

  // ==================== WEBSOCKET MANAGEMENT ====================

  /**
   * Initialize Kite WebSocket connection
   */
  public async initializeWebSocket(config: KiteWebSocketConfig): Promise<void> {
    try {
      this.kiteService = KiteWebSocketService.getInstance(config);
      
      // Set up event listeners
      this.kiteService.on('connected', this.handleWebSocketConnected.bind(this));
      this.kiteService.on('disconnected', this.handleWebSocketDisconnected.bind(this));
      this.kiteService.on('priceUpdate', this.handlePriceUpdate.bind(this));
      this.kiteService.on('error', this.handleWebSocketError.bind(this));
      
      // Connect to WebSocket
      await this.kiteService.connect();
      
      console.log('✅ Kite WebSocket initialized and connected');
      
    } catch (error) {
      console.error('❌ Failed to initialize Kite WebSocket:', error);
      throw error;
    }
  }

  /**
   * Handle WebSocket connection
   */
  private handleWebSocketConnected(data: any): void {
    console.log('🔌 Kite WebSocket connected');
    this.emit('websocketConnected', data);
    
    // Resubscribe to previously subscribed symbols
    if (this.subscribedSymbols.size > 0) {
      this.resubscribeToSymbols();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  private handleWebSocketDisconnected(data: any): void {
    console.log('🔌 Kite WebSocket disconnected');
    this.emit('websocketDisconnected', data);
  }

  /**
   * Handle WebSocket errors
   */
  private handleWebSocketError(error: any): void {
    console.error('❌ Kite WebSocket error:', error);
    this.emit('websocketError', error);
  }

  /**
   * Handle price updates from WebSocket
   */
  private handlePriceUpdate(priceData: KitePriceData): void {
    const symbol = priceData.symbol;
    if (!symbol) {
      console.warn('⚠️ Received price update without symbol');
      return;
    }

    const stockPrice: StockPrice = {
      symbol,
      price: priceData.last_price,
      change: priceData.change,
      changePercent: priceData.change_percent,
      volume: priceData.volume,
      lastUpdated: priceData.timestamp,
      source: 'websocket',
      instrumentToken: priceData.instrument_token
    };

    this.updatePrice(stockPrice);
  }

  // ==================== SYMBOL MAPPING ====================

  /**
   * Load symbol mappings from API or local storage
   */
  public async loadSymbolMappings(): Promise<void> {
    try {
      // Try to load from localStorage first
      const cachedMappings = localStorage.getItem('symbolMappings');
      if (cachedMappings) {
        const mappings = JSON.parse(cachedMappings);
        mappings.forEach((mapping: SymbolMapping) => {
          this.symbolMappings.set(mapping.symbol, mapping);
        });
        console.log(`✅ Loaded ${this.symbolMappings.size} symbol mappings from cache`);
      }

      // Fetch fresh mappings from API
      await this.fetchSymbolMappings();
      
    } catch (error) {
      console.error('❌ Error loading symbol mappings:', error);
    }
  }

  /**
   * Fetch symbol mappings from API
   */
  private async fetchSymbolMappings(): Promise<void> {
    try {
      // This would be your API endpoint for symbol mappings
      const response = await fetch('/api/symbol-mappings');
      if (response.ok) {
        const mappings: SymbolMapping[] = await response.json();
        
        mappings.forEach(mapping => {
          this.symbolMappings.set(mapping.symbol, mapping);
        });
        
        // Cache mappings
        localStorage.setItem('symbolMappings', JSON.stringify(mappings));
        
        console.log(`✅ Fetched ${mappings.length} symbol mappings from API`);
      }
    } catch (error) {
      console.error('❌ Error fetching symbol mappings:', error);
    }
  }

  /**
   * Fetch incremental symbol mappings - only get new symbols that aren't already mapped
   */
  public async fetchIncrementalMappings(symbols: string[]): Promise<Map<string, SymbolMapping>> {
    try {
      // Convert existing mappings to the format expected by the API
      const existingMappings: Record<string, any> = {};
      this.symbolMappings.forEach((mapping, symbol) => {
        existingMappings[symbol] = {
          instrumentToken: mapping.instrumentToken,
          exchange: mapping.exchange,
          companyName: mapping.companyName
        };
      });

      const response = await fetch('/api/symbol-mappings/incremental', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbols: symbols,
          existing_mappings: existingMappings,
          exchange: 'NSE'
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          // Add new mappings to our cache
          Object.entries(result.data).forEach(([symbol, mappingData]: [string, any]) => {
            const mapping: SymbolMapping = {
              symbol: symbol,
              instrumentToken: mappingData.instrumentToken,
              exchange: mappingData.exchange,
              companyName: mappingData.companyName,
              isin: mappingData.isin,
              faceValue: mappingData.faceValue,
              lotSize: mappingData.lotSize,
              tickSize: mappingData.tickSize
            };
            
            this.symbolMappings.set(symbol, mapping);
          });

          // Update localStorage cache
          const allMappings = Array.from(this.symbolMappings.values());
          localStorage.setItem('symbolMappings', JSON.stringify(allMappings));

          console.log(`✅ Incremental mapping fetch: ${result.new_mappings} new, ${result.existing_mappings} cached out of ${result.total_requested} total`);
          
          return this.symbolMappings;
        }
      }
      
      return this.symbolMappings;
    } catch (error) {
      console.error('❌ Error fetching incremental symbol mappings:', error);
      return this.symbolMappings;
    }
  }

  /**
   * Check which symbols already have mappings and which need to be fetched
   */
  public async checkExistingMappings(symbols: string[]): Promise<{
    cachedSymbols: string[];
    missingSymbols: string[];
    cacheHitRate: number;
  }> {
    try {
      // Convert existing mappings to the format expected by the API
      const existingMappings: Record<string, any> = {};
      this.symbolMappings.forEach((mapping, symbol) => {
        existingMappings[symbol] = {
          instrumentToken: mapping.instrumentToken,
          exchange: mapping.exchange,
          companyName: mapping.companyName
        };
      });

      const response = await fetch('/api/symbol-mappings/check-existing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbols: symbols,
          existing_mappings: existingMappings
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          return {
            cachedSymbols: result.cached_symbols || [],
            missingSymbols: result.missing_symbols || [],
            cacheHitRate: result.cache_hit_rate || 0
          };
        }
      }
      
      // Fallback: check locally
      const cachedSymbols: string[] = [];
      const missingSymbols: string[] = [];
      
      symbols.forEach(symbol => {
        const symbolUpper = symbol.toUpperCase();
        if (this.symbolMappings.has(symbolUpper)) {
          cachedSymbols.push(symbolUpper);
        } else {
          missingSymbols.push(symbolUpper);
        }
      });

      return {
        cachedSymbols,
        missingSymbols,
        cacheHitRate: symbols.length > 0 ? (cachedSymbols.length / symbols.length) * 100 : 0
      };
    } catch (error) {
      console.error('❌ Error checking existing mappings:', error);
      
      // Fallback: check locally
      const cachedSymbols: string[] = [];
      const missingSymbols: string[] = [];
      
      symbols.forEach(symbol => {
        const symbolUpper = symbol.toUpperCase();
        if (this.symbolMappings.has(symbolUpper)) {
          cachedSymbols.push(symbolUpper);
        } else {
          missingSymbols.push(symbolUpper);
        }
      });

      return {
        cachedSymbols,
        missingSymbols,
        cacheHitRate: symbols.length > 0 ? (cachedSymbols.length / symbols.length) * 100 : 0
      };
    }
  }

  /**
   * Get instrument token for a symbol
   */
  public getInstrumentToken(symbol: string): number | undefined {
    const mapping = this.symbolMappings.get(symbol.toUpperCase());
    return mapping?.instrumentToken;
  }

  /**
   * Get symbol for an instrument token
   */
  public getSymbol(instrumentToken: number): string | undefined {
    for (const [symbol, mapping] of Array.from(this.symbolMappings.entries())) {
      if (mapping.instrumentToken === instrumentToken) {
        return symbol;
      }
    }
    return undefined;
  }

  // ==================== PRICE MANAGEMENT ====================

  /**
   * Subscribe to symbols for real-time updates
   */
  public subscribeToSymbols(symbols: string[]): void {
    if (!this.kiteService || !this.kiteService.isWebSocketConnected()) {
      console.warn('⚠️ WebSocket not connected, cannot subscribe to symbols');
      return;
    }

    const newSymbols = symbols.filter(symbol => !this.subscribedSymbols.has(symbol));
    
    if (newSymbols.length === 0) {
      console.log('ℹ️ All symbols already subscribed');
      return;
    }

    // Check subscription limit
    if (this.subscribedSymbols.size + newSymbols.length > this.maxSubscriptions) {
      console.warn(`⚠️ Subscription limit reached (${this.maxSubscriptions}). Cannot subscribe to ${newSymbols.length} new symbols.`);
      return;
    }

    // Map symbols to instrument tokens
    const instruments = newSymbols
      .map(symbol => {
        const token = this.getInstrumentToken(symbol);
        return token ? { instrument_token: token, symbol } : null;
      })
      .filter(Boolean) as Array<{ instrument_token: number; symbol: string }>;

    if (instruments.length === 0) {
      console.warn('⚠️ No valid instrument tokens found for symbols');
      return;
    }

    // Subscribe to instruments
    this.kiteService.subscribeToInstruments(instruments);
    
    // Track subscribed symbols
    newSymbols.forEach(symbol => this.subscribedSymbols.add(symbol));
    
    console.log(`📡 Subscribed to ${instruments.length} new symbols`);
    this.emit('symbolsSubscribed', { symbols: newSymbols, count: instruments.length });
  }

  /**
   * Unsubscribe from symbols
   */
  public unsubscribeFromSymbols(symbols: string[]): void {
    if (!this.kiteService || !this.kiteService.isWebSocketConnected()) {
      return;
    }

    const instruments = symbols
      .map(symbol => {
        const token = this.getInstrumentToken(symbol);
        return token ? { instrument_token: token } : null;
      })
      .filter(Boolean) as Array<{ instrument_token: number }>;

    if (instruments.length > 0) {
      this.kiteService.unsubscribeFromInstruments(instruments);
      
      // Remove from tracking
      symbols.forEach(symbol => this.subscribedSymbols.delete(symbol));
      
      console.log(`📡 Unsubscribed from ${instruments.length} symbols`);
      this.emit('symbolsUnsubscribed', { symbols, count: instruments.length });
    }
  }

  /**
   * Resubscribe to all previously subscribed symbols
   */
  private resubscribeToSymbols(): void {
    const symbols = Array.from(this.subscribedSymbols);
    if (symbols.length > 0) {
      this.subscribeToSymbols(symbols);
    }
  }

  /**
   * Update price data
   */
  public updatePrice(priceData: StockPrice): void {
    const existing = this.priceCache.get(priceData.symbol);
    this.priceCache.set(priceData.symbol, priceData);
    this.updateCount++;
    
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
  public updatePrices(priceDataArray: StockPrice[]): void {
    priceDataArray.forEach(priceData => {
      this.updatePrice(priceData);
    });
    
    this.emit('pricesBatchUpdated', priceDataArray);
  }

  /**
   * Get current price for a symbol
   */
  public getPrice(symbol: string): StockPrice | null {
    const price = this.priceCache.get(symbol.toUpperCase());
    if (price) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
    return price || null;
  }

  /**
   * Get prices for multiple symbols
   */
  public getPrices(symbols: string[]): StockPrice[] {
    return symbols
      .map(symbol => this.getPrice(symbol))
      .filter(price => price !== null) as StockPrice[];
  }

  /**
   * Get all cached prices
   */
  public getAllPrices(): StockPrice[] {
    return Array.from(this.priceCache.values());
  }

  /**
   * Check if symbol is subscribed
   */
  public isSubscribed(symbol: string): boolean {
    return this.subscribedSymbols.has(symbol.toUpperCase());
  }

  /**
   * Get all subscribed symbols
   */
  public getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Disconnect WebSocket
   */
  public disconnect(): void {
    if (this.kiteService) {
      this.kiteService.disconnect();
      this.kiteService = null;
    }
    console.log('🔌 CentralizedPriceManager disconnected');
  }

  /**
   * Get WebSocket statistics
   */
  public getWebSocketStats() {
    return this.kiteService?.getStats() || null;
  }

  /**
   * Get price manager statistics
   */
  public getStats(): PriceManagerStats {
    const totalHits = this.cacheHits + this.cacheMisses;
    const hitRate = totalHits > 0 ? (this.cacheHits / totalHits) * 100 : 0;
    
    return {
      totalSymbols: this.priceCache.size,
      activeSubscriptions: this.subscribedSymbols.size,
      lastUpdate: Math.max(...Array.from(this.priceCache.values()).map(p => p.lastUpdated), 0),
      websocketConnected: this.kiteService?.isWebSocketConnected() || false,
      cacheHitRate: hitRate,
      memoryUsage: `${(JSON.stringify(Array.from(this.priceCache.entries())).length / 1024).toFixed(2)}KB`
    };
  }

  /**
   * Clear all cached prices
   */
  public clearPrices(): void {
    this.priceCache.clear();
    console.log('🗑️ All cached prices cleared');
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.updateCount = 0;
    this.lastStatsReset = Date.now();
    console.log('📊 Statistics reset');
  }
}

export default CentralizedPriceManager; 