/**
 * Integrated Service Manager - Tightly Coupled Architecture
 * ======================================================
 *
 * Shared memory service manager that holds all data in-process
 * and provides a single interface for the frontend.
 *
 * This replaces the fragmented API approach with a tightly coupled
 * architecture using shared objects for maximum performance.
 */

import { sharedDataManager } from './SharedDataManager';

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  url: string;
  lastCheck: string;
  responseTime: number;
  error?: string;
}

export interface IntegratedServiceStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  lastUpdate: string;
  uptime: number;
}

export interface MarketDataSummary {
  indices: Array<{
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }>;
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
  marketStats: {
    totalVolume: number;
    totalValue: number;
    advanceDeclineRatio: number;
    marketBreadth: number;
  };
  lastUpdated: string;
}

export interface TradingOpportunities {
  swingTrading: Array<{
    symbol: string;
    name: string;
    price: number;
    score: number;
    signal: string;
    confidence: string;
  }>;
  intradayTrading: Array<{
    symbol: string;
    name: string;
    price: number;
    score: number;
    signal: string;
    confidence: string;
  }>;
  longTermInvesting: Array<{
    symbol: string;
    name: string;
    price: number;
    score: number;
    signal: string;
    confidence: string;
  }>;
  moneyMakingOpportunities: Array<{
    symbol: string;
    name: string;
    price?: number;
    currentPrice?: number;
    changePercent?: number;
    score?: number;
    opportunityScore?: number;
    opportunityType?: string;
    riskLevel?: string;
    confidence?: number;
    signal?: string;
    sector?: string;
    source?: string;
    course?: string;
    recommendationStrength?: string;
    calculatedRisk?: string;
    priceActionScore?: number;
    momentumSignal?: string;
    trendAlignment?: string;
    breakoutPotential?: string;
    technicalIndicators?: any;
  }>;
  lastUpdated: string;
  source?: string;
  summary?: any;
  dataQuality?: any;
}

class IntegratedServiceManager {
  private static instance: IntegratedServiceManager;
  private sharedDataManager: typeof sharedDataManager;

  private constructor() {
    this.sharedDataManager = sharedDataManager;
  }

  static getInstance(): IntegratedServiceManager {
    if (!IntegratedServiceManager.instance) {
      IntegratedServiceManager.instance = new IntegratedServiceManager();
    }
    return IntegratedServiceManager.instance;
  }

  /**
   * Initialize all services and check their health (shared memory)
   */
  async initialize(): Promise<IntegratedServiceStatus> {
    console.log('🔧 [IntegratedServiceManager] Initializing shared services...');

    // Use shared data manager for service health
    const status = await this.sharedDataManager.initialize();

    console.log(`✅ [IntegratedServiceManager] Shared services initialized - ${status.overall.toUpperCase()}`);
    return status;
  }

  /**
   * Get comprehensive market data (shared memory)
   */
  async getMarketData(): Promise<MarketDataSummary> {
    console.log('📊 [IntegratedServiceManager] Accessing market data from shared memory');

    // Direct access to shared data - no API calls!
    const marketData = await this.sharedDataManager.getMarketData();

    console.log('✅ [IntegratedServiceManager] Market data accessed successfully');
    return marketData;
  }

  /**
   * Get trading opportunities from all services (shared memory)
   */
  async getTradingOpportunities(): Promise<TradingOpportunities> {
    console.log('🎯 [IntegratedServiceManager] Accessing trading opportunities from shared memory');

    // Direct access to shared data - no API calls!
    const opportunities = await this.sharedDataManager.getTradingOpportunities();

    console.log('✅ [IntegratedServiceManager] Trading opportunities accessed successfully');
    return opportunities;
  }

  /**
   * Get current service status (shared memory)
   */
  getServiceStatus(): IntegratedServiceStatus | null {
    return this.sharedDataManager.getServiceStatus();
  }

  /**
   * Refresh all data (shared memory)
   */
  async refreshAll(): Promise<{
    status: IntegratedServiceStatus;
    marketData: MarketDataSummary;
    opportunities: TradingOpportunities;
  }> {
    console.log('🔄 [IntegratedServiceManager] Refreshing all shared data...');

    // Direct refresh of shared data - no API calls!
    const result = await this.sharedDataManager.refreshAll();

    console.log('✅ [IntegratedServiceManager] All shared data refreshed successfully');
    return result;
  }

  /**
   * Force refresh all data immediately
   */
  async forceRefresh(): Promise<void> {
    return this.sharedDataManager.forceRefresh();
  }

  /**
   * Get service information (shared memory)
   */
  getServiceInfo() {
    return this.sharedDataManager.getServiceInfo();
  }
}

// Export singleton instance
export const integratedServiceManager = IntegratedServiceManager.getInstance();
export default integratedServiceManager;
