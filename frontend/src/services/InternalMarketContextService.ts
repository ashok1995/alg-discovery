/**
 * Internal & Global Market Context Service
 * Fetches internal-market-context (Kite 8179) and global-context (Yahoo 8185).
 * Proxied via /api/internal-market-context and /api/global-context in dev; nginx in prod.
 */

import type { InternalMarketContextResponse } from '../types/apiModels';
import type { GlobalContextResponse } from '../types/apiModels';

const TIMEOUT_MS = 10000;

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.PUBLIC_URL || '';
};

export async function fetchInternalMarketContext(): Promise<InternalMarketContextResponse> {
  const url = `${getBaseUrl()}/api/internal-market-context`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Internal market context failed (${res.status}): ${text || res.statusText}`);
    }
    return (await res.json()) as InternalMarketContextResponse;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err instanceof Error ? err : new Error('Internal market context request failed');
  }
}

export async function fetchGlobalContext(): Promise<GlobalContextResponse> {
  const url = `${getBaseUrl()}/api/global-context`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Global context failed (${res.status}): ${text || res.statusText}`);
    }
    return (await res.json()) as GlobalContextResponse;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err instanceof Error ? err : new Error('Global context request failed');
  }
}
