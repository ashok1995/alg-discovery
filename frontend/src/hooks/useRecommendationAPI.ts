/**
 * useRecommendationAPI Hook
 * =========================
 * 
 * React hook for managing recommendation API calls with state management,
 * error handling, and caching for all 4 recommendation scenarios.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  recommendationAPIService,
  type RecommendationRequest,
  type RecommendationResponse,
  type Recommendation,
  type RiskProfile,
  type ServiceStatus
} from '../services/RecommendationAPIService';

// Hook state interface
interface RecommendationState {
  recommendations: Recommendation[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  totalCount: number;
  executionTime: number;
}

// Hook options interface
interface UseRecommendationOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
  retryAttempts?: number;
  onError?: (error: string) => void;
  onSuccess?: (data: RecommendationResponse) => void;
}

// Hook return interface
interface UseRecommendationReturn {
  // State
  state: RecommendationState;
  serviceStatus: ServiceStatus | null;
  
  // Actions
  fetchRecommendations: (request?: RecommendationRequest) => Promise<void>;
  refreshRecommendations: () => Promise<void>;
  clearError: () => void;
  
  // Utilities
  isLoading: boolean;
  hasError: boolean;
  hasData: boolean;
  isEmpty: boolean;
}

/**
 * Hook for managing recommendation API calls
 */
export function useRecommendationAPI(
  type: 'swing' | 'long-buy' | 'intraday-buy' | 'intraday-sell',
  initialRequest?: RecommendationRequest,
  options: UseRecommendationOptions = {}
): UseRecommendationReturn {
  const {
    autoFetch = true,
    refreshInterval,
    retryAttempts = 3,
    onError,
    onSuccess
  } = options;

  // State management
  const [state, setState] = useState<RecommendationState>({
    recommendations: [],
    loading: false,
    error: null,
    lastUpdated: null,
    totalCount: 0,
    executionTime: 0
  });

  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);

  // Refs for cleanup
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch recommendations with error handling
   */
  const fetchRecommendations = useCallback(async (request?: RecommendationRequest) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await recommendationAPIService.getRecommendationsWithRetry(
        type,
        { ...initialRequest, ...request },
        retryAttempts
      );

      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setState({
        recommendations: (response.items || response.recommendations || []) as any,
        loading: false,
        error: null,
        lastUpdated: response.timestamp || new Date().toISOString(),
        totalCount: response.total_count || 0,
        executionTime: response.execution_time || 0
      });

      onSuccess?.(response as any);
    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      onError?.(errorMessage);
      console.error(`❌ Error fetching ${type} recommendations:`, error);
    }
  }, [type, initialRequest, retryAttempts, onSuccess, onError]);

  /**
   * Refresh recommendations
   */
  const refreshRecommendations = useCallback(async () => {
    await fetchRecommendations();
  }, [fetchRecommendations]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Check service status
   */
  const checkServiceStatus = useCallback(async () => {
    try {
      const status = await recommendationAPIService.getServiceStatus();
      setServiceStatus(status);
    } catch (error) {
      console.error('❌ Error checking service status:', error);
      setServiceStatus({
        connected: false,
        url: recommendationAPIService.getServiceInfo().primaryService.baseUrl,
        status: 'error',
        lastCheck: new Date().toISOString()
      });
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchRecommendations();
    }
    checkServiceStatus();
  }, [autoFetch, fetchRecommendations, checkServiceStatus]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        fetchRecommendations();
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
  }, [refreshInterval, fetchRecommendations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Computed properties
  const isLoading = state.loading;
  const hasError = !!state.error;
  const hasData = state.recommendations.length > 0;
  const isEmpty = !isLoading && !hasError && state.recommendations.length === 0;

  return {
    state,
    serviceStatus,
    fetchRecommendations,
    refreshRecommendations,
    clearError,
    isLoading,
    hasError,
    hasData,
    isEmpty
  };
}

/**
 * Hook for managing all recommendation types at once
 */
export function useAllRecommendations(
  initialRequest?: RecommendationRequest,
  options: UseRecommendationOptions = {}
) {
  const [allRecommendations, setAllRecommendations] = useState<{
    swing: RecommendationResponse | null;
    longBuy: RecommendationResponse | null;
    intradayBuy: RecommendationResponse | null;
    intradaySell: RecommendationResponse | null;
  }>({
    swing: null,
    longBuy: null,
    intradayBuy: null,
    intradaySell: null
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllRecommendations = useCallback(async (request?: RecommendationRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await recommendationAPIService.getAllRecommendations({
        ...initialRequest,
        ...request
      });

      setAllRecommendations(response as any);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('❌ Error fetching all recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [initialRequest]);

  const refreshAll = useCallback(async () => {
    await fetchAllRecommendations();
  }, [fetchAllRecommendations]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    recommendations: allRecommendations,
    loading,
    error,
    fetchAllRecommendations,
    refreshAll,
    clearError,
    hasData: Object.values(allRecommendations).some(r => r !== null),
    isEmpty: Object.values(allRecommendations).every(r => r === null || r.recommendations.length === 0)
  };
}

/**
 * Hook for managing service status
 */
export function useRecommendationServiceStatus() {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const serviceStatus = await recommendationAPIService.getServiceStatus();
      setStatus(serviceStatus);
    } catch (error) {
      console.error('❌ Error checking service status:', error);
      setStatus({
        connected: false,
        url: recommendationAPIService.getServiceInfo().primaryService.baseUrl,
        status: 'error',
        lastCheck: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    status,
    loading,
    checkStatus,
    isConnected: status?.connected || false
  };
}
