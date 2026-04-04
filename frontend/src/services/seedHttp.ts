import { API_CONFIG } from '../config/api';

export type SeedQueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

const DEFAULT_TIMEOUT_MS = 15_000;
const SLOW_TIMEOUT_MS = 45_000;
const FAST_TIMEOUT_MS = 5_000;

// Keep these lists small and explicit to avoid surprises.
const SLOW_PATHS = new Set<string>([
  '/api/v2/dashboard/market-movers',
]);

const FAST_PATHS = new Set<string>([
  '/api/v2/monitor/quick-stats',
]);

function timeoutForPath(path: string): number {
  if (FAST_PATHS.has(path)) return FAST_TIMEOUT_MS;
  if (SLOW_PATHS.has(path)) return SLOW_TIMEOUT_MS;
  return DEFAULT_TIMEOUT_MS;
}

export function seedBuildUrl(path: string, params?: SeedQueryParams): string {
  const url = new URL(`${API_CONFIG.SEED_API_BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function seedFetchJSON<T>(
  path: string,
  opts?: {
    params?: SeedQueryParams;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    headers?: HeadersInit;
    timeoutMs?: number;
  },
): Promise<T> {
  const url = seedBuildUrl(path, opts?.params);
  const controller = new AbortController();
  const timeoutMs = opts?.timeoutMs ?? timeoutForPath(path);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const init: RequestInit = {
    method: opts?.method ?? 'GET',
    signal: controller.signal,
    headers: opts?.headers,
  };

  if (opts?.body !== undefined) {
    init.body = JSON.stringify(opts.body);
    init.headers = { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) };
  }

  try {
    const res = await fetch(url, init);
    clearTimeout(timeoutId);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Seed API ${path} failed (${res.status}): ${text || res.statusText}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

