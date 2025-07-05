#!/usr/bin/env python3
"""
Cron Job Analytics Viewer
=========================

This script provides comprehensive viewing and analysis of cron job execution history.
It allows you to monitor performance, track trends, and identify issues in the trading system.

Usage:
    python view_cron_analytics.py [command] [options]

Commands:
    history       - View execution history
    performance   - Show performance analytics  
    summary       - Display job summaries
    trends        - Show performance trends
    failures      - Show failed executions
    live          - Live monitoring dashboard
    export        - Export data to CSV/JSON

Examples:
    python view_cron_analytics.py history --days 7
    python view_cron_analytics.py performance --job-type shortterm
    python view_cron_analytics.py failures --limit 20
    python view_cron_analytics.py live
"""

import asyncio
import argparse
import json
import csv
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path
import time

# Add the api directory to the Python path
sys.path.append(str(Path(__file__).parent / "api"))

from models.cron_tracking_models import (
    cron_execution_tracker, CronJobType, CronJobStatus
)

class CronAnalyticsViewer:
    """Analytics viewer for cron job execution data"""
    
    def __init__(self):
        self.tracker = cron_execution_tracker
        
    async def initialize(self):
        """Initialize the tracker connection"""
        await self.tracker.initialize()
    
    async def close(self):
        """Close the tracker connection"""
        await self.tracker.close()
    
    async def show_execution_history(self, 
                                     job_type: Optional[str] = None,
                                     days: int = 7,
                                     limit: int = 50,
                                     status_filter: Optional[str] = None) -> None:
        """Display execution history with filtering options"""
        
        print(f"📊 Cron Job Execution History (Last {days} days)")
        print("=" * 80)
        
        # Convert string parameters to enums
        job_type_enum = None
        if job_type:
            try:
                job_type_enum = CronJobType(job_type.lower() + "_analysis")
            except ValueError:
                print(f"❌ Invalid job type: {job_type}")
                return
        
        status_enum = None
        if status_filter:
            try:
                status_enum = CronJobStatus(status_filter.lower())
            except ValueError:
                print(f"❌ Invalid status: {status_filter}")
                return
        
        start_date = datetime.now() - timedelta(days=days)
        
        try:
            executions = await self.tracker.get_job_history(
                job_type=job_type_enum,
                limit=limit,
                status_filter=status_enum,
                start_date=start_date
            )
            
            if not executions:
                print("ℹ️  No execution data found for the specified criteria")
                return
            
            # Display summary
            print(f"Found {len(executions)} executions")
            print()
            
            # Display table header
            print(f"{'Time':<20} {'Job Type':<15} {'Status':<10} {'Duration':<10} {'Recommendations':<15} {'Error':<30}")
            print("-" * 120)
            
            for execution in executions:
                # Format data
                start_time = execution.get('actual_start_time', '')
                if isinstance(start_time, str):
                    try:
                        start_time = datetime.fromisoformat(start_time).strftime('%Y-%m-%d %H:%M')
                    except:
                        start_time = start_time[:16]  # Truncate if parsing fails
                
                job_type_display = execution.get('job_type', '').replace('_analysis', '')
                status = execution.get('status', 'unknown')
                duration = execution.get('duration_seconds', 0)
                duration_str = f"{duration:.1f}s" if duration else "N/A"
                
                recommendations = execution.get('recommendations_count', 0) or execution.get('output_summary', {}).get('recommendations_generated', 0)
                recommendations_str = str(recommendations) if recommendations else "0"
                
                error = execution.get('error_message', '')[:25] + ('...' if len(execution.get('error_message', '')) > 25 else '')
                
                # Color coding for status
                if status == 'success':
                    status_display = f"✅ {status}"
                elif status == 'failed':
                    status_display = f"❌ {status}"
                elif status == 'skipped':
                    status_display = f"⏭️  {status}"
                else:
                    status_display = f"⚪ {status}"
                
                print(f"{start_time:<20} {job_type_display:<15} {status_display:<15} {duration_str:<10} {recommendations_str:<15} {error:<30}")
            
            print()
            
        except Exception as e:
            print(f"❌ Error retrieving execution history: {e}")
    
    async def show_performance_analytics(self, 
                                         job_type: Optional[str] = None,
                                         days: int = 30) -> None:
        """Display performance analytics"""
        
        print(f"📈 Performance Analytics (Last {days} days)")
        print("=" * 80)
        
        job_type_enum = None
        if job_type:
            try:
                job_type_enum = CronJobType(job_type.lower() + "_analysis")
            except ValueError:
                print(f"❌ Invalid job type: {job_type}")
                return
        
        try:
            analytics = await self.tracker.get_performance_analytics(
                job_type=job_type_enum,
                days=days
            )
            
            if analytics.get('error'):
                print(f"❌ Error: {analytics['error']}")
                return
            
            if analytics.get('executions', 0) == 0:
                print("ℹ️  No execution data found for the specified criteria")
                return
            
            # Display key metrics
            print(f"📊 Execution Summary:")
            print(f"   • Total Executions: {analytics.get('total_executions', 0)}")
            print(f"   • Successful: {analytics.get('successful_executions', 0)}")
            print(f"   • Failed: {analytics.get('failed_executions', 0)}")
            print(f"   • Success Rate: {analytics.get('success_rate_percent', 0):.1f}%")
            print(f"   • Recent Success Rate: {analytics.get('recent_success_rate_percent', 0):.1f}%")
            print()
            
            print(f"⏱️  Performance Metrics:")
            print(f"   • Average Duration: {analytics.get('average_duration_seconds', 0):.2f} seconds")
            print(f"   • Execution Frequency: {analytics.get('execution_frequency_per_day', 0):.1f} per day")
            print()
            
            print(f"📋 Recommendations:")
            print(f"   • Total Generated: {analytics.get('total_recommendations_generated', 0)}")
            print(f"   • Average per Execution: {analytics.get('average_recommendations_per_execution', 0):.1f}")
            print()
            
            print(f"📅 Timeline:")
            last_execution = analytics.get('last_execution')
            last_success = analytics.get('last_successful_execution')
            
            if last_execution:
                if isinstance(last_execution, str):
                    try:
                        last_execution = datetime.fromisoformat(last_execution)
                    except:
                        pass
                print(f"   • Last Execution: {last_execution}")
            
            if last_success:
                if isinstance(last_success, str):
                    try:
                        last_success = datetime.fromisoformat(last_success)
                    except:
                        pass
                print(f"   • Last Success: {last_success}")
            
            print()
            
        except Exception as e:
            print(f"❌ Error retrieving performance analytics: {e}")
    
    async def show_job_summaries(self) -> None:
        """Display summary for all job types"""
        
        print("📋 Job Type Summaries")
        print("=" * 80)
        
        job_types = [
            CronJobType.SHORTTERM_ANALYSIS,
            CronJobType.SWING_ANALYSIS,
            CronJobType.LONGTERM_ANALYSIS,
            CronJobType.CACHE_CLEANUP
        ]
        
        for job_type in job_types:
            print(f"\n🔧 {job_type.value.replace('_', ' ').title()}")
            print("-" * 40)
            
            try:
                analytics = await self.tracker.get_performance_analytics(
                    job_type=job_type,
                    days=30
                )
                
                if analytics.get('executions', 0) == 0:
                    print("   No recent execution data")
                    continue
                
                success_rate = analytics.get('success_rate_percent', 0)
                status_icon = "✅" if success_rate >= 90 else "⚠️" if success_rate >= 70 else "❌"
                
                print(f"   {status_icon} Success Rate: {success_rate:.1f}%")
                print(f"   📊 Executions: {analytics.get('total_executions', 0)} (last 30 days)")
                print(f"   ⏱️  Avg Duration: {analytics.get('average_duration_seconds', 0):.2f}s")
                
                if job_type != CronJobType.CACHE_CLEANUP:
                    print(f"   📈 Recommendations: {analytics.get('total_recommendations_generated', 0)} total")
                
            except Exception as e:
                print(f"   ❌ Error: {e}")
    
    async def show_failed_executions(self, limit: int = 20, days: int = 7) -> None:
        """Display recent failed executions with details"""
        
        print(f"❌ Failed Executions (Last {days} days)")
        print("=" * 80)
        
        start_date = datetime.now() - timedelta(days=days)
        
        try:
            failures = await self.tracker.get_job_history(
                status_filter=CronJobStatus.FAILED,
                limit=limit,
                start_date=start_date
            )
            
            if not failures:
                print("✅ No failed executions found in the specified period")
                return
            
            print(f"Found {len(failures)} failed executions\n")
            
            for i, failure in enumerate(failures, 1):
                print(f"🔴 Failure #{i}")
                print(f"   Time: {failure.get('actual_start_time', 'Unknown')}")
                print(f"   Job: {failure.get('job_name', 'Unknown')}")
                print(f"   Type: {failure.get('job_type', 'Unknown')}")
                print(f"   Error: {failure.get('error_message', 'No error message')}")
                
                error_details = failure.get('error_details', {})
                if error_details:
                    print(f"   Details: {error_details}")
                
                print()
                
        except Exception as e:
            print(f"❌ Error retrieving failed executions: {e}")
    
    async def live_monitoring(self, refresh_seconds: int = 30) -> None:
        """Live monitoring dashboard"""
        
        print("🔴 Live Cron Job Monitoring")
        print("Press Ctrl+C to exit")
        print("=" * 80)
        
        try:
            while True:
                # Clear screen (works on most terminals)
                print("\033[2J\033[H")
                
                print(f"🔴 Live Monitoring - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                print("=" * 80)
                
                # Show recent executions
                recent_executions = await self.tracker.get_job_history(limit=10)
                
                if recent_executions:
                    print("\n📊 Recent Executions:")
                    print(f"{'Time':<16} {'Job':<15} {'Status':<10} {'Duration':<8} {'Recs':<6}")
                    print("-" * 60)
                    
                    for execution in recent_executions[:5]:
                        start_time = execution.get('actual_start_time', '')
                        if isinstance(start_time, str):
                            try:
                                start_time = datetime.fromisoformat(start_time).strftime('%H:%M:%S')
                            except:
                                start_time = start_time[-8:]  # Last 8 chars
                        
                        job_type = execution.get('job_type', '').replace('_analysis', '')[:14]
                        status = execution.get('status', 'unknown')
                        duration = execution.get('duration_seconds', 0)
                        duration_str = f"{duration:.1f}s" if duration else "N/A"
                        
                        recommendations = execution.get('recommendations_count', 0) or execution.get('output_summary', {}).get('recommendations_generated', 0)
                        
                        status_icon = "✅" if status == "success" else "❌" if status == "failed" else "⏭️" if status == "skipped" else "⚪"
                        
                        print(f"{start_time:<16} {job_type:<15} {status_icon}{status:<8} {duration_str:<8} {recommendations:<6}")
                
                # Show system health summary
                print(f"\n🏥 System Health Summary:")
                health_data = {}
                for job_type in [CronJobType.SHORTTERM_ANALYSIS, CronJobType.SWING_ANALYSIS, CronJobType.LONGTERM_ANALYSIS, CronJobType.CACHE_CLEANUP]:
                    try:
                        analytics = await self.tracker.get_performance_analytics(job_type=job_type, days=1)
                        success_rate = analytics.get('success_rate_percent', 0)
                        health_data[job_type.value.replace('_analysis', '')] = success_rate
                    except:
                        health_data[job_type.value.replace('_analysis', '')] = 0
                
                for job_name, success_rate in health_data.items():
                    status_icon = "✅" if success_rate >= 90 else "⚠️" if success_rate >= 70 else "❌" if success_rate > 0 else "⚪"
                    print(f"   {status_icon} {job_name:<15}: {success_rate:.1f}% success rate")
                
                print(f"\n⏰ Next refresh in {refresh_seconds} seconds...")
                await asyncio.sleep(refresh_seconds)
                
        except KeyboardInterrupt:
            print("\n\n👋 Monitoring stopped")
    
    async def export_data(self, 
                          format_type: str = "csv",
                          days: int = 30,
                          output_file: Optional[str] = None) -> None:
        """Export execution data to CSV or JSON"""
        
        if not output_file:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_file = f"cron_executions_{timestamp}.{format_type}"
        
        print(f"📤 Exporting execution data to {output_file}")
        
        start_date = datetime.now() - timedelta(days=days)
        
        try:
            executions = await self.tracker.get_job_history(
                limit=10000,  # Large limit to get all data
                start_date=start_date
            )
            
            if not executions:
                print("ℹ️  No execution data found to export")
                return
            
            if format_type.lower() == "csv":
                with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
                    fieldnames = [
                        'execution_id', 'job_id', 'job_name', 'job_type', 'status',
                        'scheduled_time', 'actual_start_time', 'end_time', 'duration_seconds',
                        'success', 'recommendations_count', 'error_message', 'market_condition'
                    ]
                    
                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                    writer.writeheader()
                    
                    for execution in executions:
                        # Flatten and clean data for CSV
                        row = {}
                        for field in fieldnames:
                            value = execution.get(field, '')
                            if field == 'recommendations_count' and not value:
                                value = execution.get('output_summary', {}).get('recommendations_generated', 0)
                            row[field] = value
                        writer.writerow(row)
                        
            elif format_type.lower() == "json":
                with open(output_file, 'w', encoding='utf-8') as jsonfile:
                    json.dump(executions, jsonfile, indent=2, default=str)
            
            else:
                print(f"❌ Unsupported format: {format_type}")
                return
            
            print(f"✅ Successfully exported {len(executions)} execution records to {output_file}")
            
        except Exception as e:
            print(f"❌ Error exporting data: {e}")

async def main():
    """Main CLI interface"""
    
    parser = argparse.ArgumentParser(
        description="View and analyze cron job execution analytics",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python view_cron_analytics.py history --days 7
  python view_cron_analytics.py performance --job-type shortterm --days 30
  python view_cron_analytics.py failures --limit 10
  python view_cron_analytics.py live --refresh 30
  python view_cron_analytics.py export --format csv --days 30
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # History command
    history_parser = subparsers.add_parser('history', help='View execution history')
    history_parser.add_argument('--job-type', choices=['shortterm', 'swing', 'longterm', 'cache'], help='Filter by job type')
    history_parser.add_argument('--days', type=int, default=7, help='Number of days to look back (default: 7)')
    history_parser.add_argument('--limit', type=int, default=50, help='Maximum number of records (default: 50)')
    history_parser.add_argument('--status', choices=['success', 'failed', 'skipped', 'running'], help='Filter by status')
    
    # Performance command
    perf_parser = subparsers.add_parser('performance', help='Show performance analytics')
    perf_parser.add_argument('--job-type', choices=['shortterm', 'swing', 'longterm', 'cache'], help='Filter by job type')
    perf_parser.add_argument('--days', type=int, default=30, help='Number of days to analyze (default: 30)')
    
    # Summary command
    subparsers.add_parser('summary', help='Display job summaries')
    
    # Failures command
    failures_parser = subparsers.add_parser('failures', help='Show failed executions')
    failures_parser.add_argument('--limit', type=int, default=20, help='Maximum number of failures to show (default: 20)')
    failures_parser.add_argument('--days', type=int, default=7, help='Number of days to look back (default: 7)')
    
    # Live monitoring command
    live_parser = subparsers.add_parser('live', help='Live monitoring dashboard')
    live_parser.add_argument('--refresh', type=int, default=30, help='Refresh interval in seconds (default: 30)')
    
    # Export command
    export_parser = subparsers.add_parser('export', help='Export data to CSV/JSON')
    export_parser.add_argument('--format', choices=['csv', 'json'], default='csv', help='Export format (default: csv)')
    export_parser.add_argument('--days', type=int, default=30, help='Number of days to export (default: 30)')
    export_parser.add_argument('--output', help='Output file path (default: auto-generated)')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    viewer = CronAnalyticsViewer()
    
    try:
        await viewer.initialize()
        
        if args.command == 'history':
            await viewer.show_execution_history(
                job_type=args.job_type,
                days=args.days,
                limit=args.limit,
                status_filter=args.status
            )
        
        elif args.command == 'performance':
            await viewer.show_performance_analytics(
                job_type=args.job_type,
                days=args.days
            )
        
        elif args.command == 'summary':
            await viewer.show_job_summaries()
        
        elif args.command == 'failures':
            await viewer.show_failed_executions(
                limit=args.limit,
                days=args.days
            )
        
        elif args.command == 'live':
            await viewer.live_monitoring(refresh_seconds=args.refresh)
        
        elif args.command == 'export':
            await viewer.export_data(
                format_type=args.format,
                days=args.days,
                output_file=args.output
            )
    
    except Exception as e:
        print(f"❌ Error: {e}")
    
    finally:
        await viewer.close()

if __name__ == "__main__":
    asyncio.run(main()) 