/**
 * Display helpers for observability timestamps (ISO from Seed, operator-relative "ago").
 */

export function parseIsoDate(iso: string | null | undefined): Date | null {
  if (!iso || typeof iso !== 'string') return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatAbsoluteIso(iso: string | null | undefined): string {
  const d = parseIsoDate(iso);
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export function formatRelativeAgo(iso: string | null | undefined, nowMs: number = Date.now()): string {
  const d = parseIsoDate(iso);
  if (!d) return '—';
  const sec = Math.round((nowMs - d.getTime()) / 1000);
  if (sec < 0) return 'clock skew';
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function formatIsoWithRelative(iso: string | null | undefined, nowMs?: number): { absolute: string; relative: string } {
  return {
    absolute: formatAbsoluteIso(iso),
    relative: formatRelativeAgo(iso, nowMs),
  };
}

export function humanizeCacheAgeSeconds(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return 'never / unknown';
  if (seconds < 60) return `${Math.round(seconds)}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${(seconds / 3600).toFixed(1)}h ago`;
}

export function cacheAgeTone(seconds: number | null | undefined): 'default' | 'success' | 'warning' | 'error' {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return 'warning';
  if (seconds > 3600) return 'warning';
  return 'success';
}
