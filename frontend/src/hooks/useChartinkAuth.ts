/**
 * useChartinkAuth Hook
 * ====================
 *
 * React hook for Chartink auth (35.232.205.155:8181: session-status, vnc-url, force-update)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  chartinkAuthService,
  type ChartinkSessionStatus,
  type ChartinkForceUpdateResponse,
} from '../services/ChartinkAuthService';

interface UseChartinkAuthReturn {
  sessionStatus: ChartinkSessionStatus | null;
  loading: boolean;
  error: string | null;
  refreshStatus: () => Promise<void>;
  clearError: () => void;
  isAuthenticated: boolean;
  getVncUrl: () => Promise<string | null>;
  forceAuthenticate: () => Promise<ChartinkForceUpdateResponse | null>;
  clearSession: () => Promise<boolean>;
}

export function useChartinkAuth(autoRefreshInterval = 60000): UseChartinkAuthReturn {
  const [sessionStatus, setSessionStatus] = useState<ChartinkSessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await chartinkAuthService.getSessionStatus();
      setSessionStatus(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Session status failed');
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

  const clearSession = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      await chartinkAuthService.clearSession();
      await refreshStatus();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clear session failed');
      return false;
    }
  }, [refreshStatus]);

  useEffect(() => {
    refreshStatus();
    if (autoRefreshInterval > 0) {
      const id = setInterval(refreshStatus, autoRefreshInterval);
      return () => clearInterval(id);
    }
  }, [refreshStatus, autoRefreshInterval]);

  const isAuthenticated = Boolean(
    sessionStatus?.authenticated === true || sessionStatus?.session_working === true
  );

  return {
    sessionStatus,
    loading,
    error,
    refreshStatus,
    clearError: () => setError(null),
    isAuthenticated,
    getVncUrl,
    forceAuthenticate,
    clearSession,
  };
}

/** Lightweight hook for auth check only */
export function useChartinkAuthStatus(): { isAuthenticated: boolean; loading: boolean } {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chartinkAuthService
      .getSessionStatus()
      .then((res) => setIsAuthenticated(res?.authenticated === true || res?.session_working === true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  return { isAuthenticated, loading };
}
