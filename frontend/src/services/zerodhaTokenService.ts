/**
 * Zerodha Token Management Service
 * 
 * Service for managing Zerodha access tokens through the UI.
 * Integrated with main API management system.
 */

import { API_CONFIG, getServiceUrl } from '../config/api';

export interface TokenStatus {
  has_token: boolean;
  token_file_exists: boolean;
  last_updated?: string;
  is_valid: boolean;
  user_info?: {
    user_name?: string;
    user_id?: string;
    email?: string;
    broker?: string;
  };
}

export interface LoginUrlResponse {
  login_url: string;
  api_key: string;
}

export interface TokenValidationResponse {
  is_valid: boolean;
  user_info?: {
    user_name?: string;
    user_id?: string;
    email?: string;
    broker?: string;
  };
  error?: string;
}

export interface TokenInstructions {
  steps: Array<{
    step: number;
    title: string;
    description: string;
    action: string;
  }>;
  notes: string[];
}

export interface CredentialStatus {
  api_key: string;
  api_secret_configured: boolean;
  api_key_valid: boolean;
  credentials_file_exists: boolean;
}

export interface CredentialTestResult {
  success: boolean;
  api_key: {
    valid: boolean;
    error?: string;
  };
  api_secret: {
    valid: boolean;
    error?: string;
  };
  overall_status: 'valid' | 'invalid';
}

export interface AllZerodhaData {
  common_data_directory: string;
  credentials: {
    file_exists: boolean;
    file_path: string;
    data: {
      api_key: string;
      api_secret_configured: boolean;
      updated_at?: string;
    };
  };
  token: {
    file_exists: boolean;
    file_path: string;
    data: {
      has_token: boolean;
      is_valid: boolean;
      user_info: any;
      updated_at?: string;
    };
  };
  current_config: {
    api_key: string;
    api_secret_configured: boolean;
    token_file: string;
  };
}

class ZerodhaTokenService {
  // Integrated with Zerodha container running on configured port
  private baseUrl = `${getServiceUrl(API_CONFIG.PORTS.ZERODHA_API)}/api/zerodha/token`;

  /**
   * Get current token status
   */
  async getTokenStatus(): Promise<TokenStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/zerodha/token/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting token status:', error);
      throw error;
    }
  }

  /**
   * Generate login URL for Zerodha authentication
   */
  async generateLoginUrl(): Promise<LoginUrlResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/zerodha/token/login-url`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error generating login URL:', error);
      throw error;
    }
  }

  /**
   * Update access token
   */
  async updateAccessToken(accessToken: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/zerodha/token/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: accessToken }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating access token:', error);
      throw error;
    }
  }

  /**
   * Validate access token without saving
   */
  async validateToken(accessToken: string): Promise<TokenValidationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/zerodha/token/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: accessToken }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error validating token:', error);
      throw error;
    }
  }

  /**
   * Generate token from callback URL
   */
  async generateTokenFromCallback(callbackUrl: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/zerodha/token/generate-from-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callback_url: callbackUrl }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error generating token from callback:', error);
      throw error;
    }
  }

  /**
   * Delete access token
   */
  async deleteToken(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/zerodha/token`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting token:', error);
      throw error;
    }
  }

  /**
   * Get token generation instructions
   */
  async getInstructions(): Promise<TokenInstructions> {
    try {
      const response = await fetch(`${this.baseUrl}/api/zerodha/token/instructions`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting instructions:', error);
      throw error;
    }
  }

  /**
   * Get credentials status
   */
  async getCredentialsStatus(): Promise<CredentialStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/credentials/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting credentials status:', error);
      throw error;
    }
  }

  /**
   * Update API credentials
   */
  async updateCredentials(apiKey: string, apiSecret: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/credentials/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ api_key: apiKey, api_secret: apiSecret }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating credentials:', error);
      throw error;
    }
  }

  /**
   * Test API credentials
   */
  async testCredentials(): Promise<CredentialTestResult> {
    try {
      const response = await fetch(`${this.baseUrl}/credentials/test`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error testing credentials:', error);
      throw error;
    }
  }

  /**
   * Get partner service status
   */
  async getPartnerServiceStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/partner/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting partner service status:', error);
      throw error;
    }
  }

  /**
   * Test Kite (Zerodha) service
   */
  async testKite(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/partner/test/kite`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error testing Kite service:', error);
      throw error;
    }
  }

  /**
   * Test Chartink service
   */
  async testChartink(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/partner/test/chartink`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error testing Chartink service:', error);
      throw error;
    }
  }

  /**
   * Test Yahoo Finance service
   */
  async testYahooFinance(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/partner/test/yahoo-finance`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error testing Yahoo Finance service:', error);
      throw error;
    }
  }

  /**
   * Get all Zerodha data from common file location
   */
  async getAllZerodhaData(): Promise<AllZerodhaData> {
    try {
      const response = await fetch(`${this.baseUrl}/data/all`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting all Zerodha data:', error);
      throw error;
    }
  }

  /**
   * Update all Zerodha data in common file location
   */
  async updateAllZerodhaData(data: {
    api_key?: string;
    api_secret?: string;
    access_token?: string;
  }): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/data/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating all Zerodha data:', error);
      throw error;
    }
  }

  /**
   * Extract request token from callback URL
   */
  extractRequestTokenFromUrl(callbackUrl: string): string | null {
    try {
      const url = new URL(callbackUrl);
      const params = new URLSearchParams(url.search);
      const requestToken = params.get('request_token');
      
      if (!requestToken) {
        // Try fragment parameters
        const fragmentParams = new URLSearchParams(url.hash.substring(1));
        return fragmentParams.get('request_token');
      }
      
      return requestToken;
    } catch (error) {
      console.error('Error extracting request token:', error);
      return null;
    }
  }

  /**
   * Open login URL in new window/tab
   */
  openLoginUrl(loginUrl: string): void {
    window.open(loginUrl, '_blank', 'width=800,height=600');
  }
}

// Export singleton instance
export const zerodhaTokenService = new ZerodhaTokenService(); 