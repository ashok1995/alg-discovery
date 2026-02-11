#!/usr/bin/env python3
"""
Test Server Starter
==================

Quick script to start one of the trading API servers for testing.

Usage:
    python start_test_server.py shortterm  # Start short-term API on port 8001
    python start_test_server.py swing      # Start swing API on port 8002
    python start_test_server.py longterm   # Start long-term API on port 8003
    python start_test_server.py intraday   # Start intraday API on port 8004
    python start_test_server.py intraday_buy   # Start intraday BUY API on port 8004
    python start_test_server.py intraday_sell  # Start intraday SELL API on port 8005
"""

import sys
import uvicorn
from pathlib import Path

# Add api directory to path
sys.path.append(str(Path(__file__).parent / "api"))

def start_server(strategy: str):
    """Start the specified API server."""
    
    servers = {
        "shortterm": {
            "app": "shortterm_server:app",
            "port": 8001,
            "name": "Short-term Trading API"
        },
        "swing": {
            "app": "swing_server:app", 
            "port": 8002,
            "name": "Swing Trading API"
        },
        "longterm": {
            "app": "longterm_server:app",
            "port": 8003,
            "name": "Long-term Investment API"
        },
        "intraday": {
            "app": "intraday_server:app",
            "port": 8004,
            "name": "Intraday Trading API"
        },
        "intraday_buy": {
            "app": "intraday_buy_server:app",
            "port": 8004,
            "name": "Intraday BUY API"
        },
        "intraday_sell": {
            "app": "intraday_sell_server:app",
            "port": 8005,
            "name": "Intraday SELL API"
        }
    }
    
    if strategy not in servers:
        print(f"❌ Unknown strategy: {strategy}")
        print(f"Available strategies: {list(servers.keys())}")
        return
    
    server_config = servers[strategy]
    
    print(f"🚀 Starting {server_config['name']}")
    print(f"📡 Port: {server_config['port']}")
    print(f"🌐 URL: http://localhost:{server_config['port']}")
    print(f"📖 Docs: http://localhost:{server_config['port']}/docs")
    print(f"🔄 Use Ctrl+C to stop")
    print("-" * 50)
    
    # Change to api directory
    import os
    os.chdir(Path(__file__).parent / "api")
    
    # Start server
    uvicorn.run(
        server_config["app"],
        host="0.0.0.0",
        port=server_config["port"],
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("""
🚀 Test Server Starter
======================

Usage:
    python start_test_server.py shortterm  # Start short-term API on port 8001
    python start_test_server.py swing      # Start swing API on port 8002
    python start_test_server.py longterm   # Start long-term API on port 8003
    python start_test_server.py intraday   # Start intraday API on port 8004
    python start_test_server.py intraday_buy   # Start intraday BUY API on port 8004
    python start_test_server.py intraday_sell  # Start intraday SELL API on port 8005

Example:
    python start_test_server.py shortterm
""")
        sys.exit(1)
    
    strategy = sys.argv[1].lower()
    start_server(strategy) 