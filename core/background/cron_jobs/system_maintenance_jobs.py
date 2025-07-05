"""
System Maintenance Cron Jobs
Automated system health monitoring, log rotation, and performance optimization
"""

import os
import asyncio
import shutil
import psutil
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
from pathlib import Path
import gzip
import json

from core.background.cron_jobs.job_scheduler import (
    JobDefinition, JobPriority, add_cron_job, add_interval_job
)
from common.db import db_manager
from core.database.cache.redis_manager import cache_manager

logger = logging.getLogger(__name__)

class SystemMaintenanceManager:
    """System maintenance with automated health monitoring"""
    
    def __init__(self):
        self.cache_manager = cache_manager
        self.log_directory = Path("logs")
        self.archive_directory = Path("logs/archive")
        self.max_log_age_days = 30
        self.max_archive_age_days = 90
        
        # Ensure directories exist
        self.log_directory.mkdir(exist_ok=True)
        self.archive_directory.mkdir(exist_ok=True)
    
    def rotate_logs(self) -> Dict[str, Any]:
        """Rotate and compress old log files"""
        try:
            logger.info("Starting log rotation")
            
            results = {
                'rotated_files': [],
                'compressed_files': [],
                'archived_files': [],
                'deleted_files': [],
                'errors': [],
                'total_space_saved': 0
            }
            
            current_date = datetime.now()
            
            # Find log files to rotate (older than 1 day)
            for log_file in self.log_directory.rglob("*.log"):
                try:
                    # Skip if file is in archive directory
                    if self.archive_directory in log_file.parents:
                        continue
                    
                    file_stat = log_file.stat()
                    file_date = datetime.fromtimestamp(file_stat.st_mtime)
                    age_days = (current_date - file_date).days
                    
                    if age_days >= 1:
                        # Create dated archive name
                        archive_name = f"{log_file.stem}_{file_date.strftime('%Y%m%d')}.log"
                        archive_path = self.archive_directory / archive_name
                        
                        # Move to archive
                        shutil.move(str(log_file), str(archive_path))
                        results['rotated_files'].append(str(log_file))
                        
                        # Compress the archived file
                        compressed_path = archive_path.with_suffix('.log.gz')
                        with open(archive_path, 'rb') as f_in:
                            with gzip.open(compressed_path, 'wb') as f_out:
                                shutil.copyfileobj(f_in, f_out)
                        
                        # Calculate space saved
                        original_size = archive_path.stat().st_size
                        compressed_size = compressed_path.stat().st_size
                        space_saved = original_size - compressed_size
                        results['total_space_saved'] += space_saved
                        
                        # Remove uncompressed file
                        archive_path.unlink()
                        
                        results['compressed_files'].append(str(compressed_path))
                        
                except Exception as e:
                    error_msg = f"Failed to rotate {log_file}: {e}"
                    logger.error(error_msg)
                    results['errors'].append(error_msg)
            
            # Clean up very old compressed files
            for compressed_file in self.archive_directory.glob("*.gz"):
                try:
                    file_stat = compressed_file.stat()
                    file_date = datetime.fromtimestamp(file_stat.st_mtime)
                    age_days = (current_date - file_date).days
                    
                    if age_days > self.max_archive_age_days:
                        file_size = compressed_file.stat().st_size
                        compressed_file.unlink()
                        results['deleted_files'].append(str(compressed_file))
                        results['total_space_saved'] += file_size
                        
                except Exception as e:
                    error_msg = f"Failed to delete old archive {compressed_file}: {e}"
                    logger.error(error_msg)
                    results['errors'].append(error_msg)
            
            # Store rotation results in cache
            self.cache_manager.set(
                "last_log_rotation",
                {
                    'timestamp': datetime.utcnow().isoformat(),
                    'results': results
                },
                ttl=86400,  # 24 hours
                prefix="system_maintenance"
            )
            
            logger.info(f"Log rotation completed: {len(results['rotated_files'])} rotated, "
                       f"{len(results['compressed_files'])} compressed, "
                       f"{len(results['deleted_files'])} deleted, "
                       f"{results['total_space_saved']/1024/1024:.2f} MB saved")
            
            return results
            
        except Exception as e:
            logger.error(f"Log rotation failed: {e}")
            return {'error': str(e)}
    
    def health_check(self) -> Dict[str, Any]:
        """Comprehensive system health check"""
        try:
            logger.info("Starting system health check")
            
            results = {
                'timestamp': datetime.utcnow().isoformat(),
                'overall_status': 'healthy',
                'cpu': {},
                'memory': {},
                'disk': {},
                'database': {},
                'cache': {},
                'processes': {},
                'alerts': []
            }
            
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            load_avg = os.getloadavg() if hasattr(os, 'getloadavg') else [0, 0, 0]
            
            results['cpu'] = {
                'usage_percent': cpu_percent,
                'count': cpu_count,
                'load_average': {
                    '1min': load_avg[0],
                    '5min': load_avg[1],
                    '15min': load_avg[2]
                }
            }
            
            # Add CPU alerts
            if cpu_percent > 80:
                results['alerts'].append(f"High CPU usage: {cpu_percent}%")
                results['overall_status'] = 'warning'
            
            if cpu_percent > 95:
                results['overall_status'] = 'critical'
            
            # Memory metrics
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            results['memory'] = {
                'total_gb': round(memory.total / (1024**3), 2),
                'available_gb': round(memory.available / (1024**3), 2),
                'used_percent': memory.percent,
                'swap_used_percent': swap.percent
            }
            
            # Add memory alerts
            if memory.percent > 85:
                results['alerts'].append(f"High memory usage: {memory.percent}%")
                results['overall_status'] = 'warning'
            
            if memory.percent > 95:
                results['overall_status'] = 'critical'
            
            # Disk metrics
            disk_usage = psutil.disk_usage('/')
            results['disk'] = {
                'total_gb': round(disk_usage.total / (1024**3), 2),
                'used_gb': round(disk_usage.used / (1024**3), 2),
                'free_gb': round(disk_usage.free / (1024**3), 2),
                'used_percent': round((disk_usage.used / disk_usage.total) * 100, 2)
            }
            
            # Add disk alerts
            if results['disk']['used_percent'] > 85:
                results['alerts'].append(f"High disk usage: {results['disk']['used_percent']}%")
                results['overall_status'] = 'warning'
            
            if results['disk']['used_percent'] > 95:
                results['overall_status'] = 'critical'
            
            # Database health check
            try:
                db_health = db_manager.health_check()
                results['database'] = {
                    'postgres_status': db_health.get('postgres', 'unknown'),
                    'redis_status': db_health.get('redis', 'unknown'),
                    'mongo_status': db_health.get('mongo', 'unknown')
                }
                
                # Check for database issues
                for db_name, status in results['database'].items():
                    if status != 'healthy':
                        results['alerts'].append(f"Database issue: {db_name} is {status}")
                        if results['overall_status'] == 'healthy':
                            results['overall_status'] = 'warning'
                        
            except Exception as e:
                results['database']['error'] = str(e)
                results['alerts'].append(f"Database health check failed: {e}")
                results['overall_status'] = 'warning'
            
            # Cache health check
            try:
                cache_stats = self.cache_manager.get_cache_stats()
                results['cache'] = cache_stats
                
                # Check cache hit rate
                if cache_stats.get('hit_rate', 0) < 0.5:  # Less than 50% hit rate
                    results['alerts'].append(f"Low cache hit rate: {cache_stats.get('hit_rate', 0)*100:.1f}%")
                    
            except Exception as e:
                results['cache']['error'] = str(e)
                results['alerts'].append(f"Cache health check failed: {e}")
            
            # Process monitoring
            try:
                processes = []
                for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                    try:
                        proc_info = proc.info
                        # Focus on Python processes (likely our services)
                        if 'python' in proc_info['name'].lower():
                            processes.append({
                                'pid': proc_info['pid'],
                                'name': proc_info['name'],
                                'cpu_percent': proc_info['cpu_percent'],
                                'memory_percent': proc_info['memory_percent']
                            })
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
                
                results['processes'] = {
                    'python_processes': processes,
                    'total_processes': len(list(psutil.process_iter()))
                }
                
            except Exception as e:
                results['processes']['error'] = str(e)
            
            # Store health check results
            self.cache_manager.set(
                "system_health",
                results,
                ttl=300,  # 5 minutes
                prefix="system_monitoring"
            )
            
            # Store in time series for historical tracking
            health_history_key = f"health_history_{datetime.utcnow().strftime('%Y%m%d_%H%M')}"
            self.cache_manager.set(
                health_history_key,
                {
                    'timestamp': results['timestamp'],
                    'cpu_usage': results['cpu']['usage_percent'],
                    'memory_usage': results['memory']['used_percent'],
                    'disk_usage': results['disk']['used_percent'],
                    'alert_count': len(results['alerts']),
                    'overall_status': results['overall_status']
                },
                ttl=86400,  # 24 hours
                prefix="health_history"
            )
            
            logger.info(f"Health check completed: {results['overall_status']} - {len(results['alerts'])} alerts")
            return results
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat(),
                'overall_status': 'error'
            }
    
    def cleanup_system_resources(self) -> Dict[str, Any]:
        """Clean up system resources and temporary files"""
        try:
            logger.info("Starting system resource cleanup")
            
            results = {
                'temp_files_cleaned': 0,
                'cache_entries_cleaned': 0,
                'memory_freed_mb': 0,
                'errors': []
            }
            
            # Clean up temporary files
            temp_dirs = ['/tmp', '/var/tmp'] if os.name == 'posix' else ['C:\\temp', 'C:\\tmp']
            
            for temp_dir in temp_dirs:
                if os.path.exists(temp_dir):
                    try:
                        for file_path in Path(temp_dir).glob('*'):
                            try:
                                if file_path.is_file():
                                    # Only remove files older than 1 day
                                    file_age = datetime.now() - datetime.fromtimestamp(file_path.stat().st_mtime)
                                    if file_age.days >= 1:
                                        file_size = file_path.stat().st_size
                                        file_path.unlink()
                                        results['temp_files_cleaned'] += 1
                                        results['memory_freed_mb'] += file_size / (1024 * 1024)
                            except Exception as e:
                                # Skip files that can't be removed (permission issues, etc.)
                                continue
                    except Exception as e:
                        error_msg = f"Failed to clean temp directory {temp_dir}: {e}"
                        logger.warning(error_msg)
                        results['errors'].append(error_msg)
            
            # Clean up old cache entries
            try:
                cleaned_cache = self.cache_manager.cleanup_expired()
                results['cache_entries_cleaned'] = cleaned_cache
            except Exception as e:
                error_msg = f"Cache cleanup failed: {e}"
                logger.error(error_msg)
                results['errors'].append(error_msg)
            
            # Force garbage collection (Python specific)
            import gc
            collected = gc.collect()
            logger.debug(f"Garbage collection freed {collected} objects")
            
            logger.info(f"System cleanup completed: {results['temp_files_cleaned']} temp files, "
                       f"{results['cache_entries_cleaned']} cache entries, "
                       f"{results['memory_freed_mb']:.2f} MB freed")
            
            return results
            
        except Exception as e:
            logger.error(f"System cleanup failed: {e}")
            return {'error': str(e)}
    
    def generate_daily_report(self) -> Dict[str, Any]:
        """Generate daily system performance report"""
        try:
            logger.info("Generating daily system report")
            
            report_date = datetime.utcnow().date()
            
            # Get health check history for the last 24 hours
            health_history = []
            for hour in range(24):
                timestamp = datetime.combine(report_date, datetime.min.time()) + timedelta(hours=hour)
                for minute in range(0, 60, 5):  # Every 5 minutes
                    check_time = timestamp + timedelta(minutes=minute)
                    key = f"health_history_{check_time.strftime('%Y%m%d_%H%M')}"
                    
                    health_data = self.cache_manager.get(key, prefix="health_history")
                    if health_data:
                        health_history.append(health_data)
            
            if not health_history:
                logger.warning("No health history found for daily report")
                return {'error': 'No health data available'}
            
            # Calculate statistics
            cpu_values = [h['cpu_usage'] for h in health_history if 'cpu_usage' in h]
            memory_values = [h['memory_usage'] for h in health_history if 'memory_usage' in h]
            disk_values = [h['disk_usage'] for h in health_history if 'disk_usage' in h]
            
            report = {
                'date': report_date.isoformat(),
                'data_points': len(health_history),
                'uptime_percent': len([h for h in health_history if h.get('overall_status') in ['healthy', 'warning']]) / len(health_history) * 100,
                'cpu_stats': {
                    'average': sum(cpu_values) / len(cpu_values) if cpu_values else 0,
                    'max': max(cpu_values) if cpu_values else 0,
                    'min': min(cpu_values) if cpu_values else 0
                },
                'memory_stats': {
                    'average': sum(memory_values) / len(memory_values) if memory_values else 0,
                    'max': max(memory_values) if memory_values else 0,
                    'min': min(memory_values) if memory_values else 0
                },
                'disk_stats': {
                    'average': sum(disk_values) / len(disk_values) if disk_values else 0,
                    'max': max(disk_values) if disk_values else 0,
                    'min': min(disk_values) if disk_values else 0
                },
                'alert_summary': {
                    'total_alerts': sum(h.get('alert_count', 0) for h in health_history),
                    'critical_periods': len([h for h in health_history if h.get('overall_status') == 'critical']),
                    'warning_periods': len([h for h in health_history if h.get('overall_status') == 'warning'])
                }
            }
            
            # Store the daily report
            report_key = f"daily_report_{report_date.strftime('%Y%m%d')}"
            self.cache_manager.set(
                report_key,
                report,
                ttl=86400 * 7,  # Keep for 1 week
                prefix="system_reports"
            )
            
            logger.info(f"Daily report generated: {report['uptime_percent']:.1f}% uptime, "
                       f"{report['alert_summary']['total_alerts']} total alerts")
            
            return report
            
        except Exception as e:
            logger.error(f"Daily report generation failed: {e}")
            return {'error': str(e)}


# Initialize maintenance manager
maintenance_manager = SystemMaintenanceManager()

# Job functions
def rotate_logs():
    """Job function for log rotation"""
    return maintenance_manager.rotate_logs()

def health_check():
    """Job function for health monitoring"""
    return maintenance_manager.health_check()

def cleanup_system():
    """Job function for system cleanup"""
    return maintenance_manager.cleanup_system_resources()

def generate_report():
    """Job function for daily reporting"""
    return maintenance_manager.generate_daily_report()

def setup_system_maintenance_jobs():
    """Setup all system maintenance cron jobs"""
    
    logger.info("Setting up system maintenance cron jobs")
    
    # Health monitoring - every 5 minutes
    add_interval_job(
        job_id="system_health_check",
        name="System Health Monitoring",
        func=health_check,
        minutes=5
    )
    
    # Log rotation - daily at 1 AM
    add_cron_job(
        job_id="log_rotation",
        name="Daily Log Rotation",
        func=rotate_logs,
        hour=1,
        minute=0
    )
    
    # System cleanup - daily at 3 AM
    add_cron_job(
        job_id="system_cleanup",
        name="System Resource Cleanup",
        func=cleanup_system,
        hour=3,
        minute=0
    )
    
    # Daily report generation - daily at 11:59 PM
    add_cron_job(
        job_id="daily_report",
        name="Daily System Report",
        func=generate_report,
        hour=23,
        minute=59
    )
    
    # Emergency health check - every hour during market hours
    add_interval_job(
        job_id="emergency_health_check",
        name="Emergency Health Check",
        func=health_check,
        hours=1
    )
    
    logger.info("System maintenance cron jobs setup completed") 