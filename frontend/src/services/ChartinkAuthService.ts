/**
 * Query execution auth client (proxied as /api/chartink → /api/v1/auth).
 * Backend host unchanged (e.g. prod 35.232.205.155:8181).
 * Endpoints: session-status, vnc-url, cookie/force-update, cookie/status, clear, health.
 */

import axios, { AxiosInstance } from 'axios';

const CHARTINK_AUTH_PREFIX = '/api/chartink';

/** GET /api/v1/auth/session-status - Unified auth/session status (aliases: check, status) */
export interface ChartinkSessionStatus {
  success?: boolean;
  authenticated: boolean;
  session_working?: boolean;
  vnc_url?: string | null;
  next_action?: 'open_vnc' | 'poll_status' | 'none';
  query_verified?: boolean;
  query_row_count?: number;
  last_authenticated_at?: string | null;
  hints?: string;
  status?: string;
  error?: string | null;
  [key: string]: unknown;
}

/** Legacy alias for compatibility */
export type ChartinkCheckStatus = ChartinkSessionStatus & { status?: { authenticated: boolean; vnc_url?: string | null; next_action?: string; query_verified?: boolean; query_row_count?: number } };

/** GET /api/v1/auth/vnc-url response */
export interface ChartinkVncUrlResponse {
  success: boolean;
  vnc_url?: string;
  message?: string;
}

/** POST /api/v1/auth/cookie/force-update response */
export interface ChartinkForceUpdateResponse {
  success?: boolean;
  message?: string;
  error?: string;
  next_action?: 'open_vnc' | 'poll_status' | 'none';
  vnc_url?: string | null;
}

/** GET /api/v1/auth/cookie/status response */
export interface ChartinkCookieStatus {
  success?: boolean;
  age_seconds?: number;
  expires_at?: string;
  exists?: boolean;
  [key: string]: unknown;
}

/** Normalize session-status response to a consistent shape */
function normalizeSessionStatus(data: Record<string, unknown>): ChartinkSessionStatus {
  const s = data.status as Record<string, unknown> | undefined;
  return {
    success: data.success as boolean | undefined ?? true,
    authenticated: (data.authenticated ?? s?.authenticated) as boolean ?? false,
    session_working: (data.session_working ?? s?.session_working) as boolean | undefined,
    vnc_url: (data.vnc_url ?? s?.vnc_url) as string | null | undefined,
    next_action: (data.next_action ?? s?.next_action) as ChartinkSessionStatus['next_action'],
    query_verified: (data.query_verified ?? s?.query_verified) as boolean | undefined,
    query_row_count: (data.query_row_count ?? s?.query_row_count) as number | undefined,
    last_authenticated_at: (data.last_authenticated_at ?? s?.last_authenticated_at) as string | null | undefined,
    hints: (data.hints ?? s?.hints) as string | undefined,
    status: (data.status as string) ?? (s as { status?: string } | undefined)?.status,
    error: (data.error ?? s?.error) as string | null | undefined,
  };
}

class ChartinkAuthService {
  private static instance: ChartinkAuthService;
  private api: AxiosInstance;

  private constructor() {
    this.api = axios.create({
      baseURL: '',
      timeout: 60000, // force-update can take a while
      headers: { 'Content-Type': 'application/json' },
    });

    this.api.interceptors.response.use(
      (r) => r,
      (err) => {
        const d = err.response?.data;
        const msg = (d?.detail as string) ?? (d?.message as string) ?? err.message;
        console.error('[QueryExecutionAuth]', err.config?.method, err.config?.url, err.response?.status, msg);
        return Promise.reject(err);
      }
    );
  }

  static getInstance(): ChartinkAuthService {
    if (!ChartinkAuthService.instance) {
      ChartinkAuthService.instance = new ChartinkAuthService();
    }
    return ChartinkAuthService.instance;
  }

  /** GET /api/v1/auth/session-status - Unified auth/session status (primary endpoint) */
  async getSessionStatus(): Promise<ChartinkSessionStatus> {
    const res = await this.api.get(`${CHARTINK_AUTH_PREFIX}/session-status`);
    return normalizeSessionStatus(res.data as Record<string, unknown>);
  }

  /** Alias for getSessionStatus - check/status are aliases on backend */
  async getAuthStatus(): Promise<ChartinkSessionStatus> {
    return this.getSessionStatus();
  }

  /** GET /health - Quick service health check (proxied via /api/chartink-health) */
  async getHealth(): Promise<{ ok: boolean }> {
    const res = await this.api.get('/api/chartink-health');
    return res.data as { ok: boolean };
  }

  /** GET /api/v1/auth/vnc-url - Get VNC login URL */
  async getVncUrl(): Promise<ChartinkVncUrlResponse> {
    const res = await this.api.get(`${CHARTINK_AUTH_PREFIX}/vnc-url`);
    return res.data;
  }

  /** POST /api/v1/auth/cookie/force-update - Force authenticate via VNC (primary for web app) */
  async forceAuthenticate(): Promise<ChartinkForceUpdateResponse> {
    const res = await this.api.post(`${CHARTINK_AUTH_PREFIX}/cookie/force-update`, {});
    return res.data;
  }

  /** GET /api/v1/auth/cookie/status - Cookie metadata and age */
  async getCookieStatus(): Promise<ChartinkCookieStatus> {
    const res = await this.api.get(`${CHARTINK_AUTH_PREFIX}/cookie/status`);
    return res.data;
  }

  /** POST /api/v1/auth/clear - Clear session (logout) */
  async clearSession(): Promise<{ success?: boolean; message?: string }> {
    const res = await this.api.post(`${CHARTINK_AUTH_PREFIX}/clear`, {});
    return res.data;
  }
}

export const chartinkAuthService = ChartinkAuthService.getInstance();
