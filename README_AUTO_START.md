# 🚀 Trading Services Auto-Start Setup

This document explains how to set up your trading APIs to run continuously with automatic restart and internet connectivity monitoring.

## 🎯 Features

✅ **Continuous Operation**: APIs run 24/7 with automatic restart  
✅ **Internet Awareness**: Only operates when internet is available  
✅ **Cache Refresh**: Automatic cache refresh every 1 hour  
✅ **Crash Recovery**: Automatic restart if services fail  
✅ **System Restart**: Auto-start after laptop reboot  
✅ **Comprehensive Logging**: Full logging for monitoring and debugging  
✅ **Easy Management**: Simple commands for control and monitoring  

## 📋 Services Managed

1. **Trading API Servers**
   - Long-term Investment API (port 8001)
   - Swing Trading API (port 8002)
   - Short-term Trading API (port 8003)

2. **Background Services**
   - Trading Cron Manager (market-aware scheduling)
   - Cache Refresh Service (hourly cache updates)
   - Internet Connectivity Monitor (connection tracking)

3. **Supervision System**
   - Supervisor daemon for process management
   - macOS Launch Agent for auto-start

## 🚀 Quick Setup

### 1. Run the Setup Script
```bash
# Make the script executable and run it
chmod +x setup_auto_start.sh
./setup_auto_start.sh
```

This will:
- Install supervisor and configure all services
- Set up macOS Launch Agent for auto-start
- Create monitoring and management scripts
- Start all services immediately

### 2. Verify Services are Running
```bash
# Quick status check
python check_services.py

# Detailed status check
.venv/bin/python -m supervisor.supervisorctl -c supervisord.conf status
```

## 🎮 Management Commands

### Service Control
```bash
# Check if auto-start is enabled
launchctl list | grep com.trading.services

# Manually start all services
launchctl start com.trading.services

# Manually stop all services  
launchctl stop com.trading.services

# Restart all services
./setup_auto_start.sh restart
```

### Individual Service Management
```bash
# Check status of all services
.venv/bin/python -m supervisor.supervisorctl -c supervisord.conf status

# Restart specific service
.venv/bin/python -m supervisor.supervisorctl -c supervisord.conf restart longterm-api

# Stop specific service
.venv/bin/python -m supervisor.supervisorctl -c supervisord.conf stop swing-api

# Start specific service
.venv/bin/python -m supervisor.supervisorctl -c supervisord.conf start shortterm-api
```

### View Logs
```bash
# System logs
tail -f logs/launchd-stdout.log
tail -f logs/launchd-stderr.log

# Individual service logs
tail -f logs/longterm-api.log
tail -f logs/swing-api.log
tail -f logs/shortterm-api.log
tail -f logs/trading-cron.log
tail -f logs/cache-refresh.log
tail -f logs/internet-monitor.log
```

## 📊 Monitoring

### Health Check Endpoints
```bash
# Check API health
curl http://localhost:8001/health  # Long-term API
curl http://localhost:8002/health  # Swing API  
curl http://localhost:8003/health  # Short-term API
```

### Service Status
```bash
# Quick status overview
python check_services.py

# Detailed supervisor status
.venv/bin/python -m supervisor.supervisorctl -c supervisord.conf status

# Check internet connectivity
cat logs/connection_status.txt
```

### Cache Status
```bash
# Test cache functionality
python3 -c "
import asyncio
import sys
sys.path.append('.')
from api.models.recommendation_models import recommendation_cache

async def check_cache():
    await recommendation_cache.initialize()
    stats = await recommendation_cache.get_cache_stats()
    print(f'Cache: {stats}')
    await recommendation_cache.close()

asyncio.run(check_cache())
"
```

## 🔧 Configuration

### Supervisor Configuration
- **File**: `supervisord.conf`
- **Programs**: All service definitions
- **Logs**: Individual log files for each service
- **Auto-restart**: Enabled for all services

### Launch Agent Configuration  
- **File**: `com.trading.services.plist`
- **Location**: `~/Library/LaunchAgents/`
- **Triggers**: Network connectivity, system boot
- **Keep-alive**: Automatic restart on failure

### Cache Refresh Schedule
- **Interval**: Every 1 hour (3600 seconds)
- **Check frequency**: Every 10 minutes
- **Internet dependency**: Only refreshes when connected

## 🛠️ Troubleshooting

### Services Not Starting
```bash
# Check prerequisites
ls -la .venv/bin/python
ls -la supervisord.conf

# Check launch agent
launchctl list | grep com.trading.services
cat ~/Library/LaunchAgents/com.trading.services.plist

# View error logs
cat logs/launchd-stderr.log
```

### API Not Responding
```bash
# Check if supervisor is running
ps aux | grep supervisord

# Check individual service status
.venv/bin/python -m supervisor.supervisorctl -c supervisord.conf status

# Restart specific API
.venv/bin/python -m supervisor.supervisorctl -c supervisord.conf restart longterm-api
```

### Cache Issues
```bash
# Check cache refresh logs
tail -f logs/cache-refresh.log

# Manual cache refresh
python3 -c "
import requests
response = requests.post('http://localhost:8001/api/longterm/long-buy-recommendations', 
                        json={'force_refresh': True})
print(response.status_code, len(response.json().get('recommendations', [])))
"
```

### Internet Connectivity Issues
```bash
# Check connectivity monitor
tail -f logs/internet-monitor.log

# Check current status
cat logs/connection_status.txt

# Test connectivity manually
python3 -c "
import requests
try:
    response = requests.get('https://www.google.com', timeout=5)
    print('Connected:', response.status_code == 200)
except:
    print('Not connected')
"
```

## 🔄 Uninstall/Disable

### Disable Auto-Start
```bash
# Unload launch agent (disable auto-start)
launchctl unload ~/Library/LaunchAgents/com.trading.services.plist

# Or use the setup script
./setup_auto_start.sh uninstall
```

### Stop All Services
```bash
# Stop all services through launch agent
launchctl stop com.trading.services

# Or stop supervisor directly
.venv/bin/python -m supervisor.supervisorctl -c supervisord.conf shutdown
```

### Remove Launch Agent
```bash
# Completely remove auto-start capability
./setup_auto_start.sh uninstall
rm ~/Library/LaunchAgents/com.trading.services.plist
```

## 📁 File Structure

```
alg-discovery/
├── supervisord.conf              # Supervisor configuration
├── com.trading.services.plist    # macOS Launch Agent
├── setup_auto_start.sh          # Auto-start setup script
├── start_all_services.py        # Main service manager
├── cache_refresh_service.py     # Cache refresh daemon
├── internet_monitor.py          # Connectivity monitor
├── cron_manager_starter.py      # Cron manager wrapper
├── check_services.py           # Status checker (created by setup)
└── logs/                       # All log files
    ├── supervisord.log
    ├── longterm-api.log
    ├── swing-api.log
    ├── shortterm-api.log
    ├── trading-cron.log
    ├── cache-refresh.log
    ├── internet-monitor.log
    ├── launchd-stdout.log
    └── launchd-stderr.log
```

## 🎯 Expected Behavior

### Normal Operation
1. **Boot up**: Services start automatically when laptop boots
2. **Internet loss**: Services pause until connectivity restored
3. **Internet restore**: Services resume and refresh caches
4. **Hourly refresh**: Cache refreshes every hour automatically
5. **API requests**: Always served from cache (fast) or fresh analysis (slower)

### Error Recovery
1. **Service crash**: Supervisor restarts it immediately
2. **Complete failure**: Launch Agent restarts everything
3. **Network issues**: Services wait for connectivity
4. **System restart**: Everything starts automatically

## 🎉 Success Indicators

You'll know everything is working when:

✅ **APIs respond quickly**: All health endpoints return 200  
✅ **Cache is active**: Regular cache refresh logs appear  
✅ **Auto-restart works**: Services recover from failures  
✅ **Internet awareness**: Services pause/resume with connectivity  
✅ **Boot persistence**: Services start after laptop restart  

## 📞 Support

If you encounter issues:

1. **Check logs**: Always start with the log files
2. **Run status checks**: Use the provided status scripts
3. **Test individual components**: Isolate the problem
4. **Manual restart**: Use the management commands
5. **Full restart**: Uninstall and reinstall if needed

Your trading APIs are now production-ready with enterprise-grade reliability! 🚀 