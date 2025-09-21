/**
 * useChartinkAuth Hook
 * ====================
 * 
 * React hook for managing Chartink authentication state
 */

import { useState, useEffect, useCallback } from 'react';
import { chartinkAuthService, type ChartinkAuthStatus, type ChartinkLoginResponse } from '../services/ChartinkAuthService';

interface UseChartinkAuthReturn {
  // State
  authStatus: ChartinkAuthStatus | null;
  loading: boolean;
  error: string | null;
  loginInProgress: boolean;
  
  // Actions
  refreshStatus: () => Promise<void>;
  triggerLogin: () => Promise<void>;
  clearError: () => void;
  
  // Computed properties
  isAuthenticated: boolean;
  isHealthy: boolean;
  needsLogin: boolean;
  healthScore: number;
}

export function useChartinkAuth(autoRefreshInterval: number = 30000): UseChartinkAuthReturn {
  const [authStatus, setAuthStatus] = useState<ChartinkAuthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginInProgress, setLoginInProgress] = useState(false);

  /**
   * Refresh authentication status
   */
  const refreshStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const status = await chartinkAuthService.getSessionStatus();
      setAuthStatus(status);
      
      console.log('📈 [useChartinkAuth] Status refreshed:', status.status);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ [useChartinkAuth] Status refresh failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Trigger browser login
   */
  const triggerLogin = useCallback(async () => {
    try {
      setLoginInProgress(true);
      setError(null);
      
      console.log('🔐 [useChartinkAuth] Triggering browser login...');
      const loginResponse = await chartinkAuthService.triggerBrowserLogin();
      
      if (loginResponse.success) {
        console.log('✅ [useChartinkAuth] Login successful:', loginResponse.message);
        
        // Refresh status after successful login
        setTimeout(() => {
          refreshStatus();
        }, 3000);
      } else {
        throw new Error(loginResponse.error || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      console.error('❌ [useChartinkAuth] Login failed:', error);
    } finally {
      setLoginInProgress(false);
    }
  }, [refreshStatus]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-refresh on mount and interval
  useEffect(() => {
    refreshStatus();
    
    if (autoRefreshInterval > 0) {
      const interval = setInterval(refreshStatus, autoRefreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshStatus, autoRefreshInterval]);

  // Computed properties
  const isAuthenticated = authStatus?.session_working || false;
  const isHealthy = authStatus?.status === 'healthy';
  const needsLogin = authStatus?.status === 'unhealthy' || !authStatus?.session_working;
  const healthScore = authStatus?.health_score || 0;

  return {
    authStatus,
    loading,
    error,
    loginInProgress,
    refreshStatus,
    triggerLogin,
    clearError,
    isAuthenticated,
    isHealthy,
    needsLogin,
    healthScore
  };
}

/**
 * Hook for just checking if Chartink is authenticated (lightweight)
 */
export function useChartinkAuthStatus(): { isAuthenticated: boolean; loading: boolean } {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await chartinkAuthService.getSessionStatus();
        setIsAuthenticated(status.session_working);
      } catch (error) {
        console.error('❌ Auth status check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  return { isAuthenticated, loading };
}

