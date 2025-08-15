#!/bin/bash

# Port Forwarding Setup Script for AlgoDiscovery Production
# This script sets up port forwarding from port 80 to 8080
# So you can access http://algodiscovery.prod (no port needed)

echo "🚀 Setting up port forwarding for AlgoDiscovery production..."

# Check if running on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📱 Detected macOS, setting up port forwarding..."
    
    # Check if port 80 is already in use
    if lsof -i :80 > /dev/null 2>&1; then
        echo "⚠️  Port 80 is already in use. Stopping existing processes..."
        sudo lsof -ti:80 | xargs sudo kill -9 2>/dev/null || true
    fi
    
    # Check if port 8080 is available
    if lsof -i :8080 > /dev/null 2>&1; then
        echo "⚠️  Port 8080 is already in use. Please stop the service first."
        echo "   Run: docker-compose -f docker-compose-8080.yml down"
        exit 1
    fi
    
    # Create port forwarding using pfctl (macOS built-in)
    echo "🔧 Setting up port forwarding from 80 to 8080..."
    
    # Create pf configuration
    cat > /tmp/algodiscovery-pf.conf << EOF
# AlgoDiscovery Port Forwarding Configuration
rdr pass inet proto tcp from any to any port 80 -> 127.0.0.1 port 8080
EOF
    
    # Enable port forwarding
    sudo pfctl -f /tmp/algodiscovery-pf.conf
    sudo pfctl -e
    
    echo "✅ Port forwarding enabled! Port 80 now forwards to 8080"
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Detected Linux, setting up port forwarding..."
    
    # Check if iptables is available
    if ! command -v iptables &> /dev/null; then
        echo "❌ iptables not found. Please install iptables or use ufw."
        exit 1
    fi
    
    # Check if port 80 is already in use
    if lsof -i :80 > /dev/null 2>&1; then
        echo "⚠️  Port 80 is already in use. Stopping existing processes..."
        sudo lsof -ti:80 | xargs sudo kill -9 2>/dev/null || true
    fi
    
    # Check if port 8080 is available
    if lsof -i :8080 > /dev/null 2>&1; then
        echo "⚠️  Port 8080 is already in use. Please stop the service first."
        echo "   Run: docker-compose -f docker-compose-8080.yml down"
        exit 1
    fi
    
    # Set up port forwarding using iptables
    echo "🔧 Setting up port forwarding from 80 to 8080..."
    
    # Forward port 80 to 8080
    sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8080
    sudo iptables -t nat -A OUTPUT -p tcp --dport 80 -j REDIRECT --to-port 8080
    
    # Save iptables rules (Ubuntu/Debian)
    if command -v iptables-save &> /dev/null; then
        sudo iptables-save > /tmp/algodiscovery-iptables.rules
        echo "✅ Port forwarding enabled! Port 80 now forwards to 8080"
        echo "💡 To make this permanent, run: sudo iptables-restore < /tmp/algodiscovery-iptables.rules"
    else
        echo "✅ Port forwarding enabled! Port 80 now forwards to 8080"
    fi
    
else
    echo "❌ Unsupported operating system: $OSTYPE"
    echo "Please manually set up port forwarding from port 80 to 8080"
    exit 1
fi

echo ""
echo "🎯 Port forwarding setup complete!"
echo ""
echo "📋 What this gives you:"
echo "   ✅ http://algodiscovery.prod (no port needed!)"
echo "   ✅ http://algodiscovery.prod:8080 (still works)"
echo "   ✅ http://localhost:8080 (direct access)"
echo ""
echo "🚀 Next steps:"
echo "   1. Deploy your container: ./docker-deploy-8080.sh"
echo "   2. Access production: http://algodiscovery.prod"
echo "   3. Access development: http://localhost:3000"
echo ""
echo "💡 The container will run on port 8080, but users can access it on port 80!"
echo ""
