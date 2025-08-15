/**
 * React Hook for Shared Price Management
 * =====================================
 * 
 * Provides easy access to the shared price manager for React components.
 * Handles automatic symbol registration and cleanup.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import SharedPriceManager, { PriceManagerStats } from '../services/SharedPriceManager';
import { PriceData } from '../services/AppLevelCacheManager';

export interface UseSharedPricesOptions {
  symbols?: string[];
  priority?: 'high' | 'normal' | 'low';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseSharedPricesReturn {
  // Price data
  prices: Map<string, PriceData>;
  priceData: PriceData[];
  stats: PriceManagerStats;
  
  // Price actions
  requestSymbol: (symbol: string, priority?: 'high' | 'normal' | 'low') => void;
  releaseSymbol: (symbol: string) => void;
  getPrice: (symbol: string) => PriceData | null;
  forceUpdate: (symbols?: string[]) => Promise<void>;
  
  // State
  isLoading: boolean;
  lastUpdated: number;
  isWebSocketConnected: boolean;
  
  // WebSocket
  initializeWebSocket: (apiKey: string, accessToken: string) => Promise<void>;
}

export function useSharedPrices(
  options: UseSharedPricesOptions = {},
  componentId?: string
): UseSharedPricesReturn {
  const {
    symbols = [],
    priority = 'normal',
    autoRefresh = false,
    refreshInterval = 2000 // 2 seconds
  } = options;

  const priceManager = SharedPriceManager.getInstance();
  const [prices, setPrices] = useState<Map<string, PriceData>>(new Map());
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [stats, setStats] = useState<PriceManagerStats>(priceManager.getStats());
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(0);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  const componentIdRef = useRef(componentId || `component_${Math.random().toString(36).substr(2, 9)}`);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const eventListenersRef = useRef<Map<string, (...args: any[]) => void>>(new Map());

  // Register symbols when component mounts or symbols change
  useEffect(() => {
    const componentId = componentIdRef.current;
    
    // Register all symbols
    symbols.forEach(symbol => {
      priceManager.requestSymbol(symbol, componentId, priority);
    });

    // Cleanup function
    return () => {
      symbols.forEach(symbol => {
        priceManager.releaseSymbol(symbol, componentId);
      });
    };
  }, [symbols, priority, priceManager]);

  // Set up event listeners
  useEffect(() => {
    const listeners = eventListenersRef.current;

    // Price update events
    const handlePricesUpdated = (updatedPrices: PriceData[]) => {
      setPrices(prev => {
        const newPrices = new Map(prev);
        updatedPrices.forEach(priceData => {
          newPrices.set(priceData.symbol, priceData);
        });
        return newPrices;
      });

      setPriceData(Array.from(prices.values()));
      setLastUpdated(Date.now());
      setIsLoading(false);
    };

    // WebSocket events
    const handleWebSocketConnected = () => {
      setIsWebSocketConnected(true);
    };

    const handleWebSocketDisconnected = () => {
      setIsWebSocketConnected(false);
    };

    // Error events
    const handlePriceFetchError = (error: any) => {
      console.error('❌ Price fetch error:', error);
      setIsLoading(false);
    };

    // Stats update
    const handleStatsUpdate = () => {
      setStats(priceManager.getStats());
    };

    // Register event listeners
    listeners.set('pricesUpdated', handlePricesUpdated);
    listeners.set('websocketConnected', handleWebSocketConnected);
    listeners.set('websocketDisconnected', handleWebSocketDisconnected);
    listeners.set('priceFetchError', handlePriceFetchError);

    // Add listeners to price manager
    priceManager.on('pricesUpdated', handlePricesUpdated);
    priceManager.on('websocketConnected', handleWebSocketConnected);
    priceManager.on('websocketDisconnected', handleWebSocketDisconnected);
    priceManager.on('priceFetchError', handlePriceFetchError);

    // Update stats periodically
    const statsInterval = setInterval(handleStatsUpdate, 5000);

    return () => {
      // Remove event listeners
      listeners.forEach((listener, event) => {
        priceManager.off(event, listener);
      });
      listeners.clear();

      // Clear intervals
      clearInterval(statsInterval);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [priceManager]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && symbols.length > 0) {
      const scheduleRefresh = () => {
        refreshTimeoutRef.current = setTimeout(async () => {
          setIsLoading(true);
          await priceManager.forcePriceUpdate(symbols);
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
  }, [autoRefresh, symbols, refreshInterval, priceManager]);

  // Price actions
  const requestSymbol = useCallback((
    symbol: string, 
    symbolPriority: 'high' | 'normal' | 'low' = priority
  ) => {
    priceManager.requestSymbol(symbol, componentIdRef.current, symbolPriority);
  }, [priority, priceManager]);

  const releaseSymbol = useCallback((symbol: string) => {
    priceManager.releaseSymbol(symbol, componentIdRef.current);
  }, [priceManager]);

  const getPrice = useCallback((symbol: string) => {
    return priceManager.getPrice(symbol);
  }, [priceManager]);

  const forceUpdate = useCallback(async (updateSymbols?: string[]) => {
    const symbolsToUpdate = updateSymbols || symbols;
    if (symbolsToUpdate.length > 0) {
      setIsLoading(true);
      await priceManager.forcePriceUpdate(symbolsToUpdate);
    }
  }, [symbols, priceManager]);

  const initializeWebSocket = useCallback(async (apiKey: string, accessToken: string) => {
    await priceManager.initializeWebSocket(apiKey, accessToken);
  }, [priceManager]);

  return {
    // Price data
    prices,
    priceData,
    stats,
    
    // Price actions
    requestSymbol,
    releaseSymbol,
    getPrice,
    forceUpdate,
    
    // State
    isLoading,
    lastUpdated,
    isWebSocketConnected,
    
    // WebSocket
    initializeWebSocket,
  };
}

export default useSharedPrices; 