/**
 * Types and utility functions for App-Level Cache
 */

export interface CachedRecommendation {
  id: string;
  strategy: string;
  data: unknown;
  timestamp: number;
  expiresAt: number;
  symbols: string[];
  variants?: Record<string, string>;
}

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: number;
  source: 'websocket' | 'api' | 'cache';
}

export interface AppCacheStats {
  totalRecommendations: number;
  totalSymbols: number;
  activeWebSocketConnections: number;
  lastPriceUpdate: number;
  cacheHitRate: number;
  memoryUsage: string;
}

/** Generate cache id for a recommendation based on strategy and variants */
export function generateRecommendationId(strategy: string, variants?: Record<string, string>): string {
  if (variants) {
    const variantString = Object.entries(variants)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    return `${strategy}-${variantString}`;
  }
  return strategy;
}

/** Split array into chunks of given size */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/** Default background refresh configs for strategies */
export const REFRESH_CONFIGS: Array<{ strategy: string; interval: number }> = [
  { strategy: 'long-buy', interval: 15 * 60 * 1000 },
  { strategy: 'swing-buy', interval: 30 * 60 * 1000 },
  { strategy: 'short-buy', interval: 2 * 60 * 1000 },
  { strategy: 'intraday-buy', interval: 30 * 1000 },
];
