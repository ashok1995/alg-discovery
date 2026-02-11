#!/usr/bin/env python3
"""
Cron Status Dashboard
=====================

Real-time visualization of trading cron job status with:
- Live cron job monitoring
- Market status display
- Execution history and analytics
- Log streaming
- Performance metrics
- Interactive controls

Usage:
    python cron_status_dashboard.py
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List
import subprocess
import time

# Add project root to path
sys.path.append(str(Path(__file__).parent))

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
    UNDERLINE = '\033[4m'
    END = '\033[0m'

class CronStatusDashboard:
    """Interactive dashboard for monitoring cron job status"""
    
    def __init__(self):
        self.log_file = "./logs/cron.log"
        self.refresh_interval = 5  # seconds
        self.running = True
        
    def clear_screen(self):
        """Clear the terminal screen"""
        os.system('clear' if os.name == 'posix' else 'cls')
        
    def get_cron_process_status(self) -> Dict[str, Any]:
        """Check if cron manager process is running"""
        try:
            result = subprocess.run(['pgrep', '-f', 'cron.main'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                pids = result.stdout.strip().split('\n')
                return {
                    "running": True,
                    "pids": [int(pid) for pid in pids if pid],
                    "count": len([pid for pid in pids if pid])
                }
            else:
                return {"running": False, "pids": [], "count": 0}
        except Exception as e:
            return {"error": str(e), "running": False}
            
    def get_market_status(self) -> Dict[str, Any]:
        """Get current market status"""
        try:
            from services.market_timer import MarketTimer
            market_timer = MarketTimer()
            return market_timer.get_market_session_info()
        except Exception as e:
            return {"error": str(e), "is_open": False}
            
    def get_recent_logs(self, lines: int = 20) -> List[str]:
        """Get recent log entries"""
        try:
            if not os.path.exists(self.log_file):
                return ["Log file not found"]
                
            with open(self.log_file, 'r') as f:
                all_lines = f.readlines()
                return [line.strip() for line in all_lines[-lines:]]
        except Exception as e:
            return [f"Error reading logs: {e}"]
            
    def get_scheduler_jobs_info(self) -> Dict[str, Any]:
        """Get information about scheduled jobs"""
        try:
            from api.services.trading_scheduler import trading_scheduler
            return trading_scheduler.get_scheduler_status()
        except Exception as e:
            return {"error": str(e), "status": "error"}
            
    def format_time_ago(self, timestamp_str: str) -> str:
        """Format timestamp as time ago"""
        try:
            if not timestamp_str:
                return "Never"
            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            now = datetime.now()
            if timestamp.tzinfo:
                from datetime import timezone
                now = now.replace(tzinfo=timezone.utc)
            
            diff = now - timestamp
            if diff.days > 0:
                return f"{diff.days}d ago"
            elif diff.seconds > 3600:
                return f"{diff.seconds // 3600}h ago"
            elif diff.seconds > 60:
                return f"{diff.seconds // 60}m ago"
            else:
                return f"{diff.seconds}s ago"
        except:
            return "Unknown"
            
    def render_header(self):
        """Render dashboard header"""
        print(f"{Colors.BOLD}{Colors.CYAN}{'='*80}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.CYAN}🚀 TRADING CRON STATUS DASHBOARD 🚀{Colors.END}")
        print(f"{Colors.BOLD}{Colors.CYAN}{'='*80}{Colors.END}")
        print(f"{Colors.WHITE}Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.END}")
        print()
        
    def render_process_status(self, process_info: Dict[str, Any]):
        """Render cron process status"""
        print(f"{Colors.BOLD}{Colors.YELLOW}📊 PROCESS STATUS{Colors.END}")
        print("-" * 40)
        
        if process_info.get("running"):
            status_color = Colors.GREEN
            status_text = "✅ RUNNING"
            pids = process_info.get("pids", [])
            print(f"Status: {status_color}{status_text}{Colors.END}")
            print(f"PIDs: {Colors.CYAN}{', '.join(map(str, pids))}{Colors.END}")
            print(f"Count: {Colors.CYAN}{process_info.get('count', 0)}{Colors.END}")
        else:
            status_color = Colors.RED
            status_text = "❌ STOPPED"
            print(f"Status: {status_color}{status_text}{Colors.END}")
            if "error" in process_info:
                print(f"Error: {Colors.RED}{process_info['error']}{Colors.END}")
        print()
        
    def render_market_status(self, market_info: Dict[str, Any]):
        """Render market status"""
        print(f"{Colors.BOLD}{Colors.BLUE}📈 MARKET STATUS{Colors.END}")
        print("-" * 40)
        
        if "error" in market_info:
            print(f"Error: {Colors.RED}{market_info['error']}{Colors.END}")
        else:
            is_open = market_info.get('is_open', False)
            session = market_info.get('session', 'Unknown')
            
            status_color = Colors.GREEN if is_open else Colors.YELLOW
            status_text = "🟢 OPEN" if is_open else "🟡 CLOSED"
            
            print(f"Status: {status_color}{status_text}{Colors.END}")
            print(f"Session: {Colors.CYAN}{session}{Colors.END}")
            
            if 'next_market_open' in market_info:
                print(f"Next Open: {Colors.CYAN}{market_info['next_market_open']}{Colors.END}")
        print()
        
    def render_scheduler_status(self, scheduler_info: Dict[str, Any]):
        """Render scheduler job status"""
        print(f"{Colors.BOLD}{Colors.MAGENTA}⏰ SCHEDULER STATUS{Colors.END}")
        print("-" * 40)
        
        if "error" in scheduler_info:
            print(f"Error: {Colors.RED}{scheduler_info['error']}{Colors.END}")
            print()
            return
            
        status = scheduler_info.get('status', 'unknown')
        status_color = Colors.GREEN if status == 'running' else Colors.RED
        status_text = f"{'✅' if status == 'running' else '❌'} {status.upper()}"
        
        print(f"Scheduler: {status_color}{status_text}{Colors.END}")
        
        jobs = scheduler_info.get('jobs', [])
        if jobs:
            print(f"Jobs ({len(jobs)}):")
            for job in jobs:
                next_run = job.get('next_run')
                next_run_text = self.format_time_ago(next_run) if next_run else "Not scheduled"
                print(f"  • {Colors.CYAN}{job.get('name', job.get('id', 'Unknown'))}{Colors.END}")
                print(f"    Next: {Colors.YELLOW}{next_run_text}{Colors.END}")
        else:
            print(f"{Colors.YELLOW}No jobs scheduled{Colors.END}")
        print()
        
    def render_recent_logs(self, logs: List[str]):
        """Render recent log entries"""
        print(f"{Colors.BOLD}{Colors.WHITE}📋 RECENT LOGS (Last 10 entries){Colors.END}")
        print("-" * 80)
        
        for log_line in logs[-10:]:
            if not log_line.strip():
                continue
                
            # Color code log levels
            if "ERROR" in log_line or "❌" in log_line:
                color = Colors.RED
            elif "WARNING" in log_line or "⚠️" in log_line:
                color = Colors.YELLOW
            elif "INFO" in log_line or "✅" in log_line or "🔄" in log_line:
                color = Colors.GREEN
            else:
                color = Colors.WHITE
                
            # Truncate long lines
            if len(log_line) > 75:
                log_line = log_line[:72] + "..."
                
            print(f"{color}{log_line}{Colors.END}")
        print()
        
    def render_controls(self):
        """Render control instructions"""
        print(f"{Colors.BOLD}{Colors.CYAN}🎮 CONTROLS{Colors.END}")
        print("-" * 40)
        print(f"{Colors.WHITE}Press 'q' + Enter to quit{Colors.END}")
        print(f"{Colors.WHITE}Press 'r' + Enter to restart cron{Colors.END}")
        print(f"{Colors.WHITE}Press 'f' + Enter to force run all jobs{Colors.END}")
        print(f"{Colors.WHITE}Press 'l' + Enter to view full logs{Colors.END}")
        print(f"{Colors.WHITE}Auto-refresh every {self.refresh_interval} seconds{Colors.END}")
        print()
        
    async def handle_user_input(self):
        """Handle user input asynchronously"""
        import select
        import sys
        
        if select.select([sys.stdin], [], [], 0) == ([sys.stdin], [], []):
            user_input = sys.stdin.readline().strip().lower()
            
            if user_input == 'q':
                self.running = False
                print(f"{Colors.GREEN}Exiting dashboard...{Colors.END}")
                return
            elif user_input == 'r':
                print(f"{Colors.YELLOW}Restarting cron manager...{Colors.END}")
                subprocess.run(['pkill', '-f', 'cron.main'], capture_output=True)
                await asyncio.sleep(2)
                subprocess.Popen(['nohup', 'python3', '-u', 'cron/main.py'], 
                               stdout=open('./logs/cron.log', 'a'),
                               stderr=subprocess.STDOUT)
                print(f"{Colors.GREEN}Cron manager restarted{Colors.END}")
                await asyncio.sleep(2)
            elif user_input == 'f':
                print(f"{Colors.YELLOW}Force running all jobs...{Colors.END}")
                try:
                    from api.services.trading_scheduler import trading_scheduler
                    results = await trading_scheduler.force_run_all()
                    print(f"{Colors.GREEN}Force run completed: {results}{Colors.END}")
                except Exception as e:
                    print(f"{Colors.RED}Force run failed: {e}{Colors.END}")
                await asyncio.sleep(3)
            elif user_input == 'l':
                print(f"{Colors.YELLOW}Opening full logs...{Colors.END}")
                subprocess.run(['tail', '-f', self.log_file])
                
    async def run_dashboard(self):
        """Run the interactive dashboard"""
        print(f"{Colors.GREEN}Starting Cron Status Dashboard...{Colors.END}")
        print(f"{Colors.YELLOW}Press Ctrl+C to exit{Colors.END}")
        await asyncio.sleep(2)
        
        try:
            while self.running:
                self.clear_screen()
                
                # Gather status information
                process_info = self.get_cron_process_status()
                market_info = self.get_market_status()
                scheduler_info = self.get_scheduler_jobs_info()
                recent_logs = self.get_recent_logs()
                
                # Render dashboard
                self.render_header()
                self.render_process_status(process_info)
                self.render_market_status(market_info)
                self.render_scheduler_status(scheduler_info)
                self.render_recent_logs(recent_logs)
                self.render_controls()
                
                # Handle user input
                await self.handle_user_input()
                
                # Wait before next refresh
                await asyncio.sleep(self.refresh_interval)
                
        except KeyboardInterrupt:
            print(f"\n{Colors.GREEN}Dashboard stopped by user{Colors.END}")
        except Exception as e:
            print(f"\n{Colors.RED}Dashboard error: {e}{Colors.END}")

def main():
    """Main entry point"""
    dashboard = CronStatusDashboard()
    asyncio.run(dashboard.run_dashboard())

if __name__ == "__main__":
    main() 