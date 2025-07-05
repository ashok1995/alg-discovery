#!/usr/bin/env python3
"""Comprehensive status checker for all trading services."""

import requests
import subprocess
import sys
import os
import psutil
from pathlib import Path
from datetime import datetime

def check_api(name, port):
    """Check if an API endpoint is responding."""
    try:
        response = requests.get(f"http://localhost:{port}/health", timeout=5)
        return "🟢 UP" if response.status_code == 200 else "🔴 DOWN"
    except:
        return "🔴 DOWN"

def check_process(name):
    """Check if a process is running by looking for its log file activity."""
    log_file = f"/Users/ashokkumar/Desktop/alg-discovery/logs/{name}.log"
    error_log = f"/Users/ashokkumar/Desktop/alg-discovery/logs/{name}-error.log"
    
    try:
        # Check if log file exists and was modified recently
        log_exists = os.path.exists(log_file)
        error_exists = os.path.exists(error_log)
        
        if not log_exists and not error_exists:
            return "🔴 NO LOGS"
        
        # Check log file modification time
        log_time = os.path.getmtime(log_file) if log_exists else 0
        error_time = os.path.getmtime(error_log) if error_exists else 0
        latest_time = max(log_time, error_time)
        
        # If log was modified in last 5 minutes, service is likely running
        if (datetime.now().timestamp() - latest_time) < 300:  # 5 minutes
            return "🟢 RUNNING"
        else:
            return "🟡 STALE"
    except:
        return "🔴 ERROR"

def check_supervisor():
    """Check if supervisor is running."""
    try:
        subprocess.run(["supervisorctl", "status"], check=True, capture_output=True)
        return "🟢 RUNNING"
    except:
        return "🔴 NOT RUNNING"

def check_api_services():
    """Check if all API services are running."""
    api_services = {
        'Long-term API': 8001,
        'Swing API': 8002,
        'Short-term API': 8003,
        'Intraday Buy API': 8004,
        'Intraday Sell API': 8005,
        'Miscellaneous API': 8006
    }
    
    print("\n🌐 API Services")
    print("-" * 30)
    
    for service, port in api_services.items():
        try:
            response = requests.get(f'http://localhost:{port}/health')
            if response.status_code == 200:
                print(f"{service} ({port}): 🟢 UP")
            else:
                print(f"{service} ({port}): 🔴 DOWN")
        except requests.exceptions.RequestException:
            print(f"{service} ({port}): 🔴 DOWN")

def main():
    print("\n📊 AlgoDiscovery Services Status Check")
    print("=" * 50)
    print(f"\n🔄 Check Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check Supervisor
    print("\n📋 Supervisor Status")
    print("-" * 30)
    supervisor_status = check_supervisor()
    print(f"Supervisor: {supervisor_status}")
    
    # Check API Services
    check_api_services()
    
    # Check Background Services
    print("\n⚙️  Background Services")
    print("-" * 30)
    print(f"Trading Cron: {check_process('trading-cron')}")
    print(f"Cache Refresh: {check_process('cache-refresh')}")
    print(f"Internet Monitor: {check_process('internet-monitor')}")
    
    print("\n📝 Log Files")
    print("-" * 30)
    log_dir = Path("/Users/ashokkumar/Desktop/alg-discovery/logs")
    if log_dir.exists():
        print("Log directory: 🟢 EXISTS")
        log_files = list(log_dir.glob("*.log"))
        if log_files:
            print(f"Number of log files: {len(log_files)}")
        else:
            print("No log files found!")
    else:
        print("Log directory: 🔴 MISSING")

if __name__ == "__main__":
    main() 