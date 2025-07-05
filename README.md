# AlgoDiscovery Trading System

A comprehensive algorithmic trading platform providing automated stock recommendations across multiple timeframes with environment-based configuration management.

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd alg-discovery
pip install -r requirements.txt

# Start all trading servers
./api/manage_servers.sh start all

# Setup cron jobs
./cron/manage_cron.sh install

# Test API
curl "http://localhost:8002/api/swing/swing-buy-recommendations"
```

## 📋 System Overview

- **4 Trading Strategies**: Swing, Short-term, Long-term, and Intraday
- **Environment-Based Config**: Easy deployment and management
- **Automated Cron Jobs**: Scheduled recommendation generation
- **RESTful APIs**: JSON endpoints for all strategies
- **Comprehensive Logging**: Structured logs with monitoring

## 🏗️ Architecture

```
alg-discovery/
├── api/                    # Trading API servers
│   ├── env/               # Server configurations
│   ├── manage_servers.sh  # Server management
│   └── *_server.py        # Strategy servers
├── cron/                  # Cron job system
│   ├── env/               # Cron configurations
│   ├── manage_cron.sh     # Cron management
│   └── env_loader.py      # Environment loader
└── core/                  # Trading algorithms
```

## 📚 Documentation

- **[Complete System Guide](ALGODISCOVERY_SYSTEM_GUIDE.md)** - Comprehensive documentation
- **[Cron Environment Setup](CRON_ENVIRONMENT_SETUP.md)** - Cron job configuration
- **[API Environment Setup](api/ENVIRONMENT_SETUP.md)** - Server configuration

## 🔧 Management Commands

### Server Management
```bash
./api/manage_servers.sh start all      # Start all servers
./api/manage_servers.sh status         # Check server status
./api/manage_servers.sh health         # Health check
./api/manage_servers.sh logs swing     # View logs
```

### Cron Management
```bash
./cron/manage_cron.sh list             # List cron jobs
./cron/manage_cron.sh install          # Install cron jobs
./cron/manage_cron.sh run short_buy    # Run manually
./cron/manage_cron.sh show intraday_buy # Show config
```

## 🌐 API Endpoints

| Strategy | Port | Endpoint |
|----------|------|----------|
| Swing | 8002 | `/api/swing/swing-buy-recommendations` |
| Short-term | 8003 | `/api/shortterm/shortterm-buy-recommendations` |
| Long-term | 8004 | `/api/longterm/longterm-buy-recommendations` |
| Intraday | 8002 | `/api/intraday/intraday-buy-recommendations` |

### Force Refresh Feature
```bash
# Bypass cache for fresh data
curl "http://localhost:8002/api/swing/swing-buy-recommendations?force_refresh=true"
```

## 📊 Available Cron Jobs

| Cron Type | Schedule | Description |
|-----------|----------|-------------|
| `swing_buy` | 9 AM weekdays | Swing trading recommendations |
| `short_buy` | 9 AM weekdays | Short-term recommendations |
| `long_buy` | 9 AM weekdays | Long-term recommendations |
| `intraday_buy` | 9 AM weekdays | Intraday buy recommendations |
| `intraday_sell` | 2 PM weekdays | Intraday sell recommendations |

## 🔍 Monitoring

```bash
# Real-time server monitoring
./api/manage_servers.sh monitor

# View cron logs
tail -f cron/logs/short_buy_cron.log

# Check system health
./api/manage_servers.sh health
```

## 🛠️ Development

### Adding New Strategy
1. Create server file: `api/new_strategy_server.py`
2. Create environment file: `api/env/new_strategy.env`
3. Update `api/manage_servers.sh`
4. Test the server

### Adding New Cron Job
1. Create environment file: `cron/env/new_cron.env`
2. Update `cron/manage_cron.sh`
3. Test the cron job

## 🐛 Troubleshooting

### Common Issues
- **Port conflicts**: Use `lsof -i :8002` to check
- **Environment files**: Verify `api/env/` and `cron/env/` exist
- **Cron issues**: Test manually with `./cron/manage_cron.sh run <type>`

### Debug Mode
```bash
# Enable in environment files
DEBUG=true
LOG_LEVEL=DEBUG
```

## 📈 Features

- ✅ **Multi-strategy Support**: Swing, Short-term, Long-term, Intraday
- ✅ **Environment Configuration**: Easy deployment and customization
- ✅ **Automated Scheduling**: Cron-based recommendation generation
- ✅ **Force Refresh**: Bypass cache for fresh data
- ✅ **Health Monitoring**: Real-time system monitoring
- ✅ **Comprehensive Logging**: Structured logs with emojis
- ✅ **RESTful APIs**: JSON endpoints for all strategies
- ✅ **Error Handling**: Robust error handling and recovery

## 🔒 Security

- Environment-based configuration for sensitive data
- Secure API key management
- Database connection security
- Network access controls

## 📞 Support

For issues and questions:
1. Check log files in `api/logs/` and `cron/logs/`
2. Review environment configurations
3. Test components individually
4. Consult the [Complete System Guide](ALGODISCOVERY_SYSTEM_GUIDE.md)

## 📄 License

[Add your license information here]

---

**Version**: 2.0 - Environment-based configuration system 