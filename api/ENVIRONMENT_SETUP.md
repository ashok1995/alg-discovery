# Environment Configuration System

## Overview

The AlgoDiscovery Trading System now supports server-specific environment configurations. Each server (swing, shortterm, longterm) can have its own environment file with specific settings.

## Environment Files

### Server-Specific Environment Files

- `swing.env` - Configuration for the swing trading server (port 8002)
- `shortterm.env` - Configuration for the short-term trading server (port 8003)  
- `longterm.env` - Configuration for the long-term investment server (port 8001)

### Fallback Environment File

- `server.env` - Default configuration used as fallback if server-specific files are not found

## Environment File Structure

Each environment file contains the following configuration sections:

### Server Configuration
```bash
SERVER_TYPE=swing|shortterm|longterm
PORT=8001|8002|8003
HOST=localhost
```

### API Configuration
```bash
CHARTINK_API_BASE_URL=https://chartink.com
API_TIMEOUT=30
MAX_RETRIES=3
```

### CORS Configuration
```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:8080,http://127.0.0.1:3000
```

### Logging Configuration
```bash
LOG_LEVEL=INFO
LOG_FORMAT=standard
LOG_FILE=./logs/{server_type}_server.log
```

### Performance Settings
```bash
REQUEST_TIMEOUT=60
WORKER_TIMEOUT=120
KEEP_ALIVE=2
```

### Cache Settings
```bash
CACHE_TTL_MINUTES=15
ENABLE_CACHE=true
```

### Server-Specific Settings

#### Swing Trading
```bash
SWING_HOLDING_PERIOD_DAYS=3-10
SWING_MIN_SCORE=25.0
SWING_TOP_RECOMMENDATIONS=20
SWING_LIMIT_PER_QUERY=50
```

#### Short-term Trading
```bash
SHORTTERM_HOLDING_PERIOD_DAYS=1-28
SHORTTERM_MIN_SCORE=35.0
SHORTTERM_TOP_RECOMMENDATIONS=20
SHORTTERM_LIMIT_PER_QUERY=50
```

#### Long-term Investment
```bash
LONGTERM_HOLDING_PERIOD_DAYS=90-365
LONGTERM_MIN_SCORE=25.0
LONGTERM_TOP_RECOMMENDATIONS=20
LONGTERM_LIMIT_PER_QUERY=50
```

## Usage

### Starting Individual Servers

#### Using the Python Startup Script
```bash
# Start swing trading server
python3 start_server.py swing

# Start short-term trading server
python3 start_server.py shortterm

# Start long-term investment server
python3 start_server.py longterm
```

#### Using the Shell Script Manager
```bash
# Start all servers
./manage_servers.sh start

# Start specific server
./manage_servers.sh start swing
./manage_servers.sh start shortterm
./manage_servers.sh start longterm

# Check status
./manage_servers.sh status

# Stop servers
./manage_servers.sh stop
```

### Environment Loading Process

1. **Server-Specific File**: The system first looks for `{server_type}.env`
2. **Fallback File**: If not found, it falls back to `server.env`
3. **Default Values**: If no environment files exist, default values are used

### Environment Variables in Code

The environment variables are automatically loaded and available in the server code:

```python
import os

# Access environment variables
port = os.getenv('PORT', 8000)
host = os.getenv('HOST', 'localhost')
log_level = os.getenv('LOG_LEVEL', 'INFO')
```

## Configuration Examples

### Development Environment
```bash
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG
HOST=localhost
```

### Production Environment
```bash
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=WARNING
HOST=0.0.0.0
```

### Custom CORS Origins
```bash
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

## Troubleshooting

### Environment File Not Found
If you see a warning about environment files not being found:
1. Check that the environment files exist in the `api/` directory
2. Verify file permissions are correct
3. The system will use default values if no files are found

### Configuration Not Applied
If configuration changes are not taking effect:
1. Restart the server after making changes
2. Check that the environment file syntax is correct
3. Verify that the server is loading the correct environment file

### Port Conflicts
If you get port conflicts:
1. Check that the ports in the environment files are unique
2. Verify that no other services are using the same ports
3. Update the PORT variable in the appropriate environment file

## Best Practices

1. **Use Server-Specific Files**: Create separate environment files for each server type
2. **Keep Sensitive Data Secure**: Don't commit environment files with sensitive data to version control
3. **Use Fallback Values**: Always provide sensible default values in the code
4. **Document Changes**: Update this documentation when adding new environment variables
5. **Test Configuration**: Verify that each server starts correctly with its environment file

## Migration from Old System

If you're migrating from the old single environment file system:

1. Copy your existing `server.env` settings to the appropriate server-specific files
2. Update any server-specific settings in the individual files
3. Test each server individually to ensure proper configuration loading
4. Remove or update any references to the old environment loading system 