/**
 * Seed WebSocket Service
 * ======================
 * Real-time streams:
 *   WS /ws/positions    — position updates (SEED_POSITIONS_API_BASE_URL / position-tracker, e.g. :8183)
 *   WS /ws/system-health — system health (SEED_API_BASE_URL / Seed service, e.g. :8182)
 *
 * Auto-reconnects with exponential back-off. Use the useSeedWebSocket hook
 * in components rather than instantiating this service directly.
 */

import { API_CONFIG } from '../config/api';
import type { SeedPositionsMessage, SeedHealthMessage } from '../types/apiModels';

type Listener<T> = (msg: T) => void;

function buildWsUrl(path: string, httpBase: string): string {
  const wsBase = httpBase.replace(/^https?:\/\//, (m) => (m.startsWith('https') ? 'wss://' : 'ws://'));
  return `${wsBase}${path}`;
}

class SeedWebSocket<T> {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener<T>>();
  private connectListeners = new Set<() => void>();
  private disconnectListeners = new Set<() => void>();
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 30_000;
  private readonly baseDelay = 2_000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly url: string;

  constructor(path: string, httpBase: string) {
    this.url = buildWsUrl(path, httpBase);
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;
    this.shouldReconnect = true;
    this._open();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.disconnectListeners.forEach((fn) => fn());
  }

  onMessage(fn: Listener<T>): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onConnect(fn: () => void): () => void {
    this.connectListeners.add(fn);
    return () => this.connectListeners.delete(fn);
  }

  onDisconnect(fn: () => void): () => void {
    this.disconnectListeners.add(fn);
    return () => this.disconnectListeners.delete(fn);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private _open(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.connectListeners.forEach((fn) => fn());
      };

      this.ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as T;
          this.listeners.forEach((fn) => fn(data));
        } catch {
          // ignore malformed frames
        }
      };

      this.ws.onerror = () => {
        // errors are followed by onclose — handle there
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.disconnectListeners.forEach((fn) => fn());
        if (this.shouldReconnect) {
          const delay = Math.min(
            this.baseDelay * Math.pow(1.5, this.reconnectAttempts),
            this.maxReconnectDelay,
          );
          this.reconnectAttempts++;
          this.reconnectTimer = setTimeout(() => this._open(), delay);
        }
      };
    } catch (err) {
      console.warn('[SeedWebSocket] Failed to create WebSocket:', err);
    }
  }
}

// Singleton instances — one per stream
let positionsWs: SeedWebSocket<SeedPositionsMessage> | null = null;
let healthWs: SeedWebSocket<SeedHealthMessage> | null = null;

export function getSeedPositionsWs(): SeedWebSocket<SeedPositionsMessage> {
  if (!positionsWs) {
    positionsWs = new SeedWebSocket<SeedPositionsMessage>('/ws/positions', API_CONFIG.SEED_POSITIONS_API_BASE_URL);
  }
  return positionsWs;
}

export function getSeedHealthWs(): SeedWebSocket<SeedHealthMessage> {
  if (!healthWs) {
    healthWs = new SeedWebSocket<SeedHealthMessage>('/ws/system-health', API_CONFIG.SEED_API_BASE_URL);
  }
  return healthWs;
}
