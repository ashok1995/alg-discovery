/**
 * Direct Kite WebSocket Service for Frontend.
 * WebSocket connection to Kite Connect for real-time price updates.
 */

import { EventEmitter } from 'events';
import { API_CONFIG } from '../config/api';
import type { KitePriceData, KiteWebSocketConfig, WebSocketStats } from '../types/kiteWebSocket';

export type { KitePriceData, KiteWebSocketConfig, WebSocketStats };

class KiteWebSocketService extends EventEmitter {
  private static instance: KiteWebSocketService;

  private config: KiteWebSocketConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private heartbeatInterval: number;

  private isConnecting = false;
  private isConnected = false;
  private lastConnected = 0;
  private lastMessageTime = 0;
  private connectionId = '';

  private subscribedSymbols = new Set<number>();
  private symbolMapping = new Map<number, string>();
  private reverseSymbolMapping = new Map<string, number>();

  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private messageCount = 0;
  private errorCount = 0;

  private constructor(config: KiteWebSocketConfig) {
    super();
    this.config = config;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5;
    this.reconnectDelay = config.reconnectDelay ?? API_CONFIG.REFRESH.PRICES;
    this.heartbeatInterval = config.heartbeatInterval ?? API_CONFIG.WEBSOCKET.HEARTBEAT_INTERVAL;

    console.log('🚀 KiteWebSocketService initialized');
  }

  public static getInstance(config?: KiteWebSocketConfig): KiteWebSocketService {
    if (!KiteWebSocketService.instance) {
      if (!config) {
        throw new Error('KiteWebSocketService requires configuration on first initialization');
      }
      KiteWebSocketService.instance = new KiteWebSocketService(config);
    }
    return KiteWebSocketService.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      console.log('⚠️ WebSocket already connecting or connected');
      return;
    }

    this.isConnecting = true;
    this.connectionId = `kite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const wsUrl = `wss://ws.kite.trade/?api_key=${this.config.apiKey}&access_token=${this.config.accessToken}`;
      console.log(`🔌 Connecting to Kite WebSocket: ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.handleConnectionError(error);
    }
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('✅ Kite WebSocket connected successfully');
      this.isConnecting = false;
      this.isConnected = true;
      this.lastConnected = Date.now();
      this.reconnectAttempts = 0;
      this.lastMessageTime = Date.now();

      this.startHeartbeat();

      this.emit('connected', { connectionId: this.connectionId, timestamp: Date.now() });

      if (this.subscribedSymbols.size > 0) {
        this.resubscribeToSymbols();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        this.lastMessageTime = Date.now();
        this.messageCount++;

        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
        this.errorCount++;
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      this.errorCount++;
      this.emit('error', error);
    };

    this.ws.onclose = (event) => {
      console.log(`🔌 WebSocket disconnected: ${event.code} - ${event.reason}`);
      this.isConnected = false;
      this.isConnecting = false;
      this.stopHeartbeat();

      this.emit('disconnected', {
        code: event.code,
        reason: event.reason,
        timestamp: Date.now(),
      });

      if (event.code !== 1000) {
        this.attemptReconnection();
      }
    };
  }

  private handleWebSocketMessage(data: { type: string; [key: string]: unknown }): void {
    if (data.type === 'ltp') {
      this.emit('priceUpdate', {
        instrument_token: data.instrument_token as number,
        last_price: data.last_price as number,
        change: data.change as number,
        change_percent: data.change_percent as number,
        volume: data.volume as number,
        timestamp: Date.now(),
        symbol: this.symbolMapping.get(data.instrument_token as number),
      } as KitePriceData);
    } else if (data.type === 'order') this.emit('orderUpdate', data);
    else if (data.type === 'position') this.emit('positionUpdate', data);
    else if (data.type === 'pong') console.log('💓 Heartbeat received');
    else console.log('📨 Unknown message type:', data.type, data);
  }

  public subscribeToInstruments(instruments: Array<{ instrument_token: number; symbol?: string }>): void {
    if (!this.isConnected || !this.ws) return;
    try {
      this.ws.send(JSON.stringify({
        a: 'subscribe',
        v: instruments.map((i) => ({ instrument_token: i.instrument_token, exchange_token: i.symbol || String(i.instrument_token) })),
      }));
      instruments.forEach((i) => {
        this.subscribedSymbols.add(i.instrument_token);
        if (i.symbol) {
          this.symbolMapping.set(i.instrument_token, i.symbol);
          this.reverseSymbolMapping.set(i.symbol, i.instrument_token);
        }
      });
      this.emit('subscribed', { instruments, timestamp: Date.now() });
    } catch (error) {
      this.emit('subscriptionError', { error, instruments });
    }
  }

  public subscribeToSymbols(_symbols: string[]): void {
    console.warn('⚠️ Use subscribeToInstruments with token mapping');
  }

  public unsubscribeFromInstruments(instruments: Array<{ instrument_token: number }>): void {
    if (!this.isConnected || !this.ws) return;
    try {
      this.ws.send(JSON.stringify({ a: 'unsubscribe', v: instruments.map((i) => ({ instrument_token: i.instrument_token })) }));
      instruments.forEach((i) => {
        this.subscribedSymbols.delete(i.instrument_token);
        const sym = this.symbolMapping.get(i.instrument_token);
        if (sym) {
          this.reverseSymbolMapping.delete(sym);
          this.symbolMapping.delete(i.instrument_token);
        }
      });
      this.emit('unsubscribed', { instruments, timestamp: Date.now() });
    } catch (error) {
      this.emit('unsubscriptionError', { error, instruments });
    }
  }

  private resubscribeToSymbols(): void {
    const instruments = Array.from(this.subscribedSymbols).map((t) => ({ instrument_token: t, symbol: this.symbolMapping.get(t) }));
    if (instruments.length > 0) this.subscribeToInstruments(instruments);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws) this.ws.send(JSON.stringify({ a: 'ping' }));
    }, this.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached');
      return;
    }
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
  }

  private handleConnectionError(error: unknown): void {
    this.emit('connectionError', error);
    if (this.reconnectAttempts < this.maxReconnectAttempts) this.attemptReconnection();
  }

  public disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  public getStats(): WebSocketStats {
    return {
      isConnected: this.isConnected,
      lastConnected: this.lastConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscribedSymbols: this.subscribedSymbols.size,
      lastMessageTime: this.lastMessageTime,
      connectionId: this.connectionId,
    };
  }

  public getDetailedStats(): WebSocketStats & { messageCount: number; errorCount: number; subscribedSymbolsList: string[] } {
    return { ...this.getStats(), messageCount: this.messageCount, errorCount: this.errorCount, subscribedSymbolsList: Array.from(this.symbolMapping.values()) };
  }

  public isWebSocketConnected(): boolean { return this.isConnected; }
  public getSubscribedSymbols(): string[] { return Array.from(this.symbolMapping.values()); }
  public getInstrumentToken(symbol: string): number | undefined { return this.reverseSymbolMapping.get(symbol); }
  public getSymbol(instrumentToken: number): string | undefined { return this.symbolMapping.get(instrumentToken); }
}

export default KiteWebSocketService;
