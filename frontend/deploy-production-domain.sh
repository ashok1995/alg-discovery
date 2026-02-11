#!/bin/bash

# Production Domain Deployment Script
# This script deploys the frontend for domain access (api.algodiscovery.com)

set -e

echo "🚀 Starting Production Domain Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="algodiscovery.com"
FRONTEND_IMAGE="algodiscovery-frontend-domain-prod"
CONTAINER_NAME="algodiscovery-frontend-domain-prod"
FRONTEND_PORT=80

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "  Domain: $DOMAIN"
echo "  Frontend Image: $FRONTEND_IMAGE"
echo "  Container Name: $CONTAINER_NAME"
echo "  Port: $FRONTEND_PORT"
echo ""

# Step 1: Create necessary directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p logs/nginx ssl

# Step 2: Build frontend Docker image for domain
echo -e "${YELLOW}🔨 Building frontend Docker image for domain access...${NC}"
docker build -f Dockerfile.production -t $FRONTEND_IMAGE .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend image built successfully${NC}"
else
    echo -e "${RED}❌ Frontend image build failed${NC}"
    exit 1
fi

# Step 3: Stop existing container
echo -e "${YELLOW}🛑 Stopping existing container...${NC}"
docker stop $CONTAINER_NAME || true
docker rm $CONTAINER_NAME || true

# Step 4: Run frontend container for domain access
echo -e "${YELLOW}🐳 Starting frontend container for domain access...${NC}"
docker run -d \
    --name $CONTAINER_NAME \
    -p $FRONTEND_PORT:80 \
    -v $(pwd)/logs/nginx:/var/log/nginx \
    --restart unless-stopped \
    $FRONTEND_IMAGE

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend container started successfully${NC}"
else
    echo -e "${RED}❌ Failed to start frontend container${NC}"
    exit 1
fi

# Step 5: Wait for container to be ready
echo -e "${YELLOW}⏳ Waiting for container to be ready...${NC}"
sleep 5

# Step 6: Health check
echo -e "${YELLOW}🏥 Performing health check...${NC}"
if curl -f -s "http://localhost/health" > /dev/null; then
    echo -e "${GREEN}✅ Frontend health check passed${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
fi

# Step 7: Test domain access (if DNS is configured)
echo -e "${YELLOW}🌐 Testing domain access...${NC}"
if curl -f -s "http://$DOMAIN/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Domain access working: http://$DOMAIN${NC}"
else
    echo -e "${YELLOW}⚠️ Domain access not available (DNS not configured)${NC}"
    echo "  You can still access via: http://localhost"
fi

# Step 8: Test API proxy
echo -e "${YELLOW}🔌 Testing API proxy...${NC}"
if curl -f -s "http://localhost/api/recommendations/stocks?strategy=swing&limit=1" > /dev/null; then
    echo -e "${GREEN}✅ API proxy working${NC}"
else
    echo -e "${YELLOW}⚠️ API proxy test failed (backend services may not be running)${NC}"
fi

# Step 9: Display deployment summary
echo ""
echo -e "${GREEN}🎉 Production Domain Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo "  Frontend URL: http://localhost (development)"
echo "  Domain URL: http://$DOMAIN (production)"
echo "  Health Check: http://localhost/health"
echo "  API Base URL: http://localhost/api"
echo "  Container: $CONTAINER_NAME"
echo "  Image: $FRONTEND_IMAGE"
echo ""
echo -e "${BLUE}🌐 Access Methods:${NC}"
echo "  Development: http://localhost"
echo "  Production: http://$DOMAIN (when DNS is configured)"
echo "  Both support the same functionality"
echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo "  View logs: docker logs $CONTAINER_NAME"
echo "  Stop container: docker stop $CONTAINER_NAME"
echo "  Restart container: docker restart $CONTAINER_NAME"
echo "  Remove container: docker rm $CONTAINER_NAME"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "  1. Configure DNS to point $DOMAIN to this server"
echo "  2. Deploy backend services on ports 8183, 8020, 8030, 8002"
echo "  3. Update backend CORS to allow $DOMAIN"
echo "  4. Test full functionality"
echo ""
echo -e "${GREEN}🚀 Your production frontend is now accessible via domain!${NC}"
