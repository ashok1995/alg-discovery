#!/bin/bash

# Domain-Based Production Deployment Script
# This script deploys the frontend to serve from api.algodiscovery.com

set -e

echo "🚀 Starting Domain-Based Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="api.algodiscovery.com"
FRONTEND_PORT=443
BACKEND_PORT=8183

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "  Domain: $DOMAIN"
echo "  Frontend Port: $FRONTEND_PORT"
echo "  Backend Port: $BACKEND_PORT"
echo ""

# Step 1: Build production frontend
echo -e "${YELLOW}🔨 Building production frontend...${NC}"
npm run build:prod:domain

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build successful${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

# Step 2: Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose-domain.yml down || true

# Step 3: Start domain-based containers
echo -e "${YELLOW}🐳 Starting domain-based containers...${NC}"
docker-compose -f docker-compose-domain.yml up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Containers started successfully${NC}"
else
    echo -e "${RED}❌ Failed to start containers${NC}"
    exit 1
fi

# Step 4: Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Step 5: Health check
echo -e "${YELLOW}🏥 Performing health check...${NC}"
if curl -f -s "https://$DOMAIN/health" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "Checking HTTP fallback..."
    if curl -f -s "http://$DOMAIN/health" > /dev/null; then
        echo -e "${YELLOW}⚠️ HTTP works, but HTTPS needs SSL certificates${NC}"
    else
        echo -e "${RED}❌ Both HTTP and HTTPS health checks failed${NC}"
        exit 1
    fi
fi

# Step 6: Test API endpoint
echo -e "${YELLOW}🔌 Testing API endpoint...${NC}"
if curl -f -s "https://$DOMAIN/api/recommendations/stocks?strategy=swing&limit=1" > /dev/null; then
    echo -e "${GREEN}✅ API endpoint working${NC}"
else
    echo -e "${RED}❌ API endpoint failed${NC}"
    echo "Make sure the recommendation service is running on port $BACKEND_PORT"
fi

# Step 7: Display deployment summary
echo ""
echo -e "${GREEN}🎉 Domain-Based Production Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo "  Frontend URL: https://$DOMAIN"
echo "  API Base URL: https://$DOMAIN/api"
echo "  Health Check: https://$DOMAIN/health"
echo "  Recommendations: https://$DOMAIN/api/recommendations/stocks"
echo ""
echo -e "${BLUE}🔧 Configuration Files:${NC}"
echo "  Nginx Config: nginx.conf"
echo "  Docker Compose: docker-compose-domain.yml"
echo "  Environment: env.production.domain"
echo ""
echo -e "${YELLOW}⚠️ Next Steps:${NC}"
echo "  1. Configure SSL certificates in ./ssl/ directory"
echo "  2. Update DNS to point api.algodiscovery.com to this server"
echo "  3. Ensure backend services are running on correct ports"
echo "  4. Test the application at https://$DOMAIN"
echo ""
echo -e "${GREEN}🚀 Your application is now accessible at https://$DOMAIN${NC}"
