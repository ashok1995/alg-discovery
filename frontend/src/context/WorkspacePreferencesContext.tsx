/**
 * Workspace preferences: localStorage-backed, shared across Settings and pages (e.g. Recommendations).
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { SystemSettings } from '../components/settings/types';
import {
  DEFAULT_WORKSPACE_SETTINGS,
  readWorkspaceSettingsFromStorage,
  writeWorkspaceSettingsToStorage,
} from '../config/workspacePreferencesDefaults';

interface WorkspacePreferencesContextValue {
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  updateSetting: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
  saveToStorage: () => void;
  resetToDefaults: () => void;
}

const WorkspacePreferencesContext = createContext<WorkspacePreferencesContextValue | null>(null);

export const WorkspacePreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings>(() => readWorkspaceSettingsFromStorage());

  const updateSetting = useCallback(<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveToStorage = useCallback(() => {
    setSettings((current) => {
      writeWorkspaceSettingsToStorage(current);
      return current;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    const next = { ...DEFAULT_WORKSPACE_SETTINGS };
    setSettings(next);
    writeWorkspaceSettingsToStorage(next);
  }, []);

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      updateSetting,
      saveToStorage,
      resetToDefaults,
    }),
    [settings, updateSetting, saveToStorage, resetToDefaults]
  );

  return <WorkspacePreferencesContext.Provider value={value}>{children}</WorkspacePreferencesContext.Provider>;
};

export function useWorkspacePreferences(): WorkspacePreferencesContextValue {
  const ctx = useContext(WorkspacePreferencesContext);
  if (!ctx) {
    throw new Error('useWorkspacePreferences must be used within WorkspacePreferencesProvider');
  }
  return ctx;
}
