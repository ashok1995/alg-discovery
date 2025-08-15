#!/bin/bash

# Local DNS Setup Script for AlgoDiscovery Development and Production
# This script sets up local DNS entries for production frontend identification only

echo "🌐 Setting up local DNS for AlgoDiscovery production frontend identification..."

# Check if running on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📱 Detected macOS, setting up production frontend DNS entry..."
    
    # Check if entry already exists
    if grep -q "algodiscovery.prod" /etc/hosts; then
        echo "⚠️  Production frontend DNS entry already exists in /etc/hosts"
        echo "Current production entry:"
        grep "algodiscovery.prod" /etc/hosts
    else
        echo "➕ Adding production frontend DNS entry to /etc/hosts..."
        
        # Add only the frontend DNS entry (backend services stay on localhost)
        echo "" | sudo tee -a /etc/hosts
        echo "# AlgoDiscovery Production Frontend DNS (Port 8080)" | sudo tee -a /etc/hosts
        echo "127.0.0.1 algodiscovery.prod" | sudo tee -a /etc/hosts
        
        echo "✅ Production frontend DNS entry added successfully!"
    fi
    
    # Flush DNS cache
    echo "🔄 Flushing DNS cache..."
    sudo dscacheutil -flushcache
    sudo killall -HUP mDNSResponder
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Detected Linux, setting up production frontend DNS entry..."
    
    # Check if entry already exists
    if grep -q "algodiscovery.prod" /etc/hosts; then
        echo "⚠️  Production frontend DNS entry already exists in /etc/hosts"
        echo "Current production entry:"
        grep "algodiscovery.prod" /etc/hosts
    else
        echo "➕ Adding production frontend DNS entry to /etc/hosts..."
        
        # Add only the frontend DNS entry (backend services stay on localhost)
        echo "" | sudo tee -a /etc/hosts
        echo "# AlgoDiscovery Production Frontend DNS (Port 8080)" | sudo tee -a /etc/hosts
        echo "127.0.0.1 algodiscovery.prod" | sudo tee -a /etc/hosts
        
        echo "✅ Production frontend DNS entry added successfully!"
    fi
    
    # Flush DNS cache (systemd-resolved)
    if command -v systemctl &> /dev/null; then
        echo "🔄 Flushing DNS cache..."
        sudo systemctl restart systemd-resolved
    fi
    
else
    echo "❌ Unsupported operating system: $OSTYPE"
    echo "Please manually add this entry to your hosts file:"
    echo "127.0.0.1 algodiscovery.prod"
    exit 1
fi

echo ""
echo "🎯 Local DNS setup complete!"
echo ""
echo "📋 Environment URLs:"
echo ""
echo "🚀 PRODUCTION (Port 8080) - Frontend DNS + Backend Localhost:"
echo "   Frontend: http://algodiscovery.prod:8080"
echo "   API: http://localhost:8002"
echo "   Recommendations: http://localhost:8010"
echo "   Theme: http://localhost:8020"
echo "   Strategies: http://localhost:8030"
echo ""
echo "🛠️  DEVELOPMENT (Port 3000) - All Localhost:"
echo "   Frontend: http://localhost:3000"
echo "   API: http://localhost:8002"
echo "   Recommendations: http://localhost:8010"
echo "   Theme: http://localhost:8020"
echo "   Strategies: http://localhost:8030"
echo ""
echo "💡 Key Benefits:"
echo "   ✅ Frontend uses DNS for clear production identification"
echo "   ✅ Backend services stay on localhost (no changes needed)"
echo "   ✅ Clear visual distinction between environments"
echo "   ✅ No backend configuration updates required"
echo ""
echo "🚀 You can now run:"
echo "   npm run start:local    # Start development on localhost:3000"
echo "   npm run start:dev      # Start development on localhost:3000"
echo "   ./docker-deploy.sh     # Deploy production on algodiscovery.prod:8080"
echo ""
echo "💡 Tip: Use http://algodiscovery.prod:8080 to clearly identify production testing!"
echo ""
