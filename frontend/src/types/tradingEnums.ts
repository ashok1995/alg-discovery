/**
 * Trading enums - extracted from trading.ts to keep files under 300 lines
 */

export enum StrategyType {
  SWING = 'swing',
  SWING_BUY = 'swing_buy',
  SWING_SELL = 'swing_sell',
  INTRADAY_BUY = 'intraday_buy',
  INTRADAY_SELL = 'intraday_sell',
  SHORT = 'short',
  POSITIONAL = 'positional',
  LONG_TERM = 'long_term',
  SHORT_TERM = 'short_term',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum MarketCondition {
  BULLISH = 'bullish',
  BEARISH = 'bearish',
  NEUTRAL = 'neutral',
  AUTO_DETECTED = 'auto_detected',
}

export enum Sector {
  IT = 'i.t',
  FINANCE = 'finance',
  FMCG = 'fmcg',
  AUTO = 'auto',
  PHARMA = 'pharma',
  METALS = 'metals',
  REALTY = 'realty',
  SERVICES = 'services',
  TEXTILES = 'textiles',
  INDUSTRIALS = 'industrials',
  MEDIA = 'media',
  ENERGY = 'energy',
  TELECOM = 'telecom',
  INDICES = 'indices',
}

export enum MarketCap {
  LARGECAP = 'largecap',
  MIDCAP = 'midcap',
  SMALLCAP = 'smallcap',
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SortBy {
  SCORE = 'score',
  PRICE = 'price',
  VOLUME = 'volume',
  MARKET_CAP = 'market_cap',
  CHANGE_PERCENT = 'change_percent',
  RSI = 'rsi',
}

export enum InvestmentHorizon {
  INTRADAY = 'intraday',
  SHORT_TERM = 'short_term',
  MEDIUM_TERM = 'medium_term',
  LONG_TERM = 'long_term',
  POSITION = 'position',
}

export enum LossTighteningMode {
  CONSERVATIVE = 'conservative',
  MODERATE = 'moderate',
  AGGRESSIVE = 'aggressive',
}

export enum MarketSession {
  PRE = 'pre',
  REGULAR = 'regular',
  POST = 'post',
  PRE_POST = 'pre_post',
  BEFORE_0900 = 'before_0900',
  PRE_OPEN_0900_0915 = 'pre_open_0900_0915',
  REGULAR_0915_1445 = 'regular_0915_1445',
  CLOSING_1445_1530 = 'closing_1445_1530',
  AFTER_1530 = 'after_1530',
  CLOSED = 'closed',
}
