/**
 * React hook for market context data
 * Provides market intelligence, stock data, and trading analysis
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  marketContextService, 
  MarketIntelligence, 
  StockDataResponse, 
  SwingAnalysis,
  UnifiedAnalysis,
  SystemHealth,
  IntradaySignals,
  MomentumScanner,
  ScalpingOpportunities
} from '../services/MarketContextService';

export interface UseMarketContextReturn {
  // Market Intelligence
  marketIntelligence: MarketIntelligence | null;
  marketIntelligenceLoading: boolean;
  marketIntelligenceError: string | null;
  refreshMarketIntelligence: (horizon?: 'intraday' | 'swing' | 'positional') => Promise<void>;

  // Stock Data
  stockData: StockDataResponse | null;
  stockDataLoading: boolean;
  stockDataError: string | null;
  fetchStockData: (symbols: string[], exchange?: string) => Promise<void>;

  // Trading Analysis
  swingAnalysis: SwingAnalysis | null;
  swingAnalysisLoading: boolean;
  swingAnalysisError: string | null;
  fetchSwingAnalysis: (symbol: string) => Promise<void>;

  unifiedAnalysis: UnifiedAnalysis | null;
  unifiedAnalysisLoading: boolean;
  unifiedAnalysisError: string | null;
  fetchUnifiedAnalysis: (symbol: string, horizon: 'intraday' | 'swing' | 'positional') => Promise<void>;

  // System Health
  systemHealth: SystemHealth | null;
  systemHealthLoading: boolean;
  systemHealthError: string | null;
  refreshSystemHealth: () => Promise<void>;

  // Intraday Trading
  intradaySignals: IntradaySignals | null;
  intradaySignalsLoading: boolean;
  intradaySignalsError: string | null;
  fetchIntradaySignals: (symbol: string) => Promise<void>;

  momentumScanner: MomentumScanner | null;
  momentumScannerLoading: boolean;
  momentumScannerError: string | null;
  refreshMomentumScanner: () => Promise<void>;

  scalpingOpportunities: ScalpingOpportunities | null;
  scalpingLoading: boolean;
  scalpingError: string | null;
  fetchScalpingOpportunities: (symbol: string) => Promise<void>;

  // General
  isHealthy: boolean;
  lastUpdated: Date | null;

  // Enhanced market data for home page
  topGainers: Array<{
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }>;
  topLosers: Array<{
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }>;
  mostActive: Array<{
    symbol: string;
    name: string;
    price: number;
    volume: number;
    value: number;
  }>;
  marketOverview: {
    totalVolume: number;
    totalValue: number;
    advanceDecline: { advances: number; declines: number; unchanged: number };
    marketBreadth: number;
  } | null;
  enhancedMarketLoading: boolean;
  enhancedMarketError: string | null;
  fetchEnhancedMarketData: () => Promise<void>;
}

export const useMarketContext = (): UseMarketContextReturn => {
  // Market Intelligence State
  const [marketIntelligence, setMarketIntelligence] = useState<MarketIntelligence | null>(null);
  const [marketIntelligenceLoading, setMarketIntelligenceLoading] = useState(false);
  const [marketIntelligenceError, setMarketIntelligenceError] = useState<string | null>(null);

  // Stock Data State
  const [stockData, setStockData] = useState<StockDataResponse | null>(null);
  const [stockDataLoading, setStockDataLoading] = useState(false);
  const [stockDataError, setStockDataError] = useState<string | null>(null);

  // Trading Analysis State
  const [swingAnalysis, setSwingAnalysis] = useState<SwingAnalysis | null>(null);
  const [swingAnalysisLoading, setSwingAnalysisLoading] = useState(false);
  const [swingAnalysisError, setSwingAnalysisError] = useState<string | null>(null);

  const [unifiedAnalysis, setUnifiedAnalysis] = useState<UnifiedAnalysis | null>(null);
  const [unifiedAnalysisLoading, setUnifiedAnalysisLoading] = useState(false);
  const [unifiedAnalysisError, setUnifiedAnalysisError] = useState<string | null>(null);

  // System Health State
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [systemHealthLoading, setSystemHealthLoading] = useState(false);
  const [systemHealthError, setSystemHealthError] = useState<string | null>(null);

  // Intraday Trading State
  const [intradaySignals, setIntradaySignals] = useState<IntradaySignals | null>(null);
  const [intradaySignalsLoading, setIntradaySignalsLoading] = useState(false);
  const [intradaySignalsError, setIntradaySignalsError] = useState<string | null>(null);

  const [momentumScanner, setMomentumScanner] = useState<MomentumScanner | null>(null);
  const [momentumScannerLoading, setMomentumScannerLoading] = useState(false);
  const [momentumScannerError, setMomentumScannerError] = useState<string | null>(null);

  // Enhanced market data state
  const [topGainers, setTopGainers] = useState<Array<{
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }>>([]);
  const [topLosers, setTopLosers] = useState<Array<{
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }>>([]);
  const [mostActive, setMostActive] = useState<Array<{
    symbol: string;
    name: string;
    price: number;
    volume: number;
    value: number;
  }>>([]);
  const [marketOverview, setMarketOverview] = useState<{
    totalVolume: number;
    totalValue: number;
    advanceDecline: { advances: number; declines: number; unchanged: number };
    marketBreadth: number;
  } | null>(null);
  const [enhancedMarketLoading, setEnhancedMarketLoading] = useState(false);
  const [enhancedMarketError, setEnhancedMarketError] = useState<string | null>(null);

  const [scalpingOpportunities, setScalpingOpportunities] = useState<ScalpingOpportunities | null>(null);
  const [scalpingLoading, setScalpingLoading] = useState(false);
  const [scalpingError, setScalpingError] = useState<string | null>(null);

  // General State
  const [isHealthy, setIsHealthy] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Market Intelligence Functions
  const refreshMarketIntelligence = useCallback(async (horizon: 'intraday' | 'swing' | 'positional' = 'swing') => {
    setMarketIntelligenceLoading(true);
    setMarketIntelligenceError(null);

    try {
      const data = await marketContextService.getMarketIntelligence(horizon);
      setMarketIntelligence(data);
      setLastUpdated(new Date());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch market intelligence';
      setMarketIntelligenceError(errorMessage);
      console.error('Market intelligence error:', error);
    } finally {
      setMarketIntelligenceLoading(false);
    }
  }, []);

  // Stock Data Functions
  const fetchStockData = useCallback(async (symbols: string[], exchange: string = 'NSE') => {
    setStockDataLoading(true);
    setStockDataError(null);

    try {
      const data = await marketContextService.getRealTimeStockData({ symbols, exchange });
      setStockData(data);
      setLastUpdated(new Date());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stock data';
      setStockDataError(errorMessage);
      console.error('Stock data error:', error);
    } finally {
      setStockDataLoading(false);
    }
  }, []);

  // Trading Analysis Functions
  const fetchSwingAnalysis = useCallback(async (symbol: string) => {
    setSwingAnalysisLoading(true);
    setSwingAnalysisError(null);

    try {
      const data = await marketContextService.getSwingAnalysis(symbol);
      setSwingAnalysis(data);
      setLastUpdated(new Date());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch swing analysis';
      setSwingAnalysisError(errorMessage);
      console.error('Swing analysis error:', error);
    } finally {
      setSwingAnalysisLoading(false);
    }
  }, []);

  const fetchUnifiedAnalysis = useCallback(async (symbol: string, horizon: 'intraday' | 'swing' | 'positional') => {
    setUnifiedAnalysisLoading(true);
    setUnifiedAnalysisError(null);

    try {
      const data = await marketContextService.getUnifiedAnalysis({ symbol, horizon });
      setUnifiedAnalysis(data);
      setLastUpdated(new Date());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch unified analysis';
      setUnifiedAnalysisError(errorMessage);
      console.error('Unified analysis error:', error);
    } finally {
      setUnifiedAnalysisLoading(false);
    }
  }, []);

  // System Health Functions
  const refreshSystemHealth = useCallback(async () => {
    setSystemHealthLoading(true);
    setSystemHealthError(null);

    try {
      const data = await marketContextService.getSystemHealth();
      setSystemHealth(data);
      setIsHealthy(data.system_status === 'healthy');
      setLastUpdated(new Date());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch system health';
      setSystemHealthError(errorMessage);
      setIsHealthy(false);
      console.error('System health error:', error);
    } finally {
      setSystemHealthLoading(false);
    }
  }, []);

  // Intraday Trading Functions
  const fetchIntradaySignals = useCallback(async (symbol: string) => {
    setIntradaySignalsLoading(true);
    setIntradaySignalsError(null);

    try {
      const data = await marketContextService.getIntradaySignals(symbol);
      setIntradaySignals(data);
      setLastUpdated(new Date());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch intraday signals';
      setIntradaySignalsError(errorMessage);
      console.error('Intraday signals error:', error);
    } finally {
      setIntradaySignalsLoading(false);
    }
  }, []);

  const refreshMomentumScanner = useCallback(async () => {
    setMomentumScannerLoading(true);
    setMomentumScannerError(null);

    try {
      const data = await marketContextService.getMomentumScanner();
      setMomentumScanner(data);
      setLastUpdated(new Date());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch momentum scanner';
      setMomentumScannerError(errorMessage);
      console.error('Momentum scanner error:', error);
    } finally {
      setMomentumScannerLoading(false);
    }
  }, []);

  const fetchScalpingOpportunities = useCallback(async (symbol: string) => {
    setScalpingLoading(true);
    setScalpingError(null);

    try {
      const data = await marketContextService.getQuickScalp(symbol);
      setScalpingOpportunities(data);
      setLastUpdated(new Date());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch scalping opportunities';
      setScalpingError(errorMessage);
      console.error('Scalping opportunities error:', error);
    } finally {
      setScalpingLoading(false);
    }
  }, []);

  /**
   * Fetch enhanced market data for home page
   */
  const fetchEnhancedMarketData = useCallback(async () => {
    try {
      setEnhancedMarketLoading(true);
      setEnhancedMarketError(null);

      // Fetch market overview data from Kite services
      const symbols = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'HDFC', 'INFY', 'ITC', 'LT', 'KOTAKBANK', 'AXISBANK'];

      try {
        // Get real-time stock data for top symbols
        const stockDataResponse = await marketContextService.getRealTimeStockData({
          symbols: symbols.slice(0, 10), // Limit to 10 for performance
          exchange: 'NSE'
        });

        if (stockDataResponse.stocks && stockDataResponse.stocks.length > 0) {
          const stocks = stockDataResponse.stocks;

          // Calculate top gainers, losers, and most active
          const gainers = stocks
            .filter(stock => stock.change_percent > 0)
            .sort((a, b) => b.change_percent - a.change_percent)
            .slice(0, 5)
            .map(stock => ({
              symbol: stock.symbol,
              name: stock.symbol,
              price: stock.last_price,
              change: stock.change,
              changePercent: stock.change_percent,
              volume: stock.volume
            }));

          const losers = stocks
            .filter(stock => stock.change_percent < 0)
            .sort((a, b) => a.change_percent - b.change_percent)
            .slice(0, 5)
            .map(stock => ({
              symbol: stock.symbol,
              name: stock.symbol,
              price: stock.last_price,
              change: stock.change,
              changePercent: stock.change_percent,
              volume: stock.volume
            }));

          const mostActive = stocks
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 5)
            .map(stock => ({
              symbol: stock.symbol,
              name: stock.symbol,
              price: stock.last_price,
              volume: stock.volume,
              value: stock.last_price * stock.volume
            }));

          setTopGainers(gainers);
          setTopLosers(losers);
          setMostActive(mostActive);

          // Calculate market overview
          const totalVolume = stocks.reduce((sum, stock) => sum + stock.volume, 0);
          const totalValue = stocks.reduce((sum, stock) => sum + (stock.last_price * stock.volume), 0);
          const advances = stocks.filter(stock => stock.change_percent > 0).length;
          const declines = stocks.filter(stock => stock.change_percent < 0).length;
          const unchanged = stocks.filter(stock => stock.change_percent === 0).length;
          const marketBreadth = ((advances - declines) / stocks.length) * 100;

          setMarketOverview({
            totalVolume,
            totalValue,
            advanceDecline: { advances, declines, unchanged },
            marketBreadth
          });
        }
      } catch (stockDataError) {
        console.warn('⚠️ Failed to fetch stock data:', stockDataError);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch enhanced market data';
      setEnhancedMarketError(errorMessage);
      console.error('❌ Enhanced market data fetch failed:', error);
    } finally {
      setEnhancedMarketLoading(false);
    }
  }, []);

  // Health Check and Enhanced Market Data on Mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await marketContextService.healthCheck();
        setIsHealthy(health.status === 'healthy');
      } catch (error) {
        setIsHealthy(false);
        console.error('Health check failed:', error);
      }
    };

    checkHealth();

    // Fetch enhanced market data for home page
    fetchEnhancedMarketData();
  }, [fetchEnhancedMarketData]);

  return {
    // Market Intelligence
    marketIntelligence,
    marketIntelligenceLoading,
    marketIntelligenceError,
    refreshMarketIntelligence,

    // Stock Data
    stockData,
    stockDataLoading,
    stockDataError,
    fetchStockData,

    // Trading Analysis
    swingAnalysis,
    swingAnalysisLoading,
    swingAnalysisError,
    fetchSwingAnalysis,

    unifiedAnalysis,
    unifiedAnalysisLoading,
    unifiedAnalysisError,
    fetchUnifiedAnalysis,

    // System Health
    systemHealth,
    systemHealthLoading,
    systemHealthError,
    refreshSystemHealth,

    // Intraday Trading
    intradaySignals,
    intradaySignalsLoading,
    intradaySignalsError,
    fetchIntradaySignals,

    momentumScanner,
    momentumScannerLoading,
    momentumScannerError,
    refreshMomentumScanner,

    scalpingOpportunities,
    scalpingLoading,
    scalpingError,
    fetchScalpingOpportunities,

    // Enhanced market data
    topGainers,
    topLosers,
    mostActive,
    marketOverview,
    enhancedMarketLoading,
    enhancedMarketError,
    fetchEnhancedMarketData,

    // General
    isHealthy,
    lastUpdated,
  };
};

export default useMarketContext;




