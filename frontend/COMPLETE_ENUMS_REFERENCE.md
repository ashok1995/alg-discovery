# 📊 Complete Enums Reference for Recommendation Service

This document provides a comprehensive reference for all enum values and constants supported by the universal recommendation request model. These reflect current frontend expectations and should align with backend feasibility.

## 🎯 **Core Strategy Types**

```typescript
enum StrategyType {
  SWING = 'swing',                    // 3-10 day trading
  INTRADAY_BUY = 'intraday_buy',     // Same day buy signals  
  INTRADAY_SELL = 'intraday_sell',   // Same day sell signals
  LONG_TERM = 'long_term',           // Weeks to months holding
  SHORT_TERM = 'short_term'          // Short-term positions
}
```

**Available Values:**
- `swing` - 3-10 day trading positions
- `intraday_buy` - Same day buy signals
- `intraday_sell` - Same day sell signals
- `long_term` - Weeks to months holding period
- `short_term` - Short-term positions

## 📈 **Sort Options**

```typescript
enum SortDirection {
  ASC = 'asc',    // Ascending order
  DESC = 'desc'   // Descending order
}
```

**Available Values:**
- `asc` - Ascending order (low to high)
- `desc` - Descending order (high to low)

**Sortable Fields:**
- `score` - Recommendation score (0-100)
- `price` - Current price
- `last_price` - Last known price
- `volume` - Trading volume
- `market_cap` - Market capitalization
- `change_percent` - Price change percentage
- `technical_score` - Technical analysis score
- `fundamental_score` - Fundamental analysis score
- `combined_score` - Combined score

## ⏰ **Market Sessions (IST)**

```typescript
enum MarketSession {
  // High-level sessions
  PRE = 'pre',                    // Before market open
  REGULAR = 'regular',            // Normal trading hours
  POST = 'post',                  // After market close
  PRE_POST = 'pre_post',          // Extended hours
  
  // Detailed India market windows
  BEFORE_0900 = 'before_0900',              // Before 09:00
  PRE_OPEN_0900_0915 = 'pre_open_0900_0915', // 09:00 - 09:15
  REGULAR_0915_1445 = 'regular_0915_1445',   // 09:15 - 14:45
  CLOSING_1445_1530 = 'closing_1445_1530',   // 14:45 - 15:30
  AFTER_1530 = 'after_1530',                 // After 15:30
  CLOSED = 'closed'                         // Holidays/weekends/outside hours
}
```

**Available Values:**
- `pre` - Before market open
- `regular` - Normal trading hours
- `post` - After market close
- `pre_post` - Extended hours
- `before_0900` - Before 09:00 IST
- `pre_open_0900_0915` - 09:00 - 09:15 IST
- `regular_0915_1445` - 09:15 - 14:45 IST
- `closing_1445_1530` - 14:45 - 15:30 IST
- `after_1530` - After 15:30 IST
- `closed` - Holidays/weekends/outside hours

## 📊 **Market Conditions**

```typescript
enum MarketCondition {
  BULLISH = 'bullish',    // Rising market
  BEARISH = 'bearish',    // Declining market
  NEUTRAL = 'neutral'     // Sideways market
}
```

**Available Values:**
- `bullish` - Rising market trend
- `bearish` - Declining market trend
- `neutral` - Sideways market trend

## ⚖️ **Risk Levels**

```typescript
const RISK_LEVELS = [
  'low',      // Conservative approach
  'medium',   // Balanced risk
  'high'      // Aggressive strategy
] as const;
```

**Available Values:**
- `low` - Conservative approach, lower risk
- `medium` - Balanced risk approach
- `high` - Aggressive strategy, higher risk

## ⏱️ **Time Frames**

```typescript
const TIME_FRAMES = [
  'intraday',   // Same day trading
  'swing',      // 3-10 day positions
  'long_term'   // Extended holding periods
] as const;
```

**Available Values:**
- `intraday` - Same day trading
- `swing` - 3-10 day positions
- `long_term` - Extended holding periods

## 🏭 **Sectors & Industries**

```typescript
const SECTORS = [
  'Banking',           // Financial services
  'IT',               // Information Technology
  'Oil & Gas',        // Energy sector
  'Pharma',           // Pharmaceuticals
  'FMCG',            // Fast Moving Consumer Goods
  'Telecom',         // Telecommunications
  'Auto',            // Automotive
  'Metals',          // Metal & Mining
  'Real Estate',     // Real Estate
  'Healthcare',      // Healthcare services
  'Power',           // Power & Utilities
  'Media',           // Media & Entertainment
  'Chemicals',       // Chemical industry
  'Textiles',        // Textile industry
  'Infrastructure',  // Infrastructure
  'Agriculture',     // Agriculture
  'Defense',         // Defense & Aerospace
  'Education',       // Education
  'Logistics',       // Logistics & Transportation
  'Retail'           // Retail
] as const;
```

## 🎯 **Score Filters (NEW)**

```typescript
interface ScoreFilters {
  min_score?: number;           // Minimum recommendation score (0-100)
  max_score?: number;           // Maximum recommendation score (0-100)
  score_range?: { min?: number; max?: number }; // Score range filter
  technical_score_min?: number; // Minimum technical score
  fundamental_score_min?: number; // Minimum fundamental score
  combined_score_min?: number;  // Minimum combined score
}
```

**Score Ranges:**
- `min_score`: 0-100 (default: 10)
- `max_score`: 0-100 (default: 100)
- `technical_score_min`: 0-100 (default: 0)
- `fundamental_score_min`: 0-100 (default: 0)
- `combined_score_min`: 0-100 (default: 0)

## 📊 **Technical Indicators**

```typescript
const TECHNICAL_INDICATORS = {
  // Momentum Indicators
  rsi: { min: 0, max: 100 },           // Relative Strength Index
  macd: ['bullish', 'bearish', 'neutral'], // MACD Signal
  
  // Moving Averages
  sma_20: 'number',                    // 20-day Simple Moving Average
  sma_50: 'number',                    // 50-day Simple Moving Average
  ema_12: 'number',                    // 12-day Exponential Moving Average
  ema_26: 'number',                    // 26-day Exponential Moving Average
  
  // Volatility Indicators
  bollinger_bands: {
    upper: 'number',
    middle: 'number', 
    lower: 'number'
  },
  
  // Volume Indicators
  volume_sma: 'number',                // Volume Simple Moving Average
  volume_ratio: 'number',              // Volume ratio
  
  // Price Action
  support_level: 'number',            // Support price level
  resistance_level: 'number',          // Resistance price level
  breakout_level: 'number'             // Breakout price level
} as const;
```

**Technical Indicator Values:**
- **RSI**: 0-100 range
- **MACD**: `bullish`, `bearish`, `neutral`
- **Moving Averages**: Numeric values
- **Volume**: Numeric multipliers (e.g., 1.5x, 2.0x)

## 📊 **Fundamental Metrics**

```typescript
const FUNDAMENTAL_METRICS = {
  // Valuation Ratios
  pe_ratio: { min: 0, max: 100 },      // Price-to-Earnings
  pb_ratio: { min: 0, max: 10 },       // Price-to-Book
  ps_ratio: { min: 0, max: 20 },       // Price-to-Sales
  peg_ratio: { min: 0, max: 5 },       // PEG Ratio
  
  // Profitability
  roe: { min: 0, max: 100 },           // Return on Equity (%)
  roa: { min: 0, max: 50 },            // Return on Assets (%)
  roic: { min: 0, max: 50 },           // Return on Invested Capital (%)
  
  // Financial Health
  debt_to_equity: { min: 0, max: 5 },  // Debt-to-Equity Ratio
  current_ratio: { min: 0, max: 10 },  // Current Ratio
  quick_ratio: { min: 0, max: 10 },    // Quick Ratio
  
  // Growth Metrics
  revenue_growth: { min: -100, max: 100 }, // Revenue Growth (%)
  profit_growth: { min: -100, max: 100 },  // Profit Growth (%)
  eps_growth: { min: -100, max: 100 }      // EPS Growth (%)
} as const;
```

## 📈 **Include Flags**

```typescript
interface UniversalIncludeFlags {
  real_time_prices?: boolean;      // Live price data
  technical_indicators?: boolean;  // Technical analysis
  fundamentals?: boolean;          // Fundamental analysis
  sentiment?: boolean;             // Market sentiment
  alerts?: boolean;               // Price/volume alerts
  ai_analysis?: boolean;           // AI-powered analysis
}
```

**Available Values:**
- `real_time_prices`: `true`/`false` (default: `true`)
- `technical_indicators`: `true`/`false` (default: `true`)
- `fundamentals`: `true`/`false` (default: `true`)
- `sentiment`: `true`/`false` (default: `false`)
- `alerts`: `true`/`false` (default: `true`)
- `ai_analysis`: `true`/`false` (default: `true`)

## 📊 **Confidence Levels**

```typescript
const CONFIDENCE_LEVELS = [
  'high',    // High confidence recommendation
  'medium',  // Medium confidence recommendation  
  'low'      // Low confidence recommendation
] as const;
```

**Available Values:**
- `high` - High confidence recommendation
- `medium` - Medium confidence recommendation
- `low` - Low confidence recommendation

## 🎯 **Recommendation Types**

```typescript
const RECOMMENDATION_TYPES = [
  'buy',     // Buy recommendation
  'sell',    // Sell recommendation
  'hold'     // Hold recommendation
] as const;
```

**Available Values:**
- `buy` - Buy recommendation
- `sell` - Sell recommendation
- `hold` - Hold recommendation

## 🔍 **Trace Sources**

```typescript
const TRACE_SOURCES = [
  'web',     // Web application
  'cli',     // Command line interface
  'job',     // Background job
  'api',     // API call
  'mobile'   // Mobile application
] as const;
```

**Available Values:**
- `web` - Web application
- `cli` - Command line interface
- `job` - Background job
- `api` - API call
- `mobile` - Mobile application

## 📝 **Complete Enum Usage Example**

```json
{
  "strategy": "swing",
  "include": {
    "real_time_prices": true,
    "technical_indicators": true,
    "fundamentals": true,
    "sentiment": false,
    "alerts": true,
    "ai_analysis": true
  },
  "filters": {
    "risk_levels": ["low", "medium"],
    "sectors": ["IT", "Banking"],
    "time_frame": "swing",
    "technicals": {
      "rsi_min": 55,
      "rsi_max": 75,
      "macd": "bullish"
    },
    "fundamentals": {
      "pe_max": 40,
      "debt_to_equity_max": 0.5,
      "roe_min": 10.0
    }
  },
  "score_filters": {
    "min_score": 70,
    "max_score": 95,
    "technical_score_min": 75,
    "fundamental_score_min": 65,
    "combined_score_min": 70
  },
  "sort": {
    "by": "score",
    "direction": "desc"
  },
  "context": {
    "condition": "neutral",
    "session": "regular_0915_1445"
  },
  "trace": {
    "request_id": "swing_req_20250113_001",
    "source": "web",
    "user_id": "user_123"
  },
  "limit": 50
}
```

## 🚀 **Quick Reference Tables**

### Strategy Types
| Value | Description | Use Case |
|-------|-------------|----------|
| `swing` | 3-10 day trading | Medium-term positions |
| `intraday_buy` | Same day buy | Day trading opportunities |
| `intraday_sell` | Same day sell | Day trading exits |
| `long_term` | Weeks to months | Investment positions |
| `short_term` | Short-term | Quick trades |

### Risk Levels
| Value | Description | Characteristics |
|-------|-------------|-----------------|
| `low` | Conservative | Stable, low volatility |
| `medium` | Balanced | Moderate risk/reward |
| `high` | Aggressive | High risk, high reward |

### Market Conditions
| Value | Description | Market State |
|-------|-------------|--------------|
| `bullish` | Rising market | Upward trend |
| `bearish` | Declining market | Downward trend |
| `neutral` | Sideways market | Range-bound |

### Market Sessions (IST)
| Value | Time | Description |
|-------|------|-------------|
| `before_0900` | Before 09:00 | Pre-market |
| `pre_open_0900_0915` | 09:00 - 09:15 | Pre-open session |
| `regular_0915_1445` | 09:15 - 14:45 | Regular trading |
| `closing_1445_1530` | 14:45 - 15:30 | Closing session |
| `after_1530` | After 15:30 | Post-market |
| `closed` | N/A | Market closed |

## 📋 **Notes**

- **Technical, fundamental, and sentiment filters** accept structured objects to allow future extension without breaking the schema
- **Score filters** provide granular control over different types of scores
- **All numeric ranges** are inclusive (e.g., min_score: 70 includes scores >= 70)
- **Enum values are case-sensitive** and must match exactly
- **Backend validation** should enforce these enum constraints

---

*Last updated: January 2025 - Score filters added, variants removed*