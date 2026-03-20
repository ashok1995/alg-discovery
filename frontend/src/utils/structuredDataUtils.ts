/**
 * Helpers for nested object/array trees (Seed settings UI, read-only viewers).
 */

import type { PathSegment } from '../types/structuredData';

const MAX_HUMANIZE = 80;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** e.g. max_slippage_pct → Max slippage pct */
export function humanizeKey(key: string): string {
  if (!key) return key;
  const spaced = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Immutable set of value at path. Creates missing object/array shells along the path.
 */
export function setPathImmutable(root: unknown, path: PathSegment[], value: unknown): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;

  if (typeof head === 'number') {
    const arr = Array.isArray(root) ? [...root] : [];
    while (arr.length <= head) {
      arr.push(undefined);
    }
    arr[head] = setPathImmutable(arr[head], rest, value);
    return arr;
  }

  const key = String(head);
  const obj: Record<string, unknown> = isPlainObject(root) ? { ...root } : {};
  obj[key] = setPathImmutable(obj[key], rest, value);
  return obj;
}

/** True if array of [number, number] tuples (e.g. score_tiers). */
export function isScoreTierTuples(value: unknown): value is [number, number][] {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === 2 &&
      typeof row[0] === 'number' &&
      typeof row[1] === 'number' &&
      Number.isFinite(row[0]) &&
      Number.isFinite(row[1])
  );
}

/** True if object values are all finite numbers (e.g. charges map). */
export function isFlatNumberRecord(value: unknown): value is Record<string, number> {
  if (!isPlainObject(value)) return false;
  const entries = Object.entries(value);
  if (entries.length === 0) return false;
  return entries.every(([, v]) => typeof v === 'number' && Number.isFinite(v));
}

export function truncateForDisplay(text: string, max = MAX_HUMANIZE): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
