/**
 * React Hook for Kite WebSocket Service
 * =====================================
 * 
 * Provides easy access to the Kite WebSocket service for React components.
 * Handles automatic cleanup and event listening.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import KiteWebSocketService, { 
  KitePriceData, 
  KiteWebSocketConfig, 
  WebSocketStats 
} from '../services/KiteWebSocketService';

export interface UseKiteWebSocketOptions {
  autoConnect?: boolean;
  instruments?: Array<{ instrument_token: number; symbol?: string }>;
  onPriceUpdate?: (priceData: KitePriceData) => void;
  onOrderUpdate?: (orderData: any) => void;
  onPositionUpdate?: (positionData: any) => void;
}

export interface UseKiteWebSocketReturn {
  // WebSocket state
  isConnected: boolean;
  isConnecting: boolean;
  stats: WebSocketStats;
  
  // Connection actions
  connect: (config?: KiteWebSocketConfig) => Promise<void>;
  disconnect: () => void;
  
  // Subscription actions
  subscribeToInstruments: (instruments: Array<{ instrument_token: number; symbol?: string }>) => void;
  unsubscribeFromInstruments: (instruments: Array<{ instrument_token: number }>) => void;
  
  // Utility
  getSubscribedSymbols: () => string[];
  getInstrumentToken: (symbol: string) => number | undefined;
  getSymbol: (instrumentToken: number) => string | undefined;
}

export function useKiteWebSocket(options: UseKiteWebSocketOptions = {}): UseKiteWebSocketReturn {
  const {
    autoConnect = false,
    instruments = [],
    onPriceUpdate,
    onOrderUpdate,
    onPositionUpdate
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [stats, setStats] = useState<WebSocketStats>({
    isConnected: false,
    lastConnected: 0,
    reconnectAttempts: 0,
    subscribedSymbols: 0,
    lastMessageTime: 0,
    connectionId: ''
  });

  const kiteServiceRef = useRef<KiteWebSocketService | null>(null);
  const eventListenersRef = useRef<Map<string, (...args: any[]) => void>>(new Map());

  // Initialize Kite WebSocket service
  const initializeService = useCallback((config?: KiteWebSocketConfig) => {
    try {
      if (config) {
        kiteServiceRef.current = KiteWebSocketService.getInstance(config);
      } else {
        // Try to get existing instance
        kiteServiceRef.current = KiteWebSocketService.getInstance();
      }
      return kiteServiceRef.current;
    } catch (error) {
      console.error('Failed to initialize Kite WebSocket service:', error);
      return null;
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    const service = kiteServiceRef.current;
    if (!service) return;

    const listeners = eventListenersRef.current;

    // Connection events
    const handleConnected = (data: any) => {
      setIsConnected(true);
      setIsConnecting(false);
      setStats(service.getStats());
      console.log('✅ Kite WebSocket connected:', data);
    };

    const handleDisconnected = (data: any) => {
      setIsConnected(false);
      setIsConnecting(false);
      setStats(service.getStats());
      console.log('🔌 Kite WebSocket disconnected:', data);
    };

    const handleError = (error: any) => {
      setIsConnecting(false);
      console.error('❌ Kite WebSocket error:', error);
    };

    // Data events
    const handlePriceUpdate = (priceData: KitePriceData) => {
      setStats(service.getStats());
      if (onPriceUpdate) {
        onPriceUpdate(priceData);
      }
    };

    const handleOrderUpdate = (orderData: any) => {
      if (onOrderUpdate) {
        onOrderUpdate(orderData);
      }
    };

    const handlePositionUpdate = (positionData: any) => {
      if (onPositionUpdate) {
        onPositionUpdate(positionData);
      }
    };

    // Subscription events
    const handleSubscribed = (data: any) => {
      setStats(service.getStats());
      console.log('📡 Subscribed to instruments:', data);
    };

    const handleUnsubscribed = (data: any) => {
      setStats(service.getStats());
      console.log('📡 Unsubscribed from instruments:', data);
    };

    // Register event listeners
    listeners.set('connected', handleConnected);
    listeners.set('disconnected', handleDisconnected);
    listeners.set('error', handleError);
    listeners.set('priceUpdate', handlePriceUpdate);
    listeners.set('orderUpdate', handleOrderUpdate);
    listeners.set('positionUpdate', handlePositionUpdate);
    listeners.set('subscribed', handleSubscribed);
    listeners.set('unsubscribed', handleUnsubscribed);

    // Add listeners to service
    service.on('connected', handleConnected);
    service.on('disconnected', handleDisconnected);
    service.on('error', handleError);
    service.on('priceUpdate', handlePriceUpdate);
    service.on('orderUpdate', handleOrderUpdate);
    service.on('positionUpdate', handlePositionUpdate);
    service.on('subscribed', handleSubscribed);
    service.on('unsubscribed', handleUnsubscribed);

    // Update stats periodically
    const statsInterval = setInterval(() => {
      if (service) {
        setStats(service.getStats());
      }
    }, 5000);

    return () => {
      // Remove event listeners
      listeners.forEach((listener, event) => {
        service.off(event, listener);
      });
      listeners.clear();

      // Clear intervals
      clearInterval(statsInterval);
    };
  }, [onPriceUpdate, onOrderUpdate, onPositionUpdate]);

  // Auto-connect functionality
  useEffect(() => {
    if (autoConnect && !kiteServiceRef.current) {
      // Try to initialize with environment variables
      const apiKey = process.env.REACT_APP_KITE_API_KEY;
      const accessToken = process.env.REACT_APP_KITE_ACCESS_TOKEN;
      
      if (apiKey && accessToken) {
        const config: KiteWebSocketConfig = {
          apiKey,
          accessToken
        };
        
        const service = initializeService(config);
        if (service) {
          setIsConnecting(true);
          service.connect().catch(error => {
            console.error('Failed to auto-connect:', error);
            setIsConnecting(false);
          });
        }
      } else {
        console.warn('⚠️ Kite API credentials not found in environment variables');
      }
    }
  }, [autoConnect, initializeService]);

  // Auto-subscribe to instruments when connected
  useEffect(() => {
    if (isConnected && instruments.length > 0) {
      const service = kiteServiceRef.current;
      if (service) {
        service.subscribeToInstruments(instruments);
      }
    }
  }, [isConnected, instruments]);

  // Connection actions
  const connect = useCallback(async (config?: KiteWebSocketConfig) => {
    let service = kiteServiceRef.current;
    
    if (config) {
      service = initializeService(config);
    } else if (!service) {
      console.error('No Kite WebSocket service available. Please provide config.');
      return;
    }

    if (service) {
      setIsConnecting(true);
      try {
        await service.connect();
      } catch (error) {
        console.error('Failed to connect:', error);
        setIsConnecting(false);
        throw error;
      }
    }
  }, [initializeService]);

  const disconnect = useCallback(() => {
    const service = kiteServiceRef.current;
    if (service) {
      service.disconnect();
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, []);

  // Subscription actions
  const subscribeToInstruments = useCallback((instruments: Array<{ instrument_token: number; symbol?: string }>) => {
    const service = kiteServiceRef.current;
    if (service) {
      service.subscribeToInstruments(instruments);
    }
  }, []);

  const unsubscribeFromInstruments = useCallback((instruments: Array<{ instrument_token: number }>) => {
    const service = kiteServiceRef.current;
    if (service) {
      service.unsubscribeFromInstruments(instruments);
    }
  }, []);

  // Utility functions
  const getSubscribedSymbols = useCallback(() => {
    const service = kiteServiceRef.current;
    return service ? service.getSubscribedSymbols() : [];
  }, []);

  const getInstrumentToken = useCallback((symbol: string) => {
    const service = kiteServiceRef.current;
    return service ? service.getInstrumentToken(symbol) : undefined;
  }, []);

  const getSymbol = useCallback((instrumentToken: number) => {
    const service = kiteServiceRef.current;
    return service ? service.getSymbol(instrumentToken) : undefined;
  }, []);

  return {
    // WebSocket state
    isConnected,
    isConnecting,
    stats,
    
    // Connection actions
    connect,
    disconnect,
    
    // Subscription actions
    subscribeToInstruments,
    unsubscribeFromInstruments,
    
    // Utility
    getSubscribedSymbols,
    getInstrumentToken,
    getSymbol,
  };
}

export default useKiteWebSocket; 