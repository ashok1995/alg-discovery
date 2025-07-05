"""
Distributed Cron Job Scheduler
Market-aware scheduling with distributed job management
"""

import asyncio
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Callable, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.jobstores.redis import RedisJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
from common.db import db_manager
from core.database.cache.redis_manager import cache_manager

logger = logging.getLogger(__name__)

class JobStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class JobPriority(Enum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class JobResult:
    job_id: str
    status: JobStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    result: Any = None
    error: Optional[str] = None
    execution_time: Optional[float] = None

@dataclass
class JobDefinition:
    id: str
    name: str
    func: Callable
    trigger_type: str  # 'cron', 'interval', 'date'
    trigger_args: Dict[str, Any]
    priority: JobPriority = JobPriority.NORMAL
    max_instances: int = 1
    market_hours_only: bool = False
    enabled: bool = True
    description: str = ""
    tags: List[str] = field(default_factory=list)

class DistributedJobScheduler:
    """Distributed job scheduler with market intelligence"""
    
    def __init__(self):
        self.market_hours = db_manager.market_hours
        self.cache_manager = cache_manager
        
        # Setup Redis job store
        redis_config = {
            'host': db_manager.config.redis_host,
            'port': db_manager.config.redis_port,
            'db': db_manager.config.redis_db + 1,  # Use different DB for jobs
        }
        
        if db_manager.config.redis_password:
            redis_config['password'] = db_manager.config.redis_password
        
        # Job stores and executors
        jobstores = {
            'default': RedisJobStore(**redis_config)
        }
        
        executors = {
            'default': ThreadPoolExecutor(20),
            'high_priority': ThreadPoolExecutor(10),
        }
        
        job_defaults = {
            'coalesce': False,
            'max_instances': 3,
            'misfire_grace_time': 300  # 5 minutes
        }
        
        # Create schedulers
        self.scheduler = AsyncIOScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults,
            timezone='Asia/Kolkata'
        )
        
        self.background_scheduler = BackgroundScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults,
            timezone='Asia/Kolkata'
        )
        
        self.jobs: Dict[str, JobDefinition] = {}
        self.job_results: Dict[str, JobResult] = {}
        self._running = False
        
    def start(self):
        """Start the job scheduler"""
        if not self._running:
            self.scheduler.start()
            self.background_scheduler.start()
            self._running = True
            logger.info("Distributed job scheduler started")
            
            # Schedule market hours check
            self._schedule_market_hours_check()
    
    def stop(self):
        """Stop the job scheduler"""
        if self._running:
            self.scheduler.shutdown()
            self.background_scheduler.shutdown()
            self._running = False
            logger.info("Distributed job scheduler stopped")
    
    def add_job(self, job_def: JobDefinition) -> bool:
        """Add a job to the scheduler"""
        try:
            # Wrap the function to add market hours check
            wrapped_func = self._wrap_job_function(job_def)
            
            # Determine executor based on priority
            executor = 'high_priority' if job_def.priority in [JobPriority.HIGH, JobPriority.CRITICAL] else 'default'
            
            # Create trigger
            if job_def.trigger_type == 'cron':
                trigger = CronTrigger(**job_def.trigger_args)
            elif job_def.trigger_type == 'interval':
                trigger = IntervalTrigger(**job_def.trigger_args)
            else:
                logger.error(f"Unsupported trigger type: {job_def.trigger_type}")
                return False
            
            # Add to appropriate scheduler
            if asyncio.iscoroutinefunction(job_def.func):
                self.scheduler.add_job(
                    wrapped_func,
                    trigger=trigger,
                    id=job_def.id,
                    name=job_def.name,
                    executor=executor,
                    max_instances=job_def.max_instances,
                    replace_existing=True
                )
            else:
                self.background_scheduler.add_job(
                    wrapped_func,
                    trigger=trigger,
                    id=job_def.id,
                    name=job_def.name,
                    executor=executor,
                    max_instances=job_def.max_instances,
                    replace_existing=True
                )
            
            self.jobs[job_def.id] = job_def
            logger.info(f"Added job: {job_def.name} ({job_def.id})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add job {job_def.id}: {e}")
            return False
    
    def remove_job(self, job_id: str) -> bool:
        """Remove a job from the scheduler"""
        try:
            # Try both schedulers
            try:
                self.scheduler.remove_job(job_id)
            except:
                pass
            
            try:
                self.background_scheduler.remove_job(job_id)
            except:
                pass
            
            if job_id in self.jobs:
                del self.jobs[job_id]
            
            logger.info(f"Removed job: {job_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to remove job {job_id}: {e}")
            return False
    
    def pause_job(self, job_id: str) -> bool:
        """Pause a job"""
        try:
            try:
                self.scheduler.pause_job(job_id)
            except:
                self.background_scheduler.pause_job(job_id)
            
            logger.info(f"Paused job: {job_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to pause job {job_id}: {e}")
            return False
    
    def resume_job(self, job_id: str) -> bool:
        """Resume a job"""
        try:
            try:
                self.scheduler.resume_job(job_id)
            except:
                self.background_scheduler.resume_job(job_id)
            
            logger.info(f"Resumed job: {job_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to resume job {job_id}: {e}")
            return False
    
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status"""
        # Check both schedulers
        job = None
        try:
            job = self.scheduler.get_job(job_id)
        except:
            try:
                job = self.background_scheduler.get_job(job_id)
            except:
                pass
        
        if not job:
            return None
        
        return {
            'id': job.id,
            'name': job.name,
            'next_run_time': job.next_run_time.isoformat() if job.next_run_time else None,
            'func': str(job.func),
            'trigger': str(job.trigger),
            'executor': job.executor,
            'max_instances': job.max_instances,
        }
    
    def list_jobs(self) -> List[Dict[str, Any]]:
        """List all jobs"""
        jobs = []
        
        # Get from both schedulers
        for job in self.scheduler.get_jobs():
            jobs.append(self.get_job_status(job.id))
        
        for job in self.background_scheduler.get_jobs():
            if not any(j['id'] == job.id for j in jobs):  # Avoid duplicates
                jobs.append(self.get_job_status(job.id))
        
        return jobs
    
    def _wrap_job_function(self, job_def: JobDefinition) -> Callable:
        """Wrap job function with market hours check and logging"""
        
        def wrapper(*args, **kwargs):
            job_id = job_def.id
            start_time = datetime.utcnow()
            
            # Create job result
            result = JobResult(
                job_id=job_id,
                status=JobStatus.RUNNING,
                start_time=start_time
            )
            
            try:
                # Market hours check
                if job_def.market_hours_only and not self.market_hours.is_market_open():
                    logger.info(f"Skipping job {job_id} - market is closed")
                    result.status = JobStatus.CANCELLED
                    result.end_time = datetime.utcnow()
                    self._store_job_result(result)
                    return None
                
                logger.info(f"Starting job: {job_def.name} ({job_id})")
                
                # Execute the actual function
                if asyncio.iscoroutinefunction(job_def.func):
                    # For async functions, we need to handle them differently
                    loop = asyncio.get_event_loop()
                    job_result = loop.run_until_complete(job_def.func(*args, **kwargs))
                else:
                    job_result = job_def.func(*args, **kwargs)
                
                result.result = job_result
                result.status = JobStatus.COMPLETED
                result.end_time = datetime.utcnow()
                result.execution_time = (result.end_time - result.start_time).total_seconds()
                
                logger.info(f"Completed job: {job_def.name} ({job_id}) in {result.execution_time:.2f}s")
                
            except Exception as e:
                result.status = JobStatus.FAILED
                result.error = str(e)
                result.end_time = datetime.utcnow()
                result.execution_time = (result.end_time - result.start_time).total_seconds()
                
                logger.error(f"Job failed: {job_def.name} ({job_id}) - {e}")
            
            finally:
                self._store_job_result(result)
            
            return result.result
        
        return wrapper
    
    def _store_job_result(self, result: JobResult):
        """Store job result in cache"""
        try:
            self.job_results[result.job_id] = result
            
            # Also store in Redis for distributed access
            cache_key = f"job_result:{result.job_id}:{result.start_time.isoformat()}"
            self.cache_manager.set(
                cache_key, 
                {
                    'job_id': result.job_id,
                    'status': result.status.value,
                    'start_time': result.start_time.isoformat(),
                    'end_time': result.end_time.isoformat() if result.end_time else None,
                    'execution_time': result.execution_time,
                    'error': result.error,
                    'result': str(result.result) if result.result else None
                },
                ttl=86400,  # Keep for 24 hours
                prefix="job_results"
            )
            
        except Exception as e:
            logger.error(f"Failed to store job result: {e}")
    
    def _schedule_market_hours_check(self):
        """Schedule periodic market hours checks"""
        
        def check_market_hours():
            is_open = self.market_hours.is_market_open()
            logger.debug(f"Market hours check: {'OPEN' if is_open else 'CLOSED'}")
            
            # Store market status in cache
            self.cache_manager.set(
                "market_status",
                {
                    'is_open': is_open,
                    'timestamp': datetime.utcnow().isoformat(),
                    'next_open': self.market_hours.time_until_market_open() if not is_open else 0
                },
                ttl=60,  # 1 minute TTL
                prefix="market"
            )
        
        # Check every minute
        market_check_job = JobDefinition(
            id="market_hours_check",
            name="Market Hours Check",
            func=check_market_hours,
            trigger_type="interval",
            trigger_args={"minutes": 1},
            priority=JobPriority.HIGH,
            description="Periodic check of market hours status"
        )
        
        self.add_job(market_check_job)


# Global scheduler instance
job_scheduler = DistributedJobScheduler()

# Convenience functions
def add_cron_job(job_id: str, 
                 name: str, 
                 func: Callable,
                 cron_expression: str = None,
                 **cron_kwargs) -> bool:
    """Add a cron job"""
    
    # Parse cron expression if provided
    if cron_expression:
        # Basic cron expression parsing (minute hour day month day_of_week)
        parts = cron_expression.split()
        if len(parts) == 5:
            cron_kwargs = {
                'minute': parts[0],
                'hour': parts[1],
                'day': parts[2],
                'month': parts[3],
                'day_of_week': parts[4]
            }
    
    job_def = JobDefinition(
        id=job_id,
        name=name,
        func=func,
        trigger_type="cron",
        trigger_args=cron_kwargs
    )
    
    return job_scheduler.add_job(job_def)

def add_interval_job(job_id: str,
                    name: str,
                    func: Callable,
                    **interval_kwargs) -> bool:
    """Add an interval job"""
    
    job_def = JobDefinition(
        id=job_id,
        name=name,
        func=func,
        trigger_type="interval",
        trigger_args=interval_kwargs
    )
    
    return job_scheduler.add_job(job_def) 