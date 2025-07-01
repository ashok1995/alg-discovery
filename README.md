# AlgoDiscovery Trading System

A comprehensive automated trading system with advanced intraday stock discovery, real-time data processing, and sophisticated trading algorithms.

## 🎯 Project Overview

AlgoDiscovery is a full-stack trading system that combines:
- **Backend API**: FastAPI-based trading engine with real-time data processing
- **Intraday Discovery**: Advanced stock screening and momentum analysis
- **Yahoo Finance Integration**: Direct market data access
- **WebSocket Support**: Real-time updates and live trading signals
- **Technical Analysis**: RSI, MACD, Bollinger Bands, and custom strategies
- **Portfolio Management**: Risk management and position tracking

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- pip or conda

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd alg-discovery
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp env.example .env
   # Edit .env with your API keys and configuration
   ```

4. **Start the trading system:**
   ```bash
   python start.py
   ```

The API will be available at `http://localhost:8888`

## 📖 API Documentation

- **Interactive Docs**: http://localhost:8888/docs
- **ReDoc**: http://localhost:8888/redoc
- **Health Check**: http://localhost:8888/health

## 🔧 Project Structure

```
alg-discovery/
├── 📄 README.md              # This file - main project documentation
├── 📄 requirements.txt       # All project dependencies
├── 📄 start.py              # Main startup script
├── 📄 env.example           # Environment configuration template
├── 📁 api/                  # Backend API implementation
│   ├── 📄 main.py           # FastAPI application
│   ├── 📄 config.py         # Advanced configuration management
│   ├── 📄 simple_config.py  # Simple configuration for development
│   ├── 📁 models/           # Data models and schemas
│   ├── 📁 services/         # Business logic and external integrations
│   ├── 📄 README.md         # API-specific documentation
│   └── 📁 data/             # API data storage
├── 📁 data/                 # Global data storage
├── 📁 logs/                 # Application logs
├── 📁 config/               # Configuration files
├── 📁 services/             # Shared services
├── 📁 utils/                # Utility functions
├── 📁 docs/                 # Additional documentation
└── 📁 infrastructure/       # Deployment and infrastructure
```

## 🌟 Key Features

### 🔥 Intraday Stock Discovery
- **Momentum Breakout Screening**: High momentum stocks with breakout potential
- **Gap & Go Strategy**: Stocks with significant overnight gaps
- **Volume Spike Detection**: Unusual volume activity identification
- **Consolidation Breakouts**: Pattern-based breakout detection

### 📊 Yahoo Finance Integration
- **Real-time Data**: Current prices, volume, and market metrics
- **Historical Analysis**: Flexible periods and intervals
- **Batch Processing**: Multiple symbols in single requests
- **Company Information**: Sector, market cap, financial metrics

### 🔄 WebSocket Support
- **Live Price Updates**: Real-time market data streaming
- **Trading Signals**: Instant signal notifications
- **Portfolio Updates**: Live portfolio monitoring
- **Market Status**: Real-time market hours and status

### 📈 Technical Analysis
- **RSI Momentum**: Oversold/overbought analysis
- **MACD Signals**: Trend and momentum indicators
- **Bollinger Bands**: Volatility and price action
- **Custom Strategies**: Extensible strategy framework

## 🎯 API Endpoints Overview

### Core Endpoints
- `GET /health` - System health check
- `GET /api/version` - API version and features
- `GET /api/market-status` - Current market status

### Intraday Discovery
- `GET /api/intraday/screener/{criteria}` - Stock screening
- `GET /api/intraday/top-movers` - Top moving stocks
- `GET /api/intraday/breakout-candidates` - Breakout opportunities
- `GET /api/intraday/volume-leaders` - Volume spike stocks
- `GET /api/intraday/gap-stocks` - Gap trading opportunities
- `GET /api/intraday/momentum/{symbol}` - Momentum analysis
- `GET /api/intraday/signals` - Trading signals generation

### Yahoo Finance Direct Access
- `GET /api/yahoo/{symbol}` - Comprehensive stock data
- `GET /api/yahoo/{symbol}/price` - Current price only
- `GET /api/yahoo/{symbol}/history` - Historical data
- `GET /api/yahoo/batch` - Multiple stocks data

### Stock Data & Analysis
- `GET /api/stock/{symbol}` - Stock data
- `GET /api/stock/{symbol}/technical` - Technical indicators
- `GET /api/signals/{symbol}` - Trading signals
- `GET /api/portfolio` - Portfolio overview

### WebSocket Connections
- `WS /ws/live-data` - Live market data
- `WS /ws/signals` - Trading signals stream

## 🛠️ Configuration

### Environment Variables
Key settings in `.env` file:

```bash
# Server Configuration
HOST=0.0.0.0
PORT=8888
DEBUG=true

# API Keys
ALPHA_VANTAGE_API_KEY=your_key
ZERODHA_API_KEY=your_key

# Trading Settings
DEFAULT_SYMBOLS=TCS.NS,INFY.NS,RELIANCE.NS
MAX_POSITION_SIZE=100000.0
MAX_DAILY_LOSS=50000.0

# Performance
CACHE_TTL_SECONDS=300
DATA_FETCH_INTERVAL=30
```

### Advanced Configuration
For production deployments, use `api/config.py` for comprehensive settings management with validation and type safety.

## 📊 Usage Examples

### Python Client Example
```python
import requests
import websockets
import asyncio

# Get current stock price
response = requests.get("http://localhost:8888/api/yahoo/AAPL/price")
price_data = response.json()
print(f"AAPL: ${price_data['current_price']}")

# Screen for momentum breakouts
response = requests.get("http://localhost:8888/api/intraday/screener/momentum_breakout")
breakouts = response.json()
for stock in breakouts[:5]:
    print(f"{stock['symbol']}: {stock['score']:.2f}")

# WebSocket for live updates
async def live_data():
    uri = "ws://localhost:8888/ws/live-data"
    async with websockets.connect(uri) as websocket:
        await websocket.send('{"action": "subscribe", "symbols": ["AAPL", "TSLA"]}')
        async for message in websocket:
            data = json.loads(message)
            print(f"Live update: {data}")

asyncio.run(live_data())
```

### curl Examples
```bash
# Get comprehensive stock data
curl "http://localhost:8888/api/yahoo/TCS.NS?period=1y&interval=1d"

# Screen momentum breakouts
curl "http://localhost:8888/api/intraday/screener/momentum_breakout?limit=10"

# Get batch stock prices
curl "http://localhost:8888/api/yahoo/batch?symbols=AAPL,MSFT,GOOGL"

# Get trading signals
curl "http://localhost:8888/api/intraday/signals?symbols=TCS.NS,RELIANCE.NS"
```

## 🚀 Development

### Running in Development Mode
```bash
# Start with auto-reload
DEBUG=true python start.py

# View logs
tail -f logs/backend_api.log

# Run tests
pytest api/tests/
```

### Adding Custom Strategies
1. Extend the `TradingStrategy` base class in `api/services/`
2. Implement `analyze()` and `calculate_confidence()` methods
3. Register the strategy in the analysis engine

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📦 Deployment

### Docker Deployment
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8888
CMD ["python", "start.py"]
```

### Production Settings
```bash
ENVIRONMENT=production
DEBUG=false
WORKERS=4
LOG_LEVEL=INFO
SECRET_KEY=your-production-secret-key
```

## 🔗 Related Projects

- **Streamlit Frontend**: Interactive trading dashboard
- **Jupyter Notebooks**: Strategy development and backtesting
- **Mobile App**: Real-time alerts and portfolio monitoring

## 📞 Support

- **Documentation**: `/docs` endpoint for detailed API documentation
- **Health Monitoring**: `/health` endpoint for system status
- **Logs**: Check `logs/` directory for detailed application logs

## ⚠️ Disclaimer

This is a development/educational trading system. Always test thoroughly before using with real money. Trading involves risk, and past performance doesn't guarantee future results.

---

**AlgoDiscovery Trading System** - Advanced algorithmic trading made accessible. 🚀📈 