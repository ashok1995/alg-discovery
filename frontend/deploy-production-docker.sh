#!/bin/bash

# Production Docker Deployment Script for AlgoDiscovery
# This script builds and deploys the complete stack using Docker

set -e

echo "🚀 Starting Production Docker Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="api.algodiscovery.com"
FRONTEND_IMAGE="algodiscovery-frontend-prod"
BACKEND_REGISTRY="your-registry"  # Update this with your registry

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "  Domain: $DOMAIN"
echo "  Frontend Image: $FRONTEND_IMAGE"
echo "  Backend Registry: $BACKEND_REGISTRY"
echo ""

# Step 1: Create necessary directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p logs/nginx logs/recommendation logs/theme logs/strategy logs/general-api
mkdir -p ssl

# Step 2: Check if SSL certificates exist
echo -e "${YELLOW}🔒 Checking SSL certificates...${NC}"
if [ ! -f "ssl/api.algodiscovery.com.crt" ] || [ ! -f "ssl/api.algodiscovery.com.key" ]; then
    echo -e "${RED}❌ SSL certificates not found${NC}"
    echo "Please place your SSL certificates in the ssl/ directory:"
    echo "  ssl/api.algodiscovery.com.crt"
    echo "  ssl/api.algodiscovery.com.key"
    echo ""
    echo "For development, you can create self-signed certificates:"
    echo "  openssl req -x509 -newkey rsa:4096 -keyout ssl/api.algodiscovery.com.key -out ssl/api.algodiscovery.com.crt -days 365 -nodes -subj '/CN=api.algodiscovery.com'"
    exit 1
else
    echo -e "${GREEN}✅ SSL certificates found${NC}"
fi

# Step 3: Build frontend Docker image
echo -e "${YELLOW}🔨 Building frontend Docker image...${NC}"
docker build -f Dockerfile.production -t $FRONTEND_IMAGE .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend image built successfully${NC}"
else
    echo -e "${RED}❌ Frontend image build failed${NC}"
    exit 1
fi

# Step 4: Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose-full-stack.yml down || true

# Step 5: Start all services
echo -e "${YELLOW}🐳 Starting all services...${NC}"
docker-compose -f docker-compose-full-stack.yml up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All services started successfully${NC}"
else
    echo -e "${RED}❌ Failed to start services${NC}"
    exit 1
fi

# Step 6: Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 15

# Step 7: Health checks
echo -e "${YELLOW}🏥 Performing health checks...${NC}"

# Check frontend
if curl -f -s "http://localhost/health" > /dev/null; then
    echo -e "${GREEN}✅ Frontend health check passed${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
fi

# Check recommendation service
if curl -f -s "http://localhost:8183/health" > /dev/null; then
    echo -e "${GREEN}✅ Recommendation service health check passed${NC}"
else
    echo -e "${RED}❌ Recommendation service health check failed${NC}"
fi

# Check theme service
if curl -f -s "http://localhost:8020/health" > /dev/null; then
    echo -e "${GREEN}✅ Theme service health check passed${NC}"
else
    echo -e "${RED}❌ Theme service health check failed${NC}"
fi

# Check strategy service
if curl -f -s "http://localhost:8030/health" > /dev/null; then
    echo -e "${GREEN}✅ Strategy service health check passed${NC}"
else
    echo -e "${RED}❌ Strategy service health check failed${NC}"
fi

# Check general API service
if curl -f -s "http://localhost:8002/health" > /dev/null; then
    echo -e "${GREEN}✅ General API service health check passed${NC}"
else
    echo -e "${RED}❌ General API service health check failed${NC}"
fi

# Step 8: Test API endpoint
echo -e "${YELLOW}🔌 Testing API endpoint...${NC}"
if curl -f -s "http://localhost/api/recommendations/stocks?strategy=swing&limit=1" > /dev/null; then
    echo -e "${GREEN}✅ API endpoint working${NC}"
else
    echo -e "${RED}❌ API endpoint failed${NC}"
fi

# Step 9: Display deployment summary
echo ""
echo -e "${GREEN}🎉 Production Docker Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo "  Frontend URL: http://localhost (or https://$DOMAIN)"
echo "  API Base URL: http://localhost/api"
echo "  Health Check: http://localhost/health"
echo "  Recommendations: http://localhost/api/recommendations/stocks"
echo ""
echo -e "${BLUE}🐳 Docker Services:${NC}"
echo "  Frontend: $FRONTEND_IMAGE"
echo "  Recommendation Service: Port 8183"
echo "  Theme Service: Port 8020"
echo "  Strategy Service: Port 8030"
echo "  General API Service: Port 8002"
echo ""
echo -e "${BLUE}📁 Logs Location:${NC}"
echo "  Frontend: ./logs/nginx/"
echo "  Recommendation: ./logs/recommendation/"
echo "  Theme: ./logs/theme/"
echo "  Strategy: ./logs/strategy/"
echo "  General API: ./logs/general-api/"
echo ""
echo -e "${YELLOW}🔧 Management Commands:${NC}"
echo "  View logs: docker-compose -f docker-compose-full-stack.yml logs -f"
echo "  Stop services: docker-compose -f docker-compose-full-stack.yml down"
echo "  Restart services: docker-compose -f docker-compose-full-stack.yml restart"
echo "  View status: docker-compose -f docker-compose-full-stack.yml ps"
echo ""
echo -e "${GREEN}🚀 Your application is now running in production mode!${NC}"
