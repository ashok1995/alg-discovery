import React from 'react';
import { API_CONFIG } from './api';
import {
  TrendingUp,
  Timeline,
  ShowChart,
  Analytics,
  PieChart,
  Science,
  AccountTree,
  Dashboard,
  Business,
  Map,
  People,
  Assessment,
  Build,
  Security,
  CheckCircle
} from '@mui/icons-material';

export interface ServiceInfoConfig {
  name: string;
  displayName: string;
  port: number;
  icon: React.ReactNode;
  description: string;
  category: 'trading' | 'analysis' | 'management' | 'tools';
}

export const serviceConfig: ServiceInfoConfig[] = [
  // Trading Services
  {
    name: 'swing-api',
    displayName: 'Swing Buy AI',
    port: API_CONFIG.PORTS.SWING_API,
    icon: <TrendingUp />,
    description: 'AI-powered swing trading recommendations with real-time data',
    category: 'trading'
  },
  {
    name: 'longterm-api',
    displayName: 'Long Term Trading',
    port: API_CONFIG.PORTS.LONGTERM_API,
    icon: <Timeline />,
    description: 'Long-term investment strategies and portfolio optimization',
    category: 'trading'
  },
  {
    name: 'intraday-api',
    displayName: 'Intraday Trading',
    port: API_CONFIG.PORTS.SWING_API,
    icon: <ShowChart />,
    description: 'Intraday trading signals and real-time analysis',
    category: 'trading'
  },
  {
    name: 'intraday-service-api',
    displayName: 'Intraday Service',
    port: API_CONFIG.PORTS.SWING_API,
    icon: <Analytics />,
    description: 'Advanced intraday service with enhanced features',
    category: 'trading'
  },
  // Analysis Services
  {
    name: 'variants-api',
    displayName: 'Strategy Variants',
    port: API_CONFIG.PORTS.SWING_API,
    icon: <PieChart />,
    description: 'Multiple trading strategy variants and backtesting',
    category: 'analysis'
  },
  {
    name: 'algorithm-api',
    displayName: 'Algorithm Analysis',
    port: API_CONFIG.PORTS.ALGORITHM_API,
    icon: <Science />,
    description: 'Algorithmic trading analysis and optimization',
    category: 'analysis'
  },
  {
    name: 'unified-strategy-api',
    displayName: 'Unified Strategy',
    port: API_CONFIG.PORTS.UNIFIED_STRATEGY_API,
    icon: <AccountTree />,
    description: 'Unified strategy framework and cross-analysis',
    category: 'analysis'
  },
  // Management Services
  {
    name: 'dashboard-api',
    displayName: 'Dashboard',
    port: API_CONFIG.PORTS.SWING_API,
    icon: <Dashboard />,
    description: 'Main dashboard and overview analytics',
    category: 'management'
  },
  {
    name: 'zerodha-api',
    displayName: 'Zerodha Management',
    port: API_CONFIG.PORTS.ZERODHA_API,
    icon: <Business />,
    description: 'Zerodha broker integration and management',
    category: 'management'
  },
  {
    name: 'stock-mapping-api',
    displayName: 'Stock Mapping',
    port: API_CONFIG.PORTS.SWING_API,
    icon: <Map />,
    description: 'Stock mapping and categorization services',
    category: 'management'
  },
  {
    name: 'stock-candidate-populator-api',
    displayName: 'Stock Candidate',
    port: 8018,
    icon: <People />,
    description: 'Stock candidate population and screening',
    category: 'management'
  },
  // Tools Services
  {
    name: 'facts-api',
    displayName: 'Market Facts',
    port: 8008,
    icon: <Assessment />,
    description: 'Market facts and fundamental data',
    category: 'tools'
  },
  {
    name: 'misc-api',
    displayName: 'Misc Tools',
    port: 8006,
    icon: <Build />,
    description: 'Miscellaneous trading tools and utilities',
    category: 'tools'
  },
  {
    name: 'zerodha-test-api',
    displayName: 'Zerodha Test',
    port: 8010,
    icon: <Security />,
    description: 'Zerodha connection testing and validation',
    category: 'tools'
  },
  {
    name: 'validation-api',
    displayName: 'Validation Tools',
    port: 8012,
    icon: <CheckCircle />,
    description: 'Data validation and quality assurance tools',
    category: 'tools'
  }
];
