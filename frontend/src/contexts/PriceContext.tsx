/**
 * Price Context Provider
 * =====================
 * 
 * Provides centralized price management throughout the application.
 * Makes real-time price updates available to all components.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useCentralizedPriceManager } from '../hooks/useCentralizedPriceManager';
import { StockPrice } from '../services/CentralizedPriceManager';

interface PriceContextType {
  // State
  isConnected: boolean;
  isLoading: boolean;
  
  // Actions
  connect: (config: any) => Promise<void>;
  disconnect: () => void;
  subscribeToSymbols: (symbols: string[]) => void;
  unsubscribeFromSymbols: (symbols: string[]) => void;
  
  // Data access
  getPrice: (symbol: string) => StockPrice | null;
  getPrices: (symbols: string[]) => StockPrice[];
  isSubscribed: (symbol: string) => boolean;
  getSubscribedSymbols: () => string[];
  
  // Utility
  loadSymbolMappings: () => Promise<void>;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

interface PriceProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;
}

export const PriceProvider: React.FC<PriceProviderProps> = ({ 
  children, 
  autoConnect = false 
}) => {
  const [isInitialized, setIsInitialized] = useState(false);

  const priceManager = useCentralizedPriceManager({
    autoConnect,
    autoLoadMappings: true,
    onPriceUpdate: (price: StockPrice) => {
      // Global price updates can be handled here
      console.log(`🌍 Global price update: ${price.symbol} - ₹${price.price}`);
    },
    onWebSocketConnected: () => {
      console.log('🌍 Global WebSocket connected');
    },
    onWebSocketDisconnected: () => {
      console.log('🌍 Global WebSocket disconnected');
    },
    onError: (error) => {
      console.error('🌍 Global WebSocket error:', error);
    }
  });

  // Initialize price manager
  useEffect(() => {
    const initialize = async () => {
      try {
        await priceManager.loadSymbolMappings();
        setIsInitialized(true);
        console.log('🌍 Price context initialized');
      } catch (error) {
        console.error('❌ Failed to initialize price context:', error);
      }
    };

    initialize();
  }, [priceManager.loadSymbolMappings]);

  const contextValue: PriceContextType = {
    // State
    isConnected: priceManager.isConnected,
    isLoading: priceManager.isLoading,
    
    // Actions
    connect: priceManager.connect,
    disconnect: priceManager.disconnect,
    subscribeToSymbols: priceManager.subscribeToSymbols,
    unsubscribeFromSymbols: priceManager.unsubscribeFromSymbols,
    
    // Data access
    getPrice: priceManager.getPrice,
    getPrices: priceManager.getPrices,
    isSubscribed: priceManager.isSubscribed,
    getSubscribedSymbols: priceManager.getSubscribedSymbols,
    
    // Utility
    loadSymbolMappings: priceManager.loadSymbolMappings
  };

  if (!isInitialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Initializing price manager...</div>
      </div>
    );
  }

  return (
    <PriceContext.Provider value={contextValue}>
      {children}
    </PriceContext.Provider>
  );
};

export const usePriceContext = (): PriceContextType => {
  const context = useContext(PriceContext);
  if (context === undefined) {
    throw new Error('usePriceContext must be used within a PriceProvider');
  }
  return context;
};

export default PriceContext; 