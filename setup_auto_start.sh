#!/bin/bash
"""
Setup Auto-Start for Trading Services
=====================================

This script sets up automatic startup of trading services on macOS using Launch Agents.
The services will automatically start when:
- The laptop boots up
- Internet connectivity is restored
- The system restarts

Features:
- Automatic restart on failure
- Internet connectivity monitoring
- Proper logging and error handling
- Easy management commands

Author: AI Assistant
Date: 2025-07-03
"""

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAUNCHD_DIR="$HOME/Library/LaunchAgents"
PLIST_NAME="com.trading.services.plist"
PLIST_SOURCE="$PROJECT_ROOT/$PLIST_NAME"
PLIST_TARGET="$LAUNCHD_DIR/$PLIST_NAME"

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}🚀 TRADING SERVICES AUTO-START SETUP${NC}"
echo -e "${BLUE}======================================================================${NC}"

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if we're on macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_error "This script is for macOS only"
        exit 1
    fi
    
    # Check if virtual environment exists
    if [[ ! -f "$PROJECT_ROOT/.venv/bin/python" ]]; then
        print_error "Virtual environment not found at $PROJECT_ROOT/.venv"
        print_info "Please run: python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
        exit 1
    fi
    
    # Check if required scripts exist
    required_files=(
        "start_all_services.py"
        "supervisord.conf"
        "cache_refresh_service.py"
        "internet_monitor.py"
        "cron_manager_starter.py"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$PROJECT_ROOT/$file" ]]; then
            print_error "Required file not found: $file"
            exit 1
        fi
    done
    
    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"
    
    # Create LaunchAgents directory if it doesn't exist
    mkdir -p "$LAUNCHD_DIR"
    
    print_status "Prerequisites check passed"
}

# Function to install the launch agent
install_launch_agent() {
    print_info "Installing Launch Agent..."
    
    # Stop existing agent if running
    if launchctl list | grep -q "com.trading.services"; then
        print_info "Stopping existing trading services..."
        launchctl unload "$PLIST_TARGET" 2>/dev/null || true
    fi
    
    # Copy plist file
    cp "$PLIST_SOURCE" "$PLIST_TARGET"
    
    # Set proper permissions
    chmod 644 "$PLIST_TARGET"
    
    # Load the launch agent
    launchctl load "$PLIST_TARGET"
    
    print_status "Launch Agent installed and loaded"
}

# Function to check if services are running
check_services() {
    print_info "Checking service status..."
    
    # Check if launch agent is loaded
    if launchctl list | grep -q "com.trading.services"; then
        print_status "Launch Agent is loaded"
    else
        print_warning "Launch Agent is not loaded"
        return 1
    fi
    
    # Check API endpoints
    api_ports=(8001 8002 8003)
    api_names=("Long-term" "Swing" "Short-term")
    
    for i in "${!api_ports[@]}"; do
        port=${api_ports[$i]}
        name=${api_names[$i]}
        
        if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
            print_status "$name API (port $port) is running"
        else
            print_warning "$name API (port $port) is not responding"
        fi
    done
}

# Function to show management commands
show_management_commands() {
    echo ""
    echo -e "${BLUE}🎮 MANAGEMENT COMMANDS${NC}"
    echo -e "${BLUE}======================================================================${NC}"
    
    echo -e "${GREEN}# Check if Launch Agent is loaded:${NC}"
    echo "  launchctl list | grep com.trading.services"
    echo ""
    
    echo -e "${GREEN}# Manually start services:${NC}"
    echo "  launchctl start com.trading.services"
    echo ""
    
    echo -e "${GREEN}# Manually stop services:${NC}"
    echo "  launchctl stop com.trading.services"
    echo ""
    
    echo -e "${GREEN}# Unload Launch Agent (disable auto-start):${NC}"
    echo "  launchctl unload ~/Library/LaunchAgents/com.trading.services.plist"
    echo ""
    
    echo -e "${GREEN}# Reload Launch Agent (after changes):${NC}"
    echo "  launchctl unload ~/Library/LaunchAgents/com.trading.services.plist"
    echo "  launchctl load ~/Library/LaunchAgents/com.trading.services.plist"
    echo ""
    
    echo -e "${GREEN}# View logs:${NC}"
    echo "  tail -f $PROJECT_ROOT/logs/launchd-stdout.log"
    echo "  tail -f $PROJECT_ROOT/logs/launchd-stderr.log"
    echo ""
    
    echo -e "${GREEN}# Check service status:${NC}"
    echo "  python $PROJECT_ROOT/start_all_services.py --status"
    echo ""
    
    echo -e "${GREEN}# Manual service management:${NC}"
    echo "  cd $PROJECT_ROOT"
    echo "  .venv/bin/python -m supervisor.supervisorctl -c supervisord.conf status"
    echo ""
}

# Function to create a simple status checker script
create_status_script() {
    cat > "$PROJECT_ROOT/check_services.py" << 'EOF'
#!/usr/bin/env python3
"""Quick status checker for trading services."""

import requests
import subprocess
import sys
from pathlib import Path

def check_api(name, port):
    try:
        response = requests.get(f"http://localhost:{port}/health", timeout=5)
        return "🟢 UP" if response.status_code == 200 else "🔴 DOWN"
    except:
        return "🔴 DOWN"

def check_launchd():
    try:
        result = subprocess.run(["launchctl", "list"], capture_output=True, text=True)
        return "🟢 LOADED" if "com.trading.services" in result.stdout else "🔴 NOT LOADED"
    except:
        return "🔴 ERROR"

print("📊 Trading Services Status")
print("=" * 40)
print(f"Launch Agent: {check_launchd()}")
print(f"Long-term API (8001): {check_api('longterm', 8001)}")
print(f"Swing API (8002): {check_api('swing', 8002)}")
print(f"Short-term API (8003): {check_api('shortterm', 8003)}")
EOF

    chmod +x "$PROJECT_ROOT/check_services.py"
    print_status "Status checker script created: check_services.py"
}

# Main execution
main() {
    check_prerequisites
    install_launch_agent
    create_status_script
    
    # Wait a moment for services to start
    print_info "Waiting for services to start..."
    sleep 10
    
    check_services
    show_management_commands
    
    echo ""
    echo -e "${GREEN}🎉 SETUP COMPLETE!${NC}"
    echo -e "${GREEN}======================================================================${NC}"
    echo -e "${GREEN}✅ Trading services will now start automatically when:${NC}"
    echo -e "${GREEN}   • Your laptop boots up${NC}"
    echo -e "${GREEN}   • Internet connectivity is restored${NC}"
    echo -e "${GREEN}   • Services crash and need restart${NC}"
    echo ""
    echo -e "${BLUE}📋 Quick status check: python check_services.py${NC}"
    echo ""
}

# Handle command line arguments
case "${1:-}" in
    "uninstall")
        print_info "Uninstalling Launch Agent..."
        launchctl unload "$PLIST_TARGET" 2>/dev/null || true
        rm -f "$PLIST_TARGET"
        print_status "Launch Agent uninstalled"
        ;;
    "status")
        check_services
        ;;
    "restart")
        print_info "Restarting services..."
        launchctl stop com.trading.services 2>/dev/null || true
        sleep 2
        launchctl start com.trading.services
        print_status "Services restarted"
        ;;
    *)
        main
        ;;
esac 