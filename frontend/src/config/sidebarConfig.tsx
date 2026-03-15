import React from 'react';
import {
  Dashboard,
  TrendingUp,
  Assessment,
  Settings,
  Analytics,
  Storage,
  FilterList,
  AutoAwesome,
  Business,
  Build,
  Home,
  Code,
  Psychology,
} from '@mui/icons-material';

export interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  description: string;
  category: 'main' | 'trading' | 'analysis' | 'management' | 'tools';
}

export const menuItems: MenuItem[] = [
  {
    text: 'Home',
    icon: <Home />,
    path: '/',
    description: 'System overview and key metrics',
    category: 'main'
  },
  {
    text: 'Dashboard',
    icon: <Dashboard />,
    path: '/seed-dashboard',
    description: 'Positions, market movers, performance, capital & P&L',
    category: 'main'
  },
  {
    text: 'Stock Recommendations',
    icon: <AutoAwesome />,
    path: '/recommendations',
    description: 'AI-powered stock recommendations with comprehensive metrics',
    category: 'trading'
  },
  {
    text: 'Investing',
    icon: <Business />,
    path: '/investing',
    description: 'Comprehensive investment opportunities & portfolio building',
    category: 'trading'
  },
  {
    text: 'ML / Learning',
    icon: <Psychology />,
    path: '/seed-dashboard?tab=ml',
    description: 'ARM weights, Thompson Sampling, reward loop',
    category: 'analysis'
  },
  {
    text: 'Backtesting',
    icon: <Assessment />,
    path: '/backtesting',
    description: 'Strategy backtesting and analysis',
    category: 'analysis'
  },
  {
    text: 'Query Manager',
    icon: <Analytics />,
    path: '/query-manager',
    description: 'Register, test, and manage queries',
    category: 'analysis'
  },
  {
    text: 'System Control',
    icon: <Settings />,
    path: '/system-control',
    description: 'Manage system components and configuration',
    category: 'management'
  },
  {
    text: 'Stock Mapping Manager',
    icon: <Storage />,
    path: '/stock-mapping',
    description: 'Manage stock mappings and database',
    category: 'management'
  },
  {
    text: 'Stock Candidate Populator',
    icon: <FilterList />,
    path: '/stock-candidate-populator',
    description: 'Populate and manage stock candidates',
    category: 'management'
  },
  {
    text: 'Settings',
    icon: <Build />,
    path: '/settings',
    description: 'Application settings and configuration',
    category: 'tools'
  },
  {
    text: 'Recommendation Service Test',
    icon: <Code />,
    path: '/test/recommendation-service',
    description: 'Test and debug recommendation service connection',
    category: 'tools'
  }
];

export const categories = {
  main: { title: 'Main', icon: <Dashboard /> },
  trading: { title: 'Trading', icon: <TrendingUp /> },
  analysis: { title: 'Analysis', icon: <Assessment /> },
  management: { title: 'Management', icon: <Settings /> },
  tools: { title: 'Tools', icon: <Build /> }
} as const;
