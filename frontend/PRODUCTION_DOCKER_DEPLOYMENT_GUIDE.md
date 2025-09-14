# Production Docker Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the AlgoDiscovery frontend and backend services using Docker in production.

## Prerequisites
- Docker and Docker Compose installed
- SSL certificates for `api.algodiscovery.com`
- Backend services built as Docker images
- Access to the deployment server

## Quick Start

### 1. Frontend Only Deployment
```bash
# Deploy just the frontend
npm run docker:deploy:frontend
```

### 2. Full Stack Deployment
```bash
# Deploy frontend + all backend services
npm run docker:deploy:prod
```

## Detailed Deployment Steps

### Step 1: Prepare SSL Certificates
```bash
# Create SSL directory
mkdir -p ssl

# Place your SSL certificates
cp your-cert.crt ssl/api.algodiscovery.com.crt
cp your-key.key ssl/api.algodiscovery.com.key

# Or create self-signed certificates for testing
openssl req -x509 -newkey rsa:4096 -keyout ssl/api.algodiscovery.com.key -out ssl/api.algodiscovery.com.crt -days 365 -nodes -subj '/CN=api.algodiscovery.com'
```

### Step 2: Prepare Backend Services
Ensure your backend services are built as Docker images:

```bash
# Build backend services (adjust paths as needed)
docker build -t your-registry/algodiscovery-recommendation:latest ./recommendation-service
docker build -t your-registry/algodiscovery-theme:latest ./theme-service
docker build -t your-registry/algodiscovery-strategy:latest ./strategy-service
docker build -t your-registry/algodiscovery-general-api:latest ./general-api-service
```

### Step 3: Deploy Frontend
```bash
# Deploy frontend only
./deploy-frontend-only.sh
```

### Step 4: Deploy Full Stack
```bash
# Deploy everything
./deploy-production-docker.sh
```

## Configuration Files

### 1. Frontend Dockerfile (`Dockerfile.production`)
- Multi-stage build for optimized production image
- Nginx server with custom configuration
- SSL support and health checks

### 2. Docker Compose (`docker-compose-full-stack.yml`)
- Complete stack configuration
- Network isolation
- Volume mounts for logs and SSL
- Environment variables for domain configuration

### 3. Nginx Configuration (`nginx-domain.conf`)
- HTTPS termination
- API proxy routing
- Security headers
- CORS configuration

## Backend Service Configuration

### Required Environment Variables
Each backend service needs these environment variables:

```bash
API_DOMAIN=api.algodiscovery.com
FRONTEND_URL=https://api.algodiscovery.com
CORS_ORIGINS=https://api.algodiscovery.com
NODE_ENV=production
PORT=8183  # Adjust for each service
```

### Service Ports
- **Recommendation Service**: 8183
- **Theme Service**: 8020
- **Strategy Service**: 8030
- **General API Service**: 8002

### CORS Configuration
Update each backend service to allow requests from `https://api.algodiscovery.com`:

#### Python/FastAPI
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://api.algodiscovery.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Node.js/Express
```javascript
const cors = require('cors');

app.use(cors({
    origin: 'https://api.algodiscovery.com',
    credentials: true
}));
```

## Deployment Commands

### Frontend Only
```bash
# Build and deploy frontend
npm run docker:deploy:frontend

# Or manually
./deploy-frontend-only.sh
```

### Full Stack
```bash
# Build and deploy everything
npm run docker:deploy:prod

# Or manually
./deploy-production-docker.sh
```

### Management Commands
```bash
# View all services
docker-compose -f docker-compose-full-stack.yml ps

# View logs
docker-compose -f docker-compose-full-stack.yml logs -f

# Stop services
docker-compose -f docker-compose-full-stack.yml down

# Restart services
docker-compose -f docker-compose-full-stack.yml restart

# Update services
docker-compose -f docker-compose-full-stack.yml pull
docker-compose -f docker-compose-full-stack.yml up -d
```

## Health Checks

### Frontend Health Check
```bash
curl http://localhost/health
```

### Backend Service Health Checks
```bash
curl http://localhost:8183/health  # Recommendation
curl http://localhost:8020/health  # Theme
curl http://localhost:8030/health  # Strategy
curl http://localhost:8002/health  # General API
```

### API Endpoint Test
```bash
curl "http://localhost/api/recommendations/stocks?strategy=swing&limit=1"
```

## Troubleshooting

### Common Issues

#### 1. SSL Certificate Errors
```bash
# Check SSL certificates
ls -la ssl/
openssl x509 -in ssl/api.algodiscovery.com.crt -text -noout
```

#### 2. Port Conflicts
```bash
# Check port usage
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

#### 3. CORS Errors
- Verify backend services allow `https://api.algodiscovery.com`
- Check nginx CORS headers
- Test with browser developer tools

#### 4. Service Not Starting
```bash
# Check container logs
docker logs algodiscovery-frontend-prod
docker logs algodiscovery-recommendation-prod
```

### Debug Commands
```bash
# Check Docker images
docker images | grep algodiscovery

# Check running containers
docker ps | grep algodiscovery

# Check Docker networks
docker network ls

# Check volumes
docker volume ls
```

## Security Considerations

### SSL/TLS
- Use valid SSL certificates
- Implement proper cipher suites
- Enable HSTS headers

### Network Security
- Use Docker networks for isolation
- Implement firewall rules
- Monitor network traffic

### Application Security
- Regular security updates
- Proper authentication
- Input validation
- Rate limiting

## Monitoring and Logging

### Log Locations
- **Frontend**: `./logs/nginx/`
- **Recommendation**: `./logs/recommendation/`
- **Theme**: `./logs/theme/`
- **Strategy**: `./logs/strategy/`
- **General API**: `./logs/general-api/`

### Monitoring Commands
```bash
# View real-time logs
docker-compose -f docker-compose-full-stack.yml logs -f

# Check resource usage
docker stats

# Check service health
curl http://localhost/health
```

## Backup and Recovery

### Backup Commands
```bash
# Backup Docker images
docker save algodiscovery-frontend-prod > frontend-backup.tar
docker save your-registry/algodiscovery-recommendation:latest > recommendation-backup.tar

# Backup configuration
tar -czf config-backup.tar.gz ssl/ logs/ *.yml *.conf
```

### Recovery Commands
```bash
# Restore Docker images
docker load < frontend-backup.tar
docker load < recommendation-backup.tar

# Restore configuration
tar -xzf config-backup.tar.gz
```

## Performance Optimization

### Docker Optimization
- Use multi-stage builds
- Optimize image layers
- Use .dockerignore files
- Implement health checks

### Nginx Optimization
- Enable gzip compression
- Implement caching
- Use HTTP/2
- Optimize worker processes

### Application Optimization
- Implement connection pooling
- Use CDN for static assets
- Implement caching strategies
- Monitor performance metrics

## Maintenance

### Regular Tasks
- Update Docker images
- Rotate logs
- Monitor disk space
- Check SSL certificate expiration
- Update security patches

### Update Procedure
```bash
# Pull latest images
docker-compose -f docker-compose-full-stack.yml pull

# Restart services
docker-compose -f docker-compose-full-stack.yml up -d

# Verify deployment
curl http://localhost/health
```

This guide provides a comprehensive framework for deploying and maintaining your AlgoDiscovery application in production using Docker.
