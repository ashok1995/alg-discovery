/**
 * useMoneyMakingOpportunities Hook
 * ================================
 *
 * React hook for managing Money Making Opportunities state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import integratedServiceManager from '../services/IntegratedServiceManager';

export interface UseMoneyMakingOpportunitiesReturn {
  // State
  opportunities: any[];
  summary: any;
  loading: boolean;
  error: string | null;
  serviceInfo: any;
  serviceLoading: boolean;

  // Actions
  rankOpportunities: (request: any) => Promise<void>;
  refreshOpportunities: () => Promise<void>;
  getQuickOpportunities: (limit?: number) => Promise<void>;
  getHighConfidenceOpportunities: (limit?: number) => Promise<void>;
  getLowRiskOpportunities: (limit?: number) => Promise<void>;
  getMomentumOpportunities: (limit?: number) => Promise<void>;
  getVolumeSurgeOpportunities: (limit?: number) => Promise<void>;
  clearError: () => void;

  // Computed properties
  totalOpportunities: number;
  averageScore: number;
  topOpportunity: any;
  hasOpportunities: boolean;
  isServiceAvailable: boolean;
}

export function useMoneyMakingOpportunities(autoRefreshInterval: number = 0): UseMoneyMakingOpportunitiesReturn {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceInfo, setServiceInfo] = useState<any>(null);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [lastRequest, setLastRequest] = useState<any>(null);

  /**
   * Rank opportunities with given request
   */
  const rankOpportunities = useCallback(async (request: any) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🎯 [useMoneyMakingOpportunities] Ranking opportunities:`, request);
      const opportunitiesData = await integratedServiceManager.getTradingOpportunities();

      setOpportunities(opportunitiesData?.moneyMakingOpportunities || []);
      setSummary({
        total_opportunities: opportunitiesData?.moneyMakingOpportunities?.length || 0,
        average_score: opportunitiesData?.moneyMakingOpportunities?.reduce((sum: number, opp: any) => sum + opp.opportunityScore, 0) / (opportunitiesData?.moneyMakingOpportunities?.length || 1) || 0,
        top_performers: opportunitiesData?.moneyMakingOpportunities?.slice(0, 3).map((opp: any) => opp.symbol) || []
      });
      setLastRequest(request);

      console.log(`✅ [useMoneyMakingOpportunities] Retrieved ${opportunitiesData?.moneyMakingOpportunities?.length || 0} opportunities`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to rank opportunities';
      setError(errorMessage);
      console.error('❌ [useMoneyMakingOpportunities] Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh current opportunities
   */
  const refreshOpportunities = useCallback(async () => {
    if (lastRequest) {
      await rankOpportunities(lastRequest);
    }
  }, [lastRequest, rankOpportunities]);

  /**
   * Get quick opportunities with default settings
   */
  const getQuickOpportunities = useCallback(async (limit: number = 10) => {
    await rankOpportunities({
      min_opportunity_score: 40,
      limit,
      include_analysis: true,
      include_volume_analysis: true,
    });
  }, [rankOpportunities]);

  /**
   * Get high-confidence opportunities only
   */
  const getHighConfidenceOpportunities = useCallback(async (limit: number = 10) => {
    await rankOpportunities({
      min_opportunity_score: 60,
      limit,
      include_analysis: true,
      include_volume_analysis: true,
    });
  }, [rankOpportunities]);

  /**
   * Get low-risk opportunities
   */
  const getLowRiskOpportunities = useCallback(async (limit: number = 10) => {
    await rankOpportunities({
      max_risk_level: 'medium',
      min_opportunity_score: 30,
      limit,
      include_analysis: true,
      include_volume_analysis: true,
    });
  }, [rankOpportunities]);

  /**
   * Get momentum opportunities
   */
  const getMomentumOpportunities = useCallback(async (limit: number = 10) => {
    await rankOpportunities({
      opportunity_types: ['momentum', 'breakout'],
      min_opportunity_score: 40,
      limit,
      include_analysis: true,
      include_volume_analysis: true,
    });
  }, [rankOpportunities]);

  /**
   * Get volume surge opportunities
   */
  const getVolumeSurgeOpportunities = useCallback(async (limit: number = 10) => {
    await rankOpportunities({
      opportunity_types: ['volume_surge'],
      min_opportunity_score: 40,
      min_volume_ratio: 1.5,
      limit,
      include_analysis: true,
      include_volume_analysis: true,
    });
  }, [rankOpportunities]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Load service information
   */
  useEffect(() => {
    const loadServiceInfo = async () => {
      try {
        setServiceLoading(true);
        const serviceInfoData = integratedServiceManager.getServiceInfo();
        setServiceInfo(serviceInfoData);
      } catch (error) {
        console.warn('⚠️ Failed to load service info:', error);
      } finally {
        setServiceLoading(false);
      }
    };

    loadServiceInfo();
  }, []);

  /**
   * Auto-refresh opportunities
   */
  useEffect(() => {
    if (autoRefreshInterval > 0 && opportunities.length > 0) {
      const interval = setInterval(refreshOpportunities, autoRefreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefreshInterval, opportunities.length, refreshOpportunities]);

  /**
   * Load default opportunities on mount
   */
  useEffect(() => {
    getQuickOpportunities();
  }, [getQuickOpportunities]);

  // Computed properties
  const totalOpportunities = opportunities.length;
  const averageScore = opportunities.length > 0
    ? opportunities.reduce((sum: number, opp: any) => sum + opp.opportunityScore, 0) / opportunities.length
    : 0;
  const topOpportunity = opportunities.length > 0 ? opportunities[0] : null;
  const hasOpportunities = opportunities.length > 0;
  const isServiceAvailable = serviceInfo !== null;

  return {
    opportunities,
    summary,
    loading,
    error,
    serviceInfo,
    serviceLoading,
    rankOpportunities,
    refreshOpportunities,
    getQuickOpportunities,
    getHighConfidenceOpportunities,
    getLowRiskOpportunities,
    getMomentumOpportunities,
    getVolumeSurgeOpportunities,
    clearError,
    totalOpportunities,
    averageScore,
    topOpportunity,
    hasOpportunities,
    isServiceAvailable,
  };
}

/**
 * Hook for just checking if Money Making Opportunities service is available
 */
export function useMoneyMakingOpportunitiesStatus(): { isAvailable: boolean; loading: boolean; error: string | null } {
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkService = async () => {
      try {
        setLoading(true);
        setError(null);

        const info = await integratedServiceManager.getServiceInfo();
        setIsAvailable(true);
      } catch (err) {
        setIsAvailable(false);
        const errorMessage = err instanceof Error ? err.message : 'Service unavailable';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    checkService();
  }, []);

  return { isAvailable, loading, error };
}
