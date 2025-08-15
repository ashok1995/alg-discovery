/**
 * Swing API Service
 * Handles communication with the Swing Buy AI API endpoints
 */

import { AbstractAPIService, BaseAPIRequest, BaseAPIResponse } from './BaseAPIService';
import swingBuyAIService, { 
  SwingBuyAIRequest, 
  SwingBuyAIResponse, 
  ConnectionStatus, 
  RealTimePricesResponse,
  StockSubscriptionRequest,
  StockSubscriptionResponse,
  HealthResponse,
  EnhancedRealTimePrice,
  TechnicalIndicatorsResponse,
  AIScoreUpdateResponse,
  PriceAlertConfig
} from './swingBuyAiService';

export class SwingAPIService extends AbstractAPIService {
  constructor() {
    super(
      'swing-api',
      'Swing Buy AI',
      8002,
      {
        HEALTH: '/health',
        STATUS: '/status',
        AI_RECOMMENDATIONS: '/api/swing/ai-recommendations',
        SWING_RECOMMENDATIONS: '/api/strategy/recommendations',
        TRACKING_STATUS: '/api/swing/tracking-status',
        REAL_TIME_PRICES: '/api/swing/real-time-prices',
        SUBSCRIBE_STOCKS: '/api/swing/subscribe-stocks',
        UNSUBSCRIBE_STOCKS: '/api/swing/unsubscribe-stocks',
        TECHNICAL_INDICATORS: '/api/swing/technical-indicators',
        AI_SCORE_UPDATE: '/api/swing/ai-score-update',
        PRICE_ALERTS: '/api/swing/price-alerts',
        VOLUME_ALERTS: '/api/swing/volume-alerts'
      }
    );
  }

  /**
   * Get AI-powered swing trading recommendations
   */
  async getAIRecommendations(params: SwingBuyAIRequest = {}): Promise<SwingBuyAIResponse> {
    return swingBuyAIService.getAIRecommendations(params);
  }

  /**
   * Get swing recommendations from cache (legacy endpoint)
   */
  async getSwingRecommendations(params: SwingBuyAIRequest = {}): Promise<SwingBuyAIResponse> {
    return swingBuyAIService.getSwingRecommendations(params);
  }

  /**
   * Get real-time connection status
   */
  async getTrackingStatus(): Promise<ConnectionStatus> {
    return swingBuyAIService.getTrackingStatus();
  }

  /**
   * Get real-time prices for symbols
   */
  async getRealTimePrices(symbols: string[]): Promise<RealTimePricesResponse> {
    return swingBuyAIService.getRealTimePrices(symbols);
  }

  /**
   * Subscribe to real-time stock updates
   */
  async subscribeStocks(request: StockSubscriptionRequest): Promise<StockSubscriptionResponse> {
    return swingBuyAIService.subscribeStocks(request);
  }

  /**
   * Unsubscribe from real-time stock updates
   */
  async unsubscribeStocks(request: StockSubscriptionRequest): Promise<StockSubscriptionResponse> {
    return swingBuyAIService.unsubscribeStocks(request);
  }

  /**
   * Check API health status
   */
  async healthCheck(): Promise<HealthResponse> {
    return swingBuyAIService.healthCheck();
  }

  /**
   * Get detailed service status
   */
  async getStatus(): Promise<any> {
    return swingBuyAIService.getStatus();
  }

  /**
   * Test connection to the API
   */
  async testConnection(): Promise<boolean> {
    return swingBuyAIService.testConnection();
  }

  /**
   * Get enhanced real-time prices with technical indicators and alerts
   */
  async getEnhancedRealTimePrices(symbols: string[]): Promise<{ success: boolean; data: Record<string, EnhancedRealTimePrice>; error?: string }> {
    return swingBuyAIService.getEnhancedRealTimePrices(symbols);
  }

  /**
   * Get technical indicators for a symbol
   */
  async getTechnicalIndicators(symbol: string): Promise<TechnicalIndicatorsResponse> {
    return swingBuyAIService.getTechnicalIndicators(symbol);
  }

  /**
   * Get AI score update for a symbol
   */
  async getAIScoreUpdate(symbol: string): Promise<AIScoreUpdateResponse> {
    return swingBuyAIService.getAIScoreUpdate(symbol);
  }

  /**
   * Get price alerts for symbols
   */
  async getPriceAlerts(symbols: string[]): Promise<{ success: boolean; data: Record<string, any>; error?: string }> {
    return swingBuyAIService.getPriceAlerts(symbols);
  }

  /**
   * Get volume alerts for symbols
   */
  async getVolumeAlerts(symbols: string[]): Promise<{ success: boolean; data: Record<string, any>; error?: string }> {
    return swingBuyAIService.getVolumeAlerts(symbols);
  }

  /**
   * Get comprehensive enhanced data for symbols (prices + indicators + alerts)
   */
  async getComprehensiveData(symbols: string[]): Promise<{ success: boolean; data: Record<string, EnhancedRealTimePrice>; error?: string }> {
    return swingBuyAIService.getComprehensiveData(symbols);
  }

  /**
   * Set up price alert configuration
   */
  async setPriceAlertConfig(config: PriceAlertConfig): Promise<{ success: boolean; message: string; error?: string }> {
    return swingBuyAIService.setPriceAlertConfig(config);
  }
}

// Export singleton instance
export const swingAPIService = new SwingAPIService();
export default swingAPIService; 