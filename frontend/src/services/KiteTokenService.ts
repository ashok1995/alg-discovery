/**
 * Kite Token Management Service
 * =============================
 * 
 * Complete token management including request token to access token conversion
 * Integrates with the token refresh API on port 8079
 */

import axios, { AxiosInstance } from 'axios';

export interface TokenStatus {
  kite_token_valid: boolean;
  needs_refresh: boolean;
  last_checked?: string;
  kite_token_expires_at?: string | null;
  kite_token_masked?: string;
  yahoo_finance_available?: boolean;
  user_id?: string;
  user_name?: string;
  email?: string;
  // Computed properties for compatibility
  is_valid: boolean;
  last_updated?: string;
  expires_at?: string;
}

export interface TokenRefreshInfo {
  login_url: string;
  callback_url: string;
  api_key: string;
  instructions: string[];
}

export interface AccessTokenResponse {
  success: boolean;
  access_token?: string;
  user_id?: string;
  user_name?: string;
  user_shortname?: string;
  email?: string;
  user_type?: string;
  broker?: string;
  exchanges?: string[];
  products?: string[];
  order_types?: string[];
  message?: string;
  instructions?: string;
  error?: string;
}

export interface CredentialStatus {
  has_credentials: boolean;
  api_key_configured: boolean;
  api_secret_configured: boolean;
  missing_credentials?: string[];
}

class KiteTokenService {
  private static instance: KiteTokenService;
  private api: AxiosInstance;

  private constructor() {
    // Use proxy endpoints for CORS compatibility
    const baseURL = '';

    this.api = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request logging
    this.api.interceptors.request.use(
      (config) => {
        console.log(`🔐 [KiteToken] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ [KiteToken] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response logging
    this.api.interceptors.response.use(
      (response) => {
        console.log(`✅ [KiteToken] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ [KiteToken] Response error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  static getInstance(): KiteTokenService {
    if (!KiteTokenService.instance) {
      KiteTokenService.instance = new KiteTokenService();
    }
    return KiteTokenService.instance;
  }

  /**
   * Check current token status
   */
  async getTokenStatus(): Promise<TokenStatus> {
    try {
      const response = await this.api.get('/api/token/status');
      const data = response.data;
      
      // Transform response to match our interface
      return {
        ...data,
        kite_token_valid: data.token_valid || data.kite_token_valid, // Handle both backend formats
        kite_token_masked: data.token_masked || data.kite_token_masked,
        is_valid: data.token_valid || data.kite_token_valid,
        last_updated: data.last_checked,
        expires_at: data.kite_token_expires_at
      };
    } catch (error) {
      console.error('❌ [KiteToken] Token status failed:', error);
      throw this.handleError(error, 'token status check');
    }
  }

  /**
   * Get refresh information including login URL
   */
  async getRefreshInfo(): Promise<TokenRefreshInfo> {
    try {
      const response = await this.api.get('/api/token/refresh-info');
      const data = response.data;
      
      // Transform API response to match our interface
      return {
        login_url: data.step_1?.login_url || '',
        callback_url: 'http://localhost:8079/auth/callback', // Default callback URL
        api_key: data.api_key || '',
        instructions: data.step_1?.instructions ? [data.step_1.instructions] : []
      };
    } catch (error) {
      console.error('❌ [KiteToken] Refresh info failed:', error);
      throw this.handleError(error, 'refresh info');
    }
  }

  /**
   * Get callback URL for Kite Connect app
   */
  async getCallbackUrl(): Promise<{ callback_url: string }> {
    try {
      const response = await this.api.get('/api/token/callback-url');
      return response.data;
    } catch (error) {
      console.error('❌ [KiteToken] Callback URL failed:', error);
      throw this.handleError(error, 'callback URL');
    }
  }

  /**
   * Convert request token to access token (THE KEY METHOD)
   */
  async generateAccessToken(requestToken: string): Promise<AccessTokenResponse> {
    try {
      const response = await this.api.post('/api/token/submit-token', {
        request_token: requestToken
      });
      return response.data;
    } catch (error) {
      console.error('❌ [KiteToken] Access token generation failed:', error);
      throw this.handleError(error, 'access token generation');
    }
  }

  /**
   * Extract request token from callback URL
   */
  extractRequestTokenFromUrl(callbackUrl: string): string | null {
    try {
      const url = new URL(callbackUrl);
      return url.searchParams.get('request_token');
    } catch (error) {
      console.error('❌ [KiteToken] Invalid callback URL:', error);
      return null;
    }
  }

  /**
   * Complete token refresh flow from callback URL
   */
  async completeTokenRefresh(callbackUrl: string): Promise<AccessTokenResponse> {
    // Step 1: Extract request token
    const requestToken = this.extractRequestTokenFromUrl(callbackUrl);
    
    if (!requestToken) {
      throw new Error('No request token found in callback URL');
    }

    console.log('🎯 [KiteToken] Extracted request token:', requestToken);

    // Step 2: Convert to access token
    return await this.generateAccessToken(requestToken);
  }

  /**
   * Check credential status
   */
  async getCredentialStatus(): Promise<CredentialStatus> {
    try {
      const response = await this.api.get('/api/credentials/status');
      return response.data;
    } catch (error) {
      console.error('❌ [KiteToken] Credential status failed:', error);
      throw this.handleError(error, 'credential status');
    }
  }

  /**
   * Clear current token
   */
  async clearToken(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.api.delete('/api/token/clear');
      return response.data;
    } catch (error) {
      console.error('❌ [KiteToken] Clear token failed:', error);
      throw this.handleError(error, 'clear token');
    }
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    const isProduction = process.env.NODE_ENV === 'production' || 
                        process.env.REACT_APP_NODE_ENV === 'production' ||
                        (typeof window !== 'undefined' && window.location.hostname !== 'localhost');
    
    return {
      name: 'Kite Token Management Service',
      baseUrl: isProduction ? 'http://algodiscovery.com:8079' : 'http://localhost:8079',
      endpoints: {
        TOKEN_STATUS: '/api/token/status',
        REFRESH_INFO: '/api/token/refresh-info',
        CALLBACK_URL: '/api/token/callback-url',
        SUBMIT_TOKEN: '/api/token/submit-token',
        CREDENTIAL_STATUS: '/api/credentials/status',
        CLEAR_TOKEN: '/api/token/clear'
      },
      features: [
        'Request Token to Access Token Conversion',
        'Automatic Token Expiry Detection',
        'OAuth Flow Management',
        'Credential Status Monitoring'
      ]
    };
  }

  /**
   * Handle API errors consistently
   */
  private handleError(error: any, operation: string): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      return new Error(`Kite Token ${operation} failed (${status}): ${data?.detail || data?.message || 'Unknown error'}`);
    } else if (error.request) {
      return new Error(`Kite Token ${operation} failed: No response from server`);
    } else {
      return new Error(`Kite Token ${operation} failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const kiteTokenService = KiteTokenService.getInstance();
