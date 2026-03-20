/**
 * Trading UI helpers - extracted from trading.ts to keep files under 300 lines
 */

import type { ValidationError } from './common';
import {
  StrategyType,
  RiskLevel,
  MarketCondition,
  LossTighteningMode,
  SortBy,
  SortDirection,
  InvestmentHorizon,
} from './tradingEnums';
import type { UIRecommendationRequest } from './trading';

export function validateUIRequest(request: Partial<UIRecommendationRequest>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!request.strategy) errors.push({ field: 'strategy', message: 'Strategy is required' });
  // risk_level optional: Seed GET /v2/recommendations does not use it (min_score only).
  if (request.min_score !== undefined && (request.min_score < 0 || request.min_score > 100)) {
    errors.push({ field: 'min_score', message: 'Min score must be between 0 and 100' });
  }
  if (request.limit !== undefined && (request.limit < 1 || request.limit > 100)) {
    errors.push({ field: 'limit', message: 'Limit must be between 1 and 100' });
  }
  return errors;
}

export function getDefaultUIRequest(): UIRecommendationRequest {
  return {
    strategy: StrategyType.SWING,
    risk_level: RiskLevel.MEDIUM,
    investment_horizon: InvestmentHorizon.MEDIUM_TERM,
    max_positions: 10,
    profit_target_value: 5,
    stop_loss_percentage: 3,
    min_price: 10,
    max_price: 10000,
    min_volume: 100000,
    min_score: 60,
    limit: 20,
    sort_by: SortBy.SCORE,
    sort_direction: SortDirection.DESC,
  };
}

export function getDropdownOptions() {
  return {
    strategies: [
      { value: StrategyType.SWING_BUY, label: 'Swing Buy' },
      { value: StrategyType.SWING_SELL, label: 'Swing Sell' },
      { value: StrategyType.INTRADAY_BUY, label: 'Intraday Buy' },
      { value: StrategyType.INTRADAY_SELL, label: 'Intraday Sell' },
      { value: StrategyType.SHORT, label: 'Short (1-5 days)' },
      { value: StrategyType.POSITIONAL, label: 'Positional (30-120 days)' },
      { value: StrategyType.SWING, label: 'Swing (legacy)' },
    ],
    riskLevels: [
      { value: RiskLevel.LOW, label: 'Low Risk' },
      { value: RiskLevel.MEDIUM, label: 'Medium Risk' },
      { value: RiskLevel.HIGH, label: 'High Risk' },
    ],
    investmentHorizons: [
      { value: InvestmentHorizon.INTRADAY, label: 'Intraday' },
      { value: InvestmentHorizon.SHORT_TERM, label: 'Short Term (1-3 days)' },
      { value: InvestmentHorizon.MEDIUM_TERM, label: 'Medium Term (1-4 weeks)' },
      { value: InvestmentHorizon.LONG_TERM, label: 'Long Term (1+ months)' },
      { value: InvestmentHorizon.POSITION, label: 'Position' },
    ],
    sectors: [],
    marketCaps: [],
    marketConditions: [
      { value: MarketCondition.BULLISH, label: 'Bullish' },
      { value: MarketCondition.BEARISH, label: 'Bearish' },
      { value: MarketCondition.NEUTRAL, label: 'Neutral' },
      { value: MarketCondition.AUTO_DETECTED, label: 'Auto Detected' },
    ],
    lossTighteningModes: [
      { value: LossTighteningMode.CONSERVATIVE, label: 'Conservative' },
      { value: LossTighteningMode.MODERATE, label: 'Moderate' },
      { value: LossTighteningMode.AGGRESSIVE, label: 'Aggressive' },
    ],
    sortOptions: [
      { value: SortBy.SCORE, label: 'Score' },
      { value: SortBy.PRICE, label: 'Price' },
      { value: SortBy.VOLUME, label: 'Volume' },
      { value: SortBy.MARKET_CAP, label: 'Market Cap' },
      { value: SortBy.CHANGE_PERCENT, label: 'Change %' },
      { value: SortBy.RSI, label: 'RSI' },
    ],
    sortDirections: [
      { value: SortDirection.ASC, label: 'Ascending' },
      { value: SortDirection.DESC, label: 'Descending' },
    ],
    presets: [],
  };
}
