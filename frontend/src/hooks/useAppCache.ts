/**
 * React Hook for App-Level Cache Management
 * =========================================
 * 
 * Provides easy access to the centralized cache manager for React components.
 * Handles automatic cleanup and event listening.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import AppLevelCacheManager, { 
  CachedRecommendation, 
  PriceData, 
  AppCacheStats 
} from '../services/AppLevelCacheManager';

export interface UseAppCacheOptions {
  strategy?: string;
  variants?: Record<string, string>;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseAppCacheReturn {
  // Cache data
  cachedRecommendation: CachedRecommendation | null;
  prices: Map<string, PriceData>;
  stats: AppCacheStats;
  
  // Cache actions
  cacheRecommendation: (
    data: any, 
    symbols: string[], 
    variants?: Record<string, string>,
    duration?: number
  ) => string;
  getPrice: (symbol: string) => PriceData | null;
  getPrices: (symbols: string[]) => PriceData[];
  
  // Cache state
  isLoading: boolean;
  lastUpdated: number;
  cacheHit: boolean;
  
  // WebSocket state
  isWebSocketConnected: boolean;
  initializeWebSocket: (apiKey: string, accessToken: string) => Promise<void>;
  
  // Utility
  clearCache: () => void;
  refreshCache: () => void;
}

export function useAppCache(options: UseAppCacheOptions = {}): UseAppCacheReturn {
  const {
    strategy,
    variants,
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000 // 5 minutes
  } = options;

  const cacheManager = AppLevelCacheManager.getInstance();
  const [cachedRecommendation, setCachedRecommendation] = useState<CachedRecommendation | null>(null);
  const [prices, setPrices] = useState<Map<string, PriceData>>(new Map());
  const [stats, setStats] = useState<AppCacheStats>(cacheManager.getStats());
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(0);
  const [cacheHit, setCacheHit] = useState(false);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const eventListenersRef = useRef<Map<string, (...args: any[]) => void>>(new Map());

  // Initialize cache data
  useEffect(() => {
    if (strategy) {
      const recommendation = cacheManager.getCachedRecommendation(strategy, variants);
      setCachedRecommendation(recommendation);
      setCacheHit(!!recommendation);
      setLastUpdated(recommendation?.timestamp || 0);
    }
  }, [strategy, variants, cacheManager]);

  // Set up event listeners
  useEffect(() => {
    const listeners = eventListenersRef.current;

    // Recommendation cache events
    const handleRecommendationCached = (data: { strategy: string; id: string; symbols: string[] }) => {
      if (data.strategy === strategy) {
        const recommendation = cacheManager.getCachedRecommendation(strategy, variants);
        setCachedRecommendation(recommendation);
        setCacheHit(true);
        setLastUpdated(recommendation?.timestamp || 0);
        setIsLoading(false);
      }
    };

    // Price update events
    const handlePriceUpdated = (priceData: PriceData) => {
      setPrices(prev => new Map(prev).set(priceData.symbol, priceData));
    };

    const handlePricesBatchUpdated = (priceDataArray: PriceData[]) => {
      setPrices(prev => {
        const newPrices = new Map(prev);
        priceDataArray.forEach(priceData => {
          newPrices.set(priceData.symbol, priceData);
        });
        return newPrices;
      });
    };

    // WebSocket events
    const handleWebSocketConnected = () => {
      setIsWebSocketConnected(true);
    };

    const handleWebSocketDisconnected = () => {
      setIsWebSocketConnected(false);
    };

    // Background refresh events
    const handleBackgroundRefresh = (data: { strategy: string; timestamp: number }) => {
      if (data.strategy === strategy) {
        setIsLoading(true);
        // Trigger a cache refresh
        const recommendation = cacheManager.getCachedRecommendation(strategy, variants);
        if (recommendation) {
          setCachedRecommendation(recommendation);
          setLastUpdated(recommendation.timestamp);
        }
        setIsLoading(false);
      }
    };

    // Stats update
    const handleStatsUpdate = () => {
      setStats(cacheManager.getStats());
    };

    // Register event listeners
    listeners.set('recommendationCached', handleRecommendationCached);
    listeners.set('priceUpdated', handlePriceUpdated);
    listeners.set('pricesBatchUpdated', handlePricesBatchUpdated);
    listeners.set('websocketConnected', handleWebSocketConnected);
    listeners.set('websocketDisconnected', handleWebSocketDisconnected);
    listeners.set('backgroundRefresh', handleBackgroundRefresh);

    // Add listeners to cache manager
    cacheManager.on('recommendationCached', handleRecommendationCached);
    cacheManager.on('priceUpdated', handlePriceUpdated);
    cacheManager.on('pricesBatchUpdated', handlePricesBatchUpdated);
    cacheManager.on('websocketConnected', handleWebSocketConnected);
    cacheManager.on('websocketDisconnected', handleWebSocketDisconnected);
    cacheManager.on('backgroundRefresh', handleBackgroundRefresh);

    // Update stats periodically
    const statsInterval = setInterval(handleStatsUpdate, 5000);

    return () => {
      // Remove event listeners
      listeners.forEach((listener, event) => {
        cacheManager.off(event, listener);
      });
      listeners.clear();

      // Clear intervals
      clearInterval(statsInterval);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [strategy, variants, cacheManager]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && strategy) {
      const scheduleRefresh = () => {
        refreshTimeoutRef.current = setTimeout(() => {
          setIsLoading(true);
          // This will trigger a background refresh
          cacheManager.emit('backgroundRefresh', { strategy, timestamp: Date.now() });
          scheduleRefresh(); // Schedule next refresh
        }, refreshInterval);
      };

      scheduleRefresh();

      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
      };
    }
  }, [autoRefresh, strategy, refreshInterval, cacheManager]);

  // Cache actions
  const cacheRecommendation = useCallback((
    data: any,
    symbols: string[],
    variants?: Record<string, string>,
    duration?: number
  ) => {
    return cacheManager.cacheRecommendation(strategy || 'default', data, symbols, variants, duration);
  }, [strategy, cacheManager]);

  const getPrice = useCallback((symbol: string) => {
    return cacheManager.getPrice(symbol);
  }, [cacheManager]);

  const getPrices = useCallback((symbols: string[]) => {
    return cacheManager.getPrices(symbols);
  }, [cacheManager]);

  const initializeWebSocket = useCallback(async (apiKey: string, accessToken: string) => {
    await cacheManager.initializeWebSocket(apiKey, accessToken);
  }, [cacheManager]);

  const clearCache = useCallback(() => {
    cacheManager.clearCache();
    setCachedRecommendation(null);
    setPrices(new Map());
    setCacheHit(false);
    setLastUpdated(0);
  }, [cacheManager]);

  const refreshCache = useCallback(() => {
    if (strategy) {
      setIsLoading(true);
      const recommendation = cacheManager.getCachedRecommendation(strategy, variants);
      setCachedRecommendation(recommendation);
      setCacheHit(!!recommendation);
      setLastUpdated(recommendation?.timestamp || 0);
      setIsLoading(false);
    }
  }, [strategy, variants, cacheManager]);

  return {
    // Cache data
    cachedRecommendation,
    prices,
    stats,
    
    // Cache actions
    cacheRecommendation,
    getPrice,
    getPrices,
    
    // Cache state
    isLoading,
    lastUpdated,
    cacheHit,
    
    // WebSocket state
    isWebSocketConnected,
    initializeWebSocket,
    
    // Utility
    clearCache,
    refreshCache,
  };
}

export default useAppCache; 