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
      console.log('Backend not available, trying to read from local files');
      // Try to read from local files when backend is not available
      try {
        const tokenData = await this.readLocalTokenFile();
        return tokenData;
      } catch (fileError) {
        console.log('Could not read local token file, returning default status');
        return {
          has_token: false,
          token_file_exists: false,
          last_updated: undefined,
          is_valid: false,
          user_info: undefined
        };
      }
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
  async updateCredentials(apiKey: string, apiSecret: string, forceRefresh: boolean = false): Promise<any> {
    try {
      const payload: any = { 
        api_key: apiKey, 
        api_secret: apiSecret 
      };
      
      if (forceRefresh) {
        payload.force_refresh = true;
      }
      
      const response = await fetch(`${this.baseUrl}/credentials/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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

  /**
   * Automated token refresh using stored credentials
   * This initiates the OAuth flow to get a new access token
   */
  async refreshTokenAutomatically(): Promise<{
    success: boolean;
    token_refreshed?: boolean;
    token_valid?: boolean;
    error?: string;
    message?: string;
  }> {
    try {
      // First, get the login URL to initiate OAuth flow
      const loginUrlResponse = await this.generateLoginUrl();
      
      if (!loginUrlResponse?.login_url) {
        return {
          success: false,
          error: 'Failed to generate login URL'
        };
      }
      
      const loginUrl = loginUrlResponse.login_url;

      // Open the login URL in a popup window
      const popup = window.open(loginUrl, 'kite_login', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      if (!popup) {
        return {
          success: false,
          error: 'Popup blocked. Please allow popups and try again.'
        };
      }

      // Wait for the callback and extract the access token
      const tokenResult = await this.waitForCallback(popup);
      
      if (tokenResult.success) {
        return {
          success: true,
          token_refreshed: true,
          message: 'Token refreshed successfully via OAuth flow'
        };
      } else {
        return {
          success: false,
          error: tokenResult.error || 'Failed to get access token from callback'
        };
      }
    } catch (error) {
      console.error('Error in automated token refresh:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to refresh token automatically' 
      };
    }
  }

  /**
   * Force token refresh even if current token seems valid
   * This bypasses token validation and forces a refresh
   */
  async forceTokenRefresh(): Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }> {
    try {
      // Force refresh always goes through OAuth flow
      const result = await this.refreshTokenAutomatically();
      
      if (result.success) {
        return {
          success: true,
          message: 'Token force refreshed successfully via OAuth'
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to force refresh token'
        };
      }
    } catch (error) {
      console.error('Error in force token refresh:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to force refresh token' 
      };
    }
  }

  /**
   * Wait for OAuth callback and extract access token
   */
  private async waitForCallback(popup: Window): Promise<{
    success: boolean;
    access_token?: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          resolve({
            success: false,
            error: 'Login popup was closed without completing authentication'
          });
        }
      }, 1000);

      // Listen for message from popup (if using postMessage)
      const messageHandler = (event: MessageEvent) => {
        if (event.data && event.data.type === 'KITE_TOKEN_RECEIVED') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          
          if (event.data.access_token) {
            // Store the token
            this.storeAccessToken(event.data.access_token);
            resolve({
              success: true,
              access_token: event.data.access_token
            });
          } else {
            resolve({
              success: false,
              error: 'No access token received in callback'
            });
          }
        }
      };

      window.addEventListener('message', messageHandler);

      // Alternative: Check URL for callback parameters
      const checkUrl = setInterval(() => {
        try {
          if (popup.location.href.includes('request_token=') || popup.location.href.includes('access_token=')) {
            clearInterval(checkUrl);
            clearInterval(checkClosed);
            
            const url = new URL(popup.location.href);
            const requestToken = url.searchParams.get('request_token');
            const accessToken = url.searchParams.get('access_token');
            
            if (requestToken) {
              // Exchange request token for access token
              this.exchangeRequestToken(requestToken).then(result => {
                if (result.success) {
                  resolve({
                    success: true,
                    access_token: result.access_token
                  });
                } else {
                  resolve({
                    success: false,
                    error: result.error || 'Failed to exchange request token'
                  });
                }
              });
            } else if (accessToken) {
              // Direct access token received
              this.storeAccessToken(accessToken);
              resolve({
                success: true,
                access_token: accessToken
              });
            } else {
              resolve({
                success: false,
                error: 'No token found in callback URL'
              });
            }
            
            popup.close();
          }
        } catch (error) {
          // Cross-origin error, continue checking
        }
      }, 500);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkClosed);
        clearInterval(checkUrl);
        window.removeEventListener('message', messageHandler);
        popup.close();
        resolve({
          success: false,
          error: 'Authentication timeout'
        });
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Exchange request token for access token
   */
  private async exchangeRequestToken(requestToken: string): Promise<{
    success: boolean;
    access_token?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/exchange-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_token: requestToken })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.access_token) {
        this.storeAccessToken(result.access_token);
        return {
          success: true,
          access_token: result.access_token
        };
      } else {
        return {
          success: false,
          error: 'No access token in response'
        };
      }
    } catch (error) {
      console.error('Error exchanging request token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to exchange request token'
      };
    }
  }

  /**
   * Store access token locally
   */
  storeAccessToken(accessToken: string): void {
    try {
      // Store in localStorage for immediate use
      localStorage.setItem('kite_access_token', accessToken);
      
      // Also send to backend to update the token file
      this.updateTokenFile(accessToken);
    } catch (error) {
      console.error('Error storing access token:', error);
    }
  }

  /**
   * Update token file on backend
   */
  private async updateTokenFile(accessToken: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/update-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken })
      });
    } catch (error) {
      console.error('Error updating token file:', error);
    }
  }

  /**
   * Get current access token from localStorage
   */
  getCurrentAccessToken(): string | null {
    return localStorage.getItem('kite_access_token');
  }

  /**
   * Clear stored access token
   */
  clearAccessToken(): void {
    localStorage.removeItem('kite_access_token');
  }

  /**
   * Get credential status from backend
   */
  async getCredentialStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/credentials/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.log('Backend not available, trying to read from local credential files');
      // Try to read from local files when backend is not available
      try {
        const credentialData = await this.readLocalCredentialFile();
        return credentialData;
      } catch (fileError) {
        console.log('Could not read local credential file, returning default status');
        return { 
          has_credentials: false,
          api_key_valid: false 
        };
      }
    }
  }

  /**
   * Update credentials directly in local files
   */
  async updateCredentialsDirectly(apiKey: string, apiSecret: string): Promise<any> {
    try {
      // Create a simple credentials object
      const credentials = {
        api_key: apiKey,
        api_secret: apiSecret,
        updated_at: new Date().toISOString()
      };

      // Try to write to a local file using the File System Access API (modern browsers)
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: 'zerodha_credentials.json',
            types: [{
              description: 'JSON File',
              accept: { 'application/json': ['.json'] }
            }]
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(JSON.stringify(credentials, null, 2));
          await writable.close();
          
          return { success: true, message: 'Credentials saved to file successfully' };
        } catch (fileError) {
          console.log('File picker not available, falling back to download');
        }
      }

      // Fallback: Create a downloadable file
      const blob = new Blob([JSON.stringify(credentials, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zerodha_credentials.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { 
        success: true, 
        message: 'Credentials downloaded as JSON file. Please save it to your access_tokens directory.' 
      };
    } catch (error) {
      console.error('Error updating credentials directly:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update credentials' 
      };
    }
  }

  /**
   * Test credentials directly without backend
   */
  async testCredentialsDirectly(apiKey: string, apiSecret: string): Promise<any> {
    try {
      // Basic validation
      if (!apiKey || !apiSecret) {
        return { success: false, error: 'API key and secret are required' };
      }

      if (apiKey.length < 10 || apiSecret.length < 10) {
        return { success: false, error: 'API key and secret seem too short' };
      }

      // Try to generate a login URL to test credentials
      const loginUrlResponse = await this.generateLoginUrl();
      
      if (loginUrlResponse?.login_url) {
        return { 
          success: true, 
          message: 'Credentials appear valid. Login URL generated successfully.' 
        };
      } else {
        return { 
          success: false, 
          error: 'Could not generate login URL. Please check your credentials.' 
        };
      }
    } catch (error) {
      console.error('Error testing credentials directly:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to test credentials' 
      };
    }
  }

  /**
   * Load existing credentials from local file
   */
  async loadExistingCredentials(): Promise<any> {
    try {
      // Try to read from file using File System Access API
      if ('showOpenFilePicker' in window) {
        try {
          const [fileHandle] = await (window as any).showOpenFilePicker({
            types: [{
              description: 'JSON Files',
              accept: { 'application/json': ['.json'] }
            }]
          });
          
          const file = await fileHandle.getFile();
          const contents = await file.text();
          const credentials = JSON.parse(contents);
          
          return { 
            success: true, 
            credentials,
            message: 'Credentials loaded from file successfully' 
          };
        } catch (fileError) {
          console.log('File picker not available for reading');
        }
      }

      // Fallback: Return empty credentials
      return { 
        success: false, 
        error: 'File picker not available. Please manually enter your credentials.' 
      };
    } catch (error) {
      console.error('Error loading existing credentials:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to load credentials' 
      };
    }
  }

  /**
   * Auto-load credentials from common file paths
   */
  async autoLoadCredentials(): Promise<any> {
    try {
      // Try to read from common credential file paths
      const commonPaths = [
        '/access_tokens/zerodha_credentials.json',
        '/access_tokens/credentials.json',
        '/zerodha_credentials.json',
        '/credentials.json'
      ];

      for (const path of commonPaths) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            const credentials = await response.json();
            if (credentials.api_key && credentials.api_secret) {
              return { 
                success: true, 
                credentials,
                message: `Credentials loaded from ${path}` 
              };
            }
          }
        } catch (pathError) {
          // Continue to next path
          continue;
        }
      }

      // If no file found, try to read from localStorage as fallback
      const storedCredentials = localStorage.getItem('zerodha_credentials');
      if (storedCredentials) {
        try {
          const credentials = JSON.parse(storedCredentials);
          if (credentials.api_key && credentials.api_secret) {
            return { 
              success: true, 
              credentials,
              message: 'Credentials loaded from localStorage' 
            };
          }
        } catch (parseError) {
          console.log('Failed to parse stored credentials');
        }
      }

      return { 
        success: false, 
        error: 'No credentials found in common paths or localStorage' 
      };
    } catch (error) {
      console.error('Error auto-loading credentials:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to auto-load credentials' 
      };
    }
  }

  /**
   * Read token data from local file
   */
  private async readLocalTokenFile(): Promise<TokenStatus> {
    try {
      // Try to read from common token file paths
      const commonPaths = [
        '../access_tokens/zerodha_token.json',
        '../access_tokens/token.json',
        '../access_tokens/zerodha_access_token.json',
        '../zerodha_token.json',
        '../token.json'
      ];

      for (const path of commonPaths) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            const tokenData = await response.json();
            return {
              has_token: !!tokenData.access_token,
              token_file_exists: true,
              last_updated: tokenData.updated_at || new Date().toISOString(),
              is_valid: !!tokenData.access_token && tokenData.access_token.length > 10,
              user_info: tokenData.user_info || undefined
            };
          }
        } catch (pathError) {
          // Continue to next path
          continue;
        }
      }

      // If no file found, try to read from localStorage as fallback
      const storedToken = localStorage.getItem('zerodha_access_token');
      if (storedToken) {
        return {
          has_token: true,
          token_file_exists: true,
          last_updated: new Date().toISOString(),
          is_valid: storedToken.length > 10,
          user_info: undefined
        };
      }

      throw new Error('No token file found');
    } catch (error) {
      console.error('Error reading local token file:', error);
      throw error;
    }
  }

  /**
   * Read credential data from local file
   */
  private async readLocalCredentialFile(): Promise<any> {
    try {
      // Try to read from common credential file paths
      const commonPaths = [
        '../access_tokens/zerodha_credentials.json',
        '../access_tokens/credentials.json',
        '../access_tokens/api_keys.json',
        '../zerodha_credentials.json',
        '../credentials.json'
      ];

      for (const path of commonPaths) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            const credentialData = await response.json();
            if (credentialData.api_key && credentialData.api_secret) {
              return {
                has_credentials: true,
                api_key_valid: credentialData.api_key.length > 10,
                api_secret_configured: credentialData.api_secret.length > 10,
                credentials_file_exists: true
              };
            }
          }
        } catch (pathError) {
          // Continue to next path
          continue;
        }
      }

      // If no file found, try to read from localStorage as fallback
      const storedCredentials = localStorage.getItem('zerodha_credentials');
      if (storedCredentials) {
        try {
          const credentials = JSON.parse(storedCredentials);
          if (credentials.api_key && credentials.api_secret) {
            return {
              has_credentials: true,
              api_key_valid: credentials.api_key.length > 10,
              api_secret_configured: credentials.api_secret.length > 10,
              credentials_file_exists: true
            };
          }
        } catch (parseError) {
          console.log('Failed to parse stored credentials');
        }
      }

      throw new Error('No credential file found');
    } catch (error) {
      console.error('Error reading local credential file:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const zerodhaTokenService = new ZerodhaTokenService(); 