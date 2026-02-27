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
  intraday: SeedStrategyType.INTRADAY,
  'intraday-buy': SeedStrategyType.INTRADAY,
  intraday_buy: SeedStrategyType.INTRADAY,
  'intraday-sell': SeedStrategyType.INTRADAY,
  intraday_sell: SeedStrategyType.INTRADAY,
  long_term: SeedStrategyType.LONG_TERM,
  'long-term': SeedStrategyType.LONG_TERM,
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

/** Map recommendation type to strategy string */
export const TYPE_TO_STRATEGY: Record<string, string> = {
  swing: 'swing',
  'long-buy': 'long_term',
  'intraday-buy': 'intraday',
  'intraday-sell': 'intraday',
};

export function getStrategyForType(type: string): string | undefined {
  return TYPE_TO_STRATEGY[type];
}
