# AlgoDiscovery Real-Time API Integration Guide

## 🚀 Overview

The AlgoDiscovery Real-Time API provides enhanced POST endpoints for intraday trading recommendations with intelligent ranking, real-time market processing, and dynamic stock discovery via Chartink integration. This system combines multiple data sources and applies frequency-based ranking to prioritize the most consistently identified opportunities.

## ✨ New Features

### 🎯 Real-Time Processing
- **Live Market Scanning**: Continuous analysis across multiple screeners
- **Intelligent Ranking**: Frequency-based scoring system that prioritizes stocks appearing in multiple scans
- **Real-Time Filtering**: Dynamic confidence and strength thresholds
- **Multi-Source Aggregation**: Combines data from 5+ specialized screeners
- 🔍 **Dynamic Stock Discovery**: Integration with Chartink for live stock screening
- 🎨 **Chartink Themes**: Pre-configured market filters for different trading styles

### 🔥 Ranking System
The ranking algorithm considers:
- **Frequency Score**: How often a stock appears across multiple scans
- **Recency Score**: How recently the stock was identified
- **Combined Rank Score**: Weighted combination of frequency and recency
- **Technical Strength**: Overall technical analysis score
- **Market Context**: Current market conditions and sentiment

## 🔗 API Endpoints

### 1. **Simplified Intraday Buy Recommendations** (Recommended)
**POST** `/api/intraday/buy`

Get real-time buy recommendations with intelligent ranking and dynamic stock discovery via Chartink integration.

**Request Body:**
```json
{
  "limit": 10,
  "enable_ranking": true,
  "confidence_threshold": 60.0,
  "strength_threshold": 65.0,
  "ranking_window": 5,
  "chartink_theme": "intraday_buy"
}
```

**Response Example:**
```json
{
  "timestamp": "2025-01-20T10:30:00.000Z",
  "total_candidates_found": 15,
  "recommendations_returned": 10,
  "ranking_enabled": true,
  "scan_sources": ["intraday_service", "breakout_screener", "volume_screener"],
  "market_conditions": {
    "scan_time": "2025-01-20T10:30:00.000Z",
    "active_signals": 10,
    "avg_confidence": 72.3,
    "avg_strength": 68.5,
    "high_confidence_count": 6
  },
  "recommendations": [
    {
      "symbol": "RELIANCE",
      "signal_type": "BUY",
      "entry_price": 2456.75,
      "target_price": 2530.45,
      "stop_loss": 2383.12,
      "confidence": 85.5,
      "strength": 78.2,
      "rank_score": 95.8,
      "frequency_score": 4,
      "recency_score": 98.5,
      "volume_ratio": 2.3,
      "momentum_score": 82.1,
      "timestamp": "2025-01-20T10:30:00.000Z",
      "reason": "Bullish breakout with strong volume confirmation",
      "technical_indicators": {
        "rsi": 65.2,
        "momentum_score": 82.1,
        "volume_ratio": 2.3
      },
      "risk_reward_ratio": 2.4,
      "chartink_source": "intraday_buy"
    }
  ]
}
```

### 2. **Simplified Intraday Sell Recommendations** (Recommended)
**POST** `/api/intraday/sell`

Get real-time sell recommendations with intelligent ranking.

**Request Body:**
```json
{
  "limit": 10,
  "enable_ranking": true,
  "confidence_threshold": 50.0,
  "strength_threshold": 60.0,
  "ranking_window": 5
}
```

### 3. **Advanced Real-Time Buy Recommendations**
**POST** `/api/intraday/realtime-buy-recommendations`

Extended endpoint with additional response fields and detailed market analysis.

### 4. **Advanced Real-Time Sell Recommendations**
**POST** `/api/intraday/realtime-sell-recommendations`

Extended endpoint with additional response fields and detailed market analysis.

### 5. **Combined Real-Time Recommendations**
**POST** `/api/intraday/realtime-combined`

Returns both buy and sell recommendations with combined market statistics.

## 🐍 Python Integration Examples

### Basic Usage (Recommended)

```python
from algodiscovery_client import AlgoDiscoveryClient

# Initialize client
client = AlgoDiscoveryClient("http://localhost:8888")

# Get buy recommendations with ranking
buy_recommendations = client.get_intraday_buy(
    limit=10,
    enable_ranking=True,
    confidence_threshold=65.0,
    strength_threshold=70.0,
    ranking_window=5
)

# Get sell recommendations
sell_recommendations = client.get_intraday_sell(
    limit=10,
    enable_ranking=True,
    confidence_threshold=60.0,
    strength_threshold=65.0
)

# Process recommendations
if buy_recommendations:
    print(f"Found {buy_recommendations['recommendations_returned']} buy signals")
    for rec in buy_recommendations['recommendations']:
        print(f"BUY {rec['symbol']}: {rec['entry_price']} -> {rec['target_price']} "
              f"(Confidence: {rec['confidence']:.1f}%, Rank: {rec['rank_score']:.1f})")

if sell_recommendations:
    print(f"Found {sell_recommendations['recommendations_returned']} sell signals")
    for rec in sell_recommendations['recommendations']:
        print(f"SELL {rec['symbol']}: {rec['entry_price']} -> {rec['target_price']} "
              f"(Confidence: {rec['confidence']:.1f}%, Rank: {rec['rank_score']:.1f})")
```

### Advanced Usage with Custom Requests

```python
import requests
import json

def get_custom_buy_recommendations():
    """Custom request for buy recommendations with specific parameters"""
    url = "http://localhost:8888/api/intraday/buy"
    
    payload = {
        "limit": 15,
        "enable_ranking": True,
        "confidence_threshold": 75.0,  # High confidence only
        "strength_threshold": 80.0,    # Strong signals only
        "ranking_window": 7             # Longer ranking window
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        return None

# Get high-confidence recommendations
high_conf_buys = get_custom_buy_recommendations()

if high_conf_buys:
    print(f"High-confidence signals: {high_conf_buys['recommendations_returned']}")
    print(f"Average confidence: {high_conf_buys['market_conditions']['avg_confidence']:.1f}%")
    
    # Process top-ranked recommendations
    for i, rec in enumerate(high_conf_buys['recommendations'][:5], 1):
        print(f"{i}. {rec['symbol']} - Rank Score: {rec['rank_score']:.1f} "
              f"(Freq: {rec['frequency_score']}, Recent: {rec['recency_score']})")
```

### Streamlit Integration (Enhanced)

```python
import streamlit as st
from algodiscovery_client import AlgoDiscoveryClient
import pandas as pd

def main():
    st.title("🎯 AlgoDiscovery Live Trading Dashboard")
    
    # Initialize client
    client = AlgoDiscoveryClient()
    
    # Sidebar controls
    st.sidebar.header("🔧 Configuration")
    limit = st.sidebar.slider("Number of recommendations", 5, 20, 10)
    enable_ranking = st.sidebar.checkbox("Enable Ranking", value=True)
    confidence_threshold = st.sidebar.slider("Confidence Threshold", 30.0, 90.0, 65.0)
    strength_threshold = st.sidebar.slider("Strength Threshold", 40.0, 90.0, 70.0)
    
    # Auto-refresh
    auto_refresh = st.sidebar.checkbox("Auto Refresh (30s)", value=False)
    if auto_refresh:
        st.rerun()
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("🟢 Buy Recommendations")
        
        # Get buy recommendations
        buy_data = client.get_intraday_buy(
            limit=limit,
            enable_ranking=enable_ranking,
            confidence_threshold=confidence_threshold,
            strength_threshold=strength_threshold
        )
        
        if buy_data and buy_data['recommendations']:
            # Create DataFrame
            buy_df = pd.DataFrame(buy_data['recommendations'])
            
            # Display key metrics
            st.metric("Active Buy Signals", buy_data['recommendations_returned'])
            st.metric("Avg Confidence", f"{buy_data['market_conditions']['avg_confidence']:.1f}%")
            
            # Display recommendations table
            display_cols = ['symbol', 'confidence', 'rank_score', 'entry_price', 'target_price']
            st.dataframe(
                buy_df[display_cols].round(2),
                use_container_width=True
            )
        else:
            st.info("No buy recommendations available")
    
    with col2:
        st.subheader("🔴 Sell Recommendations")
        
        # Get sell recommendations
        sell_data = client.get_intraday_sell(
            limit=limit,
            enable_ranking=enable_ranking,
            confidence_threshold=confidence_threshold,
            strength_threshold=strength_threshold
        )
        
        if sell_data and sell_data['recommendations']:
            # Create DataFrame
            sell_df = pd.DataFrame(sell_data['recommendations'])
            
            # Display key metrics
            st.metric("Active Sell Signals", sell_data['recommendations_returned'])
            st.metric("Avg Confidence", f"{sell_data['market_conditions']['avg_confidence']:.1f}%")
            
            # Display recommendations table
            display_cols = ['symbol', 'confidence', 'rank_score', 'entry_price', 'target_price']
            st.dataframe(
                sell_df[display_cols].round(2),
                use_container_width=True
            )
        else:
            st.info("No sell recommendations available")

if __name__ == "__main__":
    main()

## 🎛️ Parameter Guide

### Request Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | int | 10 | Maximum recommendations to return |
| `enable_ranking` | bool | true | Enable frequency-based ranking |
| `confidence_threshold` | float | 50.0 | Minimum confidence level (0-100) |
| `strength_threshold` | float | 60.0 | Minimum technical strength (0-100) |
| `ranking_window` | int | 5 | Number of recent scans for ranking |
| `chartink_theme` | string | "intraday_buy" | Chartink theme for stock discovery |

### Chartink Theme Options

| Theme | Description | Use Case |
|--------|-------------|----------|
| `"intraday_buy"` | Bullish intraday setups | General bullish opportunities |
| `"intraday_sell"` | Bearish intraday setups | General bearish opportunities |
| `"breakout_stocks"` | Stocks breaking resistance | Momentum breakout trades |
| `"volume_leaders"` | High volume gainers | Volume-based opportunities |
| `"momentum_stocks"` | Strong momentum plays | Trend following trades |
| `"reversal_candidates"` | Potential reversal setups | Counter-trend opportunities |
| `"gap_up_stocks"` | Gap-up morning plays | Gap trading strategies |
| `"high_beta_stocks"` | High volatility opportunities | Volatility-based trades |

### Ranking Configuration

**Ranking Window Options:**
- `3`: Fast response, recent signals only
- `5`: Balanced (recommended for most cases)
- `7`: More stable, includes slightly older signals
- `10`: Maximum stability, comprehensive analysis

**Threshold Recommendations:**
- **Conservative**: confidence ≥ 70, strength ≥ 75
- **Moderate**: confidence ≥ 60, strength ≥ 65 (default)
- **Aggressive**: confidence ≥ 50, strength ≥ 55

**Theme Selection Guidelines:**
- **Morning Sessions**: Use `"gap_up_stocks"` for gap trading
- **Trending Markets**: Use `"momentum_stocks"` or `"breakout_stocks"`
- **Volatile Markets**: Use `"high_beta_stocks"` for high-volatility plays
- **Reversal Trading**: Use `"reversal_candidates"` for counter-trend setups

## 📊 Response Data Fields

### Core Recommendation Fields
- **symbol**: Stock symbol (NSE format)
- **signal_type**: Type of signal detected
- **entry_price**: Recommended entry price
- **target_price**: Profit target
- **stop_loss**: Risk management level
- **confidence**: Algorithm confidence (0-100)
- **strength**: Technical strength (0-100)

### Enhanced Ranking Fields
- **rank_score**: Overall ranking score (0-100)
- **frequency_score**: Number of times detected
- **recency_score**: How recent the signal is (0-100)
- **volume_ratio**: Current volume vs average
- **momentum_score**: Price momentum indicator

### Market Condition Fields
- **scan_time**: When the scan was performed
- **active_signals**: Total number of active signals
- **avg_confidence**: Average confidence across all signals
- **high_confidence_count**: Number of high-confidence signals

## 🚨 Error Handling

```python
try:
    data = client.get_realtime_buy_recommendations(
        limit=10,
        enable_ranking=True
    )
    
    if data is None:
        print("❌ API request failed")
    elif data.get('count', 0) == 0:
        print("📭 No recommendations found")
    else:
        print(f"✅ Found {data['count']} recommendations")
        
except Exception as e:
    print(f"🚨 Error: {str(e)}")
```

## 🔧 Troubleshooting

### Common Issues

**1. No Recommendations Returned**
- Check if markets are open
- Lower confidence/strength thresholds
- Disable ranking temporarily
- Verify API server is running

**2. Ranking Not Working**
- Ensure `enable_ranking=true` in request
- Check if sufficient scan history exists
- Try different ranking window sizes

**3. High Latency**
- Reduce limit parameter
- Increase threshold values
- Use smaller ranking windows

### Performance Optimization

**For High-Frequency Trading:**
```python
# Optimized for speed
data = client.get_realtime_buy_recommendations(
    limit=5,
    enable_ranking=False,  # Disable for speed
    confidence_threshold=75.0,
    ranking_window=3
)
```

**For Quality Analysis:**
```python
# Optimized for quality
data = client.get_realtime_combined_recommendations(
    limit=25,
    enable_ranking=True,
    confidence_threshold=65.0,
    strength_threshold=70.0,
    ranking_window=7
)
```

## 📈 Integration Patterns

### 1. Real-Time Monitoring
```python
import time

def monitor_markets():
    client = AlgoDiscoveryClient()
    
    while True:
        try:
            data = client.get_realtime_combined_recommendations(
                limit=10,
                enable_ranking=True
            )
            
            if data:
                opportunities = data.get('combined_stats', {}).get('total_opportunities', 0)
                sentiment = data.get('combined_stats', {}).get('market_sentiment', 'Unknown')
                
                print(f"📊 {opportunities} opportunities | Sentiment: {sentiment}")
            
            time.sleep(60)  # Check every minute
            
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"⚠️ Error: {e}")
            time.sleep(10)
```

### 2. Alert System
```python
def check_high_confidence_signals():
    client = AlgoDiscoveryClient()
    
    data = client.get_realtime_buy_recommendations(
        limit=20,
        enable_ranking=True,
        confidence_threshold=80.0,
        strength_threshold=75.0
    )
    
    if data and data.get('data'):
        high_frequency_signals = [
            rec for rec in data['data']
            if rec.get('frequency_score', 1) >= 3 and 
               rec.get('confidence', 0) >= 85
        ]
        
        for signal in high_frequency_signals:
            print(f"🚨 HIGH PRIORITY: {signal['symbol']} - "
                  f"Confidence: {signal['confidence']:.1f}%, "
                  f"Frequency: {signal['frequency_score']}x")
```

### 3. Data Export
```python
import pandas as pd
from datetime import datetime

def export_recommendations():
    client = AlgoDiscoveryClient()
    
    data = client.get_realtime_combined_recommendations(
        limit=50,
        enable_ranking=True
    )
    
    if data:
        # Combine buy and sell data
        all_recommendations = []
        
        for rec in data.get('buy_recommendations', {}).get('data', []):
            rec['recommendation_type'] = 'BUY'
            all_recommendations.append(rec)
        
        for rec in data.get('sell_recommendations', {}).get('data', []):
            rec['recommendation_type'] = 'SELL'
            all_recommendations.append(rec)
        
        # Create DataFrame
        df = pd.DataFrame(all_recommendations)
        
        # Export to CSV
        filename = f"recommendations_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
        df.to_csv(filename, index=False)
        
        print(f"📁 Exported {len(df)} recommendations to {filename}")
```

## 🎯 Best Practices

### 1. Parameter Tuning
- Start with default parameters and adjust based on results
- Use higher thresholds during volatile market conditions
- Enable ranking for better signal quality
- Adjust ranking window based on trading frequency

### 2. Performance Monitoring
- Monitor API response times
- Track recommendation accuracy
- Analyze ranking effectiveness
- Keep logs of successful trades

### 3. Risk Management
- Always use stop-loss levels provided
- Verify entry prices before trading
- Consider market conditions and sentiment
- Don't rely solely on algorithmic recommendations

### 4. Integration Tips
- Cache responses appropriately
- Implement proper error handling
- Use connection pooling for high-frequency requests
- Monitor API health regularly

## 📞 Support

For integration support or questions:
- Check API health: `GET /health`
- Review server logs for errors
- Verify request parameters
- Test with minimal thresholds first

---

**🚀 AlgoDiscovery Real-Time API** - Powered by AI-driven ranking and multi-source market analysis 