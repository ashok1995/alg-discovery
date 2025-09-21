/**
 * Chartink Authentication Service
 * ===============================
 * 
 * Service for managing Chartink authentication on port 8181
 * Provides session status and browser login functionality
 */

import axios, { AxiosInstance } from 'axios';
import { API_CONFIG } from '../config/api';

export interface ChartinkAuthStatus {
  success: boolean;
  session_working: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'error';
  health_score: number;
  message: string;
  details?: {
    endpoint_used: string;
    data_count: number;
    response_time_ms: number;
    http_status: number;
  };
  actions?: {
    login_browser: string;
    trigger_login: string;
    clear_session: string;
  };
  timestamp: number;
}

export interface ChartinkLoginResponse {
  success: boolean;
  message: string;
  status: string;
  login_time_seconds?: number;
  action: string;
  error?: string;
}

export interface ChartinkHealthResponse {
  ok: boolean;
}

class ChartinkAuthService {
  private static instance: ChartinkAuthService;
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
      // Add CORS handling
      withCredentials: false,
    });

    // Add request logging
    this.api.interceptors.request.use(
      (config) => {
        console.log(`🔐 [ChartinkAuth] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ [ChartinkAuth] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response logging
    this.api.interceptors.response.use(
      (response) => {
        console.log(`✅ [ChartinkAuth] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ [ChartinkAuth] Response error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  static getInstance(): ChartinkAuthService {
    if (!ChartinkAuthService.instance) {
      ChartinkAuthService.instance = new ChartinkAuthService();
    }
    return ChartinkAuthService.instance;
  }

  /**
   * Get authentication session status
   */
  async getSessionStatus(): Promise<ChartinkAuthStatus> {
    try {
      const response = await this.api.get('/api/chartink/session-status');
      return response.data;
    } catch (error) {
      console.error('❌ [ChartinkAuth] Session status failed:', error);
      throw this.handleError(error, 'session status check');
    }
  }

  /**
   * Trigger browser login (opens actual browser for manual login)
   */
  async triggerBrowserLogin(): Promise<ChartinkLoginResponse> {
    try {
      // Use the trigger-login endpoint which opens browser for manual login
      const response = await this.api.post('/api/chartink/trigger-login');
      return response.data;
    } catch (error) {
      console.error('❌ [ChartinkAuth] Browser login failed:', error);
      throw this.handleError(error, 'browser login');
    }
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<ChartinkHealthResponse> {
    try {
      // Use direct call for health check since it's not under /api/v1/auth
      const response = await axios.get('http://localhost:8081/health', { timeout: 10000 });
      return response.data;
    } catch (error) {
      console.error('❌ [ChartinkAuth] Health check failed:', error);
      throw this.handleError(error, 'health check');
    }
  }

  /**
   * Clear authentication session
   */
  async clearSession(): Promise<any> {
    try {
      const response = await this.api.post('/api/chartink/clear');
      return response.data;
    } catch (error) {
      console.error('❌ [ChartinkAuth] Clear session failed:', error);
      throw this.handleError(error, 'clear session');
    }
  }

  /**
   * Get authentication actions
   */
  async getAuthActions(): Promise<any> {
    try {
      const response = await this.api.get('/api/chartink/status');
      return response.data;
    } catch (error) {
      console.error('❌ [ChartinkAuth] Get auth actions failed:', error);
      throw this.handleError(error, 'get auth actions');
    }
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    return {
      name: 'Chartink Authentication Service',
      baseUrl: API_CONFIG.CHARTINK_AUTH_BASE_URL,
      endpoints: {
        SESSION_STATUS: '/api/v1/auth/session-status',
        BROWSER_LOGIN: '/api/v1/auth/browser-login',
        HEALTH: '/health',
        CLEAR_SESSION: '/api/v1/auth/clear',
        AUTH_STATUS: '/api/v1/auth/status'
      },
      features: [
        'Browser-based Authentication',
        'Session Status Monitoring',
        'Auto-refresh Capabilities',
        'Real-time Health Checking'
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
      return new Error(`Chartink Auth ${operation} failed (${status}): ${data?.detail || data?.message || 'Unknown error'}`);
    } else if (error.request) {
      return new Error(`Chartink Auth ${operation} failed: No response from server`);
    } else {
      return new Error(`Chartink Auth ${operation} failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const chartinkAuthService = ChartinkAuthService.getInstance();
