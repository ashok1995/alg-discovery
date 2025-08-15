#!/bin/bash

# Production Deployment Script for AlgoDiscovery
# This script builds and serves the production version on port 8080

echo "🚀 Starting production deployment for AlgoDiscovery..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the frontend directory."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf build

# Build production version
echo "🔨 Building production version..."
npm run build:prod:8080

# Check if build was successful
if [ ! -d "build" ]; then
    echo "❌ Build failed! Please check for errors above."
    exit 1
fi

echo "✅ Build completed successfully!"

# Check if serve is installed
if ! command -v serve &> /dev/null; then
    echo "📦 Installing serve package globally..."
    npm install -g serve
fi

# Kill any existing process on port 8080
echo "🔄 Checking for existing processes on port 8080..."
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 8080 is in use. Stopping existing process..."
    lsof -ti:8080 | xargs kill -9
    sleep 2
fi

# Start production server
echo "🌐 Starting production server on port 8080..."
echo "📱 Production URL: http://localhost:8080"
echo "🔗 Recommendation Service: http://localhost:8010"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm run serve:prod
