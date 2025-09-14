#!/bin/bash

# Quick Frontend Docker Deployment Script
# This script builds and deploys only the frontend as a Docker image

set -e

echo "🚀 Starting Frontend Docker Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_IMAGE="algodiscovery-frontend-prod"
CONTAINER_NAME="algodiscovery-frontend-prod"

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "  Frontend Image: $FRONTEND_IMAGE"
echo "  Container Name: $CONTAINER_NAME"
echo ""

# Step 1: Create necessary directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p logs/nginx ssl

# Step 2: Build frontend Docker image
echo -e "${YELLOW}🔨 Building frontend Docker image...${NC}"
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

# Step 4: Run frontend container
echo -e "${YELLOW}🐳 Starting frontend container...${NC}"
docker run -d \
    --name $CONTAINER_NAME \
    -p 80:80 \
    -p 443:443 \
    -v $(pwd)/ssl:/etc/ssl:ro \
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

# Step 7: Display deployment summary
echo ""
echo -e "${GREEN}🎉 Frontend Docker Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo "  Frontend URL: http://localhost"
echo "  Health Check: http://localhost/health"
echo "  Container: $CONTAINER_NAME"
echo "  Image: $FRONTEND_IMAGE"
echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo "  View logs: docker logs $CONTAINER_NAME"
echo "  Stop container: docker stop $CONTAINER_NAME"
echo "  Restart container: docker restart $CONTAINER_NAME"
echo "  Remove container: docker rm $CONTAINER_NAME"
echo ""
echo -e "${GREEN}🚀 Your frontend is now running in production mode!${NC}"
