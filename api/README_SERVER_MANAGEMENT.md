# 🚀 Server Management System

Central management system for Algorithm Discovery recommendation servers with automated deployment, monitoring, and maintenance capabilities.

## 📁 Files Structure

```
api/
├── manage_servers.sh     # Main server management script
├── server.env           # Environment configuration
├── swing_server.py      # Swing trading server
├── shortterm_server.py  # Short-term trading server
├── longterm_server.py   # Long-term investment server
├── pids/               # Process ID files (auto-created)
├── logs/               # Server log files (auto-created)
└── README_SERVER_MANAGEMENT.md
```

## 🔧 Quick Start

### 1. Make Script Executable
```bash
chmod +x manage_servers.sh
```

### 2. Start All Servers
```bash
./manage_servers.sh start all
```

### 3. Check Status
```bash
./manage_servers.sh status
```

### 4. Check Health
```bash
./manage_servers.sh health
```

## 📋 Available Commands

### Server Control
```bash
# Start servers
./manage_servers.sh start all          # Start all servers
./manage_servers.sh start swing        # Start only swing server
./manage_servers.sh start shortterm    # Start only short-term server
./manage_servers.sh start longterm     # Start only long-term server

# Stop servers
./manage_servers.sh stop all           # Stop all servers
./manage_servers.sh stop swing         # Stop only swing server

# Restart servers
./manage_servers.sh restart all        # Restart all servers
./manage_servers.sh restart shortterm  # Restart short-term server
```

### Monitoring & Status
```bash
# Check server status
./manage_servers.sh status             # Show all server status

# Health checks with HTTP responses
./manage_servers.sh health             # Check all server health

# Real-time monitoring (refreshes every 5 seconds)
./manage_servers.sh monitor            # Press Ctrl+C to exit
```

### Log Management
```bash
# View logs
./manage_servers.sh logs               # List available log files
./manage_servers.sh logs swing         # Show last 50 lines of swing logs
./manage_servers.sh logs longterm 100  # Show last 100 lines of long-term logs

# Follow logs in real-time
tail -f logs/swing.log                 # Follow swing server logs
tail -f logs/shortterm.log             # Follow short-term server logs
```

### Maintenance
```bash
# Clean up stale PID files and old logs
./manage_servers.sh clean

# Show help
./manage_servers.sh help
```

## ⚙️ Configuration (server.env)

The `server.env` file contains all configuration settings:

### Core Settings
```bash
# Server Ports
SWING_PORT=8002
SHORTTERM_PORT=8003
LONGTERM_PORT=8001

# Host (localhost for dev, 0.0.0.0 for production)
HOST=localhost
```

### Development vs Production
```bash
# Development
ENVIRONMENT=development
DEBUG=true
HOST=localhost

# Production
ENVIRONMENT=production
DEBUG=false
HOST=0.0.0.0
```

### Performance Settings
```bash
# API Configuration
API_TIMEOUT=30
MAX_RETRIES=3
REQUEST_TIMEOUT=60

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
CHARTINK_DELAY_SECONDS=0.5

# Resource Limits
MAX_MEMORY_MB=1024
MAX_CPU_PERCENT=80
```

## 🎯 Server Information

| Server Type | Port | Description | Holding Period |
|-------------|------|-------------|----------------|
| **Swing** | 8002 | Swing Trading Server | 3-10 days |
| **Short-term** | 8003 | Short-term Trading Server | 1-4 weeks |
| **Long-term** | 8001 | Long-term Investment Server | 3-12 months |

## 📊 Status Indicators

### Server Status
- 🟢 **RUNNING [HEALTHY]** - Server is running and responding to health checks
- 🟡 **RUNNING [NO RESPONSE]** - Server is running but not responding to HTTP requests
- 🔴 **STOPPED** - Server is not running

### Health Check Responses
- ✅ **HEALTHY** - HTTP 200 response from /health endpoint
- ❌ **UNHEALTHY** - Non-200 HTTP response
- ⚠️ **NOT RESPONDING** - No response from server

## 🔍 Monitoring Examples

### Basic Status Check
```bash
$ ./manage_servers.sh status

================================
 Algorithm Discovery Server Manager
================================

Swing Trading Server:    RUNNING (PID: 12345, Port: 8002) [HEALTHY]
Short-term Trading Server: RUNNING (PID: 12346, Port: 8003) [HEALTHY] 
Long-term Investment Server: STOPPED (Port: 8001)
```

### Health Check Output
```bash
$ ./manage_servers.sh health

================================
 Algorithm Discovery Server Manager
================================

Checking server health...

Swing Trading Server:    HEALTHY ✓
Short-term Trading Server: HEALTHY ✓
Long-term Investment Server: UNHEALTHY ✗ (HTTP: 500)

Some servers need attention! ⚠️
```

### Real-time Monitoring
```bash
$ ./manage_servers.sh monitor

================================
 Algorithm Discovery Server Manager
================================

Last updated: Tue Jan 15 10:30:45 PST 2025

Swing Trading Server:    RUNNING (PID: 12345, Port: 8002) [HEALTHY]
Short-term Trading Server: RUNNING (PID: 12346, Port: 8003) [HEALTHY]
Long-term Investment Server: RUNNING (PID: 12347, Port: 8001) [HEALTHY]

Press Ctrl+C to exit monitoring
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
Error: Port 8002 is already in use by another process
```
**Solution:**
```bash
# Find process using the port
lsof -i :8002

# Kill the process if needed
kill -9 <PID>

# Or use the script to stop properly
./manage_servers.sh stop swing
```

#### 2. Server Won't Start
```bash
✗ Failed to start Swing Trading Server
```
**Solution:**
```bash
# Check logs for detailed error
./manage_servers.sh logs swing

# Common fixes:
# 1. Check if Python dependencies are installed
# 2. Verify server.env configuration
# 3. Check if ChartInk module is properly set up
# 4. Ensure sufficient permissions
```

#### 3. Health Check Failing
```bash
Short-term Trading Server: UNHEALTHY ✗ (HTTP: 500)
```
**Solution:**
```bash
# Check server logs
./manage_servers.sh logs shortterm

# Common causes:
# 1. Database connection issues
# 2. ChartInk API connectivity problems
# 3. Missing configuration files
# 4. Memory or resource limits
```

#### 4. Stale PID Files
```bash
# Clean up stale PID files
./manage_servers.sh clean
```

### Debug Commands

```bash
# Check if ports are actually in use
lsof -i :8001
lsof -i :8002
lsof -i :8003

# Test server endpoints manually
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8001/health

# Check Python processes
ps aux | grep python

# Monitor resource usage
top -p $(pgrep -f "swing_server\|shortterm_server\|longterm_server")
```

## 🚀 Production Deployment

### 1. Environment Setup
```bash
# Copy and modify environment for production
cp server.env server.env.prod

# Edit production settings
vim server.env.prod
```

### 2. Production Configuration
```bash
# In server.env.prod
ENVIRONMENT=production
DEBUG=false
HOST=0.0.0.0
LOG_LEVEL=WARNING

# Security settings
API_KEY_REQUIRED=true
API_KEY=your_secure_api_key_here

# Performance optimization
MAX_MEMORY_MB=2048
WORKER_TIMEOUT=300
```

### 3. Systemd Service (Optional)
Create `/etc/systemd/system/alg-discovery.service`:
```ini
[Unit]
Description=Algorithm Discovery Servers
After=network.target

[Service]
Type=forking
User=your_user
WorkingDirectory=/path/to/alg-discovery/api
ExecStart=/path/to/alg-discovery/api/manage_servers.sh start all
ExecStop=/path/to/alg-discovery/api/manage_servers.sh stop all
ExecReload=/path/to/alg-discovery/api/manage_servers.sh restart all
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 4. Nginx Load Balancing (Optional)
```nginx
upstream swing_servers {
    server localhost:8002;
}

upstream shortterm_servers {
    server localhost:8003;
}

upstream longterm_servers {
    server localhost:8001;
}

server {
    listen 80;
    server_name your-domain.com;

    location /api/swing/ {
        proxy_pass http://swing_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/shortterm/ {
        proxy_pass http://shortterm_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/longterm/ {
        proxy_pass http://longterm_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📈 Performance Monitoring

### Resource Usage
```bash
# Monitor CPU and Memory usage
./manage_servers.sh monitor

# In another terminal, check detailed resource usage
htop -p $(pgrep -f "swing_server\|shortterm_server\|longterm_server")
```

### Log Analysis
```bash
# Monitor error patterns
grep -i error logs/*.log | tail -20

# Monitor response times
grep "processing_time" logs/*.log | tail -10

# Monitor API usage
grep "POST\|GET" logs/*.log | tail -10
```

## 🔄 Automated Operations

### Cron Jobs for Maintenance
```bash
# Add to crontab (crontab -e)

# Health check every 5 minutes
*/5 * * * * /path/to/alg-discovery/api/manage_servers.sh health > /dev/null

# Clean up logs and PIDs daily at 2 AM
0 2 * * * /path/to/alg-discovery/api/manage_servers.sh clean

# Restart servers daily at 3 AM (optional)
0 3 * * * /path/to/alg-discovery/api/manage_servers.sh restart all
```

### Health Check Script
```bash
#!/bin/bash
# health_monitor.sh

HEALTH_STATUS=$(./manage_servers.sh health | grep -c "HEALTHY ✓")

if [ "$HEALTH_STATUS" -lt 3 ]; then
    echo "WARNING: Not all servers are healthy!"
    ./manage_servers.sh status
    # Send alert (email, Slack, etc.)
fi
```

## 📞 Support & Maintenance

### Daily Operations
1. **Morning Check**: `./manage_servers.sh status`
2. **Monitor Logs**: `./manage_servers.sh logs <server> 20`
3. **Health Verification**: `./manage_servers.sh health`

### Weekly Maintenance
1. **Log Cleanup**: `./manage_servers.sh clean`
2. **Configuration Review**: Check `server.env` for optimization
3. **Performance Analysis**: Review response times and resource usage

### Emergency Procedures
1. **Complete Restart**: `./manage_servers.sh restart all`
2. **Individual Server Issues**: `./manage_servers.sh restart <server>`
3. **Log Investigation**: `./manage_servers.sh logs <server> 200`

---

**🔥 Pro Tips:**
- Use `./manage_servers.sh monitor` for real-time dashboard
- Set up automated health checks with cron jobs
- Keep production and development environments separate
- Regular log cleanup prevents disk space issues
- Monitor API response times for performance optimization 