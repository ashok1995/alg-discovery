import React from 'react';
import { Timeline as TimelineIcon, TrendingUp, TrendingDown, AccountBalance } from '@mui/icons-material';
import { StrategyType } from '../types/apiModels';

export interface StrategyConfigItem {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  riskLevel: string;
  minScore: number;
  timeFrame: string;
}

export const strategyConfig: Record<string, StrategyConfigItem> = {
  [StrategyType.SWING]: {
    label: 'Swing Trading',
    description: '3-10 day positions',
    icon: <TimelineIcon />,
    color: '#1976d2',
    riskLevel: 'medium',
    minScore: 65,
    timeFrame: '3-10 days'
  },
  [StrategyType.INTRADAY_BUY]: {
    label: 'Intraday Buy',
    description: 'Same day buy signals',
    icon: <TrendingUp />,
    color: '#2e7d32',
    riskLevel: 'high',
    minScore: 70,
    timeFrame: 'Same day'
  },
  [StrategyType.INTRADAY_SELL]: {
    label: 'Intraday Sell',
    description: 'Same day sell signals',
    icon: <TrendingDown />,
    color: '#d32f2f',
    riskLevel: 'high',
    minScore: 70,
    timeFrame: 'Same day'
  },
  [StrategyType.LONG_TERM]: {
    label: 'Long Term',
    description: 'Weeks to months holding',
    icon: <AccountBalance />,
    color: '#7b1fa2',
    riskLevel: 'low',
    minScore: 75,
    timeFrame: 'Weeks-Months'
  },
  [StrategyType.SHORT_TERM]: {
    label: 'Short Term',
    description: '1-3 day positions',
    icon: <TimelineIcon />,
    color: '#f57c00',
    riskLevel: 'medium',
    minScore: 70,
    timeFrame: '1-3 days'
  }
};

export const strategyTypeMap: Record<string, string> = {
  [StrategyType.SWING]: 'swing',
  [StrategyType.INTRADAY_BUY]: 'intraday-buy',
  [StrategyType.INTRADAY_SELL]: 'intraday-sell',
  [StrategyType.LONG_TERM]: 'long-buy',
  [StrategyType.SHORT_TERM]: 'swing'
};

export const riskColorMap: Record<string, string> = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336'
};
