/**
 * Type definitions for Kite WebSocket Service
 */

export interface KitePriceData {
  instrument_token: number;
  last_price: number;
  change: number;
  change_percent: number;
  volume: number;
  timestamp: number;
  symbol?: string;
}

export interface KiteWebSocketConfig {
  apiKey: string;
  accessToken: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

export interface WebSocketStats {
  isConnected: boolean;
  lastConnected: number;
  reconnectAttempts: number;
  subscribedSymbols: number;
  lastMessageTime: number;
  connectionId: string;
}
