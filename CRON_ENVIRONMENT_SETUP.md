# AlgoDiscovery Cron Environment Setup Guide

## Overview

The AlgoDiscovery Trading System now uses an organized environment-based configuration system for cron jobs. Each cron job has its own dedicated environment file, making it easy to manage different configurations for different strategies.

## Folder Structure

```
cron/
├── env_loader.py              # Python environment loader for cron jobs
├── manage_cron.sh             # Cron job management script
├── env/                       # Environment files directory
│   ├── env.cron              # Default fallback environment
│   ├── swing_buy.env         # Swing buy strategy configuration
│   ├── short_buy.env         # Short buy strategy configuration
│   ├── long_buy.env          # Long buy strategy configuration
│   ├── intraday_buy.env      # Intraday buy strategy configuration
│   └── intraday_sell.env     # Intraday sell strategy configuration
└── logs/                      # Log files directory (created automatically)
```

## Available Cron Jobs

| Cron Type | Description | Default Schedule | API Endpoint |
|-----------|-------------|------------------|--------------|
| `swing_buy` | Swing trading buy recommendations | 9 AM weekdays | `/api/swing/swing-buy-recommendations` |
| `short_buy` | Short-term buy recommendations | 9 AM weekdays | `/api/shortterm/shortterm-buy-recommendations` |
| `long_buy` | Long-term buy recommendations | 9 AM weekdays | `/api/longterm/longterm-buy-recommendations` |
| `intraday_buy` | Intraday buy recommendations | 9 AM weekdays | `/api/intraday/intraday-buy-recommendations` |
| `intraday_sell` | Intraday sell recommendations | 2 PM weekdays | `/api/intraday/intraday-sell-recommendations` |

## Environment Configuration

Each cron job environment file contains the following configuration sections:

### Cron Job Configuration
- `CRON_TYPE`: The type of cron job
- `CRON_NAME`: Human-readable name for the cron job
- `CRON_SCHEDULE`: Cron schedule expression
- `CRON_ENABLED`: Whether the cron job is enabled (true/false)

### API Configuration
- `API_BASE_URL`: Base URL for the API server
- `API_ENDPOINT`: Specific endpoint for recommendations
- `API_TIMEOUT`: Request timeout in seconds
- `API_RETRIES`: Number of retry attempts

### Strategy Configuration
- `STRATEGY_TYPE`: Type of trading strategy
- `HOLDING_PERIOD_DAYS`: Expected holding period range
- `MIN_SCORE`: Minimum score threshold for recommendations
- `TOP_RECOMMENDATIONS`: Number of top recommendations to process
- `LIMIT_PER_QUERY`: Maximum results per API query

### Database Configuration
- `DB_HOST`: Database host address
- `DB_PORT`: Database port number
- `DB_NAME`: Database name
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password

### Logging Configuration
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR)
- `LOG_FILE`: Path to log file
- `LOG_FORMAT`: Log format specification

### Notification Configuration
- `ENABLE_NOTIFICATIONS`: Whether to send notifications
- `NOTIFICATION_EMAIL`: Email address for notifications
- `SLACK_WEBHOOK_URL`: Slack webhook URL for notifications

### Performance Settings
- `EXECUTION_TIMEOUT`: Maximum execution time in seconds
- `MAX_MEMORY_MB`: Maximum memory usage in MB
- `ENABLE_CACHE`: Whether to enable caching
- `CACHE_TTL_MINUTES`: Cache time-to-live in minutes

### Market Hours
- `MARKET_OPEN_HOUR`: Market opening hour
- `MARKET_CLOSE_HOUR`: Market closing hour
- `MARKET_TIMEZONE`: Market timezone

### Development vs Production
- `ENVIRONMENT`: Environment type (development/production)
- `DEBUG`: Debug mode flag

## Usage

### Cron Management Script

The `manage_cron.sh` script provides a comprehensive interface for managing cron jobs:

```bash
# List all available cron jobs and their status
./cron/manage_cron.sh list

# Show detailed configuration for a specific cron job
./cron/manage_cron.sh show <cron_type>

# Run a specific cron job manually
./cron/manage_cron.sh run <cron_type>

# Install all enabled cron jobs to system crontab
./cron/manage_cron.sh install

# Remove all cron jobs from system crontab
./cron/manage_cron.sh remove

# Show current system crontab
./cron/manage_cron.sh crontab

# Show help
./cron/manage_cron.sh help
```

### Examples

```bash
# List all cron jobs
./cron/manage_cron.sh list

# Show configuration for short buy strategy
./cron/manage_cron.sh show short_buy

# Run intraday buy cron job manually
./cron/manage_cron.sh run intraday_buy

# Install all enabled cron jobs
./cron/manage_cron.sh install
```

### Python Environment Loader

The `env_loader.py` module provides Python utilities for loading cron environments:

```python
from cron.env_loader import load_cron_environment, setup_cron_logging

# Load environment for a specific cron type
config = load_cron_environment('short_buy')

# Setup logging for a cron job
setup_cron_logging('intraday_buy')
```

## Environment File Format

Environment files use standard shell variable assignment format:

```bash
# Comments start with #
CRON_TYPE=short_buy
CRON_NAME="Short Buy Strategy"
CRON_SCHEDULE="0 9 * * 1-5"
CRON_ENABLED=true

# API Configuration
API_BASE_URL=http://localhost:8003
API_ENDPOINT=/api/shortterm/shortterm-buy-recommendations
```

**Important Notes:**
- Values containing spaces must be quoted: `CRON_NAME="Short Buy Strategy"`
- Cron schedules must be quoted: `CRON_SCHEDULE="0 9 * * 1-5"`
- Boolean values should be lowercase: `true` or `false`

## Fallback Configuration

If a specific cron environment file is not found, the system falls back to `cron/env/env.cron`. This file contains default values that can be used as a template for creating new cron configurations.

## Logging

Each cron job creates its own log file in the `cron/logs/` directory:
- `swing_buy_cron.log`
- `short_buy_cron.log`
- `long_buy_cron.log`
- `intraday_buy_cron.log`
- `intraday_sell_cron.log`

Log files are created automatically when cron jobs are executed.

## Troubleshooting

### Common Issues

1. **Environment file not found**: Ensure the environment file exists in `cron/env/` directory
2. **Permission denied**: Make sure `manage_cron.sh` is executable: `chmod +x cron/manage_cron.sh`
3. **Invalid cron schedule**: Check that the CRON_SCHEDULE value is properly quoted
4. **Command not found errors**: Ensure values with spaces are properly quoted

### Debug Mode

Enable debug mode in environment files to get more verbose output:
```bash
DEBUG=true
LOG_LEVEL=DEBUG
```

### Testing Environment Loading

Test environment loading manually:
```bash
cd cron
source env/short_buy.env
echo "CRON_NAME: $CRON_NAME"
echo "CRON_SCHEDULE: $CRON_SCHEDULE"
```

## Best Practices

1. **Environment Separation**: Use different environment files for development and production
2. **Secure Credentials**: Store sensitive information like database passwords securely
3. **Regular Backups**: Keep backups of environment configurations
4. **Version Control**: Include environment files in version control (excluding sensitive data)
5. **Documentation**: Document any custom configurations or changes

## Migration from Old System

If migrating from an older cron system:

1. Create new environment files in `cron/env/` directory
2. Update any existing scripts to use the new environment loader
3. Test each cron job individually before installing to system crontab
4. Update documentation and deployment scripts

## Support

For issues or questions about the cron environment system:
1. Check the log files in `cron/logs/`
2. Review the environment file syntax
3. Test environment loading manually
4. Consult this documentation 