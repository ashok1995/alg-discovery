# AlgoDiscovery Trading System - Project Structure

## 📁 Reorganized Project Layout

The project has been reorganized with a clear separation between core startup files and API implementation:

```
alg-discovery/                 # 🏠 Project Root
├── 📄 README.md              # 📖 Main project documentation
├── 📄 requirements.txt       # 📦 Consolidated dependencies
├── 📄 start.py              # 🚀 Main startup script
├── 📄 env.example           # ⚙️ Environment configuration template
├── 📄 PROJECT_STRUCTURE.md  # 📋 This file - structure documentation
├── 📁 api/                  # 🔧 Backend API Implementation
│   ├── 📄 main.py           # 🌐 FastAPI application
│   ├── 📄 README.md         # 📖 API-specific documentation
│   ├── 📄 __init__.py       # 📦 Python package marker
│   ├── 📁 config/           # ⚙️ Comprehensive Configuration System
│   │   ├── 📄 __init__.py   # 🔧 Main configuration loader with fallback
│   │   ├── 📄 simple.py     # 🔧 Simple configuration for development
│   │   ├── 📁 app/          # 📱 Application Configuration
│   │   │   ├── 📄 __init__.py
│   │   │   └── 📄 settings.py  # Core app settings, features, directories
│   │   ├── 📁 trading/      # 💹 Trading Configuration
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 strategies.py  # Trading strategies & parameters
│   │   │   ├── 📄 risk.py        # Risk management & position sizing
│   │   │   └── 📄 market.py      # Market hours, sessions, holidays
│   │   ├── 📁 data/         # 💾 Data Configuration
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 sources.py     # Data providers & API configs
│   │   │   └── 📄 cache.py       # Caching mechanisms & storage
│   │   ├── 📁 server/       # 🌐 Server Configuration
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 config.py      # HTTP server & networking settings
│   │   │   └── 📄 websocket.py   # WebSocket configuration
│   │   └── 📁 security/     # 🔒 Security Configuration
│   │       ├── 📄 __init__.py
│   │       └── 📄 auth.py        # Authentication & authorization
│   ├── 📁 models/           # 📊 Data models and schemas
│   │   ├── 📄 __init__.py
│   │   └── 📄 stock_models.py
│   ├── 📁 services/         # 🛠️ Business logic and integrations
│   │   ├── 📄 __init__.py
│   │   ├── 📄 data_service.py
│   │   ├── 📄 analysis_engine.py
│   │   ├── 📄 intraday_service.py
│   │   ├── 📄 job_scheduler.py
│   │   └── 📄 websocket_manager.py
│   ├── 📁 data/             # 💾 API-specific data storage
│   └── 📁 logs/             # 📝 API-specific logs
├── 📁 data/                 # 💾 Global data storage
├── 📁 logs/                 # 📝 Global application logs
├── 📁 config/               # ⚙️ Legacy configuration files (if any)
├── 📁 services/             # 🔧 Shared services
├── 📁 utils/                # 🛠️ Utility functions
├── 📁 docs/                 # 📚 Additional documentation
├── 📁 infrastructure/       # 🚀 Deployment and infrastructure
└── 📁 .venv/                # 🐍 Python virtual environment
```

## 🎯 Key Organizational Principles

### 1. **Core Files at Root Level** 🏠
- `README.md` - Main project documentation
- `requirements.txt` - All project dependencies consolidated
- `start.py` - Single entry point for the entire system
- `env.example` - Environment configuration template

### 2. **API Implementation in `/api` Directory** 🔧
- Complete FastAPI backend implementation
- Self-contained with its own models and services
- Maintains its own documentation and data directories

### 3. **Comprehensive Configuration System** ⚙️
- **Modular Design**: Separated by functional domains
- **Environment-Driven**: All settings configurable via environment variables
- **Fallback Support**: Graceful degradation with simple config backup
- **Production-Ready**: Validation, security, and monitoring built-in

## 🔧 Configuration System Details

### Configuration Modules

#### **App Configuration** (`api/config/app/`)
- **`settings.py`**: Core application settings
  - Application identity and versioning
  - Environment configuration (dev/staging/prod)
  - Feature flags and toggles
  - Directory management
  - Logging configuration
  - Performance settings

#### **Trading Configuration** (`api/config/trading/`)
- **`strategies.py`**: Trading strategies and algorithmic parameters
  - RSI, MACD, Bollinger Bands, Moving Averages
  - Volume analysis, momentum, gap trading
  - Breakout and mean reversion strategies
  - Signal combination and weighting
- **`risk.py`**: Risk management and position sizing
  - Portfolio risk limits and concentration rules
  - Stop loss and take profit configurations
  - Daily loss limits and circuit breakers
  - Volatility and market condition adjustments
- **`market.py`**: Market hours and trading sessions
  - Market timing and timezone handling
  - Holiday calendars and trading sessions
  - No-trade zones and market conditions

#### **Data Configuration** (`api/config/data/`)
- **`sources.py`**: External data providers and APIs
  - Yahoo Finance, Alpha Vantage, ChartInk, Zerodha
  - API key management and rate limiting
  - Data quality checks and fallback mechanisms
- **`cache.py`**: Caching mechanisms and data storage
  - TTL policies for different data types
  - Cache backends (memory, Redis, Memcached)
  - Cache warming and cleanup strategies

#### **Server Configuration** (`api/config/server/`)
- **`config.py`**: HTTP server and networking settings
  - Server hosting, SSL, and CORS configuration
  - Request/response limits and middleware
  - Rate limiting and API documentation
- **`websocket.py`**: WebSocket configuration for real-time data
  - Connection management and message handling
  - Channel configuration and broadcasting
  - Authentication and rate limiting

#### **Security Configuration** (`api/config/security/`)
- **`auth.py`**: Authentication and authorization settings
  - API security and rate limiting
  - CORS and request validation
  - Security headers and encryption
  - Audit logging and session management

### Configuration Loading

The main configuration loader (`api/config/__init__.py`) provides:
- **Structured Configuration**: Loads all specialized modules
- **Fallback Mechanism**: Uses simple config if structured loading fails
- **Global Instances**: Pre-instantiated configuration objects
- **Backward Compatibility**: Legacy aliases for existing code

## 🚀 Usage Instructions

### Starting the System
```bash
# From project root
python start.py
```

### Development Mode
```bash
# Enable debug mode in .env
DEBUG=true
python start.py
```

### Configuration Access
```python
# Import specific configurations
from config import app_settings, server_config, trading_strategies

# Access configuration values
print(f"App: {app_settings.app_name} v{app_settings.version}")
print(f"Server: {server_config.host}:{server_config.port}")
print(f"Enabled Strategies: {trading_strategies.get_enabled_strategies()}")
```

### Environment Configuration
```bash
# Copy and edit environment file
cp env.example .env
# Edit .env with your settings

# Example configuration values
ENVIRONMENT=production
DEBUG=false
HOST=0.0.0.0
PORT=8888
RSI_STRATEGY_ENABLED=true
MAX_POSITION_SIZE=50000
CACHE_BACKEND=redis
```

## 🔧 Technical Details

### Startup Flow
1. `start.py` executes from project root
2. Adds `api/` directory to Python path
3. Changes working directory to `api/`
4. Imports configuration from `api/config/`
5. Starts FastAPI server with `api/main.py`

### Configuration Hierarchy
- **Structured Config**: Full modular configuration system
- **Simple Config**: Unified configuration for development
- **Environment Variables**: Override any setting via `.env`
- **Fallback System**: Graceful degradation if modules fail

### Import Strategy
- Root-level scripts work with relative imports
- API modules use local imports within `api/` directory
- Configuration system handles missing dependencies gracefully
- Cross-module dependencies managed through proper path management

## 🎨 Benefits of This Organization

### ✅ **Improved Developer Experience**
- Single entry point (`start.py`)
- Modular configuration system
- Environment-driven development
- Clear project structure
- Consolidated dependencies

### ✅ **Better Maintainability**
- Separation of concerns in configuration
- Modular trading strategy management
- Clear risk management policies
- Structured data source handling
- Proper logging and monitoring setup

### ✅ **Production Ready**
- Comprehensive security configuration
- Scalable server and WebSocket settings
- Risk management and circuit breakers
- Fallback mechanisms and error handling
- Environment-specific configurations

### ✅ **Development Friendly**
- Auto-reload in development mode
- Feature flags for easy testing
- Simple configuration fallback
- Clear error messages and validation
- Structured logging with different levels

## 🔄 Configuration System Benefits

### Before Implementation
- Basic environment variable handling
- Scattered configuration across files
- Limited validation and error handling
- No structured trading parameters
- Manual security and server setup

### After Implementation
- ✅ **Comprehensive Modular System**: 5 specialized configuration domains
- ✅ **Environment-Driven Configuration**: 100+ configurable parameters
- ✅ **Fallback Support**: Graceful degradation with simple config
- ✅ **Production Security**: Authentication, authorization, and security headers
- ✅ **Trading Strategy Management**: 9 configurable trading strategies
- ✅ **Risk Management**: Position sizing, stop losses, and portfolio limits
- ✅ **Data Source Management**: Multiple providers with fallback support
- ✅ **Real-time Communication**: WebSocket channels and broadcasting
- ✅ **Monitoring and Logging**: Comprehensive audit and performance tracking

## 📊 Configuration Capabilities

### **Trading Strategies (9 Strategies)**
- RSI Momentum, MACD, Bollinger Bands
- Moving Averages, Volume Analysis
- Momentum, Gap Trading, Breakout
- Mean Reversion with signal combination

### **Risk Management**
- Position sizing (3 methods)
- Portfolio risk limits and concentration
- Stop loss and take profit automation
- Daily loss limits and circuit breakers
- Volatility and market condition adjustments

### **Data Sources (4 Providers)**
- Yahoo Finance (primary, free)
- Alpha Vantage (secondary, API key required)
- ChartInk (tertiary, API key required)
- Zerodha Kite (live trading, API credentials required)

### **WebSocket Channels (6 Channels)**
- Price updates, Trading signals
- Portfolio updates, Market news
- Screener results, System status

### **Security Features**
- API authentication and rate limiting
- CORS and request validation
- Security headers and encryption
- Audit logging and session management

## 🎯 Next Steps

1. **Environment Setup**: Configure `.env` file with your API keys and preferences
2. **Strategy Configuration**: Enable/disable trading strategies based on your approach
3. **Risk Parameters**: Set position sizes and risk limits appropriate for your capital
4. **Data Sources**: Add API keys for additional data providers
5. **Monitoring Setup**: Configure logging and alerts for production deployment
6. **Testing**: Use paper trading mode to validate strategy performance
7. **Deployment**: Configure SSL and production server settings

---

**AlgoDiscovery Trading System** - Now with a comprehensive, production-ready configuration system! 🚀