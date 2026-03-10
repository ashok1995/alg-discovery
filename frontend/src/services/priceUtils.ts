/**
 * Types and helper functions for Shared Price Manager
 */

export interface SymbolRequest {
  symbol: string;
  requestedBy: string;
  priority: 'high' | 'normal' | 'low';
  lastRequested: number;
}

export interface BatchPriceRequest {
  symbols: string[];
  batchId: string;
  timestamp: number;
  source: 'api' | 'websocket';
}

export interface PriceManagerStats {
  totalSymbols: number;
  activeRequests: number;
  lastBatchUpdate: number;
  websocketConnected: boolean;
  apiCallCount: number;
  cacheHitRate: number;
}

/** Create batches of items for batched API calls */
export function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}
