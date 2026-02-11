/**
 * Direct Kite WebSocket Service for Frontend
 * ==========================================
 * 
 * Provides direct WebSocket connection to Kite Connect for real-time price updates.
 * Uses the same API key and access token as the backend but connects directly from frontend.
 * 
 * Features:
 * - Direct WebSocket connection to Kite Connect
 * - Real-time price streaming for up to ${API_CONFIG.WEBSOCKET.MAX_SUBSCRIPTIONS} instruments per connection
 * - Automatic reconnection and error handling
 * - Symbol subscription management
 * - Event-driven price updates
 */

import { EventEmitter } from 'events';
import { API_CONFIG } from '../config/api';

export interface KitePriceData {
  instrument_token: number;
  last_price: number;
  change: number;
  change_percent: number;
  volume: number;
  timestamp: number;
  symbol?: string; // Mapped from instrument_token
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

class KiteWebSocketService extends EventEmitter {
  private static instance: KiteWebSocketService;
  
  // Configuration
  private config: KiteWebSocketConfig;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private heartbeatInterval: number;
  
  // State management
  private isConnecting = false;
  private isConnected = false;
  private lastConnected = 0;
  private lastMessageTime = 0;
  private connectionId = '';
  
  // Symbol management
  private subscribedSymbols = new Set<number>();
  private symbolMapping = new Map<number, string>(); // instrument_token -> symbol
  private reverseSymbolMapping = new Map<string, number>(); // symbol -> instrument_token
  
  // Timers
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  // Statistics
  private messageCount = 0;
  private errorCount = 0;

  private constructor(config: KiteWebSocketConfig) {
    super();
    this.config = config;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5;
    this.reconnectDelay = config.reconnectDelay || API_CONFIG.REFRESH.PRICES;
    this.heartbeatInterval = config.heartbeatInterval || API_CONFIG.WEBSOCKET.HEARTBEAT_INTERVAL;
    
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

  /**
   * Initialize WebSocket connection
   */
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

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('✅ Kite WebSocket connected successfully');
      this.isConnecting = false;
      this.isConnected = true;
      this.lastConnected = Date.now();
      this.reconnectAttempts = 0;
      this.lastMessageTime = Date.now();
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Emit connection event
      this.emit('connected', { connectionId: this.connectionId, timestamp: Date.now() });
      
      // Resubscribe to symbols if any
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
        timestamp: Date.now() 
      });
      
      // Attempt reconnection if not manually closed
      if (event.code !== 1000) {
        this.attemptReconnection();
      }
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(data: any): void {
    if (data.type === 'ltp') {
      // Last traded price update
      const priceData: KitePriceData = {
        instrument_token: data.instrument_token,
        last_price: data.last_price,
        change: data.change,
        change_percent: data.change_percent,
        volume: data.volume,
        timestamp: Date.now(),
        symbol: this.symbolMapping.get(data.instrument_token)
      };
      
      // Emit price update
      this.emit('priceUpdate', priceData);
      
    } else if (data.type === 'order') {
      // Order update
      this.emit('orderUpdate', data);
      
    } else if (data.type === 'position') {
      // Position update
      this.emit('positionUpdate', data);
      
    } else if (data.type === 'pong') {
      // Heartbeat response
      console.log('💓 Heartbeat received');
      
    } else {
      // Unknown message type
      console.log('📨 Unknown message type:', data.type, data);
    }
  }

  /**
   * Subscribe to instruments for real-time updates
   */
  public subscribeToInstruments(instruments: Array<{ instrument_token: number; symbol?: string }>): void {
    if (!this.isConnected || !this.ws) {
      console.warn('⚠️ WebSocket not connected, cannot subscribe to instruments');
      return;
    }

    const subscribeMessage = {
      a: 'subscribe',
      v: instruments.map(instrument => ({
        instrument_token: instrument.instrument_token,
        exchange_token: instrument.symbol || instrument.instrument_token.toString()
      }))
    };

    try {
      this.ws.send(JSON.stringify(subscribeMessage));
      
      // Track subscribed instruments
      instruments.forEach(instrument => {
        this.subscribedSymbols.add(instrument.instrument_token);
        if (instrument.symbol) {
          this.symbolMapping.set(instrument.instrument_token, instrument.symbol);
          this.reverseSymbolMapping.set(instrument.symbol, instrument.instrument_token);
        }
      });
      
      console.log(`📡 Subscribed to ${instruments.length} instruments`);
      this.emit('subscribed', { instruments, timestamp: Date.now() });
      
    } catch (error) {
      console.error('❌ Error subscribing to instruments:', error);
      this.emit('subscriptionError', { error, instruments });
    }
  }

  /**
   * Subscribe to symbols (will need to map to instrument tokens)
   */
  public subscribeToSymbols(symbols: string[]): void {
    // For now, we'll need instrument tokens
    // In a real implementation, you'd have a mapping service
    console.warn('⚠️ subscribeToSymbols requires instrument token mapping. Use subscribeToInstruments instead.');
  }

  /**
   * Unsubscribe from instruments
   */
  public unsubscribeFromInstruments(instruments: Array<{ instrument_token: number }>): void {
    if (!this.isConnected || !this.ws) {
      console.warn('⚠️ WebSocket not connected, cannot unsubscribe from instruments');
      return;
    }

    const unsubscribeMessage = {
      a: 'unsubscribe',
      v: instruments.map(instrument => ({
        instrument_token: instrument.instrument_token
      }))
    };

    try {
      this.ws.send(JSON.stringify(unsubscribeMessage));
      
      // Remove from tracking
      instruments.forEach(instrument => {
        this.subscribedSymbols.delete(instrument.instrument_token);
        const symbol = this.symbolMapping.get(instrument.instrument_token);
        if (symbol) {
          this.reverseSymbolMapping.delete(symbol);
          this.symbolMapping.delete(instrument.instrument_token);
        }
      });
      
      console.log(`📡 Unsubscribed from ${instruments.length} instruments`);
      this.emit('unsubscribed', { instruments, timestamp: Date.now() });
      
    } catch (error) {
      console.error('❌ Error unsubscribing from instruments:', error);
      this.emit('unsubscriptionError', { error, instruments });
    }
  }

  /**
   * Resubscribe to all previously subscribed symbols
   */
  private resubscribeToSymbols(): void {
    const instruments = Array.from(this.subscribedSymbols).map(token => ({
      instrument_token: token,
      symbol: this.symbolMapping.get(token)
    }));
    
    if (instruments.length > 0) {
      this.subscribeToInstruments(instruments);
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws) {
        try {
          this.ws.send(JSON.stringify({ a: 'ping' }));
          console.log('💓 Heartbeat sent');
        } catch (error) {
          console.error('❌ Error sending heartbeat:', error);
        }
      }
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Attempt reconnection
   */
  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: any): void {
    console.error('❌ Connection error:', error);
    this.emit('connectionError', error);
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnection();
    }
  }

  /**
   * Disconnect WebSocket
   */
  public disconnect(): void {
    console.log('🔌 Disconnecting WebSocket');
    
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

  /**
   * Get WebSocket statistics
   */
  public getStats(): WebSocketStats {
    return {
      isConnected: this.isConnected,
      lastConnected: this.lastConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscribedSymbols: this.subscribedSymbols.size,
      lastMessageTime: this.lastMessageTime,
      connectionId: this.connectionId
    };
  }

  /**
   * Get detailed statistics
   */
  public getDetailedStats(): WebSocketStats & {
    messageCount: number;
    errorCount: number;
    subscribedSymbolsList: string[];
  } {
    return {
      ...this.getStats(),
      messageCount: this.messageCount,
      errorCount: this.errorCount,
      subscribedSymbolsList: Array.from(this.symbolMapping.values())
    };
  }

  /**
   * Check if connected
   */
  public isWebSocketConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get subscribed symbols
   */
  public getSubscribedSymbols(): string[] {
    return Array.from(this.symbolMapping.values());
  }

  /**
   * Get instrument token for symbol
   */
  public getInstrumentToken(symbol: string): number | undefined {
    return this.reverseSymbolMapping.get(symbol);
  }

  /**
   * Get symbol for instrument token
   */
  public getSymbol(instrumentToken: number): string | undefined {
    return this.symbolMapping.get(instrumentToken);
  }
}

export default KiteWebSocketService; 