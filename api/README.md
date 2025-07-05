# AlgoDiscovery API Directory

This directory contains the API servers and related components for the AlgoDiscovery Trading System.

## 📁 Directory Structure

```
api/
├── README.md                    # This file
├── ENVIRONMENT_SETUP.md         # Environment configuration guide
├── manage_servers.sh            # Server management script
├── env_loader.py                # Environment loader for servers
├── main.py                      # Main application entry point
├── app.py                       # FastAPI application setup
├── swing_server.py              # Swing trading API server
├── shortterm_server.py          # Short-term trading API server
├── longterm_server.py           # Long-term trading API server
├── env/                         # Environment configuration files
├── config/                      # Trading strategy configurations
├── models/                      # Data models and schemas
├── routes/                      # API route definitions
├── services/                    # Business logic services
├── logs/                        # Server log files
├── pids/                        # Process ID files
├── data/                        # Data storage
├── results/                     # API results and outputs
├── scripts/                     # Utility scripts
├── tests/                       # Test files
└── dev/                         # Development and debug files
```

## 🚀 Quick Start

### Start All Servers
```bash
./manage_servers.sh start all
```

### Start Specific Server
```bash
./manage_servers.sh start swing
./manage_servers.sh start shortterm
./manage_servers.sh start longterm
```

### Check Server Status
```bash
./manage_servers.sh status
./manage_servers.sh health
```

## 🔧 Server Management

The `manage_servers.sh` script provides comprehensive server management:

```bash
# Start servers
./manage_servers.sh start [server|all]

# Stop servers
./manage_servers.sh stop [server|all]

# Restart servers
./manage_servers.sh restart [server|all]

# Check status
./manage_servers.sh status
./manage_servers.sh health

# View logs
./manage_servers.sh logs [server] [lines]

# Monitor in real-time
./manage_servers.sh monitor
```

## 🌐 Available Servers

| Server | Port | Strategy | Endpoint |
|--------|------|----------|----------|
| Swing | 8002 | Swing Trading | `/api/swing/swing-buy-recommendations` |
| Short-term | 8003 | Short-term Trading | `/api/shortterm/shortterm-buy-recommendations` |
| Long-term | 8004 | Long-term Trading | `/api/longterm/longterm-buy-recommendations` |

## 📁 Directory Details

### `env/` - Environment Configuration
Contains environment-specific configuration files:
- `server.env` - Default server configuration
- `swing.env` - Swing trading server config
- `shortterm.env` - Short-term trading server config
- `longterm.env` - Long-term trading server config

## Configuration Files

The configuration files are located in the `shared/config` directory:

- `intraday_buy_config.json` - Intraday buy signal configuration
- `intraday_sell_config.json` - Intraday sell signal configuration
- `long_term_config.json` - Long-term investment configuration
- `short_term_config.json` - Short-term trading configuration
- `swing_buy_config.json` - Swing trading configuration
- `seed_algorithms_v2.json` - Seed algorithms configuration
- `unified_trading_config.json` - Unified trading configuration
- `settings.py` - Global settings and constants
- `simple.py` - Simplified configuration for development

## Usage

Import configuration from the shared package:

```python
from shared.config import load_config
from shared.config.settings import INTRADAY_CONFIG

# Load a specific config
intraday_buy_config = load_config("intraday_buy")

# Access settings
max_stocks = INTRADAY_CONFIG["max_stocks_per_theme"]
```

### `config/` - Trading Strategy Configuration
Contains JSON configuration files for different trading strategies:
- `swing_config.json`
- `short_term_config.json`
- `long_term_config.json`
- `intraday_buy_config.json`
- `intraday_sell_config.json`

### `models/` - Data Models
Contains Pydantic models and database schemas for API requests and responses.

### `routes/` - API Routes
Contains FastAPI route definitions organized by strategy.

### `services/` - Business Logic
Contains the core business logic for trading strategies and data processing.

### `logs/` - Server Logs
Contains log files for each server:
- `swing_server.log`
- `shortterm_server.log`
- `longterm_server.log`

### `tests/` - Test Files
Contains all test files moved from the root directory:
- Chartink integration tests
- API endpoint tests
- Configuration tests
- Query tests

### `dev/` - Development Files
Contains development and debug files:
- Chartink patches and fixes
- Query builders and generators
- Diagnostic tools

## 🔍 API Endpoints

### Common Endpoints
All servers provide these standard endpoints:
- `GET /health` - Health check
- `GET /status` - Server status
- `GET /api/recommendations` - Get recommendations

### Strategy-Specific Endpoints
Each server provides strategy-specific endpoints with parameters:
- `force_refresh=true/false` - Bypass cache
- `limit=50` - Number of results
- `min_score=25.0` - Minimum score threshold

## 🛠️ Development

### Adding New Server
1. Create server file: `new_strategy_server.py`
2. Create environment file: `env/new_strategy.env`
3. Update `manage_servers.sh` with new server definition
4. Add configuration in `config/` directory
5. Test the new server

### Running Tests
```bash
# Run all tests
python -m pytest tests/

# Run specific test
python tests/test_chartink.py
```

### Development Tools
Development and debug tools are available in the `dev/` directory:
- `fix_chartink_419.py` - Chartink API fixes
- `query_diagnostic_summary.py` - Query diagnostics
- `generate_recommendations.py` - Recommendation generator

## 📊 Monitoring

### Health Checks
```bash
# Check all servers
./manage_servers.sh health

# Monitor in real-time
./manage_servers.sh monitor
```

### Log Monitoring
```bash
# View server logs
./manage_servers.sh logs swing 100

# Tail logs in real-time
tail -f logs/swing_server.log
```

## 🔒 Security

- Environment-based configuration for sensitive data
- API key management through environment variables
- Input validation using Pydantic models
- Error handling without data exposure

## 📞 Support

For issues and questions:
1. Check the log files in `logs/`
2. Review environment configurations in `env/`
3. Test components individually
4. Consult the main system documentation

---

**Version**: 2.0 - Environment-based configuration system 