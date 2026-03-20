/**
 * Client-side session windows for position open/close (IST-style HH:mm, browser local clock).
 * Server-side Seed rules remain authoritative; this guides UI affordances.
 */

import type { StrategyPositionWindow } from '../components/settings/types';

function toMinutes(hhmm: string): number {
  const parts = hhmm.split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function nowMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Inclusive [sessionOpen, sessionClose] on the same calendar day. */
export function isWithinSession(now: Date, w: StrategyPositionWindow): boolean {
  const cur = nowMinutes(now);
  const a = toMinutes(w.sessionOpen);
  const b = toMinutes(w.sessionClose);
  return cur >= a && cur <= b;
}

/** True if current time is on or before entry cutoff (for new intraday entries). */
export function isBeforeOrAtEntryCutoff(now: Date, w: StrategyPositionWindow): boolean {
  if (!w.entryCutoff) return true;
  return nowMinutes(now) <= toMinutes(w.entryCutoff);
}

/** True if current time is on or before exit cutoff (intraday exit deadline). */
export function isBeforeOrAtExitCutoff(now: Date, w: StrategyPositionWindow): boolean {
  if (!w.exitCutoff) return true;
  return nowMinutes(now) <= toMinutes(w.exitCutoff);
}

export function canOpenPositionInWindow(now: Date, w: StrategyPositionWindow, isIntraday: boolean): boolean {
  if (!isWithinSession(now, w)) return false;
  if (isIntraday) {
    return isBeforeOrAtEntryCutoff(now, w);
  }
  return true;
}
