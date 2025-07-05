#!/usr/bin/env python3
"""
Simple Cron Status Viewer
=========================

Quick status check for trading cron jobs with:
- Process status monitoring
- Log tail viewing
- Job execution tracking
- Simple terminal interface

Usage:
    python cron_status_simple.py
"""

import os
import sys
import subprocess
import time
from datetime import datetime
from typing import List, Dict, Any

# Color codes for terminal output
class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

class SimpleCronStatus:
    """Simple cron status monitoring"""
    
    def __init__(self):
        self.log_file = "./logs/cron.log"
        
    def clear_screen(self):
        """Clear terminal screen"""
        os.system('clear' if os.name == 'posix' else 'cls')
        
    def get_process_status(self) -> Dict[str, Any]:
        """Check if cron process is running"""
        try:
            result = subprocess.run(['pgrep', '-f', 'cron.main'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                pids = [pid.strip() for pid in result.stdout.strip().split('\n') if pid.strip()]
                return {
                    "running": True,
                    "pids": pids,
                    "count": len(pids)
                }
            else:
                return {"running": False, "pids": [], "count": 0}
        except Exception as e:
            return {"error": str(e), "running": False}
            
    def get_log_stats(self) -> Dict[str, Any]:
        """Get log file statistics"""
        try:
            if not os.path.exists(self.log_file):
                return {"exists": False, "error": "Log file not found"}
                
            stat = os.stat(self.log_file)
            with open(self.log_file, 'r') as f:
                lines = f.readlines()
                
            recent_lines = lines[-20:] if lines else []
            
            # Count log levels in recent lines
            error_count = sum(1 for line in recent_lines if 'ERROR' in line or '❌' in line)
            warning_count = sum(1 for line in recent_lines if 'WARNING' in line or '⚠️' in line)
            info_count = sum(1 for line in recent_lines if 'INFO' in line or '✅' in line)
            
            return {
                "exists": True,
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime),
                "total_lines": len(lines),
                "recent_errors": error_count,
                "recent_warnings": warning_count,
                "recent_info": info_count,
                "recent_lines": [line.strip() for line in recent_lines if line.strip()]
            }
        except Exception as e:
            return {"exists": False, "error": str(e)}
            
    def get_server_status(self) -> Dict[str, Any]:
        """Check if trading servers are running"""
        servers = {
            "shortterm": 8003,
            "swing": 8002,
            "longterm": 8001
        }
        
        status = {}
        for name, port in servers.items():
            try:
                result = subprocess.run(['lsof', '-i', f':{port}'], 
                                      capture_output=True, text=True)
                status[name] = {
                    "port": port,
                    "running": result.returncode == 0,
                    "details": result.stdout.strip() if result.returncode == 0 else "Not running"
                }
            except Exception as e:
                status[name] = {"port": port, "running": False, "error": str(e)}
                
        return status
        
    def render_header(self):
        """Render status header"""
        print(f"{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.CYAN}📊 TRADING CRON STATUS MONITOR 📊{Colors.END}")
        print(f"{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}")
        print(f"{Colors.WHITE}Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.END}")
        print()
        
    def render_process_status(self, process_info: Dict[str, Any]):
        """Render process status"""
        print(f"{Colors.BOLD}{Colors.YELLOW}🚀 CRON MANAGER PROCESS{Colors.END}")
        print("-" * 40)
        
        if process_info.get("running"):
            print(f"Status: {Colors.GREEN}✅ RUNNING{Colors.END}")
            print(f"PIDs: {Colors.CYAN}{', '.join(process_info.get('pids', []))}{Colors.END}")
            print(f"Count: {Colors.CYAN}{process_info.get('count', 0)} process(es){Colors.END}")
        else:
            print(f"Status: {Colors.RED}❌ STOPPED{Colors.END}")
            if "error" in process_info:
                print(f"Error: {Colors.RED}{process_info['error']}{Colors.END}")
        print()
        
    def render_log_status(self, log_stats: Dict[str, Any]):
        """Render log file status"""
        print(f"{Colors.BOLD}{Colors.BLUE}📋 LOG FILE STATUS{Colors.END}")
        print("-" * 40)
        
        if not log_stats.get("exists"):
            print(f"Status: {Colors.RED}❌ NOT FOUND{Colors.END}")
            if "error" in log_stats:
                print(f"Error: {Colors.RED}{log_stats['error']}{Colors.END}")
        else:
            print(f"Status: {Colors.GREEN}✅ EXISTS{Colors.END}")
            print(f"Size: {Colors.CYAN}{log_stats.get('size', 0):,} bytes{Colors.END}")
            print(f"Modified: {Colors.CYAN}{log_stats.get('modified', 'Unknown')}{Colors.END}")
            print(f"Total Lines: {Colors.CYAN}{log_stats.get('total_lines', 0):,}{Colors.END}")
            
            # Recent activity summary
            errors = log_stats.get('recent_errors', 0)
            warnings = log_stats.get('recent_warnings', 0)
            info = log_stats.get('recent_info', 0)
            
            print(f"Recent Activity (last 20 lines):")
            print(f"  Errors: {Colors.RED if errors > 0 else Colors.GREEN}{errors}{Colors.END}")
            print(f"  Warnings: {Colors.YELLOW if warnings > 0 else Colors.GREEN}{warnings}{Colors.END}")
            print(f"  Info: {Colors.GREEN}{info}{Colors.END}")
        print()
        
    def render_server_status(self, server_status: Dict[str, Any]):
        """Render trading server status"""
        print(f"{Colors.BOLD}{Colors.MAGENTA}🌐 TRADING SERVERS{Colors.END}")
        print("-" * 40)
        
        for name, info in server_status.items():
            port = info.get('port', 'Unknown')
            running = info.get('running', False)
            
            status_color = Colors.GREEN if running else Colors.RED
            status_text = "✅ UP" if running else "❌ DOWN"
            
            print(f"{name.title()} (:{port}): {status_color}{status_text}{Colors.END}")
            
            if "error" in info:
                print(f"  Error: {Colors.RED}{info['error']}{Colors.END}")
        print()
        
    def render_recent_logs(self, log_stats: Dict[str, Any], lines: int = 8):
        """Render recent log entries"""
        print(f"{Colors.BOLD}{Colors.WHITE}📜 RECENT LOG ENTRIES{Colors.END}")
        print("-" * 70)
        
        if not log_stats.get("exists"):
            print(f"{Colors.RED}No log file available{Colors.END}")
            return
            
        recent_lines = log_stats.get('recent_lines', [])
        if not recent_lines:
            print(f"{Colors.YELLOW}No recent log entries{Colors.END}")
            return
            
        for line in recent_lines[-lines:]:
            if not line:
                continue
                
            # Colorize based on content
            if 'ERROR' in line or '❌' in line:
                color = Colors.RED
            elif 'WARNING' in line or '⚠️' in line:
                color = Colors.YELLOW
            elif 'INFO' in line or '✅' in line or '🔄' in line:
                color = Colors.GREEN
            else:
                color = Colors.WHITE
                
            # Truncate long lines
            display_line = line[:65] + "..." if len(line) > 65 else line
            print(f"{color}{display_line}{Colors.END}")
        print()
        
    def render_controls(self):
        """Render available commands"""
        print(f"{Colors.BOLD}{Colors.CYAN}🎮 COMMANDS{Colors.END}")
        print("-" * 40)
        print(f"{Colors.WHITE}python cron_status_simple.py          - Show this status{Colors.END}")
        print(f"{Colors.WHITE}python cron_status_simple.py watch    - Continuous monitoring{Colors.END}")
        print(f"{Colors.WHITE}python cron_status_simple.py logs     - Tail logs in real-time{Colors.END}")
        print(f"{Colors.WHITE}python cron_status_simple.py restart  - Restart cron manager{Colors.END}")
        print()
        
    def show_status(self):
        """Show current status"""
        self.clear_screen()
        
        # Gather information
        process_info = self.get_process_status()
        log_stats = self.get_log_stats()
        server_status = self.get_server_status()
        
        # Render dashboard
        self.render_header()
        self.render_process_status(process_info)
        self.render_log_status(log_stats)
        self.render_server_status(server_status)
        self.render_recent_logs(log_stats)
        self.render_controls()
        
    def watch_status(self, interval: int = 5):
        """Continuously monitor status"""
        print(f"{Colors.GREEN}Starting continuous monitoring (refresh every {interval}s)...{Colors.END}")
        print(f"{Colors.YELLOW}Press Ctrl+C to stop{Colors.END}")
        
        try:
            while True:
                self.show_status()
                time.sleep(interval)
        except KeyboardInterrupt:
            print(f"\n{Colors.GREEN}Monitoring stopped{Colors.END}")
            
    def tail_logs(self):
        """Tail log file in real-time"""
        if not os.path.exists(self.log_file):
            print(f"{Colors.RED}Log file not found: {self.log_file}{Colors.END}")
            return
            
        print(f"{Colors.GREEN}Tailing log file: {self.log_file}{Colors.END}")
        print(f"{Colors.YELLOW}Press Ctrl+C to stop{Colors.END}")
        
        try:
            subprocess.run(['tail', '-f', self.log_file])
        except KeyboardInterrupt:
            print(f"\n{Colors.GREEN}Log tailing stopped{Colors.END}")
            
    def restart_cron(self):
        """Restart cron manager"""
        print(f"{Colors.YELLOW}Restarting cron manager...{Colors.END}")
        
        # Stop existing processes
        try:
            subprocess.run(['pkill', '-f', 'cron.main'], capture_output=True)
            print(f"{Colors.GREEN}Stopped existing cron processes{Colors.END}")
            time.sleep(2)
        except Exception as e:
            print(f"{Colors.YELLOW}Warning stopping processes: {e}{Colors.END}")
            
        # Start new process
        try:
            with open('./logs/cron.log', 'a') as log_file:
                subprocess.Popen(['nohup', 'python3', '-u', 'cron/main.py'], 
                               stdout=log_file, stderr=subprocess.STDOUT)
            print(f"{Colors.GREEN}Started new cron manager process{Colors.END}")
            
            # Wait and check status
            time.sleep(3)
            process_info = self.get_process_status()
            if process_info.get("running"):
                print(f"{Colors.GREEN}✅ Cron manager is now running (PID: {', '.join(process_info.get('pids', []))}){Colors.END}")
            else:
                print(f"{Colors.RED}❌ Failed to start cron manager{Colors.END}")
                
        except Exception as e:
            print(f"{Colors.RED}Error starting cron manager: {e}{Colors.END}")

def main():
    """Main entry point"""
    monitor = SimpleCronStatus()
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'watch':
            monitor.watch_status()
        elif command == 'logs':
            monitor.tail_logs()
        elif command == 'restart':
            monitor.restart_cron()
        else:
            print(f"{Colors.RED}Unknown command: {command}{Colors.END}")
            print(f"{Colors.WHITE}Available commands: watch, logs, restart{Colors.END}")
    else:
        monitor.show_status()

if __name__ == "__main__":
    main() 