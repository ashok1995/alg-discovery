# AlgoDiscovery Frontend Environment Setup Guide

This guide explains how to set up and use different environments for development and production.

## 🌍 Environment Overview

We have **4 different environments** to support parallel development and production:

### 1. **Local Development** (`env.local`)
- **Port**: 3000
- **DNS**: `localhost` (simple, no DNS setup needed)
- **Purpose**: Local development with simple configuration
- **Features**: Fast refresh, debug mode, mock data

### 2. **Development** (`env.development`)
- **Port**: 3000
- **DNS**: `localhost`
- **Purpose**: Standard development environment
- **Features**: Balanced performance, debug tools

### 3. **Production Testing** (`env.production`)
- **Port**: 3000 (for testing)
- **DNS**: `localhost`
- **Purpose**: Production testing on development port
- **Features**: Production settings, no debug tools

### 4. **Production Live** (`env.production.8080`) ⭐
- **Port**: **8080**
- **DNS**: `algodiscovery.prod` (DNS naming for clear identification)
- **Purpose**: **ACTUAL PRODUCTION DEPLOYMENT**
- **Features**: Full production configuration with DNS naming

## 🚀 Quick Start

### Prerequisites
```bash
# Install dependencies
npm install

# Install serve globally (for production)
npm install -g serve
```

### Setup Production DNS (One-time setup)
```bash
# Make script executable
chmod +x setup-local-dns.sh

# Run DNS setup (requires sudo)
./setup-local-dns.sh
# or
npm run dns:setup
```

## 📱 Running Different Environments

### Local Development (Simple)
```bash
npm run start:local
# Access: http://localhost:3000
# API: http://localhost:8010
```

### Standard Development
```bash
npm run start:dev
# Access: http://localhost:3000
# API: http://localhost:8010
```

### Production Testing (Port 3000)
```bash
npm run start:prod:3000
# Access: http://localhost:3000
# API: http://localhost:8010
```

### Production Deployment (Port 8080 with DNS)
```bash
# Option 1: Automated deployment
./docker-deploy.sh

# Option 2: Manual deployment
npm run build:prod:8080
npm run serve:prod

# Option 3: Docker deployment
docker-compose up -d
```

## 🔧 Environment Configuration

### Port Configuration
| Environment | Frontend Port | API Ports | DNS | Notes |
|-------------|---------------|-----------|-----|-------|
| Local | 3000 | 8010, 8002, 8020 | localhost | Simple dev |
| Development | 3000 | 8010, 8002, 8020 | localhost | Standard dev |
| Production | 3000 | 8010, 8002, 8020 | localhost | Testing only |
| Production 8080 | **8080** | 8010, 8002, 8020 | **algodiscovery.prod** | **Live production** |

### DNS Mapping (Production Environment)
```
algodiscovery.prod → 127.0.0.1:8080 (Frontend)
api.algodiscovery.prod → 127.0.0.1:8002 (Main API)
recommendations.algodiscovery.prod → 127.0.0.1:8010 (Recommendations)
theme.algodiscovery.prod → 127.0.0.1:8020 (Theme API)
strategies.algodiscovery.prod → 127.0.0.1:8030 (Strategies)
```

## 🎯 Use Cases

### For Development
```bash
# When working on new features
npm run start:local

# When testing existing features
npm run start:dev
```

### For Production
```bash
# When deploying to production port 8080
./docker-deploy.sh

# When testing production build on dev port
npm run start:prod:3000
```

### For Testing
```bash
# Test recommendation service
# Navigate to: http://localhost:3000/test/recommendation-service
# or: http://algodiscovery.prod:8080/test/recommendation-service
```

## 🔄 Parallel Development Workflow

### Scenario: Working on improvements while keeping production running

1. **Keep Production Running** (Port 8080 with DNS)
   ```bash
   # In one terminal (production)
   ./docker-deploy.sh
   # Production runs on http://algodiscovery.prod:8080
   ```

2. **Start Development** (Port 3000 on localhost)
   ```bash
   # In another terminal (development)
   npm run start:local
   # Development runs on http://localhost:3000
   ```

3. **Both environments run simultaneously**
   - Production: `http://algodiscovery.prod:8080` (stable, clearly identified)
   - Development: `http://localhost:3000` (new features, simple access)

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
lsof -i :8080

# Kill the process
kill -9 <PID>
```

### DNS Not Working
```bash
# Flush DNS cache (macOS)
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Flush DNS cache (Linux)
sudo systemctl restart systemd-resolved
```

### Build Failures
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build:prod:8080
```

## 📋 Environment Variables Reference

### Common Variables
| Variable | Local | Dev | Prod | Prod 8080 |
|----------|-------|-----|------|------------|
| `REACT_APP_NODE_ENV` | development | development | production | production |
| `REACT_APP_LOG_LEVEL` | debug | debug | error | warn |
| `REACT_APP_REQUEST_TIMEOUT` | 10000 | 15000 | 60000 | 45000 |
| `REACT_APP_REFRESH_PRICES` | 2000 | 3000 | 10000 | 8000 |

### Feature Flags
| Feature | Local | Dev | Prod | Prod 8080 |
|---------|-------|-----|------|------------|
| Debug Mode | ✅ | ✅ | ❌ | ❌ |
| Mock Data | ✅ | ❌ | ❌ | ❌ |
| Hot Reload | ✅ | ✅ | ❌ | ❌ |
| Performance Monitoring | ✅ | ✅ | ✅ | ✅ |

## 🚀 Deployment Checklist

Before deploying to production (port 8080):

- [ ] Test on development port 3000
- [ ] Verify all API endpoints are working
- [ ] Check recommendation service on port 8010
- [ ] Run production build: `npm run build:prod:8080`
- [ ] Test production build locally
- [ ] Deploy: `./docker-deploy.sh`
- [ ] Verify production accessible via: `http://algodiscovery.prod:8080`

## 📞 Support

If you encounter issues:

1. Check the environment configuration files
2. Verify DNS entries in `/etc/hosts`
3. Check port availability
4. Review the troubleshooting section above
5. Check the recommendation service test page

---

**🎯 Your production environment now uses DNS naming (algodiscovery.prod:8080) for clear identification, while development stays simple on localhost:3000!**
