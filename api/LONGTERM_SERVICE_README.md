# Indian Long-Term Investment Service 🇮🇳📈

A dedicated FastAPI server for Indian long-term investment analysis and recommendations, focused on BSE/NSE Indian equities using **Chartink API filtering + Re-ranking algorithms**.

## Chartink Integration + Re-ranking Approach

This service uses a **two-stage algorithmic approach** for Indian stock recommendations:

### Stage 1: Chartink API Filtering (Seed Algorithm)
- **Primary Filter**: Utilizes [Chartink.com](https://chartink.com) screening API to identify fundamentally strong stocks
- **Filters Applied**: 
  - `fundamental_growth`: Growth stocks with strong fundamentals (PE<30, Revenue Growth>5%)
  - `value_with_momentum`: Value stocks showing price momentum (P/E ratio, weekly performance)
- **Real-time Data**: Live screening from 500+ NSE stocks
- **Technical Criteria**: Automated technical analysis including moving averages, RSI, volume patterns
- **Fundamental Screening**: PE ratios, market cap filters, revenue growth analysis

### Stage 2: Market Sentiment Re-ranking
After Chartink filtering, stocks are re-ranked using:

**Re-ranking Factors & Weights:**
- **Sector Rotation** (25%): Favors Technology, Banking, Pharma sectors
- **Market Sentiment** (30%): Based on Nifty performance and market conditions  
- **Liquidity** (20%): Average daily trading volume analysis
- **Volatility** (15%): Lower volatility preference for long-term holds
- **Peer Comparison** (10%): Sector relative performance metrics

**Final Score Calculation:**
```
Final Score = (Chartink Score × 0.6) + (Re-ranking Score × 0.4)
```

## Quick Start

```bash
# Start the server
cd api && python longterm_server.py

# Health check
curl http://localhost:8001/health
```

## 📊 Available Endpoints

### Core Endpoints

#### 1. Health Check
```bash
GET /health
```
Returns server status and service availability for Indian market analysis.

#### 2. Long-Term Recommendations (Indian Stocks)
```bash
GET /api/longterm/recommendations?limit=10&min_score=60
```
Get stock recommendations for long-term investing in BSE/NSE listed companies.

#### 3. Portfolio Suggestions (Indian Context)
```bash
GET /api/longterm/portfolio/suggestions?portfolio_value=100000&risk_tolerance=moderate
```
Get portfolio allocation suggestions optimized for Indian markets with tax considerations.

#### 4. Indian Market Outlook
```bash
GET /api/longterm/market/outlook
```
Get Indian market sentiment based on Nifty 50, Sensex, and sectoral indices.

#### 5. Indian Sector Analysis
```bash
GET /api/longterm/sectors/analysis?limit_per_sector=3
```
Get sector-wise analysis covering major Indian sectors (IT, Banking, Pharma, etc.).

#### 6. Single Stock Analysis (BSE/NSE)
```bash
GET /api/longterm/analyze/RELIANCE.NS
GET /api/longterm/analyze/TCS
```
Analyze specific Indian stocks using seed algorithms with re-ranking.

#### 7. Default Indian Watchlist
```bash
GET /api/longterm/watchlist/default
```
Get the default list of top Indian large-cap stocks for analysis.

#### 8. Strategy Information
```bash
GET /api/longterm/strategy/info
```
Get current seed algorithm weights and re-ranking factor configuration.

### POST Endpoints

#### 1. Real-Time Indian Stock Recommendations
```bash
POST /api/longterm/realtime-recommendations
Content-Type: application/json

{
  "symbols": ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS"],
  "limit": 10,
  "min_score": 60.0,
  "portfolio_value": 100000,
  "risk_tolerance": "moderate"
}
```

#### 2. Indian Portfolio Optimization
```bash
POST /api/longterm/portfolio/optimize
Content-Type: application/json

{
  "portfolio_value": 100000,
  "risk_tolerance": "moderate",
  "symbols": ["RELIANCE.NS", "TCS.NS", "INFY.NS"]
}
```

#### 3. Batch Analysis (Indian Stocks)
```bash
POST /api/longterm/batch-analysis
Content-Type: application/json

{
  "symbols": ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"],
  "min_score": 50.0
}
```

### Demo Endpoints (Always Working)

These endpoints provide sample data for Indian stocks and work without external API dependencies:

#### 1. Demo Indian Stock Recommendations
```bash
GET /api/longterm/demo/recommendations
```

#### 2. Demo Indian Portfolio
```bash
GET /api/longterm/demo/portfolio
```

#### 3. Demo Indian Sector Analysis
```bash
GET /api/longterm/demo/sectors
```

## 🛠️ Features

### ✅ **Indian Market Specific**
- **BSE/NSE Focus**: Specialized for Indian equity markets
- **Currency**: All calculations in INR (Indian Rupees)
- **Tax Optimization**: ELSS, PPF, NPS recommendations
- **SIP Integration**: Systematic Investment Plan suggestions
- **Indian Sectors**: IT, Banking, Pharma, FMCG, Energy, Auto, etc.

### ✅ **Seed Algorithm Filters + Re-ranking**
- **Fundamental Strength Filter**: PE Ratio: 5-25 range (reasonable valuation), ROE: >15% (strong profitability), Debt-to-Equity: <1.0 (manageable debt)
- **Technical Momentum Filter**: Moving Average: Price > SMA20 > SMA50 (uptrend), Volume: Recent volume >120% of average (activity), RSI: 30-70 range (good momentum, not overbought/oversold)
- **Quality Score Filter**: Profit Margin: >10% (profitable operations), Market Cap: >1000 Cr (large-cap stability)
- **Valuation Metrics Filter**: P/B Ratio: 0.5-3.0 range (reasonable book value), EV/EBITDA: 5-15 range (fair enterprise valuation)
- **Dividend Yield Filter**: Dividend Yield: >1% (income generation)

### ✅ **Re-ranking Factors**
- **Sector Rotation** (20%): Favors IT, Banking, Pharma sectors
- **Market Sentiment** (15%): Based on Nifty 50 performance
- **Liquidity** (15%): Trading volume analysis
- **Volatility** (15%): Risk-adjusted scoring
- **Peer Comparison** (20%): Relative sector performance
- **Analyst Consensus** (15%): Market outlook integration

### ✅ **Technical Features**
- Rate limiting to avoid API limits
- Error handling and fallback mechanisms
- Async processing for better performance
- CORS enabled for web access
- Comprehensive logging

## 📈 Sample Responses

### Indian Stock Recommendations Response
```json
{
  "recommendations": [
    {
      "symbol": "RELIANCE.NS",
      "score": 85.2,
      "recommendation": "Strong Buy",
      "target_price": 2650.0,
      "current_price": 2450.0,
      "upside_potential": 8.2,
      "risk_level": "Low-Medium",
      "sector": "Energy",
      "market_cap": "16.5L Cr",
      "exchange": "NSE",
      "algorithm_scores": {
        "fundamental_strength": 88.5,
        "technical_momentum": 82.0,
        "quality_score": 90.0,
        "valuation_metrics": 78.5,
        "dividend_yield": 85.0
      },
      "analysis_summary": "Strong fundamentals with market leadership"
    }
  ],
  "currency": "INR"
}
```

### Indian Market Outlook Response
```json
{
  "market_sentiment": "Bullish",
  "nifty_50_return": 8.5,
  "investment_advice": "Favorable conditions for Indian equity investments",
  "indian_market_focus": true,
  "currency": "INR",
  "recommended_strategies": [
    "SIP (Systematic Investment Plan)",
    "Diversification across sectors",
    "Focus on large-cap for stability"
  ]
}
```

## 🔧 Configuration

### Indian Market Watchlist
- **40 Large-cap stocks**: RELIANCE.NS, TCS.NS, HDFCBANK.NS, INFY.NS, etc.
- **11 Sector ETFs**: NIFTYBEES.NS, BANKBEES.NS, PHARMABEES.NS, etc.
- **5 Market Indices**: Nifty 50, Sensex, Bank Nifty, Nifty IT, Nifty Auto

### Risk Tolerance (Indian Context)
- **Conservative**: 60% stocks, 25% bonds, 10% gold, 5% FD/PPF
- **Moderate**: 75% stocks, 15% bonds, 8% gold, 2% FD/PPF  
- **Aggressive**: 90% stocks, 5% bonds, 3% gold, 2% FD/PPF

### Algorithm Weights
- **Fundamental Strength**: 30%
- **Technical Momentum**: 25%
- **Quality Score**: 20%
- **Valuation Metrics**: 15%
- **Dividend Yield**: 10%

## 🚦 Status Indicators

### Health Check Response
```json
{
  "status": "healthy",
  "service": "indian-long-term-investment",
  "market_focus": "BSE/NSE Indian Equities",
  "algorithm_type": "Seed Algorithm Filters + Re-ranking",
  "port": 8001
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Indian Stock Symbol Format**
   - Use `.NS` suffix for NSE stocks (e.g., `RELIANCE.NS`)
   - Use `.BO` suffix for BSE stocks (e.g., `RELIANCE.BO`)
   - Service auto-converts to NSE format if no suffix provided

2. **Market Hours**
   - NSE/BSE trading hours: 9:15 AM to 3:30 PM IST
   - Pre-market: 9:00 AM to 9:15 AM IST
   - After-market: 3:40 PM to 4:00 PM IST

3. **Currency & Returns**
   - All prices and returns in INR
   - Returns calculated considering Indian market conditions
   - Tax implications for Indian investors included

## 🔗 Integration

### Web Application Integration
```javascript
// Health check
fetch('http://localhost:8001/health')
  .then(response => response.json())
  .then(data => console.log(data.market_focus));

// Get Indian stock recommendations
fetch('http://localhost:8001/api/longterm/demo/recommendations')
  .then(response => response.json())
  .then(data => console.log(data.recommendations));
```

### Python Integration
```python
import requests

# Get Indian market outlook
response = requests.get('http://localhost:8001/api/longterm/market/outlook')
data = response.json()
print(f"Nifty Return: {data['nifty_50_return']}%")
print(f"Market Sentiment: {data['market_sentiment']}")

# Analyze Indian stock
response = requests.get('http://localhost:8001/api/longterm/analyze/RELIANCE.NS')
analysis = response.json()
print(f"Score: {analysis['analysis']['overall_score']}")
```

## 🇮🇳 Indian Market Specific Features

- **Tax Planning**: ELSS recommendations for 80C benefits
- **SIP Optimization**: Rupee cost averaging strategies  
- **Sectoral Diversification**: Balanced across Indian economic sectors
- **Regulatory Compliance**: SEBI guidelines adherence
- **Festival Season**: Considers Indian market seasonality
- **Quarterly Results**: Aligned with Indian corporate calendar

## 📞 Support

- **Server Status**: Check `/health` endpoint
- **Market Data**: Real-time BSE/NSE integration
- **Demo Data**: Use `/demo/*` endpoints for testing
- **Currency**: INR (Indian Rupees)
- **Exchanges**: NSE (Primary), BSE (Secondary)

---

**Note**: This service is designed specifically for Indian long-term equity investment analysis and should be used in conjunction with professional financial advice. All recommendations consider Indian market conditions, regulations, and tax implications. 

## Available Endpoints

### Core Endpoints
- `GET /health` - Service health check with Chartink API status
- `GET /api/longterm/recommendations` - Live Chartink-filtered long-term recommendations
- `POST /api/longterm/portfolio` - Portfolio suggestions with Chartink screening
- `GET /api/longterm/market/outlook` - Indian market outlook analysis  
- `GET /api/longterm/sector/analysis` - Sector analysis for Indian markets
- `POST /api/longterm/stock/analyze` - Single stock analysis with Chartink validation
- `GET /api/longterm/watchlist/default` - Default Indian watchlist

### POST Endpoints

**Portfolio Optimization with Chartink:**
```bash
curl -X POST "http://localhost:8001/api/longterm/portfolio" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio_value": 100000,
    "risk_tolerance": "medium",
    "use_chartink_filtering": true
  }'
```

**Single Stock Analysis:**
```bash
curl -X POST "http://localhost:8001/api/longterm/stock/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "RELIANCE.NS",
    "validate_with_chartink": true
  }'
```

### Demo Endpoints (Sample Data)
- `GET /api/longterm/demo/recommendations` - Sample Chartink + re-ranking results
- `GET /api/longterm/demo/portfolio` - Sample portfolio optimization
- `GET /api/longterm/demo/market` - Sample market analysis

## Sample Chartink + Re-ranking Response

```json
{
  "algorithm_type": "Chartink Filtering + Re-ranking",
  "filtering_approach": "Two-stage: Chartink seed algorithm filters followed by market sentiment re-ranking",
  "recommendations": [
    {
      "symbol": "RELIANCE.NS",
      "final_score": 84.5,
      "chartink_score": 78.0,
      "reranking_score": 92.5,
      "recommendation": "Strong Buy",
      "target_price": 2850.0,
      "current_price": 2450.0,
      "upside_potential": 16.3,
      "chartink_theme": "long_term_buy",
      "chartink_filter": "fundamental_growth",
      "algorithm_details": {
        "chartink_filtering": "Passed fundamental_growth filter - Strong revenue growth, low debt",
        "re_ranking_factors": {
          "sector_rotation": "Energy sector (Favored)",
          "market_sentiment": "Positive (3.2)",
          "liquidity_factor": "High liquidity"
        },
        "final_score_calculation": "Chartink (78.0) * 0.6 + Re-ranking (92.5) * 0.4"
      }
    }
  ],
  "chartink_integration": {
    "api_status": "Connected",
    "filters_used": {
      "long_term_buy": {
        "fundamental_growth": "Growth stocks with strong fundamentals",
        "value_with_momentum": "Value stocks showing price momentum"
      }
    },
    "data_freshness": "Real-time from Chartink screening engine"
  }
}
```

## Features

### 🇮🇳 Indian Market Specific
- **NSE/BSE Focus**: Optimized for Indian equities with .NS/.BO suffixes
- **INR Currency**: All prices and calculations in Indian Rupees
- **Indian Sectors**: IT, Banking, Pharma, FMCG, Energy analysis
- **Market Hours**: IST timezone awareness
- **Regulatory Compliance**: SEBI guidelines consideration

### 🔍 Chartink Integration  
- **Real-time Screening**: Live data from Chartink API
- **Multi-filter Support**: fundamental_growth, value_with_momentum themes
- **Technical Analysis**: RSI, Moving averages, Volume patterns
- **Fundamental Screening**: PE ratios, revenue growth, market cap filtering
- **Fallback System**: Default watchlist if Chartink unavailable

### 📊 Re-ranking Algorithm
- **Market Sentiment Analysis**: Nifty 50 performance tracking  
- **Sector Rotation**: Dynamic sector preference adjustments
- **Liquidity Assessment**: Volume-based scoring
- **Risk Adjustment**: Volatility-adjusted recommendations
- **Peer Analysis**: Sector relative performance comparison

### 🔧 Technical Features
- **Async Processing**: Non-blocking API calls for better performance
- **Error Handling**: Comprehensive logging and fallback mechanisms
- **Rate Limiting**: API protection and resource management
- **Caching**: Efficient data retrieval and storage

## Configuration

### Chartink Integration Settings
```python
CHARTINK_THEMES = ['long_term_buy']
CHARTINK_FILTERS = ['fundamental_growth', 'value_with_momentum']
MAX_STOCKS_PER_THEME = 50
CHARTINK_TIMEOUT = 30  # seconds
```

### Re-ranking Weights
```python
RERANKING_WEIGHTS = {
    'sector_rotation': 0.25,
    'market_sentiment': 0.30, 
    'liquidity': 0.20,
    'volatility': 0.15,
    'peer_comparison': 0.10
}
```

### Indian Market Watchlist
```python
DEFAULT_WATCHLIST = [
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 
    'HINDUNILVR.NS', 'ICICIBANK.NS', 'KOTAKBANK.NS',
    # ... 20 top Indian stocks
]
```

## Status Indicators

| Status | Description |
|--------|-------------|
| 🟢 Healthy | Service running, Chartink connected |
| 🟡 Limited | Service running, Chartink unavailable (using fallback) |
| 🔴 Error | Service down or critical error |

## Troubleshooting

### Common Issues

**Chartink API Connection:**
```bash
# Check Chartink status
curl "http://localhost:8001/health" | jq '.chartink_status'
```

**Stock Symbol Format:**
- Use `.NS` suffix for NSE stocks: `RELIANCE.NS`
- Use `.BO` suffix for BSE stocks: `RELIANCE.BO`

**Market Hours:**
- Service provides data 24/7, but real-time prices during market hours (9:15-15:30 IST)
- Weekend/holiday data may be delayed

## Integration Examples

### Web Application
```javascript
// Fetch Chartink-filtered recommendations
fetch('http://localhost:8001/api/longterm/demo/recommendations')
  .then(response => response.json())
  .then(data => {
    console.log('Chartink Status:', data.chartink_integration.api_status);
    console.log('Recommendations:', data.recommendations);
  });
```

### Python Client
```python
import requests

# Get live recommendations with Chartink filtering
response = requests.get('http://localhost:8001/api/longterm/recommendations')
recommendations = response.json()

for stock in recommendations:
    print(f"{stock['symbol']}: {stock['recommendation']} "
          f"(Chartink: {stock['chartink_score']}, "
          f"Final: {stock['final_score']})")
```

## Indian Market-Specific Features

- **📈 Tax Planning**: Capital gains consideration for long-term holds (>1 year)
- **💰 SIP Optimization**: Monthly investment recommendations  
- **🏭 Sectoral Diversification**: Balanced exposure across Indian sectors
- **📊 Regulatory Compliance**: SEBI guidelines and Indian market regulations
- **🌅 Market Timing**: IST timezone and Indian market hours consideration

## Support

- **📊 Health Check**: `GET /health` for service status
- **🔍 Chartink Status**: Monitor API connectivity in health endpoint
- **📈 Market Data**: Real-time during market hours, delayed otherwise
- **🇮🇳 Indian Focus**: Optimized for NSE/BSE trading

---
*Powered by Chartink API + Custom Re-ranking Algorithms* 