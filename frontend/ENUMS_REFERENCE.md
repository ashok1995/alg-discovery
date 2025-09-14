### Universal Recommendation Enums

This document lists enum values supported by the universal recommendation request model. These reflect current frontend expectations and should align with backend feasibility.

#### StrategyType
- swing
- intraday_buy
- intraday_sell
- long_term
- short_term

#### SortDirection
- asc
- desc

#### MarketSession
- pre
- regular
- post
- pre_post

Detailed time windows (IST):
- before_0900 (Before 09:00)
- pre_open_0900_0915 (09:00 – 09:15)
- regular_0915_1445 (09:15 – 14:45)
- closing_1445_1530 (14:45 – 15:30)
- after_1530 (After 15:30)
- closed (holidays/weekends/outside hours)

#### MarketCondition
- bullish
- bearish
- neutral

#### Risk Levels (string literals)
- low
- medium
- high

#### Time Frame (filters.time_frame)
- intraday
- swing
- long_term

#### Score Filters
- min_score: Minimum recommendation score (0-100)
- max_score: Maximum recommendation score (0-100)
- score_range: Score range filter with min/max
- technical_score_min: Minimum technical analysis score
- fundamental_score_min: Minimum fundamental analysis score
- combined_score_min: Minimum combined score

Notes
- Technical, fundamental, and sentiment filters accept structured objects to allow future extension without breaking the schema.

Example
```json
{
  "strategy": "swing",
  "include": {
    "real_time_prices": true,
    "technical_indicators": true
  },
  "filters": {
    "risk_levels": ["low", "medium"],
    "time_frame": "swing"
  },
  "score_filters": {
    "min_score": 70,
    "technical_score_min": 75,
    "fundamental_score_min": 65
  },
  "sort": { "by": "score", "direction": "desc" },
  "context": { "condition": "neutral", "session": "regular_0915_1445" }
}
```


