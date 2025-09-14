# Domain-Based Production Deployment Guide

## Overview
This guide explains how to deploy your AlgoDiscovery frontend for both domain access (production) and localhost access (development) using Docker containers.

## Architecture

### Production (Domain Access)
- **Domain**: `api.algodiscovery.com`
- **Access**: `http://api.algodiscovery.com`
- **Container**: `algodiscovery-frontend-domain-prod`
- **Port**: 80

### Development (Localhost Access)
- **Domain**: `localhost` or `127.0.0.1`
- **Access**: `http://localhost`
- **Same container** serves both domain and localhost

## Quick Start

### 1. Deploy for Domain Access
```bash
# Deploy frontend with domain support
npm run docker:deploy:domain
```

### 2. Access Methods
- **Development**: `http://localhost`
- **Production**: `http://api.algodiscovery.com` (when DNS is configured)

## Configuration Files

### 1. Nginx Configuration (`nginx-production.conf`)
- **Dual server blocks**: One for domain, one for localhost
- **API proxy routing**: Routes `/api/` requests to backend services
- **CORS configuration**: Different CORS settings for domain vs localhost
- **Security headers**: Production-ready security configuration

### 2. Dockerfile (`Dockerfile.production.domain`)
- **Multi-stage build**: Optimized production image
- **Domain nginx config**: Uses `nginx-production.conf`
- **Health checks**: Built-in container health monitoring
- **SSL ready**: Prepared for HTTPS configuration

### 3. Deployment Script (`deploy-production-domain.sh`)
- **Automated deployment**: Builds and deploys domain-based frontend
- **Health checks**: Verifies frontend and API endpoints
- **Error handling**: Comprehensive error checking and reporting

## Deployment Commands

### Domain-Based Production Deployment
```bash
# Deploy frontend with domain support
npm run docker:deploy:domain

# Or manually
./deploy-production-domain.sh
```

### Development Deployment
```bash
# Deploy frontend for localhost only
npm run docker:deploy:frontend

# Or manually
./deploy-frontend-only.sh
```

### Management Commands
```bash
# View container status
docker ps | grep algodiscovery-frontend-domain-prod

# View logs
docker logs algodiscovery-frontend-domain-prod

# Stop container
docker stop algodiscovery-frontend-domain-prod

# Restart container
docker restart algodiscovery-frontend-domain-prod

# Remove container
docker rm algodiscovery-frontend-domain-prod
```

## Testing

### Health Check
```bash
curl http://localhost/health
# Expected: "healthy"
```

### Frontend Application
```bash
curl http://localhost/
# Expected: HTML content with React app
```

### API Proxy
```bash
curl "http://localhost/api/recommendations/stocks?strategy=swing&limit=1"
# Expected: API response (or error if backend not running)
```

### Domain Access (when DNS is configured)
```bash
curl http://api.algodiscovery.com/health
# Expected: "healthy"
```

## Backend Integration

### Required Backend Services
- **Recommendation Service**: Port 8183
- **Theme Service**: Port 8020
- **Strategy Service**: Port 8030
- **General API Service**: Port 8002

### Backend CORS Configuration
Update your backend services to allow requests from both domains:

#### Python/FastAPI
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://api.algodiscovery.com",  # Production domain
        "http://localhost",              # Development
        "http://127.0.0.1"              # Development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Node.js/Express
```javascript
const cors = require('cors');

app.use(cors({
    origin: [
        'http://api.algodiscovery.com',  // Production domain
        'http://localhost',              // Development
        'http://127.0.0.1'              // Development
    ],
    credentials: true
}));
```

## DNS Configuration

### For Production Domain Access
1. **Configure DNS**: Point `api.algodiscovery.com` to your server IP
2. **A Record**: `api.algodiscovery.com` → `YOUR_SERVER_IP`
3. **Test**: `curl http://api.algodiscovery.com/health`

### For Development
- **No DNS needed**: Access via `http://localhost`
- **Same functionality**: Both domain and localhost serve identical content

## Environment Variables

### Frontend Environment
The frontend uses `env.production.domain` which includes:
```bash
# API Base URLs - Production (All services on same domain)
REACT_APP_API_BASE_URL=https://api.algodiscovery.com
REACT_APP_RECOMMENDATION_API_BASE_URL=https://api.algodiscovery.com
REACT_APP_THEME_API_BASE_URL=https://api.algodiscovery.com
REACT_APP_STRATEGIES_API_BASE_URL=https://api.algodiscovery.com

# Production Server Configuration - Serve from API domain
REACT_APP_PROD_SERVER_PORT=443
REACT_APP_PROD_SERVER_HOST=api.algodiscovery.com
```

## Security Considerations

### CORS Configuration
- **Production**: Restrictive CORS for `api.algodiscovery.com`
- **Development**: Permissive CORS for `localhost`

### Security Headers
- **X-Frame-Options**: SAMEORIGIN
- **X-XSS-Protection**: 1; mode=block
- **X-Content-Type-Options**: nosniff
- **Referrer-Policy**: no-referrer-when-downgrade

### SSL/HTTPS (Future)
- **SSL certificates**: Place in `ssl/` directory
- **HTTPS support**: Ready for SSL configuration
- **HTTP to HTTPS redirect**: Can be enabled

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using port 80
netstat -tulpn | grep :80

# Stop existing container
docker stop algodiscovery-frontend-domain-prod
docker rm algodiscovery-frontend-domain-prod
```

#### 2. Container Not Starting
```bash
# Check container logs
docker logs algodiscovery-frontend-domain-prod

# Check container status
docker ps -a | grep algodiscovery-frontend-domain-prod
```

#### 3. API Proxy Not Working
- **Check backend services**: Ensure they're running on correct ports
- **Check CORS**: Verify backend allows frontend domain
- **Check nginx logs**: `tail -f logs/nginx/error.log`

#### 4. Domain Not Accessible
- **Check DNS**: Verify `api.algodiscovery.com` points to server
- **Check firewall**: Ensure port 80 is open
- **Check nginx config**: Verify server_name includes domain

### Debug Commands
```bash
# Check container health
docker inspect algodiscovery-frontend-domain-prod --format='{{.State.Health.Status}}'

# Check nginx configuration
docker exec algodiscovery-frontend-domain-prod nginx -t

# Check nginx logs
docker exec algodiscovery-frontend-domain-prod tail -f /var/log/nginx/error.log

# Test API endpoints
curl -v "http://localhost/api/recommendations/stocks?strategy=swing&limit=1"
```

## Monitoring and Logs

### Log Locations
- **Nginx Access Logs**: `./logs/nginx/access.log`
- **Nginx Error Logs**: `./logs/nginx/error.log`
- **Container Logs**: `docker logs algodiscovery-frontend-domain-prod`

### Health Monitoring
- **Container Health**: Built-in Docker health checks
- **Application Health**: `http://localhost/health`
- **API Health**: Test API endpoints

## Performance Optimization

### Nginx Optimizations
- **Gzip compression**: Enabled for text files
- **Static asset caching**: 1 year cache for static files
- **Connection keep-alive**: Optimized timeout settings
- **Worker processes**: Optimized for container environment

### Docker Optimizations
- **Multi-stage build**: Reduced image size
- **Layer caching**: Optimized build process
- **Health checks**: Proactive monitoring
- **Restart policy**: Automatic recovery

## Backup and Recovery

### Backup Commands
```bash
# Backup Docker image
docker save algodiscovery-frontend-domain-prod > frontend-domain-backup.tar

# Backup configuration
tar -czf domain-config-backup.tar.gz nginx-production.conf Dockerfile.production.domain deploy-production-domain.sh
```

### Recovery Commands
```bash
# Restore Docker image
docker load < frontend-domain-backup.tar

# Restore configuration
tar -xzf domain-config-backup.tar.gz
```

## Next Steps

### 1. Backend Deployment
- Deploy backend services on ports 8183, 8020, 8030, 8002
- Update CORS settings for domain access
- Test full API functionality

### 2. SSL/HTTPS Configuration
- Obtain SSL certificates for `api.algodiscovery.com`
- Update nginx configuration for HTTPS
- Enable HTTP to HTTPS redirect

### 3. Production Monitoring
- Set up log monitoring and rotation
- Configure health check alerts
- Implement performance monitoring

### 4. DNS Configuration
- Configure DNS for `api.algodiscovery.com`
- Test domain access
- Verify SSL certificates

This setup provides a robust, production-ready deployment that supports both domain access for production and localhost access for development, all from a single Docker container.
