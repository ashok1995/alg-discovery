/**
 * useChartinkAuth Hook
 * ====================
 *
 * React hook for Chartink auth (prod 8181: check, vnc-url, force-update)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  chartinkAuthService,
  type ChartinkCheckStatus,
  type ChartinkForceUpdateResponse,
} from '../services/ChartinkAuthService';

interface UseChartinkAuthReturn {
  checkStatus: ChartinkCheckStatus | null;
  loading: boolean;
  error: string | null;
  refreshStatus: () => Promise<void>;
  clearError: () => void;
  isAuthenticated: boolean;
  getVncUrl: () => Promise<string | null>;
  forceAuthenticate: () => Promise<ChartinkForceUpdateResponse | null>;
}

export function useChartinkAuth(autoRefreshInterval = 60000): UseChartinkAuthReturn {
  const [checkStatus, setCheckStatus] = useState<ChartinkCheckStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await chartinkAuthService.getAuthStatus();
      setCheckStatus(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const getVncUrl = useCallback(async (): Promise<string | null> => {
    try {
      const res = await chartinkAuthService.getVncUrl();
      return res?.vnc_url ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'VNC URL failed');
      return null;
    }
  }, []);

  const forceAuthenticate = useCallback(async (): Promise<ChartinkForceUpdateResponse | null> => {
    try {
      setError(null);
      const res = await chartinkAuthService.forceAuthenticate();
      return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Force auth failed');
      return null;
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    if (autoRefreshInterval > 0) {
      const id = setInterval(refreshStatus, autoRefreshInterval);
      return () => clearInterval(id);
    }
  }, [refreshStatus, autoRefreshInterval]);

  const isAuthenticated = Boolean(
    checkStatus?.success && checkStatus?.status?.authenticated === true
  );

  return {
    checkStatus,
    loading,
    error,
    refreshStatus,
    clearError: () => setError(null),
    isAuthenticated,
    getVncUrl,
    forceAuthenticate,
  };
}

/** Lightweight hook for auth check only */
export function useChartinkAuthStatus(): { isAuthenticated: boolean; loading: boolean } {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chartinkAuthService
      .getAuthStatus()
      .then((res) => setIsAuthenticated(res?.success && res?.status?.authenticated === true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  return { isAuthenticated, loading };
}
