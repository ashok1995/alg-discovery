#!/bin/bash

# Docker Deployment Script for AlgoDiscovery Frontend (Port 8080)
# This script builds and deploys the production frontend on port 8080

set -e

echo "🚀 Deploying AlgoDiscovery Frontend to Production (Port 8080)..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Stop and remove existing containers
echo "🔄 Stopping existing containers..."
docker-compose -f docker-compose-8080.yml down 2>/dev/null || true
docker stop algodiscovery-frontend-prod 2>/dev/null || true
docker rm algodiscovery-frontend-prod 2>/dev/null || true

# Remove existing images
echo "🧹 Cleaning up existing images..."
docker rmi algodiscovery-frontend 2>/dev/null || true

# Build the production image (port 8080)
echo "🏗️  Building production image for port 8080..."
docker build --build-arg BUILD_ENV=prod:8080 -t algodiscovery-frontend:8080 .

# Start services in detached mode
echo "🚀 Starting production services on port 8080..."
docker-compose -f docker-compose-8080.yml up -d

# Wait for container to be healthy
echo "⏳ Waiting for container to be healthy..."
sleep 10

# Check container status
echo "📊 Container status:"
docker-compose -f docker-compose-8080.yml ps

# Check if container is running
if docker ps | grep -q "algodiscovery-frontend-prod"; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🌐 Production URLs:"
    echo "   Frontend: http://algodiscovery.prod:8080"
    echo "   Health Check: http://algodiscovery.prod:8080/health"
    echo "   Test Page: http://algodiscovery.prod:8080/test/recommendation-service"
    echo ""
    echo "🔧 Backend Services (unchanged):"
    echo "   API: http://localhost:8002"
    echo "   Recommendations: http://localhost:8010"
    echo "   Theme: http://localhost:8020"
    echo "   Strategies: http://localhost:8030"
    echo ""
    echo "📋 Testing Checklist:"
    echo "   ✅ Frontend loads: http://algodiscovery.prod:8080"
    echo "   ✅ Health check: http://algodiscovery.prod:8080/health"
    echo "   ✅ Recommendation test: http://algodiscovery.prod:8080/test/recommendation-service"
    echo "   ✅ Backend connectivity: Check browser console for API calls"
    echo ""
    echo "💡 Tip: Use this URL to clearly identify when you're testing production!"
    echo ""
else
    echo "❌ Deployment failed. Container is not running."
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   1. Check Docker logs: docker-compose -f docker-compose-8080.yml logs -f algodiscovery-frontend"
    echo "   2. Check container status: docker-compose -f docker-compose-8080.yml ps"
    echo "   3. Verify port 8080 is available: lsof -i :8080"
    echo ""
    exit 1
fi
