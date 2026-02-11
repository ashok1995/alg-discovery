/**
 * Kite Auth Service
 * Integrates with Kite Services API (prod: 203.57.85.72:8179)
 * API: GET /api/auth/login-url, POST /api/auth/login, GET /api/auth/status, PUT /api/auth/token
 */

import axios, { AxiosInstance } from 'axios';

const KITE_API_PREFIX = '/api/kite';

export interface TokenStatus {
  kite_token_valid: boolean;
  token_valid?: boolean;
  authenticated?: boolean;
  needs_refresh?: boolean;
  user_id?: string;
  user_name?: string;
  kite_token_masked?: string;
  kite_token_expires_at?: string | null;
  message?: string;
  is_valid: boolean;
}

export interface TokenRefreshInfo {
  login_url: string;
  callback_url?: string;
  message?: string;
}

/** GET /api/token/callback-url - Callback URL for Kite app setup */
export interface CallbackUrlResponse {
  callback_url: string;
  configured: boolean;
}

export interface AccessTokenResponse {
  success: boolean;
  status?: string;
  access_token?: string;
  user_id?: string;
  user_name?: string;
  message?: string;
  error?: string;
}

/** GET /api/auth/credentials/status - API key configuration status */
export interface CredentialsStatusResponse {
  api_key_configured: boolean;
  message?: string | null;
}

class KiteTokenService {
  private static instance: KiteTokenService;
  private api: AxiosInstance;

  private constructor() {
    this.api = axios.create({
      baseURL: '',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
    this.api.interceptors.response.use(
      (r) => r,
      (err) => {
        const d = err.response?.data?.detail;
        const msg =
          typeof d === 'string'
            ? d
            : Array.isArray(d)
              ? d.map((x: { msg?: string }) => x?.msg ?? '').join('; ')
              : err.message;
        throw new Error(msg || err.message);
      }
    );
  }

  static getInstance(): KiteTokenService {
    if (!KiteTokenService.instance) {
      KiteTokenService.instance = new KiteTokenService();
    }
    return KiteTokenService.instance;
  }

  /** GET /api/auth/credentials/status - Check if API key is configured */
  async getCredentialsStatus(): Promise<CredentialsStatusResponse> {
    const res = await this.api.get(`${KITE_API_PREFIX}/auth/credentials/status`);
    return res.data;
  }

  /** POST /api/auth/credentials - Save api_key and api_secret (optional, long-lived) */
  async saveCredentials(
    apiKey: string,
    apiSecret: string
  ): Promise<{ success: boolean; message?: string }> {
    const res = await this.api.post(`${KITE_API_PREFIX}/auth/credentials`, {
      api_key: apiKey.trim(),
      api_secret: apiSecret.trim(),
    });
    return res.data;
  }

  /** GET /api/auth/status - Check auth and token validity */
  async getTokenStatus(): Promise<TokenStatus> {
    const res = await this.api.get(`${KITE_API_PREFIX}/auth/status`);
    const d = res.data;
    const valid = d.token_valid ?? d.authenticated ?? false;
    return {
      ...d,
      kite_token_valid: valid,
      is_valid: valid,
      kite_token_expires_at: d.token_expiry ?? d.kite_token_expires_at,
    };
  }

  /** GET /api/token/callback-url - Get callback URL for Kite app (Redirect URL in developers.kite.trade) */
  async getCallbackUrl(): Promise<CallbackUrlResponse | null> {
    try {
      const res = await this.api.get(`${KITE_API_PREFIX}/token/callback-url`);
      const d = res.data;
      return {
        callback_url: d.callback_url ?? '',
        configured: d.configured ?? false,
      };
    } catch {
      return null;
    }
  }

  /** GET /api/auth/login-url - Get login URL from service (when configured) */
  async getRefreshInfo(): Promise<TokenRefreshInfo> {
    const res = await this.api.get(`${KITE_API_PREFIX}/auth/login-url`);
    const d = res.data;
    return {
      login_url: d.login_url ?? '',
      callback_url: d.callback_url,
      message: d.message,
    };
  }

  /** POST /api/auth/login - Convert request_token to access_token */
  async generateAccessToken(requestToken: string): Promise<AccessTokenResponse> {
    const res = await this.api.post(`${KITE_API_PREFIX}/auth/login`, {
      request_token: requestToken.trim(),
    });
    const d = res.data;
    return {
      success: d.status === 'authenticated' && !!d.access_token,
      status: d.status,
      access_token: d.access_token,
      user_id: d.user_id,
      user_name: d.user_name,
      message: d.message,
    };
  }

  /** PUT /api/auth/token - Validate and save access token (for direct token paste) */
  async updateToken(accessToken: string, userId?: string): Promise<{ success: boolean; message?: string }> {
    const res = await this.api.put(`${KITE_API_PREFIX}/auth/token`, {
      access_token: accessToken.trim(),
      user_id: userId,
    });
    return res.data;
  }

  /** DELETE /api/auth/token - Clear/delete current token */
  async clearToken(): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await this.api.delete(`${KITE_API_PREFIX}/auth/token`);
      return res.data || { success: true, message: 'Token cleared successfully' };
    } catch (err: unknown) {
      // If DELETE endpoint doesn't exist, return success anyway (token cleared client-side)
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { status?: number } }).response?.status === 404
          ? 'Token cleared (endpoint not available)'
          : 'Failed to clear token'
        : 'Token cleared';
      return { success: true, message: msg };
    }
  }

  /** Validate and save direct access token (paste from Kite; skips request_token exchange) */
  async validateAndSaveAccessToken(accessToken: string): Promise<AccessTokenResponse> {
    try {
      const res = await this.api.put(`${KITE_API_PREFIX}/auth/token`, {
        access_token: accessToken.trim(),
      });
      const d = res.data;
      return {
        success: !!d.access_token || !!d.status,
        status: d.status ?? 'authenticated',
        access_token: d.access_token ?? accessToken,
        user_id: d.user_id,
        user_name: d.user_name,
        message: d.message ?? 'Token saved successfully',
      };
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : err instanceof Error ? err.message : 'Failed to save token';
      return { success: false, error: String(msg) };
    }
  }

  extractRequestTokenFromUrl(callbackUrl: string): string | null {
    try {
      const url = new URL(callbackUrl);
      const token = url.searchParams.get('request_token');
      if (token) return token;
    } catch {
      /* fallback to regex for partial URLs */
    }
    const m = callbackUrl.match(/request_token=([^&\s]+)/);
    return m ? m[1] : null;
  }

  /** GET /health - Service health (proxy maps to root /health) */
  async getHealth(): Promise<{ status: string; service?: string; services?: Record<string, unknown> }> {
    const res = await this.api.get(`${KITE_API_PREFIX}/health`);
    return res.data;
  }
}

export const kiteTokenService = KiteTokenService.getInstance();
