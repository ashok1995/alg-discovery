#!/usr/bin/env python3
"""
Service Startup Script
=====================

Launches all microservices for the long-term investment platform:
- Main Orchestrator (port 8000)
- Long-Term Investment Service (port 8001)
- Analytics & Backtesting Service (port 8002)
- Order Management Service (port 8003)

Usage:
    python start_services.py [OPTIONS]
    
Options:
    --dev: Start in development mode with auto-reload
    --single SERVICE_NAME: Start only a specific service
    --stop: Stop all running services
    --stop-service SERVICE_NAME: Stop a specific service
    --restart SERVICE_NAME: Restart a specific service
    --status: Check status of all services
    --monitor: Start monitoring mode
    --list: List all available services
"""

import asyncio
import subprocess
import sys
import time
import signal
import argparse
import os
import requests
import json
import psutil
from datetime import datetime
from typing import List, Dict, Optional

# Service configurations
SERVICES = {
    'orchestrator': {
        'script': 'main_orchestrator.py',
        'port': 8000,
        'name': 'Main Orchestrator',
        'description': 'Primary API gateway and service coordinator'
    },
    'longterm': {
        'script': 'longterm_server.py',
        'port': 8001,
        'name': 'Long-Term Investment Service',
        'description': 'Stock analysis and investment recommendations'
    },
    'analytics': {
        'script': 'analytics_server.py',
        'port': 8002,
        'name': 'Analytics & Backtesting Service',
        'description': 'Performance analysis and strategy backtesting'
    },
    'orders': {
        'script': 'order_server.py',
        'port': 8003,
        'name': 'Order Management Service',
        'description': 'Order execution and portfolio management'
    }
}

# PID file location
PID_FILE = '.service_pids.json'

class ServiceManager:
    """Manages the lifecycle of all microservices."""
    
    def __init__(self, dev_mode: bool = False):
        self.dev_mode = dev_mode
        self.processes: Dict[str, subprocess.Popen] = {}
        self.running = False
        self.pid_data = self._load_pid_file()
    
    def _load_pid_file(self) -> Dict:
        """Load PID data from file."""
        if os.path.exists(PID_FILE):
            try:
                with open(PID_FILE, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️ Warning: Could not load PID file: {e}")
        return {}
    
    def _save_pid_file(self):
        """Save PID data to file."""
        try:
            with open(PID_FILE, 'w') as f:
                json.dump(self.pid_data, f, indent=2)
        except Exception as e:
            print(f"⚠️ Warning: Could not save PID file: {e}")
    
    def _cleanup_stale_pids(self):
        """Remove PIDs of processes that are no longer running."""
        stale_services = []
        for service_key, pid_info in self.pid_data.items():
            pid = pid_info.get('pid')
            if pid and not self._is_process_running(pid):
                stale_services.append(service_key)
        
        for service_key in stale_services:
            del self.pid_data[service_key]
        
        if stale_services:
            self._save_pid_file()
            print(f"🧹 Cleaned up {len(stale_services)} stale PID entries")
    
    def _is_process_running(self, pid: int) -> bool:
        """Check if a process is still running."""
        try:
            process = psutil.Process(pid)
            return process.is_running()
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return False
    
    def _kill_process_by_pid(self, pid: int, service_name: str) -> bool:
        """Kill a process by PID."""
        try:
            process = psutil.Process(pid)
            print(f"🛑 Terminating {service_name} (PID: {pid})...")
            process.terminate()
            
            # Wait for graceful shutdown
            try:
                process.wait(timeout=5)
                print(f"✅ {service_name} stopped gracefully")
                return True
            except psutil.TimeoutExpired:
                print(f"⚠️ Force killing {service_name}...")
                process.kill()
                process.wait()
                return True
                
        except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
            print(f"⚠️ Could not kill process {pid}: {e}")
            return False
    
    def start_service(self, service_key: str, service_config: Dict) -> bool:
        """Start a single service."""
        script = service_config['script']
        port = service_config['port']
        name = service_config['name']
        
        # Check if service is already running
        if self.is_service_running(service_key):
            print(f"⚠️ {name} is already running on port {port}")
            return True
        
        if not os.path.exists(script):
            print(f"❌ Script {script} not found!")
            return False
        
        print(f"🚀 Starting {name} on port {port}...")
        
        try:
            # Build command
            cmd = [sys.executable, script]
            
            # Start process
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True,
                bufsize=1
            )
            
            self.processes[service_key] = process
            
            # Store PID information
            self.pid_data[service_key] = {
                'pid': process.pid,
                'port': port,
                'script': script,
                'name': name,
                'started_at': datetime.now().isoformat()
            }
            self._save_pid_file()
            
            # Wait a moment and check if process started successfully
            time.sleep(2)
            if process.poll() is None:
                print(f"✅ {name} started successfully (PID: {process.pid})")
                return True
            else:
                stdout, stderr = process.communicate()
                print(f"❌ {name} failed to start:")
                if stderr:
                    print(f"   Error: {stderr}")
                # Remove from PID data if failed
                if service_key in self.pid_data:
                    del self.pid_data[service_key]
                    self._save_pid_file()
                return False
                
        except Exception as e:
            print(f"❌ Failed to start {name}: {e}")
            # Remove from PID data if failed
            if service_key in self.pid_data:
                del self.pid_data[service_key]
                self._save_pid_file()
            return False
    
    def stop_service(self, service_key: str) -> bool:
        """Stop a single service."""
        service_name = SERVICES[service_key]['name']
        
        # Try to stop from active processes first
        if service_key in self.processes:
            process = self.processes[service_key]
            try:
                print(f"🛑 Stopping {service_name}...")
                process.terminate()
                
                # Wait for graceful shutdown
                try:
                    process.wait(timeout=5)
                    print(f"✅ {service_name} stopped gracefully")
                except subprocess.TimeoutExpired:
                    print(f"⚠️ Force killing {service_name}...")
                    process.kill()
                    process.wait()
                
                del self.processes[service_key]
                
            except Exception as e:
                print(f"❌ Error stopping {service_name}: {e}")
        
        # Also try to stop from PID file
        if service_key in self.pid_data:
            pid_info = self.pid_data[service_key]
            pid = pid_info.get('pid')
            
            if pid and self._is_process_running(pid):
                self._kill_process_by_pid(pid, service_name)
            
            # Remove from PID data
            del self.pid_data[service_key]
            self._save_pid_file()
            return True
        
        print(f"⚠️ {service_name} was not running")
        return False
    
    def restart_service(self, service_key: str) -> bool:
        """Restart a specific service."""
        if service_key not in SERVICES:
            print(f"❌ Unknown service: {service_key}")
            print(f"Available services: {', '.join(SERVICES.keys())}")
            return False
        
        service_config = SERVICES[service_key]
        service_name = service_config['name']
        
        print(f"🔄 Restarting {service_name}...")
        
        # Stop the service first
        self.stop_service(service_key)
        
        # Wait a moment before starting
        time.sleep(2)
        
        # Start the service
        return self.start_service(service_key, service_config)
    
    def is_service_running(self, service_key: str) -> bool:
        """Check if a service is currently running."""
        # Check active processes
        if service_key in self.processes:
            if self.processes[service_key].poll() is None:
                return True
        
        # Check PID file
        if service_key in self.pid_data:
            pid = self.pid_data[service_key].get('pid')
            if pid and self._is_process_running(pid):
                return True
        
        return False
    
    def start_all_services(self, exclude: Optional[List[str]] = None) -> bool:
        """Start all services."""
        exclude = exclude or []
        success_count = 0
        
        print("🚀 Starting Long-Term Investment Platform Services...")
        print("=" * 60)
        
        # Clean up any stale PIDs first
        self._cleanup_stale_pids()
        
        # Start services in dependency order
        service_order = ['longterm', 'analytics', 'orders', 'orchestrator']
        
        for service_key in service_order:
            if service_key in exclude:
                continue
                
            service_config = SERVICES[service_key]
            if self.start_service(service_key, service_config):
                success_count += 1
                # Wait between services to avoid port conflicts
                time.sleep(3)
        
        total_services = len([s for s in SERVICES.keys() if s not in exclude])
        
        print("=" * 60)
        if success_count == total_services:
            print(f"🎉 All {success_count} services started successfully!")
            self.running = True
            self._print_service_info()
            return True
        else:
            print(f"⚠️ Only {success_count}/{total_services} services started successfully")
            return False
    
    def stop_all_services(self) -> bool:
        """Stop all running services."""
        print("🛑 Stopping all services...")
        
        # Clean up stale PIDs first
        self._cleanup_stale_pids()
        
        success_count = 0
        
        # Stop services in reverse dependency order
        service_order = ['orchestrator', 'orders', 'analytics', 'longterm']
        
        for service_key in service_order:
            if self.is_service_running(service_key):
                if self.stop_service(service_key):
                    success_count += 1
                time.sleep(1)  # Small delay between stops
        
        # Also stop any processes we have handles for
        for service_key in list(self.processes.keys()):
            if service_key not in service_order:
                if self.stop_service(service_key):
                    success_count += 1
        
        self.running = False
        print(f"✅ Stopped {success_count} services")
        
        # Clean up PID file
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)
            print("🧹 Cleaned up PID file")
        
        return True
    
    def check_service_health(self, service_key: str, timeout: int = 5) -> Dict[str, str]:
        """Check if a service is healthy."""
        port = SERVICES[service_key]['port']
        url = f"http://localhost:{port}/health"
        
        try:
            response = requests.get(url, timeout=timeout)
            if response.status_code == 200:
                return {"status": "healthy", "details": "Service responding"}
            else:
                return {"status": "unhealthy", "details": f"HTTP {response.status_code}"}
        except requests.exceptions.ConnectionError:
            return {"status": "unreachable", "details": "Connection refused"}
        except requests.exceptions.Timeout:
            return {"status": "timeout", "details": f"Timeout after {timeout}s"}
        except Exception as e:
            return {"status": "error", "details": str(e)}
    
    def status_all_services(self) -> Dict[str, Dict]:
        """Get status of all services."""
        print("📊 Service Status Check")
        print("=" * 80)
        
        # Clean up stale PIDs first
        self._cleanup_stale_pids()
        
        status_results = {}
        
        for service_key, service_config in SERVICES.items():
            name = service_config['name']
            port = service_config['port']
            
            # Check if process is running
            process_running = self.is_service_running(service_key)
            
            # Get PID info
            pid_info = self.pid_data.get(service_key, {})
            pid = pid_info.get('pid', 'N/A')
            started_at = pid_info.get('started_at', 'N/A')
            
            # Check if service is healthy
            health = self.check_service_health(service_key) if process_running else {"status": "stopped", "details": "Process not running"}
            
            status_results[service_key] = {
                "name": name,
                "port": port,
                "pid": pid,
                "process_running": process_running,
                "health": health,
                "started_at": started_at
            }
            
            # Print status
            status_icon = "🟢" if health["status"] == "healthy" else "🔴" if health["status"] in ["stopped", "unreachable"] else "🟡"
            pid_str = f"PID:{pid}" if pid != 'N/A' else "No PID"
            print(f"{status_icon} {name:30} | Port {port} | {pid_str:10} | {health['status'].upper():10} | {health['details']}")
        
        print("=" * 80)
        return status_results
    
    def list_services(self):
        """List all available services."""
        print("📋 Available Services")
        print("=" * 80)
        
        for service_key, service_config in SERVICES.items():
            name = service_config['name']
            port = service_config['port']
            script = service_config['script']
            description = service_config['description']
            
            running_status = "🟢 RUNNING" if self.is_service_running(service_key) else "🔴 STOPPED"
            
            print(f"Service Key: {service_key}")
            print(f"Name: {name}")
            print(f"Port: {port}")
            print(f"Script: {script}")
            print(f"Status: {running_status}")
            print(f"Description: {description}")
            print(f"URLs: http://localhost:{port} | http://localhost:{port}/docs")
            print("-" * 80)
        
        print("\nUsage Examples:")
        print("  python start_services.py --single longterm")
        print("  python start_services.py --restart analytics")
        print("  python start_services.py --stop-service orders")
        print("=" * 80)
    
    def _print_service_info(self):
        """Print service information."""
        print("\n📋 Service Information:")
        print("=" * 60)
        
        for service_key, service_config in SERVICES.items():
            name = service_config['name']
            port = service_config['port']
            description = service_config['description']
            
            running_status = "🟢" if self.is_service_running(service_key) else "🔴"
            
            print(f"{running_status} {name}")
            print(f"   Port: {port}")
            print(f"   URL: http://localhost:{port}")
            print(f"   Docs: http://localhost:{port}/docs")
            print(f"   Description: {description}")
            print()
        
        print("🌐 Main Dashboard: http://localhost:8000")
        print("📚 Complete API Docs: http://localhost:8000/docs")
        print("=" * 60)
    
    def monitor_services(self, check_interval: int = 30):
        """Monitor services and restart if needed."""
        print(f"👁️ Monitoring services (checking every {check_interval}s)")
        print("Press Ctrl+C to stop monitoring...")
        
        try:
            while self.running:
                time.sleep(check_interval)
                
                # Check each service
                services_to_check = list(SERVICES.keys())
                for service_key in services_to_check:
                    if not self.is_service_running(service_key):
                        name = SERVICES[service_key]['name']
                        print(f"⚠️ {name} has stopped unexpectedly. Restarting...")
                        self.restart_service(service_key)
                    else:
                        # Check health
                        health = self.check_service_health(service_key)
                        if health["status"] != "healthy":
                            name = SERVICES[service_key]['name']
                            print(f"⚠️ {name} health check failed: {health['details']}")
        
        except KeyboardInterrupt:
            print("\n🛑 Monitoring stopped by user")

def signal_handler(signum, frame):
    """Handle shutdown signals."""
    print("\n🛑 Received shutdown signal. Stopping services...")
    manager.stop_all_services()
    sys.exit(0)

def main():
    global manager
    
    parser = argparse.ArgumentParser(description="Long-Term Investment Platform Service Manager")
    parser.add_argument("--dev", action="store_true", help="Start in development mode")
    parser.add_argument("--single", type=str, help="Start only a specific service", choices=SERVICES.keys())
    parser.add_argument("--stop", action="store_true", help="Stop all running services")
    parser.add_argument("--stop-service", type=str, help="Stop a specific service", choices=SERVICES.keys())
    parser.add_argument("--restart", type=str, help="Restart a specific service", choices=SERVICES.keys())
    parser.add_argument("--status", action="store_true", help="Check status of all services")
    parser.add_argument("--monitor", action="store_true", help="Start monitoring mode")
    parser.add_argument("--list", action="store_true", help="List all available services")
    
    args = parser.parse_args()
    
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    manager = ServiceManager(dev_mode=args.dev)
    
    try:
        if args.list:
            manager.list_services()
            return
        
        if args.status:
            manager.status_all_services()
            return
        
        if args.stop:
            manager.stop_all_services()
            return
        
        if args.stop_service:
            manager.stop_service(args.stop_service)
            return
        
        if args.restart:
            success = manager.restart_service(args.restart)
            if success and args.monitor:
                manager.monitor_services()
            return
        
        if args.single:
            service_config = SERVICES[args.single]
            success = manager.start_service(args.single, service_config)
            if success and args.monitor:
                manager.monitor_services()
        else:
            success = manager.start_all_services()
            
            if success:
                if args.monitor:
                    manager.monitor_services()
                else:
                    try:
                        print("\n✋ Press Ctrl+C to stop all services...")
                        while True:
                            time.sleep(1)
                    except KeyboardInterrupt:
                        pass
    
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        manager.stop_all_services()

if __name__ == "__main__":
    main() 