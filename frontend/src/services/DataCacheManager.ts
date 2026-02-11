/**
 * Centralized Data Cache Manager
 * Handles caching of recommendations and provides them to SmartRefreshService for price updates
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  strategy: string;
  variants: Record<string, string>;
  expiresAt: number;
}

interface RefreshTimerInfo {
  nextRefreshTime: number;
  interval: number;
  isActive: boolean;
}

class DataCacheManager {
  private static instance: DataCacheManager;
  private cache: Map<string, CacheEntry> = new Map();
  private refreshTimers: Map<string, RefreshTimerInfo> = new Map();
  private defaultCacheDuration = 5 * 60 * 1000; // 5 minutes default cache

  private constructor() {
    console.log(`📦 [${new Date().toISOString()}] DataCacheManager initialized`);
    
    // Clean expired cache entries every minute
    setInterval(() => this.cleanExpiredEntries(), 60000);
  }

  public static getInstance(): DataCacheManager {
    if (!DataCacheManager.instance) {
      DataCacheManager.instance = new DataCacheManager();
    }
    return DataCacheManager.instance;
  }

  private generateCacheKey(strategy: string, variants: Record<string, string>): string {
    const sortedVariants = Object.keys(variants)
      .sort()
      .map(key => `${key}:${variants[key]}`)
      .join('|');
    return `${strategy}-${sortedVariants}`;
  }

  /**
   * Store data in cache with automatic expiration
   */
  public setCache<T>(
    strategy: string, 
    variants: Record<string, string>, 
    data: T, 
    cacheDuration?: number
  ): void {
    const cacheKey = this.generateCacheKey(strategy, variants);
    const duration = cacheDuration || this.defaultCacheDuration;
    const now = Date.now();
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      strategy,
      variants,
      expiresAt: now + duration
    };

    this.cache.set(cacheKey, entry);
    
    console.log(`💾 [${new Date().toISOString()}] Cache stored:`, {
      strategy,
      variants,
      dataCount: Array.isArray(data) ? data.length : 'object',
      expiresIn: `${duration/1000}s`,
      totalCacheSize: this.cache.size
    });
  }

  /**
   * Get data from cache if not expired
   */
  public getCache<T>(strategy: string, variants: Record<string, string>): T | null {
    const cacheKey = this.generateCacheKey(strategy, variants);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      console.log(`🔍 [${new Date().toISOString()}] Cache miss: ${strategy}`, { variants });
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      console.log(`⏰ [${new Date().toISOString()}] Cache expired: ${strategy}`, {
        variants,
        expiredAgo: `${(now - entry.expiresAt)/1000}s`
      });
      this.cache.delete(cacheKey);
      return null;
    }

    console.log(`✅ [${new Date().toISOString()}] Cache hit: ${strategy}`, {
      variants,
      age: `${(now - entry.timestamp)/1000}s`,
      expiresIn: `${(entry.expiresAt - now)/1000}s`,
      dataCount: Array.isArray(entry.data) ? entry.data.length : 'object'
    });

    return entry.data as T;
  }

  /**
   * Check if cache exists and is valid
   */
  public hasValidCache(strategy: string, variants: Record<string, string>): boolean {
    const cacheKey = this.generateCacheKey(strategy, variants);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return false;
    
    const now = Date.now();
    return now <= entry.expiresAt;
  }

  /**
   * Get all symbols from all cached recommendations for price manager
   */
  public getAllCachedSymbols(): string[] {
    const symbols = new Set<string>();
    
    Array.from(this.cache.values()).forEach(entry => {
      if (Array.isArray(entry.data)) {
        entry.data.forEach((item: any) => {
          if (item.symbol) {
            symbols.add(item.symbol);
          }
        });
      }
    });

    const symbolArray = Array.from(symbols);
    console.log(`📊 [${new Date().toISOString()}] Found ${symbolArray.length} unique symbols in cache:`, symbolArray.slice(0, 10));
    
    return symbolArray;
  }

  /**
   * Set refresh timer info for strategy
   */
  public setRefreshTimer(strategy: string, interval: number): void {
    const now = Date.now();
    const timerInfo: RefreshTimerInfo = {
      nextRefreshTime: now + interval,
      interval,
      isActive: true
    };

    this.refreshTimers.set(strategy, timerInfo);
    
    console.log(`⏰ [${new Date().toISOString()}] Refresh timer set for ${strategy}:`, {
      interval: `${interval/1000}s`,
      nextRefresh: new Date(timerInfo.nextRefreshTime).toISOString()
    });
  }

  /**
   * Get time remaining until next refresh for strategy
   */
  public getTimeUntilRefresh(strategy: string): number {
    const timerInfo = this.refreshTimers.get(strategy);
    if (!timerInfo || !timerInfo.isActive) return 0;

    const now = Date.now();
    const remaining = Math.max(0, timerInfo.nextRefreshTime - now);
    
    return remaining;
  }

  /**
   * Get formatted time remaining for display
   */
  public getFormattedTimeUntilRefresh(strategy: string): string {
    const remaining = this.getTimeUntilRefresh(strategy);
    
    if (remaining === 0) return 'Ready to refresh';
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Reset refresh timer when refresh completes
   */
  public resetRefreshTimer(strategy: string): void {
    const timerInfo = this.refreshTimers.get(strategy);
    if (timerInfo) {
      const now = Date.now();
      timerInfo.nextRefreshTime = now + timerInfo.interval;
      
      console.log(`🔄 [${new Date().toISOString()}] Refresh timer reset for ${strategy}:`, {
        nextRefresh: new Date(timerInfo.nextRefreshTime).toISOString()
      });
    }
  }

  /**
   * Stop refresh timer for strategy
   */
  public stopRefreshTimer(strategy: string): void {
    const timerInfo = this.refreshTimers.get(strategy);
    if (timerInfo) {
      timerInfo.isActive = false;
      console.log(`⏹️ [${new Date().toISOString()}] Refresh timer stopped for ${strategy}`);
    }
  }

  /**
   * Clear cache for specific strategy and variants
   */
  public clearCache(strategy: string, variants: Record<string, string>): void {
    const cacheKey = this.generateCacheKey(strategy, variants);
    const deleted = this.cache.delete(cacheKey);
    
    console.log(`🗑️ [${new Date().toISOString()}] Cache cleared for ${strategy}:`, {
      variants,
      wasDeleted: deleted,
      remainingCacheSize: this.cache.size
    });
  }

  /**
   * Clear all cache
   */
  public clearAllCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.refreshTimers.clear();
    
    console.log(`🗑️ [${new Date().toISOString()}] All cache cleared: ${size} entries removed`);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`🧹 [${new Date().toISOString()}] Cleaned ${cleanedCount} expired cache entries. Remaining: ${this.cache.size}`);
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    totalEntries: number;
    totalSymbols: number;
    strategies: string[];
    memoryUsage: string;
  } {
    const strategies = Array.from(new Set(Array.from(this.cache.values()).map(entry => entry.strategy)));
    const symbols = this.getAllCachedSymbols();
    
    return {
      totalEntries: this.cache.size,
      totalSymbols: symbols.length,
      strategies,
      memoryUsage: `${Math.round(JSON.stringify(Array.from(this.cache.values())).length / 1024)}KB`
    };
  }
}

export default DataCacheManager;