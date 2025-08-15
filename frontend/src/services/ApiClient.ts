/**
 * Centralized API client with comprehensive logging
 * Handles all API requests with proper error handling and logging
 */

import { API_CONFIG, getApiUrl, logApiRequest, logApiResponse } from '../config/api';
import { getMetaHeaders } from '../utils/meta';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
  requestId: string;
  duration: number;
}

class ApiClient {
  private static instance: ApiClient;
  private activeRequests = new Map<string, AbortController>();

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  async request<T = any>(
    endpoint: string, 
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      payload,
      headers = {},
      timeout = API_CONFIG.REQUEST.TIMEOUT,
      retryAttempts = API_CONFIG.REQUEST.RETRY_ATTEMPTS
    } = options;

    const url = getApiUrl(endpoint);
    const requestId = logApiRequest(method, url, payload);
    const startTime = Date.now();

    // Create abort controller for this request
    const abortController = new AbortController();
    this.activeRequests.set(requestId, abortController);

    try {
      const response = await this.makeRequest(url, {
        method,
        payload,
        headers: {
          ...getMetaHeaders(),
          ...headers,
        },
        timeout,
        signal: abortController.signal
      });

      const duration = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        logApiResponse(requestId, response.status, data, null, duration);
        
        return {
          success: true,
          data,
          status: response.status,
          requestId,
          duration
        };
      } else {
        const errorText = await response.text();
        const errorMessage = `HTTP ${response.status}: ${errorText}`;
        logApiResponse(requestId, response.status, null, errorMessage, duration);
        
        return {
          success: false,
          error: errorMessage,
          status: response.status,
          requestId,
          duration
        };
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      if (error.name === 'AbortError') {
        logApiResponse(requestId, 0, null, 'Request aborted', duration);
        return {
          success: false,
          error: 'Request was cancelled',
          status: 0,
          requestId,
          duration
        };
      }

      // Retry logic for network errors
      if (retryAttempts > 0 && this.isRetryableError(error)) {
        console.log(`🔄 [${new Date().toISOString()}] Retrying request ${requestId} (${retryAttempts} attempts left)`);
        await this.delay(API_CONFIG.REQUEST.RETRY_DELAY);
        
        return this.request(endpoint, {
          ...options,
          retryAttempts: retryAttempts - 1
        });
      }

      logApiResponse(requestId, 0, null, error, duration);
      
      return {
        success: false,
        error: error.message || 'Network error',
        status: 0,
        requestId,
        duration
      };
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  private async makeRequest(url: string, options: {
    method: string;
    payload?: any;
    headers: Record<string, string>;
    timeout: number;
    signal: AbortSignal;
  }): Promise<Response> {
    const { method, payload, headers, timeout, signal } = options;

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal
    };

    if (payload && method !== 'GET') {
      fetchOptions.body = JSON.stringify(payload);
    }

    // Add timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout);
    });

    return Promise.race([
      fetch(url, fetchOptions),
      timeoutPromise
    ]);
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors, not on HTTP errors
    return error.code === 'ECONNREFUSED' || 
           error.code === 'ENOTFOUND' || 
           error.code === 'ETIMEDOUT' ||
           error.message.includes('fetch');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cancel all active requests
  cancelAllRequests(): void {
    console.log(`🛑 [${new Date().toISOString()}] Cancelling ${this.activeRequests.size} active requests`);
    
    Array.from(this.activeRequests.entries()).forEach(([requestId, controller]) => {
      controller.abort();
      console.log(`🛑 Cancelled request: ${requestId}`);
    });
    
    this.activeRequests.clear();
  }

  // Get active request count
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }
}

export default ApiClient;