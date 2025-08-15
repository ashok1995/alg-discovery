#!/bin/bash

# Docker Development Script for AlgoDiscovery Frontend
# This script runs the production build in Docker for testing

echo "🧪 Starting Docker development environment for testing..."

# Check if we're in the right directory
if [ ! -f "Dockerfile" ]; then
    echo "❌ Error: Dockerfile not found. Please run this script from the frontend directory."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Stop existing containers
echo "🔄 Stopping existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Build and run in development mode (with logs)
echo "🔨 Building and starting development container..."
docker-compose up --build

echo ""
echo "🧪 Development container started!"
echo "📱 Test URL: http://localhost:8080"
echo "🔗 Health Check: http://localhost:8080/health"
echo ""
echo "📋 Testing checklist:"
echo "   ✅ Main page loads: http://localhost:8080"
echo "   ✅ Recommendation test: http://localhost:8080/test/recommendation-service"
echo "   ✅ API connectivity: Check browser console for errors"
echo "   ✅ Responsive design: Test different screen sizes"
echo ""
echo "Press Ctrl+C to stop the container"
echo ""
