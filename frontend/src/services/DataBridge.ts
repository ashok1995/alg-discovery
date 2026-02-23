/**
 * Data Bridge - Tightly Coupled Data Population
 * =============================================
 *
 * Background service that populates shared data from external sources
 * while maintaining the tightly coupled architecture.
 */

import { sharedDataManager } from './SharedDataManager';

export class DataBridge {
  private static instance: DataBridge;
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  static getInstance(): DataBridge {
    if (!DataBridge.instance) {
      DataBridge.instance = new DataBridge();
    }
    return DataBridge.instance;
  }

  /**
   * Start the data bridge service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('🔄 [DataBridge] Already running');
      return;
    }

    console.log('🚀 [DataBridge] Starting data bridge service...');
    this.isRunning = true;

    // Initial data population
    await this.populateData();

    // Start periodic updates
    this.updateInterval = setInterval(async () => {
      await this.populateData();
    }, 60000); // Update every 60 seconds

    console.log('✅ [DataBridge] Data bridge service started');
  }

  /**
   * Stop the data bridge service
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 [DataBridge] Data bridge service stopped');
  }

  /**
   * Populate shared data from external sources
   */
  private async populateData(): Promise<void> {
    try {
      console.log('📡 [DataBridge] Fetching external data...');

      // Fetch data from external APIs (this could be optimized further)
      const [marketData, opportunities] = await Promise.all([
        this.fetchMarketData(),
        this.fetchOpportunities()
      ]);

      // Update shared data
      sharedDataManager.updateMarketData(marketData);
      sharedDataManager.updateOpportunities(opportunities);

      console.log('✅ [DataBridge] External data populated successfully');

    } catch (error) {
      console.error('❌ [DataBridge] Failed to populate data:', error);

      // On error, ensure we still have valid data in shared memory
      this.ensureFallbackData();
    }
  }

  /**
   * Fetch market data from external sources (kite services)
   */
  private async fetchMarketData() {
    try {
      console.log('📡 [DataBridge] Fetching real market data from kite services...');

      // Use the correct endpoint that has real market data
      const marketOverviewResponse = await fetch('/api/kite/ui/market-overview');
      const marketOverview = await marketOverviewResponse.json();

      if (!marketOverview || marketOverview.status !== 'success' || !marketOverview.indexes) {
        throw new Error('Failed to fetch market overview data');
      }

      // Extract real market indices data from the market overview
      const indices = marketOverview.indexes.map((index: any) => ({
        symbol: index.symbol === '^NSEI' ? 'NIFTY' : index.symbol === '^NSEBANK' ? 'BANKNIFTY' : index.symbol,
        name: index.name,
        price: index.current_level,
        change: index.change_amount,
        changePercent: index.change_percent,
        volume: index.volume,
        source: 'Kite Market Overview',
        lastUpdated: marketOverview.timestamp,
        freshness: index.market_status === 'open' ? 'Live data' : 'Market closed',
        quality: 'excellent'
      }));

      // Fetch real stock data from market registry API
      const [topGainersData, topLosersData, topTradedData, volumeShockersData] = await Promise.allSettled([
        fetch('/api/seed/market/registry/top_gainers').catch(() => null),
        fetch('/api/seed/market/registry/top_losers').catch(() => null),
        fetch('/api/seed/market/registry/top_traded').catch(() => null),
        fetch('/api/seed/stocks/volume-shockers').catch(() => null)
      ]);

    // Process top gainers
    const topGainers = [];
    if (topGainersData.status === 'fulfilled' && topGainersData.value) {
      try {
        const gainersResponse = await topGainersData.value.json();
        if (gainersResponse.success && gainersResponse.stocks && gainersResponse.stocks.length > 0) {
          topGainers.push(...gainersResponse.stocks.slice(0, 5).map((stock: any) => ({
            symbol: stock.symbol,
            name: stock.symbol,
            price: stock.price,
            change: (stock.price * stock.change_pct) / 100,
            changePercent: stock.change_pct,
            volume: stock.volume,
            source: `Chartink - ${stock.source}`
          })));
        }
      } catch (error) {
        console.warn('Failed to parse top gainers data:', error);
      }
    }

    // Process top losers
    const topLosers = [];
    if (topLosersData.status === 'fulfilled' && topLosersData.value) {
      try {
        const losersResponse = await topLosersData.value.json();
        if (losersResponse.success && losersResponse.stocks && losersResponse.stocks.length > 0) {
          topLosers.push(...losersResponse.stocks.slice(0, 5).map((stock: any) => ({
            symbol: stock.symbol,
            name: stock.symbol,
            price: stock.price,
            change: (stock.price * stock.change_pct) / 100,
            changePercent: stock.change_pct,
            volume: stock.volume,
            source: `Chartink - ${stock.source}`
          })));
        }
      } catch (error) {
        console.warn('Failed to parse top losers data:', error);
      }
    }

    // Process most active stocks
    const mostActive = [];
    if (topTradedData.status === 'fulfilled' && topTradedData.value) {
      try {
        const tradedResponse = await topTradedData.value.json();
        if (tradedResponse.success && tradedResponse.stocks && tradedResponse.stocks.length > 0) {
          mostActive.push(...tradedResponse.stocks.slice(0, 4).map((stock: any) => ({
            symbol: stock.symbol,
            name: stock.symbol,
            volume: stock.volume,
            value: stock.price * stock.volume,
            price: stock.price,
            changePercent: stock.change_pct,
            source: `Chartink - ${stock.source}`
          })));
        }
      } catch (error) {
        console.warn('Failed to parse top traded data:', error);
      }
    }

    // Process volume shockers
    const volumeShockers = [];
    if (volumeShockersData.status === 'fulfilled' && volumeShockersData.value) {
      try {
        const shockersResponse = await volumeShockersData.value.json();
        if (shockersResponse.success && shockersResponse.stocks && shockersResponse.stocks.length > 0) {
          volumeShockers.push(...shockersResponse.stocks.slice(0, 4).map((stock: any) => ({
            symbol: stock.symbol,
            name: stock.symbol,
            volume: stock.volume,
            changePercent: stock.change_pct,
            source: `Chartink - ${stock.source}`
          })));
        }
      } catch (error) {
        console.warn('Failed to parse volume shockers data:', error);
      }
    }

    // Calculate market stats from the real data
    const allStocks = [...topGainers, ...topLosers];
    const totalVolume = allStocks.reduce((sum, stock) => sum + (stock.volume || 0), 0);
    const totalValue = allStocks.reduce((sum, stock) => sum + (stock.price * (stock.volume || 0)), 0);
    const advances = topGainers.length;
    const declines = topLosers.length;
    const advanceDeclineRatio = allStocks.length > 0 ? (advances - declines) / allStocks.length : 0;

      console.log('✅ [DataBridge] Real market data fetched successfully');

        return {
          indices,
          topGainers,
          topLosers,
          volumeShockers,
          marketStats: {
            totalVolume,
            totalValue,
            advanceDeclineRatio,
            marketBreadth: advanceDeclineRatio * 100,
            advanceDecline: {
              advances,
              declines,
              unchanged: allStocks.length - advances - declines
            },
            mostActive
          }
        };

    } catch (error) {
      console.error('❌ [DataBridge] Error fetching real market data:', error);
      throw error;
    }
  }

  /**
   * Fetch opportunities from external sources (seed service)
   */
  private async fetchOpportunities() {
    try {
      console.log('📡 [DataBridge] Fetching real opportunities from unified recommendations API...');

      // Fetch unified recommendations from seed service
      const response = await fetch('/api/seed/stocks/unified-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: 'money_making',
          horizon: 'swing',
          risk_level: 'moderate',
          limit: 8,
          include_technical_indicators: true,
          include_price_action_analysis: true,
          include_sector_analysis: true,
          prefer_real_data: true
        })
      });

      const data = await response.json();
      console.log('✅ [DataBridge] Unified opportunities fetched successfully:', data);

        // Transform the unified recommendations data to match our expected format
        const moneyMakingOpportunities = data.recommendations?.map((rec: any) => ({
          symbol: rec.symbol,
          name: rec.symbol,
          currentPrice: rec.current_price,
          changePercent: rec.technical_indicators?.change_pct || 0,
          score: rec.recommendation_score,
          confidence: rec.confidence,
          signal: rec.entry_signal?.toUpperCase() || 'BUY',
          sector: rec.sector_analysis?.sector || 'General',
          source: rec.source === 'chartink' ? 'Chartink Live' : `Unified - ${rec.source}`,
          course: rec.course,
          recommendationStrength: rec.recommendation_strength,
          riskLevel: rec.risk_level,
          calculatedRisk: rec.calculated_risk,
          priceActionScore: rec.price_action_analysis?.score,
          momentumSignal: rec.price_action_analysis?.momentum_signal,
          trendAlignment: rec.price_action_analysis?.trend_alignment,
          breakoutPotential: rec.price_action_analysis?.breakout_potential,
          technicalIndicators: rec.technical_indicators,
          targetPrice: rec.target_price,
          stopLoss: rec.stop_loss,
          expectedReturn: rec.expected_return,
          selectionReason: rec.selection_reason,
          timestamp: rec.timestamp
        })) || [];

      // Keep swing trading as empty for now since we're focusing on money making opportunities
      const swingTrading: any[] = [];

      // For now, use the same data for intraday and long-term (can be enhanced later)
      const intradayTrading = swingTrading.slice(0, 5);
      const longTermInvesting = swingTrading.slice(0, 3);

      console.log('✅ [DataBridge] Real opportunities fetched successfully');

      return {
        swingTrading,
        intradayTrading,
        longTermInvesting,
        moneyMakingOpportunities
      };

    } catch (error) {
      console.error('❌ [DataBridge] Error fetching real opportunities:', error);
      throw error;
    }
  }

  /**
   * Ensure fallback data is available when external sources fail
   */
  private ensureFallbackData(): void {
    console.log('🔧 [DataBridge] Ensuring fallback data availability');

    // The SharedDataManager already has fallback data initialized
    // This method can be extended to handle specific fallback scenarios
  }

  /**
   * Get current bridge status
   */
  getStatus(): { isRunning: boolean; lastUpdate?: Date } {
    return {
      isRunning: this.isRunning,
      lastUpdate: this.updateInterval ? new Date() : undefined
    };
  }
}

// Export singleton instance
export const dataBridge = DataBridge.getInstance();
