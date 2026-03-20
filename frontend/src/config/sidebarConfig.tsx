import React from 'react';
import {
  Dashboard,
  TrendingUp,
  Assessment,
  Settings,
  Analytics,
  Storage,
  AutoAwesome,
  Business,
  Build,
  Home,
  Psychology,
  ViewList,
  ShowChart,
  Visibility,
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
    description: 'Summary — market context, P&L strip, horizon cards, universe',
    category: 'main'
  },
  {
    text: 'Dashboard',
    icon: <Dashboard />,
    path: '/seed-dashboard',
    description: 'Summary — KPIs, quick stats, market movers, links to detail pages',
    category: 'main'
  },
  {
    text: 'Positions',
    icon: <ViewList />,
    path: '/positions',
    description: 'Paper trading & learning positions with filters',
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
    text: 'Market Movers',
    icon: <ShowChart />,
    path: '/market-movers',
    description: 'Top gainers, losers & most traded',
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
    path: '/ml-learning',
    description: 'ARM weights, Thompson Sampling, score-bin performance',
    category: 'analysis'
  },
  {
    text: 'ARM manager',
    icon: <Analytics />,
    path: '/arm-manager',
    description: 'Seed /api/v2/arms — catalog, verify-query, create/update, scenarios, performance, observability',
    category: 'analysis'
  },
  {
    text: 'Universe Manager',
    icon: <Storage />,
    path: '/universe',
    description: 'Seed universe-health API, stock mappings, candidates',
    category: 'management'
  },
  {
    text: 'Observability',
    icon: <Visibility />,
    path: '/observability',
    description: 'Read-only: pulse, pipeline, service map, learning (no config)',
    category: 'tools'
  },
  {
    text: 'System Settings',
    icon: <Build />,
    path: '/settings',
    description: 'Configure: API, workspace, Seed trading/platform (view telemetry on Observability)',
    category: 'tools'
  },
];

export const categories = {
  main: { title: 'Main', icon: <Dashboard /> },
  trading: { title: 'Trading', icon: <TrendingUp /> },
  analysis: { title: 'Analysis', icon: <Assessment /> },
  management: { title: 'Management', icon: <Settings /> },
  tools: { title: 'Tools', icon: <Build /> }
} as const;
