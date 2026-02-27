export interface SystemComponent {
  name: string;
  status: 'running' | 'stopped' | 'error';
  last_start: string;
  uptime: string;
  performance: {
    cpu_usage: number;
    memory_usage: number;
    error_count: number;
  };
  config: Record<string, unknown>;
}

export interface DataCollectionSchedule {
  component: string;
  enabled: boolean;
  interval_minutes: number;
  last_run: string;
  next_run: string;
  success_rate: number;
}

export interface SystemConfig {
  redis: {
    host: string;
    port: number;
    db: number;
  };
  database: {
    type: string;
    host: string;
    port: number;
    name: string;
  };
  zerodha: {
    api_key: string;
    access_token: string;
    rate_limit_per_minute: number;
  };
  chartink: {
    enabled: boolean;
    api_key: string;
    rate_limit_per_minute: number;
  };
  trading: {
    max_positions: number;
    risk_per_trade: number;
    max_capital_per_trade: number;
  };
}
