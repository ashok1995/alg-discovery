import { AbstractAPIService, BaseAPIRequest, BaseAPIResponse } from './BaseAPIService';
import { API_CONFIG } from '../config/api';

export class ZerodhaAPIService extends AbstractAPIService {
  constructor() {
    // Keep legacy base for other endpoints
    super('zerodha-api', 'Zerodha Management', 8011, {
      HEALTH: '/health',
      STATUS: '/status',
      MANAGEMENT: '/api/zerodha/management',
      ORDERS: '/api/zerodha/orders'
    });
  }

  // v1 endpoints absolute helpers
  private v1(path: string): string {
    const base = API_CONFIG.ZERODHA_V1_BASE_URL.replace(/\/$/, '');
    const prefix = API_CONFIG.ZERODHA_V1_PREFIX.replace(/\/$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${prefix}${p}`;
  }

  async getSettingsStatus(): Promise<any> {
    const res = await fetch(this.v1('/zerodha/settings'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getComprehensiveStatus(): Promise<any> {
    const res = await fetch(this.v1('/zerodha/comprehensive-status'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getConnectionStatus(): Promise<any> {
    const res = await fetch(this.v1('/zerodha/connection-status'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async testConnection(): Promise<any> {
    const res = await fetch(this.v1('/zerodha/test-connection'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getTokenStatusV1(): Promise<any> {
    const res = await fetch(this.v1('/zerodha/token/status'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async updateCredentialsV1(api_key: string, api_secret: string): Promise<any> {
    const res = await fetch(this.v1('/zerodha/token/credentials/update'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key, api_secret }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getManagement(): Promise<BaseAPIResponse> {
    return this.makeGetRequest<BaseAPIResponse>(this.endpoints.MANAGEMENT);
  }
}

export const zerodhaAPIService = new ZerodhaAPIService();
export default zerodhaAPIService; 