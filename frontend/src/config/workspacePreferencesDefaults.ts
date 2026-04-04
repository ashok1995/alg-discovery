/**
 * Default workspace preferences (browser localStorage). Single source for merge + migrations.
 */

import type { SystemSettings } from '../components/settings/types';

export const WORKSPACE_PREFERENCES_STORAGE_KEY = 'algdiscovery.workspace.v2';

/** Defaults when no localStorage or partial save. */
export const DEFAULT_WORKSPACE_SETTINGS: SystemSettings = {
  autoRefresh: true,
  refreshInterval: 30,
  recommendationsMinScore: 60,
  recommendationsMaxResults: 20,
  maxPositions: 5,
  defaultStopLoss: 2.0,
  defaultTarget: 5.0,
  notifications: true,
  soundAlerts: false,
  emailAlerts: false,
  positionWindows: {
    intraday: {
      sessionOpen: '09:30',
      sessionClose: '15:25',
      entryCutoff: '14:30',
      exitCutoff: '15:22',
    },
    other: {
      sessionOpen: '09:15',
      sessionClose: '15:29',
    },
  },
  cacheEnabled: true,
  cacheDuration: 300,
  debugMode: false,
  logLevel: 'info',
};

function deepMergePositionWindows(
  base: SystemSettings['positionWindows'],
  patch: Partial<SystemSettings['positionWindows']> | undefined
): SystemSettings['positionWindows'] {
  if (!patch) return base;
  return {
    intraday: { ...base.intraday, ...patch.intraday },
    other: { ...base.other, ...patch.other },
  };
}

/** Merge partial stored JSON onto defaults (tolerates v1 keys like marketHours). */
export function mergeWorkspaceSettings(partial: Record<string, unknown> | null | undefined): SystemSettings {
  if (!partial || typeof partial !== 'object') {
    return { ...DEFAULT_WORKSPACE_SETTINGS };
  }
  const p = partial as Partial<SystemSettings> & { marketHours?: unknown; riskLevel?: unknown };
  const base: SystemSettings = { ...DEFAULT_WORKSPACE_SETTINGS };
  (Object.keys(p) as (keyof SystemSettings)[]).forEach((key) => {
    const v = p[key];
    if (v === undefined) return;
    if (key === 'positionWindows' || key === 'recommendationsMinScore' || key === 'recommendationsMaxResults') return;
    (base as unknown as Record<string, unknown>)[key as string] = v as unknown;
  });
  base.positionWindows = deepMergePositionWindows(
    DEFAULT_WORKSPACE_SETTINGS.positionWindows,
    p.positionWindows as Partial<SystemSettings['positionWindows']> | undefined
  );
  base.recommendationsMinScore =
    typeof p.recommendationsMinScore === 'number' ? p.recommendationsMinScore : DEFAULT_WORKSPACE_SETTINGS.recommendationsMinScore;
  base.recommendationsMaxResults =
    typeof p.recommendationsMaxResults === 'number'
      ? p.recommendationsMaxResults
      : DEFAULT_WORKSPACE_SETTINGS.recommendationsMaxResults;
  return base;
}

export function readWorkspaceSettingsFromStorage(): SystemSettings {
  try {
    const raw = localStorage.getItem(WORKSPACE_PREFERENCES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WORKSPACE_SETTINGS };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return mergeWorkspaceSettings(parsed);
  } catch {
    return { ...DEFAULT_WORKSPACE_SETTINGS };
  }
}

export function writeWorkspaceSettingsToStorage(settings: SystemSettings): void {
  try {
    localStorage.setItem(WORKSPACE_PREFERENCES_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* quota / private mode */
  }
}
