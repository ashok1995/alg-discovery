#!/usr/bin/env python3
"""
Internet Connectivity Monitor
============================

Monitors internet connectivity and logs connection status.
This service helps ensure that all trading services only operate
when internet connectivity is available.

Features:
- Continuous internet connectivity monitoring
- Graceful handling of connection loss/restoration
- Detailed logging for troubleshooting
- Multiple endpoint testing for reliability

Author: AI Assistant
Date: 2025-07-03
"""

import asyncio
import logging
import sys
import time
import requests
from datetime import datetime, timedelta
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(Path(__file__).parent / "logs" / "internet-monitor.log")
    ]
)
logger = logging.getLogger(__name__)

class InternetMonitor:
    """Monitor internet connectivity continuously."""
    
    def __init__(self):
        self.test_endpoints = [
            "https://www.google.com",
            "https://1.1.1.1",  # Cloudflare DNS
            "https://8.8.8.8",  # Google DNS
            "https://httpbin.org/status/200",  # HTTP testing service
        ]
        self.check_interval = 30  # Check every 30 seconds
        self.is_connected = False
        self.connection_status_file = Path(__file__).parent / "logs" / "connection_status.txt"
        self.last_status_change = None
        self.consecutive_failures = 0
        self.consecutive_successes = 0
        
    def test_single_endpoint(self, url: str, timeout: int = 5) -> bool:
        """Test connectivity to a single endpoint."""
        try:
            response = requests.get(url, timeout=timeout)
            return response.status_code == 200
        except Exception:
            return False
    
    def check_connectivity(self) -> bool:
        """Check internet connectivity using multiple endpoints."""
        successful_tests = 0
        total_tests = len(self.test_endpoints)
        
        for endpoint in self.test_endpoints:
            if self.test_single_endpoint(endpoint):
                successful_tests += 1
                # If at least one endpoint works, consider connected
                if successful_tests >= 1:
                    return True
        
        return False
    
    def update_connection_status(self, connected: bool):
        """Update connection status and handle state changes."""
        if connected != self.is_connected:
            # Status changed
            self.last_status_change = datetime.now()
            previous_status = "Connected" if self.is_connected else "Disconnected"
            new_status = "Connected" if connected else "Disconnected"
            
            logger.info(f"🔄 Connection status changed: {previous_status} → {new_status}")
            
            self.is_connected = connected
            self.consecutive_failures = 0
            self.consecutive_successes = 0
            
            # Write status to file for other services to read
            try:
                with open(self.connection_status_file, 'w') as f:
                    f.write(f"{connected}\n{datetime.now().isoformat()}\n")
            except Exception as e:
                logger.error(f"❌ Failed to write connection status file: {e}")
        
        # Track consecutive results
        if connected:
            self.consecutive_successes += 1
            self.consecutive_failures = 0
        else:
            self.consecutive_failures += 1
            self.consecutive_successes = 0
    
    def get_status_summary(self) -> dict:
        """Get comprehensive status summary."""
        now = datetime.now()
        uptime_since_change = None
        
        if self.last_status_change:
            uptime_since_change = now - self.last_status_change
        
        return {
            "connected": self.is_connected,
            "last_check": now.isoformat(),
            "last_status_change": self.last_status_change.isoformat() if self.last_status_change else None,
            "uptime_since_change": str(uptime_since_change) if uptime_since_change else None,
            "consecutive_successes": self.consecutive_successes,
            "consecutive_failures": self.consecutive_failures,
            "check_interval_seconds": self.check_interval
        }
    
    async def run_continuous_monitoring(self):
        """Run continuous internet connectivity monitoring."""
        logger.info("🚀 Starting Internet Connectivity Monitor")
        logger.info(f"🔍 Testing {len(self.test_endpoints)} endpoints every {self.check_interval} seconds")
        logger.info(f"📝 Status file: {self.connection_status_file}")
        
        # Ensure logs directory and status file exist
        self.connection_status_file.parent.mkdir(exist_ok=True)
        
        while True:
            try:
                # Check connectivity
                connected = self.check_connectivity()
                self.update_connection_status(connected)
                
                # Log current status
                if connected:
                    if self.consecutive_successes % 20 == 1:  # Log every 10 minutes when connected
                        logger.info(f"✅ Internet: Connected (consecutive successes: {self.consecutive_successes})")
                else:
                    if self.consecutive_failures <= 5 or self.consecutive_failures % 10 == 0:
                        logger.warning(f"❌ Internet: Disconnected (consecutive failures: {self.consecutive_failures})")
                
                # Detailed status every hour
                if (self.consecutive_successes + self.consecutive_failures) % 120 == 0:
                    status = self.get_status_summary()
                    logger.info(f"📊 Status Summary: {status}")
                
                # Wait before next check
                await asyncio.sleep(self.check_interval)
                
            except KeyboardInterrupt:
                logger.info("🛑 Internet monitor stopped by user")
                break
            except Exception as e:
                logger.error(f"❌ Error in internet monitor: {e}")
                logger.info("⏳ Waiting 30 seconds before retry...")
                await asyncio.sleep(30)

def get_current_connection_status() -> dict:
    """Read current connection status from file (for other services)."""
    status_file = Path(__file__).parent / "logs" / "connection_status.txt"
    
    try:
        if status_file.exists():
            with open(status_file, 'r') as f:
                lines = f.read().strip().split('\n')
                if len(lines) >= 2:
                    connected = lines[0].lower() == 'true'
                    timestamp = lines[1]
                    return {
                        "connected": connected,
                        "timestamp": timestamp,
                        "file_exists": True
                    }
        
        return {
            "connected": False,
            "timestamp": None,
            "file_exists": False
        }
    except Exception as e:
        return {
            "connected": False,
            "timestamp": None,
            "file_exists": False,
            "error": str(e)
        }

async def main():
    """Main entry point."""
    # Ensure logs directory exists
    logs_dir = Path(__file__).parent / "logs"
    logs_dir.mkdir(exist_ok=True)
    
    logger.info("=" * 60)
    logger.info("🌐 INTERNET CONNECTIVITY MONITOR STARTING")
    logger.info("=" * 60)
    
    try:
        monitor = InternetMonitor()
        await monitor.run_continuous_monitoring()
    except KeyboardInterrupt:
        logger.info("🛑 Monitor stopped by user")
    except Exception as e:
        logger.error(f"❌ Monitor failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main()) 