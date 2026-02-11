# AlgoDiscovery Trading System - Complete Guide

## Overview

The AlgoDiscovery Trading System is a comprehensive algorithmic trading platform that provides automated stock recommendations across multiple timeframes. The system uses an environment-based configuration architecture for easy deployment and management.

## System Architecture

```
alg-discovery/
├── api/                    # API servers for different trading strategies
│   ├── env/               # Environment configurations for servers
│   ├── config/            # Trading strategy configurations
│   ├── models/            # Data models and schemas
│   ├── routes/            # API route definitions
│   ├── services/          # Business logic services
│   ├── logs/              # Server log files
│   ├── tests/             # Test files
│   ├── dev/               # Development and debug files
│   ├── manage_servers.sh  # Server management script
│   ├── env_loader.py      # Environment loader for servers
│   ├── swing_server.py    # Swing trading API server
│   ├── shortterm_server.py # Short-term trading API server
│   └── longterm_server.py # Long-term trading API server
├── cron/                  # Cron job management system
│   ├── env/               # Environment configurations for cron jobs
│   ├── manage_cron.sh     # Cron job management script
│   ├── env_loader.py      # Environment loader for cron jobs
│   └── strategies/        # Trading strategy implementations
├── core/                  # Core trading algorithms
├── models/                # Data models and database schemas
├── utils/                 # Utility functions and helpers
├── tests/                 # Test suites
└── docs/                  # Documentation
```

## Available Trading Strategies

### 1. Swing Trading (Port 8002)
- **Holding Period**: 3-10 days
- **Target**: Medium-term price movements
- **API Endpoint**: `/api/swing/swing-buy-recommendations`
- **Environment File**: `api/env/swing.env`

### 2. Short-term Trading (Port 8003)
- **Holding Period**: 1-28 days
- **Target**: Short-term momentum
- **API Endpoint**: `/api/shortterm/shortterm-buy-recommendations`
- **Environment File**: `api/env/shortterm.env`

### 3. Long-term Trading (Port 8004)
- **Holding Period**: 30-365 days
- **Target**: Long-term value investments
- **API Endpoint**: `/api/longterm/longterm-buy-recommendations`
- **Environment File**: `api/env/longterm.env`

### 4. Intraday Trading (Port 8002)
- **Holding Period**: 1 day
- **Target**: Same-day trading opportunities
- **API Endpoints**: 
  - Buy: `/api/intraday/intraday-buy-recommendations`
  - Sell: `/api/intraday/intraday-sell-recommendations`
- **Environment File**: `api/env/intraday.env`

## Server Management

### Starting Servers

```bash
# Start all servers
./api/manage_servers.sh start all

# Start specific server
./api/manage_servers.sh start swing
./api/manage_servers.sh start shortterm
./api/manage_servers.sh start longterm

# Check server status
./api/manage_servers.sh status

# Check server health
./api/manage_servers.sh health
```

### Server Configuration

Each server uses environment-specific configuration files in `api/env/`:

```bash
# Example server environment file (api/env/swing.env)
PORT=8002
HOST=localhost
LOG_LEVEL=INFO
LOG_FILE=./logs/swing_server.log
ENVIRONMENT=development
DEBUG=true

# Strategy-specific settings
SWING_HOLDING_PERIOD_DAYS=3-10
SWING_MIN_SCORE=25.0
SWING_TOP_RECOMMENDATIONS=20
SWING_LIMIT_PER_QUERY=50
```

## Cron Job Management

### Available Cron Jobs

| Cron Type | Schedule | Description |
|-----------|----------|-------------|
| `swing_buy` | 9 AM weekdays | Swing trading buy recommendations |
| `short_buy` | 9 AM weekdays | Short-term buy recommendations |
| `long_buy` | 9 AM weekdays | Long-term buy recommendations |
| `intraday_buy` | 9 AM weekdays | Intraday buy recommendations |
| `intraday_sell` | 2 PM weekdays | Intraday sell recommendations |

### Managing Cron Jobs

```bash
# List all cron jobs
./cron/manage_cron.sh list

# Show configuration for specific cron job
./cron/manage_cron.sh show short_buy

# Run cron job manually
./cron/manage_cron.sh run intraday_buy

# Install all enabled cron jobs to system crontab
./cron/manage_cron.sh install

# Remove all cron jobs from system crontab
./cron/manage_cron.sh remove
```

### Cron Job Configuration

Each cron job has its own environment file in `cron/env/`:

```bash
# Example cron environment file (cron/env/short_buy.env)
CRON_TYPE=short_buy
CRON_NAME="Short Buy Strategy"
CRON_SCHEDULE="0 9 * * 1-5"
CRON_ENABLED=true

API_BASE_URL=http://localhost:8003
API_ENDPOINT=/api/shortterm/shortterm-buy-recommendations
API_TIMEOUT=30
API_RETRIES=3

STRATEGY_TYPE=shortterm
HOLDING_PERIOD_DAYS=1-28
MIN_SCORE=35.0
TOP_RECOMMENDATIONS=20
LIMIT_PER_QUERY=50
```

## API Endpoints

### Common Endpoints

All servers provide these standard endpoints:

- `GET /health` - Health check
- `GET /status` - Server status
- `GET /api/recommendations` - Get recommendations (with parameters)

### Force Refresh Feature

The API supports a `force_refresh` parameter to bypass cache:

```bash
# Normal request (uses cache if available)
curl "http://localhost:8002/api/swing/swing-buy-recommendations"

# Force refresh (bypasses cache)
curl "http://localhost:8002/api/swing/swing-buy-recommendations?force_refresh=true"
```

### Query Parameters

- `force_refresh=true/false` - Bypass cache
- `limit=50` - Number of results
- `min_score=25.0` - Minimum score threshold
- `holding_period=3-10` - Holding period range

## Environment Configuration

### Server Environment Files

Located in `api/env/`:
- `server.env` - Default server configuration
- `swing.env` - Swing trading server
- `shortterm.env` - Short-term trading server
- `longterm.env` - Long-term trading server

### Cron Environment Files

Located in `cron/env/`:
- `env.cron` - Default cron configuration
- `swing_buy.env` - Swing buy cron job
- `short_buy.env` - Short buy cron job
- `long_buy.env` - Long buy cron job
- `intraday_buy.env` - Intraday buy cron job
- `intraday_sell.env` - Intraday sell cron job

## Logging

### Server Logs

- Location: `api/logs/`
- Files: `swing_server.log`, `shortterm_server.log`, `longterm_server.log`
- Format: Structured JSON with timestamps

### Cron Logs

- Location: `cron/logs/`
- Files: `swing_buy_cron.log`, `short_buy_cron.log`, etc.
- Format: Standard log format with emojis for easy reading

## Quick Start Guide

### 1. Setup Environment

```bash
# Clone repository
git clone <repository-url>
cd alg-discovery

# Install dependencies
pip install -r requirements.txt

# Copy environment files
cp env.example .env
```

### 2. Start Servers

```bash
# Start all trading servers
./api/manage_servers.sh start all

# Verify servers are running
./api/manage_servers.sh status
```

### 3. Setup Cron Jobs

```bash
# Install cron jobs
./cron/manage_cron.sh install

# Verify cron jobs
./cron/manage_cron.sh list
```

### 4. Test API

```bash
# Test swing trading API
curl "http://localhost:8002/api/swing/swing-buy-recommendations"

# Test with force refresh
curl "http://localhost:8002/api/swing/swing-buy-recommendations?force_refresh=true"
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using the port
   lsof -i :8002
   
   # Kill the process
   kill -9 <PID>
   ```

2. **Environment file not found**
   ```bash
   # Check if environment file exists
   ls -la api/env/
   ls -la cron/env/
   ```

3. **Cron job not running**
   ```bash
   # Check cron status
   ./cron/manage_cron.sh crontab
   
   # Test cron job manually
   ./cron/manage_cron.sh run short_buy
   ```

### Debug Mode

Enable debug mode in environment files:

```bash
DEBUG=true
LOG_LEVEL=DEBUG
```

## Development

### Adding New Strategies

1. Create server file: `api/new_strategy_server.py`
2. Create environment file: `api/env/new_strategy.env`
3. Update `api/manage_servers.sh` with new server definition
4. Test the new server

### Adding New Cron Jobs

1. Create environment file: `cron/env/new_cron.env`
2. Update `cron/manage_cron.sh` with new cron type
3. Test the new cron job

## Monitoring

### Health Checks

```bash
# Check all servers
./api/manage_servers.sh health

# Monitor in real-time
./api/manage_servers.sh monitor
```

### Log Monitoring

```bash
# View server logs
./api/manage_servers.sh logs swing 100

# View cron logs
tail -f cron/logs/short_buy_cron.log
```

## Security Considerations

1. **Environment Files**: Keep sensitive data in environment files
2. **API Keys**: Store API keys securely
3. **Database**: Use strong passwords for database connections
4. **Network**: Restrict API access to trusted networks

## Performance Optimization

1. **Caching**: Enable caching for better performance
2. **Rate Limiting**: Configure appropriate rate limits
3. **Resource Limits**: Set memory and CPU limits
4. **Log Rotation**: Enable log rotation to manage disk space

## Support

For issues and questions:
1. Check the log files
2. Review environment configurations
3. Test components individually
4. Consult this documentation

## Version History

- **v2.0**: Environment-based configuration system
- **v1.0**: Initial release with basic functionality 