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
