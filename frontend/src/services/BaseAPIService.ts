/**
 * Base API Service Interface
 * Defines the common interface for all API services
 */

import { getServiceUrl } from '../config/api';

export interface HealthStatus {
  success: boolean;
  status: 'healthy' | 'unhealthy' | 'error';
  timestamp: string;
  uptime?: string;
  error?: string;
}

export interface ServiceStatus {
  name: string;
  displayName: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'error' | 'unknown';
  lastCheck: string;
  responseTime?: number;
  uptime?: string;
  error?: string;
}

export interface ServiceConfig {
  name: string;
  displayName: string;
  port: number;
  baseURL: string;
  endpoints: Record<string, string>;
  enabled: boolean;
}

export interface BaseAPIRequest {
  limit?: number;
  force_refresh?: boolean;
  [key: string]: any;
}

export interface BaseAPIResponse {
  success: boolean;
  data: any;
  error?: string;
  metadata?: {
    processing_time?: number;
    cache_hit?: boolean;
    timestamp?: string;
  };
}

/**
 * Base API Service Interface
 */
export interface BaseAPIService {
  getHealth(): Promise<HealthStatus>;
  getStatus(): Promise<ServiceStatus>;
  getConfig(): Promise<ServiceConfig>;
  testConnection(): Promise<boolean>;
}

/**
 * Service Factory
 * Creates and manages instances of all API services
 */
export class ServiceFactory {
  private static instances: Map<string, BaseAPIService> = new Map();

  static createService(serviceType: string): BaseAPIService {
    if (this.instances.has(serviceType)) {
      return this.instances.get(serviceType)!;
    }

    let service: BaseAPIService;

    switch (serviceType) {
      case 'swing':
        const { SwingAPIService } = require('./SwingAPIService');
        service = new SwingAPIService();
        break;
      case 'longterm':
        const { LongTermAPIService } = require('./LongTermAPIService');
        service = new LongTermAPIService();
        break;
      case 'shortterm':
        const { ShortTermAPIService } = require('./ShortTermAPIService');
        service = new ShortTermAPIService();
        break;
      case 'intraday':
        const { IntradayAPIService } = require('./IntradayAPIService');
        service = new IntradayAPIService();
        break;
      case 'variants':
        const { VariantsAPIService } = require('./VariantsAPIService');
        service = new VariantsAPIService();
        break;
      case 'facts':
        const { FactsAPIService } = require('./FactsAPIService');
        service = new FactsAPIService();
        break;
      case 'dashboard':
        const { DashboardAPIService } = require('./DashboardAPIService');
        service = new DashboardAPIService();
        break;
      case 'unified-strategy':
        const { UnifiedStrategyAPIService } = require('./UnifiedStrategyAPIService');
        service = new UnifiedStrategyAPIService();
        break;
      case 'misc':
        const { MiscAPIService } = require('./MiscAPIService');
        service = new MiscAPIService();
        break;
      case 'zerodha-test':
        const { ZerodhaTestAPIService } = require('./ZerodhaTestAPIService');
        service = new ZerodhaTestAPIService();
        break;
      case 'zerodha':
        const { ZerodhaAPIService } = require('./ZerodhaAPIService');
        service = new ZerodhaAPIService();
        break;
      case 'validation':
        const { ValidationAPIService } = require('./ValidationAPIService');
        service = new ValidationAPIService();
        break;
      case 'algorithm':
        const { AlgorithmAPIService } = require('./AlgorithmAPIService');
        service = new AlgorithmAPIService();
        break;
      case 'intraday-service':
        const { IntradayServiceAPIService } = require('./IntradayServiceAPIService');
        service = new IntradayServiceAPIService();
        break;
      case 'stock-mapping':
        const { StockMappingAPIService } = require('./StockMappingAPIService');
        service = new StockMappingAPIService();
        break;
      case 'stock-candidate-populator':
        const { StockCandidatePopulatorAPIService } = require('./StockCandidatePopulatorAPIService');
        service = new StockCandidatePopulatorAPIService();
        break;
      default:
        throw new Error(`Unknown service type: ${serviceType}`);
    }

    this.instances.set(serviceType, service);
    return service;
  }

  static getAllServices(): Map<string, BaseAPIService> {
    return this.instances;
  }

  static clearInstances(): void {
    this.instances.clear();
  }
}

/**
 * Abstract Base API Service
 * Provides common functionality for all API services
 */
export abstract class AbstractAPIService implements BaseAPIService {
  protected baseURL: string;
  protected port: number;
  protected serviceName: string;
  protected displayName: string;
  protected endpoints: Record<string, string>;

  constructor(serviceName: string, displayName: string, port: number, endpoints: Record<string, string>) {
    this.serviceName = serviceName;
    this.displayName = displayName;
    this.port = port;
    this.baseURL = getServiceUrl(port);
    this.endpoints = endpoints;
  }

  async getHealth(): Promise<HealthStatus> {
    try {
      const response = await fetch(`${this.baseURL}/health`);

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: data.uptime || 'Unknown'
        };
      } else {
        return {
          success: false,
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: `HTTP ${response.status}`
        };
      }
    } catch (error: any) {
      return {
        success: false,
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message || 'Connection failed'
      };
    }
  }

  async getStatus(): Promise<ServiceStatus> {
    const health = await this.getHealth();
    return {
      name: this.serviceName,
      displayName: this.displayName,
      port: this.port,
      status: health.status,
      lastCheck: health.timestamp,
      error: health.error
    };
  }

  async getConfig(): Promise<ServiceConfig> {
    return {
      name: this.serviceName,
      displayName: this.displayName,
      port: this.port,
      baseURL: this.baseURL,
      endpoints: this.endpoints,
      enabled: true
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  protected async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  protected async makePostRequest<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
  }

  protected async makeGetRequest<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let url = `${this.baseURL}${endpoint}`;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
} 