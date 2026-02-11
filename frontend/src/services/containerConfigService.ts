/**
 * Container Configuration Service
 * 
 * Service for managing Zerodha container connection settings and configuration.
 */

import { API_CONFIG } from '../config/api';

export interface ContainerConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  timeout: number;
  retries: number;
  endpoints: {
    health: string;
    root: string;
    token: string;
    credentials: string;
    data: string;
    partner: string;
    docs: string;
    settings: string;
    tokenStatus: string;
    testConnection: string;
    marketData: string;
    topGainersLosers: string;
    valueTraded: string;
    combinedAnalysis: string;
    timeframes: string;
    comprehensiveStatus: string;
    autoRefreshToken: string;
    generateLoginUrl: string;
  };
}

export interface ContainerStatus {
  container: {
    status: 'running' | 'stopped' | 'error' | 'unknown';
    port: number;
    health: 'healthy' | 'unhealthy' | 'unknown';
    lastCheck: string;
  };
  api: {
    status: 'connected' | 'disconnected' | 'error';
    responseTime: number;
    endpoints: string[];
  };
  services: {
    zerodha: {
      status: 'active' | 'inactive' | 'error';
      tokenValid: boolean;
      credentialsValid: boolean;
    };
    redis: {
      status: 'active' | 'inactive' | 'error';
    };
  };
}

// New interfaces for the working endpoints
export interface ZerodhaSettings {
  api_key_configured: boolean;
  access_token_configured: boolean;
  token_file_path: string;
  last_updated: string | null;
}

export interface ZerodhaTokenStatus {
  has_token: boolean;
  token_file_exists: boolean;
  last_updated: string | null;
  is_valid: boolean;
  user_info?: {
    user_name?: string;
    user_id?: string;
    email?: string;
    broker?: string;
  };
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  kite_available: boolean;
}

export interface CredentialStatus {
  api_key: string;
  api_secret_configured: boolean;
  api_key_valid: boolean;
  credentials_file_exists: boolean;
}

export interface ComprehensiveStatus {
  configuration: {
    api_key_configured: boolean;
    api_secret_configured: boolean;
    api_key: string;
    api_secret: string;
    credentials_file: string;
    token_file: string;
  };
  token: {
    has_token: boolean;
    is_valid: boolean;
    token_file_exists: boolean;
    last_updated: string | null;
    user_info: {
      user_name: string;
      user_id: string;
      email: string;
      broker: string;
    };
  };
  connection: {
    connected: boolean;
    kite_available: boolean;
    last_refresh: string | null;
    timestamp: string;
  };
  service: {
    running: boolean;
    environment: string;
    port: number;
    log_level: string;
  };
  summary: {
    api_key_configured: boolean;
    api_secret_configured: boolean;
    token_valid: boolean;
    kite_available: boolean;
    service_running: boolean;
    all_systems_operational: boolean;
  };
}

export interface AutoRefreshTokenResponse {
  success: boolean;
  message: string;
  token_age_hours?: number;
  action?: string;
  instructions?: string[];
}

export interface GenerateLoginUrlResponse {
  login_url: string;
  api_key: string;
  message: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
}

export interface MarketData {
  symbol: string;
  timestamp: string;
  quote: {
    symbol: string;
    exchange: string;
    last_price: number;
    change: number;
    change_percent: number;
    volume: number;
    high: number;
    low: number;
    open: number;
    previous_close: number;
  };
  historical_data: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export interface TopGainersLosers {
  time_frame: string;
  timestamp: string;
  top_gainers: Array<{
    instrument_token: number;
    tradingsymbol: string;
    exchange: string;
    last_price: string;
    open_price: string;
    high_price: string;
    low_price: string;
    change: string;
    percentage_change: string;
    volume: number;
    value: string;
    previous_close: string | null;
    market_cap: string | null;
    sector: string | null;
    rank: number;
  }>;
  top_losers: Array<{
    instrument_token: number;
    tradingsymbol: string;
    exchange: string;
    last_price: string;
    open_price: string;
    high_price: string;
    low_price: string;
    change: string;
    percentage_change: string;
    volume: number;
    value: string;
    previous_close: string | null;
    market_cap: string | null;
    sector: string | null;
    rank: number;
  }>;
  total_instruments_analyzed: number;
  average_gain: string;
  average_loss: string;
  market_breadth: {
    advancing: number;
    declining: number;
    unchanged: number;
  };
}

export interface Timeframes {
  timeframes: Array<{
    code: string;
    name: string;
    description: string;
  }>;
  count: number;
}

class ContainerConfigService {
  private config: ContainerConfig = {
    host: 'localhost',
    port: API_CONFIG.PORTS.ZERODHA_API,
    protocol: 'http',
    timeout: API_CONFIG.REQUEST.TIMEOUT,
    retries: 3,
    endpoints: {
      health: '/health',
      root: '/',
      token: '/api/zerodha/token/api/zerodha/token/status',
      credentials: '/api/zerodha/token/api/zerodha/credentials/status',
      data: '/api/zerodha/token/api/zerodha/data/all',
      partner: '/api/zerodha/token/api/zerodha/partner/status',
      docs: '/docs',
      settings: '/api/zerodha/api/zerodha/settings',
      tokenStatus: '/api/zerodha/api/zerodha/token-status',
      testConnection: '/api/zerodha/api/zerodha/test-connection',
      marketData: '/api/zerodha/api/zerodha/market-data',
      topGainersLosers: '/api/zerodha/api/zerodha/top-gainers-losers',
      valueTraded: '/api/zerodha/api/zerodha/value-traded',
      combinedAnalysis: '/api/zerodha/api/zerodha/analysis/combined',
      timeframes: '/api/zerodha/api/zerodha/timeframes',
      comprehensiveStatus: '/api/zerodha/api/zerodha/comprehensive-status',
      autoRefreshToken: '/api/zerodha/api/zerodha/auto-refresh-token',
      generateLoginUrl: '/api/zerodha/api/zerodha/generate-login-url'
    }
  };

  constructor() {
    this.loadConfig();
  }

  /**
   * Load configuration from localStorage
   */
  private loadConfig(): void {
    try {
      const savedConfig = localStorage.getItem('zerodha_container_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.config = { ...this.config, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load container config from localStorage:', error);
    }
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem('zerodha_container_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save container config to localStorage:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ContainerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ContainerConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  /**
   * Get base URL for container
   */
  getBaseUrl(): string {
    return `${this.config.protocol}://${this.config.host}:${this.config.port}`;
  }

  /**
   * Get full URL for an endpoint
   */
  getEndpointUrl(endpoint: keyof ContainerConfig['endpoints']): string {
    return `${this.getBaseUrl()}${this.config.endpoints[endpoint]}`;
  }

  /**
   * Check container health
   */
  async checkHealth(): Promise<{ status: number; data: any; responseTime: number }> {
    const startTime = Date.now();
    const response = await fetch(this.getEndpointUrl('health'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.config.timeout),
    });
    
    const responseTime = Date.now() - startTime;
    const data = await response.json();
    
    return {
      status: response.status,
      data,
      responseTime
    };
  }

  /**
   * Check container status with comprehensive health check
   */
  async checkContainerStatus(): Promise<ContainerStatus> {
    const startTime = Date.now();
    
    try {
      // Check container health
      const healthResult = await this.checkHealth();
      
      // Check token status
      let tokenStatus = { has_token: false, is_valid: false };
      try {
        const tokenResponse = await fetch(this.getEndpointUrl('token'), {
          signal: AbortSignal.timeout(this.config.timeout),
        });
        if (tokenResponse.ok) {
          tokenStatus = await tokenResponse.json();
        }
      } catch (e) {
        console.warn('Token status check failed:', e);
      }

      // Check credentials status
      let credentialsStatus = { api_key_valid: false, credentials_file_exists: false };
      try {
        const credentialsResponse = await fetch(this.getEndpointUrl('credentials'), {
          signal: AbortSignal.timeout(this.config.timeout),
        });
        if (credentialsResponse.ok) {
          credentialsStatus = await credentialsResponse.json();
        }
      } catch (e) {
        console.warn('Credentials status check failed:', e);
      }

      // Check partner services
      try {
        const partnerResponse = await fetch(this.getEndpointUrl('partner'), {
          signal: AbortSignal.timeout(this.config.timeout),
        });
        if (partnerResponse.ok) {
          void partnerResponse.json();
        }
      } catch (e) {
        console.warn('Partner services check failed:', e);
      }

      const responseTime = Date.now() - startTime;

      return {
        container: {
          status: healthResult.status === 200 ? 'running' : 'error',
          port: this.config.port,
          health: healthResult.status === 200 ? 'healthy' : 'unhealthy',
          lastCheck: new Date().toISOString()
        },
        api: {
          status: healthResult.status === 200 ? 'connected' : 'disconnected',
          responseTime,
          endpoints: Object.values(this.config.endpoints)
        },
        services: {
          zerodha: {
            status: tokenStatus.has_token && tokenStatus.is_valid ? 'active' : 'inactive',
            tokenValid: tokenStatus.is_valid,
            credentialsValid: credentialsStatus.api_key_valid
          },
          redis: {
            status: 'active' // Assuming Redis is running with container
          }
        }
      };

    } catch (error) {
      console.error('Error checking container status:', error);
      
      return {
        container: {
          status: 'error',
          port: this.config.port,
          health: 'unknown',
          lastCheck: new Date().toISOString()
        },
        api: {
          status: 'error',
          responseTime: 0,
          endpoints: []
        },
        services: {
          zerodha: {
            status: 'error',
            tokenValid: false,
            credentialsValid: false
          },
          redis: {
            status: 'error'
          }
        }
      };
    }
  }

  /**
   * Test connection to container
   */
  async testConnection(): Promise<{ success: boolean; responseTime: number; error?: string }> {
    try {
      const startTime = Date.now();
      const response = await fetch(this.getEndpointUrl('health'), {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.timeout),
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return { success: true, responseTime };
      } else {
        return { success: false, responseTime, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { 
        success: false, 
        responseTime: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    this.config = {
      host: 'localhost',
      port: 8013,
      protocol: 'http',
      timeout: 10000,
      retries: 3,
      endpoints: {
        health: '/health',
        root: '/',
        token: '/api/zerodha/token/api/zerodha/token/status',
        credentials: '/api/zerodha/token/api/zerodha/credentials/status',
        data: '/api/zerodha/token/api/zerodha/data/all',
        partner: '/api/zerodha/token/api/zerodha/partner/status',
        docs: '/docs',
        settings: '/api/zerodha/api/zerodha/settings',
        tokenStatus: '/api/zerodha/api/zerodha/token-status',
        testConnection: '/api/zerodha/api/zerodha/test-connection',
        marketData: '/api/zerodha/api/zerodha/market-data',
        topGainersLosers: '/api/zerodha/api/zerodha/top-gainers-losers',
        valueTraded: '/api/zerodha/api/zerodha/value-traded',
        combinedAnalysis: '/api/zerodha/api/zerodha/analysis/combined',
        timeframes: '/api/zerodha/api/zerodha/timeframes',
        comprehensiveStatus: '/api/zerodha/api/zerodha/comprehensive-status',
        autoRefreshToken: '/api/zerodha/api/zerodha/auto-refresh-token',
        generateLoginUrl: '/api/zerodha/api/zerodha/generate-login-url'
      }
    };
    this.saveConfig();
  }

  /**
   * Get configuration summary
   */
  getConfigSummary(): { url: string; status: string } {
    return {
      url: this.getBaseUrl(),
      status: 'Configured'
    };
  }

  // New methods for the working endpoints

  /**
   * Get Zerodha settings
   */
  async getZerodhaSettings(): Promise<ZerodhaSettings> {
    try {
      const response = await fetch(this.getEndpointUrl('settings'), {
        signal: AbortSignal.timeout(this.config.timeout),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting Zerodha settings:', error);
      throw error;
    }
  }

  /**
   * Get Zerodha token status
   */
  async getZerodhaTokenStatus(): Promise<ZerodhaTokenStatus> {
    try {
      const response = await fetch(this.getEndpointUrl('tokenStatus'), {
        signal: AbortSignal.timeout(this.config.timeout),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting Zerodha token status:', error);
      throw error;
    }
  }

  /**
   * Test Zerodha connection
   */
  async testZerodhaConnection(): Promise<ConnectionTestResult> {
    try {
      const response = await fetch(this.getEndpointUrl('testConnection'), {
        signal: AbortSignal.timeout(this.config.timeout),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error testing Zerodha connection:', error);
      throw error;
    }
  }

  /**
   * Get market data for a symbol
   */
  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      const response = await fetch(`${this.getEndpointUrl('marketData')}/${symbol}`, {
        signal: AbortSignal.timeout(this.config.timeout),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting market data:', error);
      throw error;
    }
  }

  /**
   * Get top gainers and losers
   */
  async getTopGainersLosers(): Promise<TopGainersLosers> {
    try {
      const response = await fetch(this.getEndpointUrl('topGainersLosers'), {
        signal: AbortSignal.timeout(this.config.timeout),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting top gainers and losers:', error);
      throw error;
    }
  }

  /**
   * Get available timeframes
   */
  async getTimeframes(): Promise<Timeframes> {
    try {
      const response = await fetch(this.getEndpointUrl('timeframes'), {
        signal: AbortSignal.timeout(this.config.timeout),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting timeframes:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive container status with all endpoints
   */
  async getComprehensiveStatus(): Promise<{
    container: ContainerStatus;
    settings: ZerodhaSettings | null;
    tokenStatus: ZerodhaTokenStatus | null;
    connectionTest: ConnectionTestResult | null;
    credentialsStatus: CredentialStatus | null;
    timeframes: Timeframes | null;
  }> {
    try {
      const containerStatus = await this.checkContainerStatus();
      
      // Get additional status information using working endpoints
      const [settings, tokenStatus, connectionTest, credentialsStatus, timeframes] = await Promise.allSettled([
        this.getZerodhaSettings(),
        this.getZerodhaTokenStatus(),
        this.testZerodhaConnection(),
        this.getCredentialsStatus(),
        this.getTimeframes()
      ]);

      return {
        container: containerStatus,
        settings: settings.status === 'fulfilled' ? settings.value : null,
        tokenStatus: tokenStatus.status === 'fulfilled' ? tokenStatus.value : null,
        connectionTest: connectionTest.status === 'fulfilled' ? connectionTest.value : null,
        credentialsStatus: credentialsStatus.status === 'fulfilled' ? credentialsStatus.value : null,
        timeframes: timeframes.status === 'fulfilled' ? timeframes.value : null
      };
    } catch (error) {
      console.error('Error getting comprehensive status:', error);
      throw error;
    }
  }

  /**
   * Get credentials status
   */
  async getCredentialsStatus(): Promise<CredentialStatus> {
    try {
      const response = await fetch(this.getEndpointUrl('credentials'), {
        signal: AbortSignal.timeout(this.config.timeout),
      });
      
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
   * Get comprehensive status from the dedicated endpoint
   */
  async getComprehensiveStatusFromEndpoint(): Promise<ComprehensiveStatus> {
    try {
      const response = await fetch(this.getEndpointUrl('comprehensiveStatus'), {
        signal: AbortSignal.timeout(this.config.timeout),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting comprehensive status:', error);
      throw error;
    }
  }

  /**
   * Auto refresh token
   */
  async autoRefreshToken(): Promise<AutoRefreshTokenResponse> {
    try {
      const response = await fetch(this.getEndpointUrl('autoRefreshToken'), {
        method: 'POST',
        signal: AbortSignal.timeout(this.config.timeout),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error auto refreshing token:', error);
      throw error;
    }
  }

  /**
   * Generate login URL
   */
  async generateLoginUrl(): Promise<GenerateLoginUrlResponse> {
    try {
      const response = await fetch(this.getEndpointUrl('generateLoginUrl'), {
        signal: AbortSignal.timeout(this.config.timeout),
      });
      
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
   * Get health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    try {
      const response = await fetch(this.getEndpointUrl('health'), {
        signal: AbortSignal.timeout(this.config.timeout),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting health status:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const containerConfigService = new ContainerConfigService(); 