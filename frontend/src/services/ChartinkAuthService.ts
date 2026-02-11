/**
 * Chartink Authentication Service
 * ===============================
 *
 * Integrates with Chartink Auth API (prod: 203.57.85.72:8181)
 * Endpoints: vnc-url, check, cookie/force-update
 */

import axios, { AxiosInstance } from 'axios';

/** GET /api/v1/auth/check response */
export interface ChartinkCheckStatus {
  success: boolean;
  status?: {
    authenticated: boolean;
    url?: string;
    hints?: string;
    next_action?: string;
    vnc_url?: string | null;
    query_verified?: boolean;
    query_row_count?: number;
  };
  error?: string | null;
}

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
}

export interface ChartinkAuthStatus {
  success: boolean;
  authenticated: boolean;
  status?: ChartinkCheckStatus['status'];
  error?: string | null;
}

const CHARTINK_AUTH_PREFIX = '/api/chartink';

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
        const msg = d?.detail || d?.message || err.message;
        console.error('[ChartinkAuth]', err.config?.method, err.config?.url, err.response?.status, msg);
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

  /** GET /api/v1/auth/check - Authentication status */
  async getAuthStatus(): Promise<ChartinkCheckStatus> {
    const res = await this.api.get(`${CHARTINK_AUTH_PREFIX}/check`);
    return res.data;
  }

  /** GET /api/v1/auth/vnc-url - Get VNC login URL (always from API) */
  async getVncUrl(): Promise<ChartinkVncUrlResponse> {
    const res = await this.api.get(`${CHARTINK_AUTH_PREFIX}/vnc-url`);
    return res.data;
  }

  /** POST /api/v1/auth/cookie/force-update - Force authenticate via VNC */
  async forceAuthenticate(): Promise<ChartinkForceUpdateResponse> {
    const res = await this.api.post(`${CHARTINK_AUTH_PREFIX}/cookie/force-update`, {
      method: 'vnc',
    });
    return res.data;
  }
}

export const chartinkAuthService = ChartinkAuthService.getInstance();
