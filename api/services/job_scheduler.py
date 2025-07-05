"""
Background Job Scheduler
========================

Manages background jobs for automated trading operations including:
- Real-time data fetching
- Signal generation
- Portfolio monitoring
- Market status updates
"""

import asyncio
import logging
from datetime import datetime, timedelta, time as dt_time
from typing import Dict, List, Any, Optional, Callable, Set
from concurrent.futures import ThreadPoolExecutor
import threading
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
import json
from pathlib import Path
import traceback
import weakref
import os

from api.services.data_service import RealTimeDataService
from api.services.analysis_engine import AnalysisEngine
from api.services.websocket_manager import WebSocketManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class JobResult:
    """Result of a background job execution."""
    job_id: str
    status: JobStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    result: Optional[Any] = None
    error: Optional[str] = None
    duration_seconds: Optional[float] = None

class BackgroundJob:
    """Represents a background job."""
    
    def __init__(self, job_id: str, name: str, func: Callable, interval: Optional[float] = None, 
                 run_once: bool = False, enabled: bool = True):
        self.job_id = job_id
        self.name = name
        self.func = func
        self.interval = interval  # seconds between runs (None for one-time jobs)
        self.run_once = run_once
        self.enabled = enabled
        self.last_run: Optional[datetime] = None
        self.next_run: Optional[datetime] = None
        self.is_running = False
        self.run_count = 0
        self.error_count = 0
        self.last_error: Optional[str] = None
        
        # Calculate next run time
        if interval and not run_once:
            self.next_run = datetime.now() + timedelta(seconds=interval)

class JobScheduler:
    """Manages and executes background jobs."""
    
    def __init__(self, data_service: RealTimeDataService, analysis_engine: AnalysisEngine, 
                 websocket_manager: WebSocketManager):
        self.data_service = data_service
        self.analysis_engine = analysis_engine
        self.websocket_manager = websocket_manager
        
        self.jobs: Dict[str, BackgroundJob] = {}
        self.job_results: Dict[str, JobResult] = {}
        self.is_running = False
        self.scheduler_task: Optional[asyncio.Task] = None
        
        # Lock for thread safety (must be initialized before calling _initialize_default_jobs)
        self._lock = threading.Lock()
        
        # Job execution statistics
        self.stats = {
            "total_jobs": 0,
            "active_jobs": 0,
            "completed_jobs": 0,
            "failed_jobs": 0,
            "scheduler_uptime": None
        }
        
        # Initialize default jobs
        self._initialize_default_jobs()
    
    def _initialize_default_jobs(self):
        """Initialize default background jobs."""
        
        # Market data update job
        self.add_job(
            job_id="market_data_update",
            name="Market Data Update",
            func=self._update_market_data,
            interval=30,  # 30 seconds
            enabled=True
        )
        
        # Signal generation job
        self.add_job(
            job_id="signal_generation",
            name="Trading Signal Generation",
            func=self._generate_trading_signals,
            interval=60,  # 1 minute
            enabled=True
        )
        
        # Market status update job
        self.add_job(
            job_id="market_status_update",
            name="Market Status Update",
            func=self._update_market_status,
            interval=300,  # 5 minutes
            enabled=True
        )
        
        # Cache cleanup job
        self.add_job(
            job_id="cache_cleanup",
            name="Cache Cleanup",
            func=self._cleanup_caches,
            interval=1800,  # 30 minutes
            enabled=True
        )
        
        # System health check job
        self.add_job(
            job_id="health_check",
            name="System Health Check",
            func=self._system_health_check,
            interval=600,  # 10 minutes
            enabled=True
        )
    
    def add_job(self, job_id: str, name: str, func: Callable, interval: Optional[float] = None,
                run_once: bool = False, enabled: bool = True) -> bool:
        """Add a new background job."""
        try:
            with self._lock:
                if job_id in self.jobs:
                    logger.warning(f"Job {job_id} already exists, updating...")
                
                job = BackgroundJob(job_id, name, func, interval, run_once, enabled)
                self.jobs[job_id] = job
                self.stats["total_jobs"] = len(self.jobs)
                
                logger.info(f"Added job: {name} ({job_id})")
                return True
                
        except Exception as e:
            logger.error(f"Error adding job {job_id}: {str(e)}")
            return False
    
    def remove_job(self, job_id: str) -> bool:
        """Remove a background job."""
        try:
            with self._lock:
                if job_id in self.jobs:
                    del self.jobs[job_id]
                    self.stats["total_jobs"] = len(self.jobs)
                    logger.info(f"Removed job: {job_id}")
                    return True
                else:
                    logger.warning(f"Job {job_id} not found")
                    return False
                    
        except Exception as e:
            logger.error(f"Error removing job {job_id}: {str(e)}")
            return False
    
    def enable_job(self, job_id: str) -> bool:
        """Enable a job."""
        with self._lock:
            if job_id in self.jobs:
                self.jobs[job_id].enabled = True
                logger.info(f"Enabled job: {job_id}")
                return True
            return False
    
    def disable_job(self, job_id: str) -> bool:
        """Disable a job."""
        with self._lock:
            if job_id in self.jobs:
                self.jobs[job_id].enabled = False
                logger.info(f"Disabled job: {job_id}")
                return True
            return False
    
    async def start(self):
        """Start the job scheduler."""
        if self.is_running:
            logger.warning("Job scheduler is already running")
            return
        
        self.is_running = True
        self.stats["scheduler_uptime"] = datetime.now()
        
        # Start the main scheduler loop
        self.scheduler_task = asyncio.create_task(self._scheduler_loop())
        
        logger.info("Job scheduler started")
    
    async def stop(self):
        """Stop the job scheduler."""
        if not self.is_running:
            return
        
        self.is_running = False
        
        if self.scheduler_task:
            self.scheduler_task.cancel()
            try:
                await self.scheduler_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Job scheduler stopped")
    
    async def _scheduler_loop(self):
        """Main scheduler loop."""
        logger.info("Scheduler loop started")
        
        while self.is_running:
            try:
                current_time = datetime.now()
                
                # Find jobs that need to run
                jobs_to_run = []
                with self._lock:
                    for job in self.jobs.values():
                        if (job.enabled and not job.is_running and 
                            (job.next_run is None or job.next_run <= current_time)):
                            jobs_to_run.append(job)
                
                # Execute jobs
                for job in jobs_to_run:
                    if self.is_running:  # Check if still running
                        asyncio.create_task(self._execute_job(job))
                
                # Sleep for a short interval
                await asyncio.sleep(5)  # Check every 5 seconds
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in scheduler loop: {str(e)}")
                await asyncio.sleep(10)  # Wait longer on error
        
        logger.info("Scheduler loop stopped")
    
    async def _execute_job(self, job: BackgroundJob):
        """Execute a single job."""
        job_result = JobResult(
            job_id=job.job_id,
            status=JobStatus.RUNNING,
            started_at=datetime.now()
        )
        
        try:
            with self._lock:
                job.is_running = True
                job.last_run = datetime.now()
                self.stats["active_jobs"] = sum(1 for j in self.jobs.values() if j.is_running)
            
            logger.debug(f"Executing job: {job.name}")
            
            # Execute the job function
            if asyncio.iscoroutinefunction(job.func):
                result = await job.func()
            else:
                result = job.func()
            
            # Job completed successfully
            job_result.status = JobStatus.COMPLETED
            job_result.result = result
            job_result.completed_at = datetime.now()
            job_result.duration_seconds = (job_result.completed_at - job_result.started_at).total_seconds()
            
            with self._lock:
                job.run_count += 1
                self.stats["completed_jobs"] += 1
            
            logger.debug(f"Job completed: {job.name} in {job_result.duration_seconds:.2f}s")
            
        except Exception as e:
            # Job failed
            error_msg = str(e)
            job_result.status = JobStatus.FAILED
            job_result.error = error_msg
            job_result.completed_at = datetime.now()
            job_result.duration_seconds = (job_result.completed_at - job_result.started_at).total_seconds()
            
            with self._lock:
                job.error_count += 1
                job.last_error = error_msg
                self.stats["failed_jobs"] += 1
            
            logger.error(f"Job failed: {job.name} - {error_msg}")
        
        finally:
            with self._lock:
                job.is_running = False
                self.stats["active_jobs"] = sum(1 for j in self.jobs.values() if j.is_running)
                
                # Schedule next run for repeating jobs
                if job.interval and not job.run_once and job.enabled:
                    job.next_run = datetime.now() + timedelta(seconds=job.interval)
                elif job.run_once:
                    job.enabled = False  # Disable one-time jobs after execution
            
            # Store job result
            self.job_results[job.job_id] = job_result
    
    # Default job implementations
    async def _update_market_data(self):
        """Update market data for active symbols."""
        try:
            # Get active symbols from WebSocket subscriptions
            active_symbols = self.websocket_manager.get_active_symbols()
            
            if not active_symbols:
                # Use default watchlist if no active subscriptions
                active_symbols = ["TCS.NS", "INFY.NS", "RELIANCE.NS", "HDFCBANK.NS", "ICICIBANK.NS"]
            
            # Limit to prevent overload
            active_symbols = active_symbols[:50]
            
            # Fetch updated data
            updated_count = 0
            for symbol in active_symbols:
                live_update = await self.data_service.get_live_price(symbol)
                if live_update:
                    # Send update via WebSocket
                    await self.websocket_manager.send_price_update(live_update)
                    updated_count += 1
            
            return {"updated_symbols": updated_count, "total_symbols": len(active_symbols)}
            
        except Exception as e:
            logger.error(f"Error in market data update: {str(e)}")
            raise
    
    async def _generate_trading_signals(self):
        """Generate trading signals for active symbols."""
        try:
            # Get symbols to analyze
            symbols_to_analyze = ["TCS.NS", "INFY.NS", "RELIANCE.NS", "HDFCBANK.NS", "ICICIBANK.NS"]
            
            signals_generated = 0
            for symbol in symbols_to_analyze:
                analysis = await self.analysis_engine.analyze_stock(symbol)
                if analysis and analysis.recommendation in ["BUY", "SELL"]:
                    # Get signals for this symbol
                    signals = self.analysis_engine.get_cached_signals(symbol)
                    
                    # Send new signals via WebSocket
                    for signal in signals:
                        await self.websocket_manager.send_trading_signal(signal)
                        signals_generated += 1
            
            # Clean up expired signals
            self.analysis_engine.clear_expired_signals()
            
            return {"signals_generated": signals_generated, "symbols_analyzed": len(symbols_to_analyze)}
            
        except Exception as e:
            logger.error(f"Error in signal generation: {str(e)}")
            raise
    
    async def _update_market_status(self):
        """Update market status and broadcast to clients."""
        try:
            market_status = await self.data_service.get_market_status()
            await self.websocket_manager.send_market_status(market_status)
            
            return market_status
            
        except Exception as e:
            logger.error(f"Error in market status update: {str(e)}")
            raise
    
    async def _cleanup_caches(self):
        """Clean up expired cache entries."""
        try:
            # Clean up analysis engine caches
            self.analysis_engine.clear_expired_signals()
            
            # Get cache stats
            cache_stats = self.data_service.get_cache_stats()
            
            return {"cache_cleanup": "completed", "cache_stats": cache_stats}
            
        except Exception as e:
            logger.error(f"Error in cache cleanup: {str(e)}")
            raise
    
    async def _system_health_check(self):
        """Perform system health check."""
        try:
            # Check all services
            data_health = await self.data_service.health_check()
            analysis_health = await self.analysis_engine.health_check()
            websocket_health = await self.websocket_manager.health_check()
            
            overall_status = "healthy"
            if (data_health.get("status") != "healthy" or 
                analysis_health.get("status") != "healthy" or 
                websocket_health.get("status") != "healthy"):
                overall_status = "degraded"
            
            health_report = {
                "overall_status": overall_status,
                "data_service": data_health,
                "analysis_engine": analysis_health,
                "websocket_manager": websocket_health,
                "scheduler": self.get_scheduler_stats()
            }
            
            # Send health report via WebSocket if there are issues
            if overall_status != "healthy":
                await self.websocket_manager.send_system_notification({
                    "type": "health_alert",
                    "status": overall_status,
                    "timestamp": datetime.now().isoformat(),
                    "details": health_report
                })
            
            return health_report
            
        except Exception as e:
            logger.error(f"Error in health check: {str(e)}")
            raise
    
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a specific job."""
        with self._lock:
            if job_id in self.jobs:
                job = self.jobs[job_id]
                result = self.job_results.get(job_id)
                
                return {
                    "job_id": job_id,
                    "name": job.name,
                    "enabled": job.enabled,
                    "is_running": job.is_running,
                    "interval": job.interval,
                    "run_once": job.run_once,
                    "last_run": job.last_run.isoformat() if job.last_run else None,
                    "next_run": job.next_run.isoformat() if job.next_run else None,
                    "run_count": job.run_count,
                    "error_count": job.error_count,
                    "last_error": job.last_error,
                    "last_result": result.dict() if result else None
                }
            return None
    
    def get_all_jobs_status(self) -> List[Dict[str, Any]]:
        """Get status of all jobs."""
        with self._lock:
            return [self.get_job_status(job_id) for job_id in self.jobs.keys()]
    
    def get_scheduler_stats(self) -> Dict[str, Any]:
        """Get scheduler statistics."""
        with self._lock:
            uptime_seconds = 0
            if self.stats["scheduler_uptime"]:
                uptime_seconds = (datetime.now() - self.stats["scheduler_uptime"]).total_seconds()
            
            return {
                **self.stats,
                "is_running": self.is_running,
                "uptime_seconds": uptime_seconds,
                "enabled_jobs": sum(1 for job in self.jobs.values() if job.enabled),
                "disabled_jobs": sum(1 for job in self.jobs.values() if not job.enabled)
            }
    
    async def run_job_now(self, job_id: str) -> bool:
        """Manually trigger a job to run now."""
        with self._lock:
            if job_id in self.jobs:
                job = self.jobs[job_id]
                if not job.is_running:
                    # Schedule immediate execution
                    job.next_run = datetime.now()
                    logger.info(f"Manually triggered job: {job_id}")
                    return True
                else:
                    logger.warning(f"Job {job_id} is already running")
                    return False
            else:
                logger.error(f"Job {job_id} not found")
                return False

    async def stop_all_jobs(self):
        """Stop all background jobs."""
        await self.stop()

    async def start_market_data_job(self):
        """Start the market data update job."""
        if "market_data_update" in self.jobs:
            self.enable_job("market_data_update")
            await self.run_job_now("market_data_update")
            logger.info("Market data job started")
        else:
            logger.warning("Market data job not found")

    async def start_signal_generation_job(self):
        """Start the signal generation job."""
        if "signal_generation" in self.jobs:
            self.enable_job("signal_generation")
            await self.run_job_now("signal_generation")
            logger.info("Signal generation job started")
        else:
            logger.warning("Signal generation job not found")

# Global job scheduler instance (will be initialized with services)
job_scheduler: Optional[JobScheduler] = None 

def create_job_scheduler(data_service: RealTimeDataService, analysis_engine: AnalysisEngine, 
                        websocket_manager: WebSocketManager) -> JobScheduler:
    """
    Create and configure a job scheduler instance.
    
    Args:
        data_service: Real-time data service
        analysis_engine: Analysis engine for signal generation
        websocket_manager: WebSocket manager for live updates
        
    Returns:
        Configured JobScheduler instance
    """
    global job_scheduler
    
    if job_scheduler is None:
        job_scheduler = JobScheduler(data_service, analysis_engine, websocket_manager)
        logger.info("Created new job scheduler instance")
    else:
        logger.info("Reusing existing job scheduler instance")
    
    return job_scheduler

async def start_background_jobs():
    """Start all background jobs."""
    global job_scheduler
    if job_scheduler:
        await job_scheduler.start()
        logger.info("Background jobs started")
    else:
        logger.warning("Job scheduler not initialized")

async def stop_background_jobs():
    """Stop all background jobs."""
    global job_scheduler
    if job_scheduler:
        await job_scheduler.stop()
        logger.info("Background jobs stopped")
    else:
        logger.warning("Job scheduler not initialized") 