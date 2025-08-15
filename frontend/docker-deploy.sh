#!/bin/bash

# Docker Deployment Script for AlgoDiscovery Frontend (Port 80 - No Port in URL)
# This script builds and deploys the production frontend on port 80

set -e

echo "🚀 Deploying AlgoDiscovery Frontend to Production (Port 80 - No Port in URL)..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if port 80 is available (requires sudo on macOS/Linux)
if lsof -i :80 > /dev/null 2>&1; then
    echo "⚠️  Port 80 is already in use. Stopping existing processes..."
    sudo lsof -ti:80 | xargs sudo kill -9 2>/dev/null || true
fi

# Stop and remove existing containers
echo "🔄 Stopping existing containers..."
docker-compose down 2>/dev/null || true
docker stop algodiscovery-frontend-prod 2>/dev/null || true
docker rm algodiscovery-frontend-prod 2>/dev/null || true

# Remove existing images
echo "🧹 Cleaning up existing images..."
docker rmi algodiscovery-frontend 2>/dev/null || true

# Build the production image (port 80)
echo "🏗️  Building production image for port 80..."
docker build -t algodiscovery-frontend .

# Start services in detached mode
echo "🚀 Starting production services on port 80..."
docker-compose up -d

# Wait for container to be healthy
echo "⏳ Waiting for container to be healthy..."
sleep 10

# Check container status
echo "📊 Container status:"
docker-compose ps

# Check if container is running
if docker ps | grep -q "algodiscovery-frontend-prod"; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🌐 Production URLs (No Port Needed!):"
    echo "   Frontend: http://algodiscovery.prod"
    echo "   Health Check: http://algodiscovery.prod/health"
    echo "   Test Page: http://algodiscovery.prod/test/recommendation-service"
    echo ""
    echo "🔧 Backend Services (unchanged):"
    echo "   API: http://localhost:8002"
    echo "   Recommendations: http://localhost:8010"
    echo "   Theme: http://localhost:8020"
    echo "   Strategies: http://localhost:8030"
    echo ""
    echo "📋 Testing Checklist:"
    echo "   ✅ Frontend loads: http://algodiscovery.prod"
    echo "   ✅ Health check: http://algodiscovery.prod/health"
    echo "   ✅ Recommendation test: http://algodiscovery.prod/test/recommendation-service"
    echo "   ✅ Backend connectivity: Check browser console for API calls"
    echo ""
    echo "🎯 Perfect! You can now access production using just: http://algodiscovery.prod"
    echo ""
else
    echo "❌ Deployment failed. Container is not running."
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   1. Check Docker logs: docker-compose logs -f algodiscovery-frontend"
    echo "   2. Check container status: docker-compose ps"
    echo "   3. Verify port 80 is available: lsof -i :80"
    echo ""
    exit 1
fi
