/** Per-style session rules (local UI; Seed trading config is server-side). */
export interface StrategyPositionWindow {
  /** Earliest time to allow new opens in this style */
  sessionOpen: string;
  /** Latest time session is treated as active for open/close */
  sessionClose: string;
  /** Latest time for new entries (intraday); optional for swing/long */
  entryCutoff?: string;
  /** Latest time intraday exits should complete */
  exitCutoff?: string;
}

export interface PositionWindowsSettings {
  intraday: StrategyPositionWindow;
  /** Swing, long, short, etc. */
  other: StrategyPositionWindow;
}

export interface SystemSettings {
  autoRefresh: boolean;
  /** Seconds between auto-refetch ticks on supported pages (tab must be visible). */
  refreshInterval: number;
  /** Seed GET /v2/recommendations — min_score (no risk_level in API). */
  recommendationsMinScore: number;
  /** Seed limit / max rows on Recommendations page. */
  recommendationsMaxResults: number;
  maxPositions: number;
  defaultStopLoss: number;
  defaultTarget: number;
  notifications: boolean;
  soundAlerts: boolean;
  emailAlerts: boolean;
  positionWindows: PositionWindowsSettings;
  cacheEnabled: boolean;
  cacheDuration: number;
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

export interface SystemStatusState {
  apiConnected: boolean;
  marketOpen: boolean;
  cacheActive: boolean;
  securityAuthenticated: boolean;
}
