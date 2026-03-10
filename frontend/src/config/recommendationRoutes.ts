/**
 * Recommendation strategy routing configuration
 * Maps frontend strategy/type/risk to Seed API format
 */

import {
  SeedStrategyType,
  SeedRiskLevel,
  SHORT_SELL_ARMS,
  BUY_ARMS,
  SWING_ARMS,
  LONG_TERM_ARMS,
} from '../types/stock';

// Endpoint keys for Seed Service
export const ENDPOINT_KEYS = {
  RECOMMENDATIONS: '/api/v2/stocks/recommendations',
  HEALTH: 'health',
} as const;

/** Map frontend strategy string to Seed API strategy */
export const STRATEGY_TO_SEED: Record<string, SeedStrategyType> = {
  swing: SeedStrategyType.SWING,
  'swing-buy': SeedStrategyType.SWING,
  swing_buy: SeedStrategyType.SWING,
  intraday: SeedStrategyType.INTRADAY_BUY,
  'intraday-buy': SeedStrategyType.INTRADAY_BUY,
  intraday_buy: SeedStrategyType.INTRADAY_BUY,
  'intraday-sell': SeedStrategyType.INTRADAY_SELL,
  intraday_sell: SeedStrategyType.INTRADAY_SELL,
  long_term: SeedStrategyType.LONG_TERM,
  'long-term': SeedStrategyType.LONG_TERM,
  short: SeedStrategyType.SHORT_TERM,
  short_term: SeedStrategyType.SHORT_TERM,
  'short-term': SeedStrategyType.SHORT_TERM,
  'long-buy': SeedStrategyType.LONG_TERM,
  balanced: SeedStrategyType.BALANCED,
  aggressive: SeedStrategyType.AGGRESSIVE,
  conservative: SeedStrategyType.CONSERVATIVE,
};

/** Map frontend risk level string to Seed API risk level */
export const RISK_TO_SEED: Record<string, SeedRiskLevel> = {
  low: SeedRiskLevel.LOW,
  conservative: SeedRiskLevel.LOW,
  medium: SeedRiskLevel.MODERATE,
  moderate: SeedRiskLevel.MODERATE,
  high: SeedRiskLevel.HIGH,
  aggressive: SeedRiskLevel.HIGH,
};

/** Get ARM strategies based on request type */
export function getArmStrategiesForType(type: string): string[] {
  switch (type.toLowerCase()) {
    case 'intraday-sell':
    case 'short-sell':
      return SHORT_SELL_ARMS;
    case 'intraday-buy':
    case 'intraday':
      return BUY_ARMS;
    case 'swing':
    case 'swing-buy':
      return SWING_ARMS;
    case 'long-term':
    case 'long-buy':
      return LONG_TERM_ARMS;
    case 'short':
    case 'short-term':
      return SWING_ARMS;
    default:
      return [];
  }
}

export function mapToSeedStrategy(strategy: string): SeedStrategyType {
  return STRATEGY_TO_SEED[strategy.toLowerCase()] ?? SeedStrategyType.SWING;
}

export function mapToSeedRiskLevel(riskLevel: string): SeedRiskLevel {
  return RISK_TO_SEED[riskLevel.toLowerCase()] ?? SeedRiskLevel.MODERATE;
}

/** Map recommendation type to V2 strategy key (must match mapStrategyToSeedTradeType keys) */
export const TYPE_TO_STRATEGY: Record<string, string> = {
  swing: 'swing',
  'long-buy': 'long_term',
  'intraday-buy': 'intraday_buy',
  'intraday-sell': 'intraday_sell',
  short: 'short_term',
  'short-term': 'short_term',
};

export function getStrategyForType(type: string): string | undefined {
  return TYPE_TO_STRATEGY[type];
}
