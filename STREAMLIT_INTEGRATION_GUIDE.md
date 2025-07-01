# AlgoDiscovery Streamlit Integration Guide

This guide explains how to integrate the AlgoDiscovery trading backend with your external Streamlit applications.

## 📋 Overview

The AlgoDiscovery backend provides powerful trading APIs, and this integration allows you to easily connect any Streamlit application to access:

- 📈 Real-time intraday buy/sell recommendations
- 📊 Stock data and technical analysis
- 🎯 Market status and trading signals
- 💰 Portfolio management features
- 🔄 Auto-refreshing data with configurable intervals

## 🚀 Quick Start

### 1. Prerequisites

Make sure you have the AlgoDiscovery backend running:

```bash
# In your AlgoDiscovery directory
python start.py
# Server should be running on http://localhost:8888
```

### 2. Copy Integration Files

Copy these files to your external Streamlit project:

```bash
# Copy the client module to your Streamlit project
cp algodiscovery_client.py /path/to/your/streamlit/project/

# Optional: Copy the example for reference
cp streamlit_integration_example.py /path/to/your/streamlit/project/
```

### 3. Install Dependencies

Ensure your Streamlit environment has these packages:

```bash
pip install streamlit pandas requests
```

### 4. Basic Integration

```python
import streamlit as st
from algodiscovery_client import AlgoDiscoveryClient, display_recommendations_table

# Initialize the client
client = AlgoDiscoveryClient("http://localhost:8888")

# Check connection
health = client.health_check()
if health.get("status") == "healthy":
    st.success("✅ Connected to AlgoDiscovery Backend")
    
    # Display recommendations table with auto-refresh
    display_recommendations_table(client, limit=10, auto_refresh=True)
else:
    st.error("❌ Cannot connect to AlgoDiscovery Backend")
```

## 🔧 API Client Methods

### Connection & Health

```python
client = AlgoDiscoveryClient("http://localhost:8888")

# Check if backend is healthy
health = client.health_check()

# Get market status
market_status = client.get_market_status()
```

### Recommendations

```python
# Get formatted recommendations table (uses POST request)
table_data = client.get_intraday_recommendations_table(limit=10)

# Get only buy recommendations
buy_recs = client.get_buy_recommendations(limit=5)

# Get only sell recommendations  
sell_recs = client.get_sell_recommendations(limit=5)
```

### Stock Data

```python
# Get individual stock data
stock_data = client.get_stock_data("AAPL")

# Get Yahoo Finance price data
price_data = client.get_yahoo_stock_price("AAPL")

# Get multiple stocks at once
symbols = ["AAPL", "MSFT", "GOOGL"]
batch_data = client.get_multiple_stocks(symbols)
```

## 🎨 Pre-built Components

### 1. Recommendations Table

```python
from algodiscovery_client import display_recommendations_table

# Full-featured recommendations table with:
# - Side-by-side buy/sell layout
# - Auto-refresh functionality
# - Download buttons
# - Market sentiment indicator
display_recommendations_table(client, limit=15, auto_refresh=True)
```

### 2. Market Status Display

```python
from algodiscovery_client import display_market_status

# Shows market open/closed status with current time
display_market_status(client)
```

### 3. API Connection Info

```python
from algodiscovery_client import display_api_info

# Shows connection status in sidebar with service health
display_api_info(client)
```

### 4. Data Formatting

```python
from algodiscovery_client import format_recommendations_dataframe

# Convert raw recommendations to pandas DataFrame
buy_recs = client.get_buy_recommendations(10)
df = format_recommendations_dataframe(buy_recs, 'buy')
st.dataframe(df)
```

## 💡 Integration Examples

### Simple Dashboard Tab

```python
import streamlit as st
from algodiscovery_client import AlgoDiscoveryClient, display_recommendations_table

st.title("My Trading Dashboard")

# Create tabs
tab1, tab2 = st.tabs(["📊 Overview", "📈 Recommendations"])

with tab1:
    st.markdown("## Market Overview")
    # Your existing dashboard content

with tab2:
    st.markdown("## AlgoDiscovery Recommendations")
    client = AlgoDiscoveryClient()
    display_recommendations_table(client, limit=10)
```

### Custom Watchlist Integration

```python
# Get your watchlist symbols
watchlist = ["AAPL", "MSFT", "GOOGL", "TSLA"]

# Fetch batch data
client = AlgoDiscoveryClient()
batch_data = client.get_multiple_stocks(watchlist)

if batch_data:
    for symbol in watchlist:
        if symbol in batch_data["data"]:
            stock = batch_data["data"][symbol]
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric(symbol, f"${stock['current_price']}")
            with col2:
                st.metric("Change", f"${stock['change']:.2f}")
            with col3:
                # Get AlgoDiscovery recommendation for this stock
                buy_recs = client.get_buy_recommendations(20)
                sell_recs = client.get_sell_recommendations(20)
                
                # Check if this symbol has recommendations
                has_buy = any(r['symbol'] == symbol for r in buy_recs)
                has_sell = any(r['symbol'] == symbol for r in sell_recs)
                
                if has_buy:
                    st.success("🟢 BUY Signal")
                elif has_sell:
                    st.error("🔴 SELL Signal")
                else:
                    st.info("➖ No Signal")
```

### Auto-refresh with Custom Interval

```python
import time

# Custom auto-refresh logic
refresh_placeholder = st.empty()
progress_bar = st.progress(0)

# Your chosen interval (in seconds)
refresh_seconds = 60

while True:
    # Fetch fresh data
    client = AlgoDiscoveryClient()
    data = client.get_intraday_recommendations_table(10)
    
    # Update your display
    with refresh_placeholder.container():
        # Display your data here
        st.write(data)
    
    # Countdown timer
    for i in range(refresh_seconds, 0, -1):
        progress_bar.progress((refresh_seconds - i) / refresh_seconds)
        time.sleep(1)
    
    # Clear and refresh
    st.cache_data.clear()
```

## 🔄 Configuration Options

### Backend URL Configuration

```python
# For different environments
DEVELOPMENT_URL = "http://localhost:8888"
STAGING_URL = "http://staging.yourdomain.com:8888"
PRODUCTION_URL = "https://api.yourdomain.com"

# In your Streamlit app
environment = st.selectbox("Environment:", ["Development", "Staging", "Production"])

url_map = {
    "Development": DEVELOPMENT_URL,
    "Staging": STAGING_URL,
    "Production": PRODUCTION_URL
}

client = AlgoDiscoveryClient(base_url=url_map[environment])
```

### Caching Strategy

```python
# Cache recommendations for 1 minute
@st.cache_data(ttl=60)
def get_cached_recommendations(limit):
    client = AlgoDiscoveryClient()
    return client.get_intraday_recommendations_table(limit)

# Usage
data = get_cached_recommendations(10)
```

## 🚨 Error Handling

```python
def safe_api_call(client_method, *args, **kwargs):
    """Safely call API methods with error handling."""
    try:
        result = client_method(*args, **kwargs)
        if result is None:
            st.warning("⚠️ No data received from API")
            return None
        return result
    except Exception as e:
        st.error(f"❌ API Error: {str(e)}")
        return None

# Usage
client = AlgoDiscoveryClient()
data = safe_api_call(client.get_intraday_recommendations_table, limit=10)

if data:
    # Process data
    pass
else:
    st.info("Please check your connection and try again")
```

## 📊 Response Data Structures

### Recommendations Table Response

```python
{
    "timestamp": "2024-01-20T14:30:00",
    "table_format": {
        "headers": ["Symbol", "Type", "Strength", "Confidence", ...],
        "buy_side": {
            "title": "🟢 BUY RECOMMENDATIONS",
            "data": [...],
            "stats": {
                "count": 5,
                "avg_confidence": "75.2%",
                "avg_strength": "8.4",
                "high_confidence": 3
            }
        },
        "sell_side": { ... }
    },
    "raw_data": {
        "buy_recommendations": [...],
        "sell_recommendations": [...]
    },
    "market_summary": {
        "total_opportunities": 10,
        "market_sentiment": "Bullish",
        "buy_vs_sell_ratio": 1.25
    }
}
```

### Individual Recommendation Structure

```python
{
    "symbol": "AAPL",
    "signal_type": "BULLISH_BREAKOUT",
    "strength": 8.5,
    "confidence": 75.2,
    "current_price": 150.25,
    "target_price": 158.00,
    "stop_loss": 145.50,
    "volume_ratio": 1.8,
    "momentum_score": 7.2,
    "timestamp": "2024-01-20T14:30:00",
    "reason": "Strong momentum with volume confirmation"
}
```

## 🚀 Advanced Features

### WebSocket Integration (Coming Soon)

```python
# Future feature for real-time updates
import asyncio
import websockets

async def websocket_listener():
    uri = "ws://localhost:8888/ws/live-data"
    async with websockets.connect(uri) as websocket:
        await websocket.send('{"action": "subscribe", "symbols": ["AAPL", "MSFT"]}')
        
        while True:
            message = await websocket.recv()
            data = json.loads(message)
            # Update Streamlit display
            st.write(data)
```

## 🔧 Troubleshooting

### Common Issues

1. **Connection Refused**
   ```
   Solution: Ensure AlgoDiscovery backend is running on localhost:8888
   Check: curl http://localhost:8888/health
   ```

2. **No Recommendations Returned**
   ```
   Reason: Markets may be closed or no signals generated
   Check: /api/market-status endpoint
   ```

3. **Slow Response Times**
   ```
   Solution: Increase timeout in client initialization
   client = AlgoDiscoveryClient(timeout=30)
   ```

4. **Streamlit Caching Issues**
   ```
   Solution: Clear cache when needed
   st.cache_data.clear()
   ```

### Debug Mode

```python
import logging

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)

# Check API responses
client = AlgoDiscoveryClient()
health = client.health_check()
st.write("Health Response:", health)
```

## 📝 Best Practices

1. **Always check connection first**
2. **Use caching for expensive API calls**
3. **Handle errors gracefully**
4. **Provide user feedback during loading**
5. **Allow users to configure refresh intervals**
6. **Test with different market conditions**

## 🎯 Next Steps

1. Copy `algodiscovery_client.py` to your project
2. Start with the basic integration example
3. Customize the UI to match your app's style
4. Add your own business logic and features
5. Test thoroughly with live market data

For more examples and advanced usage, see `streamlit_integration_example.py`.

---

🔗 **Related Files:**
- `algodiscovery_client.py` - Main integration client
- `streamlit_integration_example.py` - Complete example app
- `api/main.py` - Backend API documentation 