# Backend Services Domain Configuration Guide

## Overview
This guide explains how to update your backend services to work with the domain-based frontend deployment at `api.algodiscovery.com`.

## Architecture
```
Frontend (Nginx) → Backend Services
https://api.algodiscovery.com/api/ → Docker Containers
```

## Backend Service Ports
- **Recommendation Service**: Port 8183
- **Theme Service**: Port 8020
- **Strategy Service**: Port 8030
- **General API Service**: Port 8002

## 1. CORS Configuration

### Python/FastAPI Services
```python
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://api.algodiscovery.com",
        "http://localhost",  # For local development
        "http://127.0.0.1"  # For local development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

### Node.js/Express Services
```javascript
const cors = require('cors');
const express = require('express');

const app = express();

// CORS configuration
const corsOptions = {
    origin: [
        'https://api.algodiscovery.com',
        'http://localhost',  // For local development
        'http://127.0.0.1'  // For local development
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
```

### Go Services
```go
package main

import (
    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default()
    
    // CORS configuration
    config := cors.DefaultConfig()
    config.AllowOrigins = []string{
        "https://api.algodiscovery.com",
        "http://localhost",  // For local development
        "http://127.0.0.1"  // For local development
    }
    config.AllowCredentials = true
    config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
    config.AllowHeaders = []string{"*"}
    
    r.Use(cors.New(config))
}
```

## 2. Environment Variables

### Docker Environment Variables
Add these to your backend service Dockerfiles or docker-compose files:

```bash
# Domain configuration
API_DOMAIN=api.algodiscovery.com
FRONTEND_URL=https://api.algodiscovery.com
CORS_ORIGINS=https://api.algodiscovery.com

# Service configuration
NODE_ENV=production
PORT=8183  # Adjust for each service

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Environment Files
Create `.env.production` files for each service:

```bash
# .env.production for recommendation service
API_DOMAIN=api.algodiscovery.com
FRONTEND_URL=https://api.algodiscovery.com
CORS_ORIGINS=https://api.algodiscovery.com
NODE_ENV=production
PORT=8183
LOG_LEVEL=info
```

## 3. Dockerfile Updates

### Python/FastAPI Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Environment variables
ENV API_DOMAIN=api.algodiscovery.com
ENV FRONTEND_URL=https://api.algodiscovery.com
ENV CORS_ORIGINS=https://api.algodiscovery.com
ENV NODE_ENV=production
ENV PORT=8183

# Expose port
EXPOSE 8183

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8183/health || exit 1

# Start application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8183"]
```

### Node.js Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Environment variables
ENV API_DOMAIN=api.algodiscovery.com
ENV FRONTEND_URL=https://api.algodiscovery.com
ENV CORS_ORIGINS=https://api.algodiscovery.com
ENV NODE_ENV=production
ENV PORT=8183

# Expose port
EXPOSE 8183

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8183/health || exit 1

# Start application
CMD ["npm", "start"]
```

## 4. Docker Compose Updates

### Individual Service Docker Compose
```yaml
version: '3.8'

services:
  recommendation-service:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: algodiscovery-recommendation-prod
    ports:
      - "8183:8183"
    environment:
      - API_DOMAIN=api.algodiscovery.com
      - FRONTEND_URL=https://api.algodiscovery.com
      - CORS_ORIGINS=https://api.algodiscovery.com
      - NODE_ENV=production
      - PORT=8183
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - algodiscovery-network

networks:
  algodiscovery-network:
    external: true
```

## 5. Health Check Endpoints

### Python/FastAPI
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "recommendation-service",
        "domain": "api.algodiscovery.com",
        "timestamp": datetime.utcnow().isoformat()
    }
```

### Node.js/Express
```javascript
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'recommendation-service',
        domain: 'api.algodiscovery.com',
        timestamp: new Date().toISOString()
    });
});
```

## 6. Logging Configuration

### Python/FastAPI
```python
import logging
import json
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/app.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Log domain configuration
logger.info(f"Service configured for domain: {os.getenv('API_DOMAIN', 'localhost')}")
```

### Node.js/Express
```javascript
const winston = require('winston');

// Configure logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: '/app/logs/app.log' }),
        new winston.transports.Console()
    ]
});

// Log domain configuration
logger.info(`Service configured for domain: ${process.env.API_DOMAIN || 'localhost'}`);
```

## 7. Testing Configuration

### Test CORS Configuration
```bash
# Test CORS from frontend domain
curl -H "Origin: https://api.algodiscovery.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:8183/api/recommendations/stocks
```

### Test Health Endpoints
```bash
# Test health endpoints
curl http://localhost:8183/health
curl http://localhost:8020/health
curl http://localhost:8030/health
curl http://localhost:8002/health
```

## 8. Deployment Steps

### 1. Update Backend Services
1. Update CORS configuration in each service
2. Add environment variables for domain
3. Update Dockerfiles with domain configuration
4. Add health check endpoints

### 2. Build Backend Images
```bash
# Build each service
docker build -t your-registry/algodiscovery-recommendation:latest ./recommendation-service
docker build -t your-registry/algodiscovery-theme:latest ./theme-service
docker build -t your-registry/algodiscovery-strategy:latest ./strategy-service
docker build -t your-registry/algodiscovery-general-api:latest ./general-api-service
```

### 3. Deploy Full Stack
```bash
# Deploy everything
cd frontend
./deploy-production-docker.sh
```

## 9. Troubleshooting

### Common Issues

#### CORS Errors
- **Problem**: Frontend can't access backend APIs
- **Solution**: Check CORS configuration and ensure `https://api.algodiscovery.com` is in allowed origins

#### Port Conflicts
- **Problem**: Services can't start due to port conflicts
- **Solution**: Ensure ports 8183, 8020, 8030, 8002 are available

#### SSL Certificate Issues
- **Problem**: HTTPS not working
- **Solution**: Place SSL certificates in `frontend/ssl/` directory

#### Health Check Failures
- **Problem**: Services failing health checks
- **Solution**: Ensure health endpoints are implemented and accessible

### Debug Commands
```bash
# Check service status
docker-compose -f docker-compose-full-stack.yml ps

# View logs
docker-compose -f docker-compose-full-stack.yml logs -f

# Test individual services
curl http://localhost:8183/health
curl http://localhost:8020/health
curl http://localhost:8030/health
curl http://localhost:8002/health

# Test API endpoints
curl http://localhost/api/recommendations/stocks?strategy=swing&limit=1
```

## 10. Security Considerations

### SSL/TLS
- Use HTTPS for all communications
- Implement proper SSL certificate management
- Use secure cipher suites

### CORS Security
- Only allow necessary origins
- Use specific headers instead of wildcards
- Implement proper authentication

### Network Security
- Use Docker networks for service isolation
- Implement proper firewall rules
- Monitor network traffic

This guide provides a complete framework for updating your backend services to work with the domain-based frontend deployment.
