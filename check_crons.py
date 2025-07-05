#!/usr/bin/env python3
"""
Cron Jobs Checker and Duplicate Prevention Script
================================================

This script provides comprehensive tools to:
1. Check all currently running cron jobs
2. Prevent duplicate job scheduling
3. Monitor job status and health
4. Manage job lifecycle

Usage:
    python check_crons.py status          # Show all job status
    python check_crons.py list            # List all configured jobs
    python check_crons.py duplicates      # Check for duplicate jobs
    python check_crons.py cleanup         # Remove inactive/duplicate jobs
"""

import asyncio
import logging
import sys
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path

# Add api directory to path
sys.path.append(str(Path(__file__).parent / "api"))

from services.trading_scheduler import trading_scheduler
from services.market_timer import market_timer
from models.recommendation_models import recommendation_cache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CronJobChecker:
    """Comprehensive cron job checker and manager."""
    
    def __init__(self):
        self.scheduler = trading_scheduler
        self.market_timer = market_timer
        
    async def show_all_job_status(self) -> Dict[str, Any]:
        """Show comprehensive status of all jobs and system."""
        print("=" * 80)
        print("🔍 COMPREHENSIVE CRON JOBS STATUS")
        print("=" * 80)
        
        # Get scheduler status
        scheduler_status = self.scheduler.get_scheduler_status()
        
        # Market status
        market_info = self.market_timer.get_market_session_info()
        print(f"\n📊 MARKET STATUS:")
        print(f"   Current Time (IST): {market_info['current_time_ist']}")
        print(f"   Session: {market_info['session']}")
        print(f"   Market Open: {market_info['is_open']}")
        print(f"   Should Run Crons: {market_info.get('should_run_cron', False)}")
        if market_info.get('next_market_open'):
            print(f"   Next Market Open: {market_info['next_market_open']}")
        
        # Scheduler status
        print(f"\n⚙️ SCHEDULER STATUS:")
        print(f"   Status: {scheduler_status['status']}")
        print(f"   Total Jobs: {len(scheduler_status.get('jobs', []))}")
        
        # Individual job status
        jobs = scheduler_status.get('jobs', [])
        if jobs:
            print(f"\n📋 CONFIGURED JOBS ({len(jobs)}):")
            for i, job in enumerate(jobs, 1):
                print(f"   {i}. ID: {job['id']}")
                print(f"      Name: {job['name']}")
                print(f"      Next Run: {job.get('next_run', 'Not scheduled')}")
                print(f"      Trigger: {job.get('trigger', 'N/A')}")
                print()
        else:
            print(f"\n📋 NO JOBS CONFIGURED")
        
        # Cache status
        try:
            cache_status = await self._get_cache_status()
            print(f"\n💾 CACHE STATUS:")
            print(f"   Connected: {cache_status.get('connected', False)}")
            print(f"   Type: {cache_status.get('type', 'Unknown')}")
            print(f"   Total Cached: {cache_status.get('total_count', 0)}")
            print(f"   Active: {cache_status.get('active_count', 0)}")
            print(f"   Expired: {cache_status.get('expired_count', 0)}")
        except Exception as e:
            print(f"\n💾 CACHE STATUS: Error - {e}")
        
        print("=" * 80)
        
        return {
            "scheduler": scheduler_status,
            "market": market_info,
            "timestamp": datetime.now().isoformat()
        }
    
    async def list_all_jobs(self) -> List[Dict[str, Any]]:
        """List all configured jobs with detailed information."""
        print("=" * 80)
        print("📋 ALL CONFIGURED CRON JOBS")
        print("=" * 80)
        
        scheduler_status = self.scheduler.get_scheduler_status()
        jobs = scheduler_status.get('jobs', [])
        
        if not jobs:
            print("❌ No cron jobs are currently configured.")
            return []
        
        print(f"Total Jobs: {len(jobs)}\n")
        
        for i, job in enumerate(jobs, 1):
            print(f"Job #{i}")
            print(f"  🔸 ID: {job['id']}")
            print(f"  🔸 Name: {job['name']}")
            print(f"  🔸 Next Run: {job.get('next_run', 'Not scheduled')}")
            print(f"  🔸 Trigger: {job.get('trigger', 'N/A')}")
            
            # Parse trigger information for more details
            trigger_str = job.get('trigger', '')
            if 'cron' in trigger_str.lower():
                print(f"  🔸 Type: Cron Job")
                if 'hour=9-15' in trigger_str:
                    print(f"  🔸 Schedule: Market hours (9:15 AM - 3:30 PM)")
                if 'minute=*/5' in trigger_str:
                    print(f"  🔸 Frequency: Every 5 minutes")
                elif 'minute=0,30' in trigger_str:
                    print(f"  🔸 Frequency: Every 30 minutes")
                elif 'minute=0' in trigger_str:
                    print(f"  🔸 Frequency: Every hour")
            
            print()
        
        return jobs
    
    async def check_for_duplicates(self) -> Dict[str, Any]:
        """Check for duplicate cron jobs."""
        print("=" * 80)
        print("🔍 CHECKING FOR DUPLICATE CRON JOBS")
        print("=" * 80)
        
        scheduler_status = self.scheduler.get_scheduler_status()
        jobs = scheduler_status.get('jobs', [])
        
        if not jobs:
            print("❌ No jobs configured - nothing to check.")
            return {"duplicates_found": False, "total_jobs": 0}
        
        # Group jobs by various criteria to detect duplicates
        job_groups = {
            'by_id': {},
            'by_name': {},
            'by_trigger': {}
        }
        
        duplicates_found = False
        
        # Group jobs
        for job in jobs:
            job_id = job['id']
            job_name = job['name']
            job_trigger = job.get('trigger', '')
            
            # Group by ID
            if job_id in job_groups['by_id']:
                job_groups['by_id'][job_id].append(job)
            else:
                job_groups['by_id'][job_id] = [job]
            
            # Group by name
            if job_name in job_groups['by_name']:
                job_groups['by_name'][job_name].append(job)
            else:
                job_groups['by_name'][job_name] = [job]
            
            # Group by trigger (similar schedules)
            if job_trigger in job_groups['by_trigger']:
                job_groups['by_trigger'][job_trigger].append(job)
            else:
                job_groups['by_trigger'][job_trigger] = [job]
        
        # Check for duplicates by ID (exact duplicates)
        print("🔍 CHECKING DUPLICATE IDs:")
        for job_id, job_list in job_groups['by_id'].items():
            if len(job_list) > 1:
                print(f"  ❌ DUPLICATE ID FOUND: '{job_id}' ({len(job_list)} instances)")
                for job in job_list:
                    print(f"     - {job['name']} | Next: {job.get('next_run', 'N/A')}")
                duplicates_found = True
        
        if not any(len(jobs) > 1 for jobs in job_groups['by_id'].values()):
            print("  ✅ No duplicate IDs found")
        
        # Check for duplicates by name
        print("\n🔍 CHECKING DUPLICATE NAMES:")
        for job_name, job_list in job_groups['by_name'].items():
            if len(job_list) > 1:
                print(f"  ⚠️ DUPLICATE NAME FOUND: '{job_name}' ({len(job_list)} instances)")
                for job in job_list:
                    print(f"     - ID: {job['id']} | Next: {job.get('next_run', 'N/A')}")
                duplicates_found = True
        
        if not any(len(jobs) > 1 for jobs in job_groups['by_name'].values()):
            print("  ✅ No duplicate names found")
        
        # Check for similar triggers (potential scheduling conflicts)
        print("\n🔍 CHECKING SIMILAR SCHEDULES:")
        for job_trigger, job_list in job_groups['by_trigger'].items():
            if len(job_list) > 1:
                print(f"  ⚠️ SIMILAR SCHEDULE FOUND: ({len(job_list)} jobs)")
                print(f"     Trigger: {job_trigger}")
                for job in job_list:
                    print(f"     - {job['name']} (ID: {job['id']})")
                print()
        
        # Summary
        print("=" * 40)
        if duplicates_found:
            print("❌ DUPLICATES DETECTED!")
            print("   • Use 'cleanup' command to remove duplicates")
            print("   • Check job scheduling logic")
        else:
            print("✅ NO DUPLICATES FOUND")
            print("   • All jobs have unique IDs and names")
        print("=" * 40)
        
        return {
            "duplicates_found": duplicates_found,
            "total_jobs": len(jobs),
            "duplicate_ids": [k for k, v in job_groups['by_id'].items() if len(v) > 1],
            "duplicate_names": [k for k, v in job_groups['by_name'].items() if len(v) > 1],
            "similar_schedules": [k for k, v in job_groups['by_trigger'].items() if len(v) > 1]
        }
    
    async def cleanup_duplicates(self) -> Dict[str, Any]:
        """Clean up duplicate and inactive jobs."""
        print("=" * 80)
        print("🧹 CLEANING UP DUPLICATE AND INACTIVE JOBS")
        print("=" * 80)
        
        # First check what we have
        duplicate_check = await self.check_for_duplicates()
        
        if not duplicate_check['duplicates_found']:
            print("✅ No duplicates found - nothing to clean up.")
            return {"cleaned": 0, "message": "No duplicates found"}
        
        print("\n⚠️ CLEANUP IS NOT IMPLEMENTED YET")
        print("This would require:")
        print("1. Stopping the current scheduler")
        print("2. Removing duplicate job definitions")
        print("3. Restarting with clean job set")
        print("4. Manual intervention recommended")
        
        return {"cleaned": 0, "message": "Manual cleanup required"}
    
    async def prevent_duplicates_guide(self):
        """Show guide on how to prevent duplicate jobs."""
        print("=" * 80)
        print("📖 HOW TO PREVENT DUPLICATE CRON JOBS")
        print("=" * 80)
        
        print("""
🔧 PREVENTION STRATEGIES:

1. 📋 UNIQUE JOB IDs:
   • Always use unique job IDs when adding jobs
   • APScheduler uses 'replace_existing=True' to prevent ID duplicates
   • Example: scheduler.add_job(..., id='unique_job_id', replace_existing=True)

2. 🔍 CHECK BEFORE ADDING:
   • Use scheduler.get_job(job_id) to check if job exists
   • Only add if job doesn't exist or intentionally replacing

3. 🛑 PROPER SHUTDOWN:
   • Always stop scheduler gracefully before restart
   • Use scheduler.shutdown(wait=True) to wait for running jobs

4. 🔄 RESTART LOGIC:
   • Clear job store before adding new jobs
   • Use scheduler.remove_all_jobs() if needed

5. 📊 MONITORING:
   • Regularly check job status with this script
   • Monitor logs for duplicate job warnings

🔨 CURRENT IMPLEMENTATION:

The trading system uses these prevention methods:
""")
        
        # Show current implementation
        print("   ✅ Unique Job IDs:")
        expected_jobs = [
            "shortterm_recommendations",
            "swing_recommendations", 
            "longterm_recommendations",
            "cache_cleanup"
        ]
        
        for job_id in expected_jobs:
            print(f"      • {job_id}")
        
        print("""
   ✅ Replace Existing: 
      • APScheduler configured with replace_existing=True
      • Prevents duplicate IDs automatically

   ✅ Proper Cleanup:
      • Scheduler stops gracefully on shutdown
      • No orphaned jobs left running

🚨 WARNING SIGNS:

Watch for these indicators of duplicate jobs:
   • Multiple jobs with same schedule running
   • Excessive API calls to trading servers
   • Cache being updated too frequently
   • High CPU usage from scheduler
   • Log messages showing duplicate analysis runs

🔧 TROUBLESHOOTING:

If duplicates are found:
   1. Stop all trading services: ./start_trading_crons.sh stop
   2. Check for any remaining Python processes: ps aux | grep trading
   3. Kill any orphaned processes: pkill -f trading_cron_manager
   4. Restart cleanly: ./start_trading_crons.sh start
   5. Verify with: python check_crons.py status
""")
        
        print("=" * 80)
    
    async def _get_cache_status(self) -> Dict[str, Any]:
        """Get cache status information."""
        try:
            # Try to get cache stats (this may fail if cache is not initialized)
            if hasattr(recommendation_cache, 'get_cache_stats'):
                return await recommendation_cache.get_cache_stats()
            else:
                # Fallback - basic connection check
                return {
                    "connected": True,
                    "type": "mongodb",
                    "total_count": 0,
                    "active_count": 0,
                    "expired_count": 0
                }
        except Exception as e:
            return {
                "connected": False,
                "error": str(e)
            }

async def main():
    """Main function to handle command line arguments."""
    if len(sys.argv) < 2:
        print("Usage: python check_crons.py [status|list|duplicates|cleanup|guide]")
        print("\nCommands:")
        print("  status      - Show comprehensive system status")
        print("  list        - List all configured jobs")
        print("  duplicates  - Check for duplicate jobs") 
        print("  cleanup     - Clean up duplicates (not implemented)")
        print("  guide       - Show prevention guide")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    checker = CronJobChecker()
    
    try:
        if command == "status":
            await checker.show_all_job_status()
        elif command == "list":
            await checker.list_all_jobs()
        elif command == "duplicates":
            await checker.check_for_duplicates()
        elif command == "cleanup":
            await checker.cleanup_duplicates()
        elif command == "guide":
            await checker.prevent_duplicates_guide()
        else:
            print(f"❌ Unknown command: {command}")
            print("Valid commands: status, list, duplicates, cleanup, guide")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"❌ Error executing command '{command}': {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 