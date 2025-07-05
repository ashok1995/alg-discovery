#!/usr/bin/env python3
"""
Start All Trading Services
==========================

Master script to start all trading services using supervisor.
Handles dependency management, health checking, and service coordination.

Services managed:
1. Internet connectivity monitor
2. Trading API servers (longterm, swing, shortterm)
3. Trading cron manager
4. Cache refresh service

Author: AI Assistant
Date: 2025-07-03
"""

import os
import sys
import time
import signal
import subprocess
import requests
from pathlib import Path
from datetime import datetime

# Add project paths
sys.path.append(str(Path(__file__).parent))

class TradingServiceManager:
    """Manager for all trading services."""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.logs_dir = self.project_root / "logs"
        self.venv_python = self.project_root / ".venv" / "bin" / "python"
        self.supervisor_config = self.project_root / "supervisord.conf"
        self.supervisor_pid = None
        
        # Ensure logs directory exists
        self.logs_dir.mkdir(exist_ok=True)
        
    def print_banner(self):
        """Print startup banner."""
        print("=" * 70)
        print("🚀 TRADING SERVICES MANAGER")
        print("=" * 70)
        print(f"📅 Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"📁 Project root: {self.project_root}")
        print(f"🐍 Python path: {self.venv_python}")
        print(f"📋 Supervisor config: {self.supervisor_config}")
        print("")
    
    def check_prerequisites(self):
        """Check if all prerequisites are met."""
        print("🔍 Checking prerequisites...")
        
        # Check virtual environment
        if not self.venv_python.exists():
            print(f"❌ Virtual environment not found: {self.venv_python}")
            return False
        
        # Check supervisor config
        if not self.supervisor_config.exists():
            print(f"❌ Supervisor config not found: {self.supervisor_config}")
            return False
        
        # Check required scripts
        required_scripts = [
            "cache_refresh_service.py",
            "internet_monitor.py", 
            "cron_manager_starter.py"
        ]
        
        for script in required_scripts:
            script_path = self.project_root / script
            if not script_path.exists():
                print(f"❌ Required script not found: {script}")
                return False
        
        # Check API servers
        api_servers = [
            "api/longterm_server.py",
            "api/swing_server.py",
            "api/shortterm_server.py"
        ]
        
        for server in api_servers:
            server_path = self.project_root / server
            if not server_path.exists():
                print(f"❌ API server not found: {server}")
                return False
        
        print("✅ All prerequisites met")
        return True
    
    def start_supervisor(self):
        """Start supervisor daemon."""
        print("🔄 Starting supervisor daemon...")
        
        try:
            # Stop any existing supervisor
            self.stop_supervisor(silent=True)
            
            # Start supervisor
            cmd = [str(self.venv_python), "-m", "supervisor.supervisord", 
                   "-c", str(self.supervisor_config), "-n"]
            
            # Run supervisor in background
            process = subprocess.Popen(
                cmd,
                cwd=str(self.project_root),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Wait a moment for startup
            time.sleep(3)
            
            # Check if supervisor is running
            if process.poll() is None:
                self.supervisor_pid = process.pid
                print(f"✅ Supervisor started (PID: {process.pid})")
                return True
            else:
                stdout, stderr = process.communicate()
                print(f"❌ Supervisor failed to start")
                if stderr:
                    print(f"Error: {stderr.decode()}")
                return False
                
        except Exception as e:
            print(f"❌ Error starting supervisor: {e}")
            return False
    
    def stop_supervisor(self, silent=False):
        """Stop supervisor daemon."""
        if not silent:
            print("🛑 Stopping supervisor daemon...")
        
        try:
            # Try using supervisorctl
            cmd = [str(self.venv_python), "-m", "supervisor.supervisorctl", 
                   "-c", str(self.supervisor_config), "shutdown"]
            
            result = subprocess.run(cmd, capture_output=True, timeout=10)
            
            if not silent:
                if result.returncode == 0:
                    print("✅ Supervisor stopped gracefully")
                else:
                    print("⚠️ Supervisor shutdown command failed")
            
        except Exception as e:
            if not silent:
                print(f"⚠️ Error stopping supervisor: {e}")
    
    def check_service_health(self, service_name, port=None, timeout=10):
        """Check if a service is healthy."""
        if port:
            # Check API service
            try:
                response = requests.get(f"http://localhost:{port}/health", timeout=timeout)
                return response.status_code == 200
            except:
                return False
        else:
            # Check supervisor managed service
            try:
                cmd = [str(self.venv_python), "-m", "supervisor.supervisorctl", 
                       "-c", str(self.supervisor_config), "status", service_name]
                
                result = subprocess.run(cmd, capture_output=True, timeout=5)
                return "RUNNING" in result.stdout.decode()
            except:
                return False
    
    def get_service_status(self):
        """Get status of all services."""
        print("📊 Service Status:")
        print("-" * 50)
        
        # API Services
        api_services = [
            ("Long-term API", 8001),
            ("Swing API", 8002),
            ("Short-term API", 8003)
        ]
        
        for name, port in api_services:
            status = "🟢 UP" if self.check_service_health(name, port) else "🔴 DOWN"
            print(f"{name:20} (:{port}): {status}")
        
        # Supervisor services
        supervisor_services = [
            "trading-cron",
            "cache-refresh", 
            "internet-monitor"
        ]
        
        for service in supervisor_services:
            status = "🟢 UP" if self.check_service_health(service) else "🔴 DOWN"
            print(f"{service:20}: {status}")
        
        print("")
    
    def wait_for_services(self, timeout=60):
        """Wait for critical services to become healthy."""
        print("⏳ Waiting for services to start...")
        
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            # Check if at least one API is up
            api_up = any([
                self.check_service_health("longterm", 8001),
                self.check_service_health("swing", 8002),
                self.check_service_health("shortterm", 8003)
            ])
            
            if api_up:
                print("✅ Services are starting up")
                break
            
            print("⏳ Still waiting for services...")
            time.sleep(5)
        
        # Final status check
        self.get_service_status()
    
    def setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown."""
        def signal_handler(signum, frame):
            print(f"\n📡 Received signal {signum}")
            print("🛑 Shutting down all services...")
            self.stop_supervisor()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    def show_management_commands(self):
        """Show available management commands."""
        print("🎮 Management Commands:")
        print("-" * 50)
        print("# Check status:")
        print(f"  {self.venv_python} -m supervisor.supervisorctl -c {self.supervisor_config} status")
        print("")
        print("# Restart specific service:")
        print(f"  {self.venv_python} -m supervisor.supervisorctl -c {self.supervisor_config} restart longterm-api")
        print("")
        print("# View logs:")
        print(f"  tail -f {self.logs_dir}/longterm-api.log")
        print("")
        print("# Stop all services:")
        print(f"  {self.venv_python} -m supervisor.supervisorctl -c {self.supervisor_config} shutdown")
        print("")
    
    def run(self):
        """Run the service manager."""
        self.print_banner()
        
        # Setup signal handlers
        self.setup_signal_handlers()
        
        # Check prerequisites
        if not self.check_prerequisites():
            print("❌ Prerequisites check failed")
            return 1
        
        # Start supervisor
        if not self.start_supervisor():
            print("❌ Failed to start supervisor")
            return 1
        
        # Wait for services
        self.wait_for_services()
        
        # Show management info
        self.show_management_commands()
        
        print("🚀 All services started! Press Ctrl+C to stop.")
        
        try:
            # Keep running until interrupted
            while True:
                time.sleep(30)
                # Optionally show periodic status
                if int(time.time()) % 300 == 0:  # Every 5 minutes
                    print(f"\n📊 Status check at {datetime.now().strftime('%H:%M:%S')}")
                    self.get_service_status()
        
        except KeyboardInterrupt:
            print("\n🛑 Shutting down...")
            self.stop_supervisor()
        
        return 0

def main():
    """Main entry point."""
    manager = TradingServiceManager()
    return manager.run()

if __name__ == "__main__":
    sys.exit(main()) 