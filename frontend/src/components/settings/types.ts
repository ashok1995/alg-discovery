export interface SystemSettings {
  autoRefresh: boolean;
  refreshInterval: number;
  riskLevel: 'low' | 'medium' | 'high';
  maxPositions: number;
  defaultStopLoss: number;
  defaultTarget: number;
  notifications: boolean;
  soundAlerts: boolean;
  emailAlerts: boolean;
  marketHours: { start: string; end: string };
  cacheEnabled: boolean;
  cacheDuration: number;
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}
