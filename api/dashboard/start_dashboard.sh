#!/bin/bash

# Streamlit Dashboard Startup Script
# ==================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DASHBOARD_PORT=8502
DASHBOARD_HOST="0.0.0.0"
APP_FILE="streamlit_app.py"

echo -e "${BLUE}🚀 Starting AlgoDiscovery Streamlit Dashboard...${NC}"

# Check if we're in the right directory
if [ ! -f "$APP_FILE" ]; then
    echo -e "${RED}❌ Error: $APP_FILE not found in current directory${NC}"
    echo -e "${YELLOW}💡 Make sure you're running this script from the dashboard directory${NC}"
    exit 1
fi

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Error: Python 3 is not installed${NC}"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
echo -e "${BLUE}🔧 Activating virtual environment...${NC}"
source venv/bin/activate

# Install dependencies
echo -e "${BLUE}📥 Installing dependencies...${NC}"
pip install --upgrade pip
pip install -r requirements.txt

# Check if dashboard API is running
echo -e "${YELLOW}🔍 Checking if Dashboard API is running...${NC}"
if curl -s http://localhost:8005/api/dashboard/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Dashboard API is running on port 8005${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Dashboard API is not running on port 8005${NC}"
    echo -e "${YELLOW}💡 Make sure to start the dashboard server first:${NC}"
    echo -e "${BLUE}   cd ../ && python dashboard_server.py${NC}"
fi

# Start Streamlit
echo -e "${GREEN}🎯 Starting Streamlit dashboard on http://$DASHBOARD_HOST:$DASHBOARD_PORT${NC}"
echo -e "${BLUE}📊 Dashboard will be available at: http://localhost:$DASHBOARD_PORT${NC}"
echo -e "${YELLOW}⏹️  Press Ctrl+C to stop the dashboard${NC}"
echo ""

# Start Streamlit with configuration
streamlit run "$APP_FILE" \
    --server.port "$DASHBOARD_PORT" \
    --server.address "$DASHBOARD_HOST" \
    --server.headless true \
    --browser.gatherUsageStats false \
    --theme.base "light" \
    --theme.primaryColor "#1f77b4" \
    --theme.backgroundColor "#ffffff" \
    --theme.secondaryBackgroundColor "#f0f2f6" \
    --theme.textColor "#262730" 