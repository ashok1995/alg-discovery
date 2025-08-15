/**
 * React Hook for Centralized Price Manager
 * ========================================
 * 
 * Provides easy access to the centralized price manager for React components.
 * Handles WebSocket connection, symbol subscriptions, and real-time price updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import CentralizedPriceManager, { 
  StockPrice, 
  PriceManagerStats, 
  SymbolMapping 
} from '../services/CentralizedPriceManager';
import { KiteWebSocketConfig } from '../services/KiteWebSocketService';

export interface UseCentralizedPriceManagerOptions {
  autoConnect?: boolean;
  autoLoadMappings?: boolean;
  onPriceUpdate?: (price: StockPrice) => void;
  onWebSocketConnected?: () => void;
  onWebSocketDisconnected?: () => void;
  onError?: (error: any) => void;
}

export interface UseCentralizedPriceManagerReturn {
  // State
  isConnected: boolean;
  isLoading: boolean;
  stats: PriceManagerStats;
  
  // Actions
  connect: (config: KiteWebSocketConfig) => Promise<void>;
  disconnect: () => void;
  subscribeToSymbols: (symbols: string[]) => void;
  unsubscribeFromSymbols: (symbols: string[]) => void;
  
  // Data access
  getPrice: (symbol: string) => StockPrice | null;
  getPrices: (symbols: string[]) => StockPrice[];
  getAllPrices: () => StockPrice[];
  isSubscribed: (symbol: string) => boolean;
  getSubscribedSymbols: () => string[];
  
  // Utility
  loadSymbolMappings: () => Promise<void>;
  fetchIncrementalMappings: (symbols: string[]) => Promise<Map<string, any>>;
  checkExistingMappings: (symbols: string[]) => Promise<{
    cachedSymbols: string[];
    missingSymbols: string[];
    cacheHitRate: number;
  }>;
  clearPrices: () => void;
  resetStats: () => void;
}

export function useCentralizedPriceManager(
  options: UseCentralizedPriceManagerOptions = {}
): UseCentralizedPriceManagerReturn {
  const {
    autoConnect = false,
    autoLoadMappings = true,
    onPriceUpdate,
    onWebSocketConnected,
    onWebSocketDisconnected,
    onError
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<PriceManagerStats>({
    totalSymbols: 0,
    activeSubscriptions: 0,
    lastUpdate: 0,
    websocketConnected: false,
    cacheHitRate: 0,
    memoryUsage: '0KB'
  });

  const priceManagerRef = useRef<CentralizedPriceManager | null>(null);
  const eventListenersRef = useRef<Map<string, (...args: any[]) => void>>(new Map());

  // Initialize price manager
  useEffect(() => {
    if (!priceManagerRef.current) {
      priceManagerRef.current = CentralizedPriceManager.getInstance();
    }

    const priceManager = priceManagerRef.current;

    // Set up event listeners
    const listeners = new Map<string, (...args: any[]) => void>();

    listeners.set('websocketConnected', () => {
      setIsConnected(true);
      onWebSocketConnected?.();
    });

    listeners.set('websocketDisconnected', () => {
      setIsConnected(false);
      onWebSocketDisconnected?.();
    });

    listeners.set('priceUpdated', (price: StockPrice) => {
      onPriceUpdate?.(price);
      // Update stats
      setStats(priceManager.getStats());
    });

    listeners.set('pricesBatchUpdated', () => {
      setStats(priceManager.getStats());
    });

    listeners.set('websocketError', (error: any) => {
      onError?.(error);
    });

    // Add listeners to price manager
    listeners.forEach((listener, event) => {
      priceManager.on(event, listener);
    });

    eventListenersRef.current = listeners;

    // Auto-load symbol mappings
    if (autoLoadMappings) {
      priceManager.loadSymbolMappings();
    }

    // Auto-connect if enabled
    if (autoConnect) {
      const apiKey = process.env.REACT_APP_KITE_API_KEY;
      const accessToken = process.env.REACT_APP_KITE_ACCESS_TOKEN;
      
      if (apiKey && accessToken) {
        const config: KiteWebSocketConfig = { apiKey, accessToken };
        connect(config);
      } else {
        console.warn('⚠️ Kite API credentials not found in environment variables');
      }
    }

    // Update stats periodically
    const statsInterval = setInterval(() => {
      if (priceManager) {
        setStats(priceManager.getStats());
      }
    }, 5000);

    return () => {
      // Remove event listeners
      listeners.forEach((listener, event) => {
        priceManager.off(event, listener);
      });

      // Clear intervals
      clearInterval(statsInterval);
    };
  }, [autoConnect, autoLoadMappings, onPriceUpdate, onWebSocketConnected, onWebSocketDisconnected, onError]);

  // Connect to WebSocket
  const connect = useCallback(async (config: KiteWebSocketConfig) => {
    if (!priceManagerRef.current) return;

    setIsLoading(true);
    try {
      await priceManagerRef.current.initializeWebSocket(config);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect:', error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (priceManagerRef.current) {
      priceManagerRef.current.disconnect();
      setIsConnected(false);
    }
  }, []);

  // Subscribe to symbols
  const subscribeToSymbols = useCallback((symbols: string[]) => {
    if (priceManagerRef.current) {
      priceManagerRef.current.subscribeToSymbols(symbols);
    }
  }, []);

  // Unsubscribe from symbols
  const unsubscribeFromSymbols = useCallback((symbols: string[]) => {
    if (priceManagerRef.current) {
      priceManagerRef.current.unsubscribeFromSymbols(symbols);
    }
  }, []);

  // Get price for a symbol
  const getPrice = useCallback((symbol: string): StockPrice | null => {
    return priceManagerRef.current?.getPrice(symbol) || null;
  }, []);

  // Get prices for multiple symbols
  const getPrices = useCallback((symbols: string[]): StockPrice[] => {
    return priceManagerRef.current?.getPrices(symbols) || [];
  }, []);

  // Get all prices
  const getAllPrices = useCallback((): StockPrice[] => {
    return priceManagerRef.current?.getAllPrices() || [];
  }, []);

  // Check if symbol is subscribed
  const isSubscribed = useCallback((symbol: string): boolean => {
    return priceManagerRef.current?.isSubscribed(symbol) || false;
  }, []);

  // Get all subscribed symbols
  const getSubscribedSymbols = useCallback((): string[] => {
    return priceManagerRef.current?.getSubscribedSymbols() || [];
  }, []);

  // Load symbol mappings
  const loadSymbolMappings = useCallback(async (): Promise<void> => {
    if (priceManagerRef.current) {
      await priceManagerRef.current.loadSymbolMappings();
    }
  }, []);

  // Fetch incremental symbol mappings
  const fetchIncrementalMappings = useCallback(async (symbols: string[]): Promise<Map<string, any>> => {
    if (priceManagerRef.current) {
      return await priceManagerRef.current.fetchIncrementalMappings(symbols);
    }
    return new Map();
  }, []);

  // Check existing mappings
  const checkExistingMappings = useCallback(async (symbols: string[]): Promise<{
    cachedSymbols: string[];
    missingSymbols: string[];
    cacheHitRate: number;
  }> => {
    if (priceManagerRef.current) {
      return await priceManagerRef.current.checkExistingMappings(symbols);
    }
    return {
      cachedSymbols: [],
      missingSymbols: symbols,
      cacheHitRate: 0
    };
  }, []);

  // Clear all prices
  const clearPrices = useCallback(() => {
    if (priceManagerRef.current) {
      priceManagerRef.current.clearPrices();
    }
  }, []);

  // Reset statistics
  const resetStats = useCallback(() => {
    if (priceManagerRef.current) {
      priceManagerRef.current.resetStats();
    }
  }, []);

  return {
    // State
    isConnected,
    isLoading,
    stats,
    
    // Actions
    connect,
    disconnect,
    subscribeToSymbols,
    unsubscribeFromSymbols,
    
    // Data access
    getPrice,
    getPrices,
    getAllPrices,
    isSubscribed,
    getSubscribedSymbols,
    
    // Utility
    loadSymbolMappings,
    fetchIncrementalMappings,
    checkExistingMappings,
    clearPrices,
    resetStats
  };
} 