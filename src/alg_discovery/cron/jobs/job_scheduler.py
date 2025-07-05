"""Background Job Scheduler
========================

Moved from ``alg_discovery.services.job_scheduler`` so that all cron/job logic
now resides under the ``alg_discovery.cron.jobs`` namespace.
"""

# --- copied from alg_discovery.services.job_scheduler (no modifications) ---

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, time as dt_time
from typing import Dict, List, Any, Optional, Callable
import threading
from enum import Enum
from dataclasses import dataclass
import contextlib

from api.services.data_service import RealTimeDataService
from api.services.analysis_engine import AnalysisEngine
from api.services.websocket_manager import WebSocketManager

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class JobResult:
    job_id: str
    status: JobStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    result: Optional[Any] = None
    error: Optional[str] = None
    duration_seconds: Optional[float] = None


class BackgroundJob:
    def __init__(self, job_id: str, name: str, func: Callable, interval: Optional[float] = None,
                 run_once: bool = False, enabled: bool = True):
        self.job_id = job_id
        self.name = name
        self.func = func
        self.interval = interval
        self.run_once = run_once
        self.enabled = enabled
        self.last_run: Optional[datetime] = None
        self.next_run: Optional[datetime] = None
        self.is_running: bool = False
        self.run_count = 0
        self.error_count = 0
        self.last_error: Optional[str] = None

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
        self.is_running: bool = False
        self.scheduler_task: Optional[asyncio.Task] = None
        self._lock = threading.Lock()
        self.stats = {
            "total_jobs": 0,
            "active_jobs": 0,
            "completed_jobs": 0,
            "failed_jobs": 0,
            "scheduler_uptime": None,
        }
        self._initialize_default_jobs()

    # ------------------------------------------------------------------
    # Job CRUD helpers
    # ------------------------------------------------------------------

    def _initialize_default_jobs(self):
        self.add_job("market_data_update", "Market Data Update", self._update_market_data, interval=30, enabled=True)
        self.add_job("signal_generation", "Trading Signal Generation", self._generate_trading_signals, interval=60, enabled=True)
        self.add_job("market_status_update", "Market Status Update", self._update_market_status, interval=300, enabled=True)
        self.add_job("cache_cleanup", "Cache Cleanup", self._cleanup_caches, interval=1800, enabled=True)
        self.add_job("health_check", "System Health Check", self._system_health_check, interval=600, enabled=True)

    def add_job(self, job_id: str, name: str, func: Callable, interval: Optional[float] = None,
                run_once: bool = False, enabled: bool = True) -> bool:
        with self._lock:
            if job_id in self.jobs:
                logger.warning("Job %s already exists, updating…", job_id)
            self.jobs[job_id] = BackgroundJob(job_id, name, func, interval, run_once, enabled)
            self.stats["total_jobs"] = len(self.jobs)
            return True

    def remove_job(self, job_id: str) -> bool:
        with self._lock:
            if job_id in self.jobs:
                del self.jobs[job_id]
                self.stats["total_jobs"] = len(self.jobs)
                return True
            return False

    def enable_job(self, job_id: str) -> bool:
        with self._lock:
            if job_id in self.jobs:
                self.jobs[job_id].enabled = True
                return True
            return False

    def disable_job(self, job_id: str) -> bool:
        with self._lock:
            if job_id in self.jobs:
                self.jobs[job_id].enabled = False
                return True
            return False

    # ------------------------------------------------------------------
    # Scheduler lifecycle
    # ------------------------------------------------------------------

    async def start(self):
        if self.is_running:
            logger.warning("Job scheduler already running")
            return
        self.is_running = True
        self.stats["scheduler_uptime"] = datetime.now()
        self.scheduler_task = asyncio.create_task(self._scheduler_loop())
        logger.info("Job scheduler started")

    async def stop(self):
        self.is_running = False
        if self.scheduler_task:
            self.scheduler_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.scheduler_task
        logger.info("Job scheduler stopped")

    async def _scheduler_loop(self):
        logger.info("Scheduler loop started")
        while self.is_running:
            current = datetime.now()
            jobs_to_run: list[BackgroundJob] = []
            with self._lock:
                for job in self.jobs.values():
                    if job.enabled and not job.is_running and (job.next_run is None or job.next_run <= current):
                        jobs_to_run.append(job)
            for job in jobs_to_run:
                if self.is_running:
                    asyncio.create_task(self._execute_job(job))
            await asyncio.sleep(5)
        logger.info("Scheduler loop stopped")

    async def _execute_job(self, job: BackgroundJob):
        result = JobResult(job_id=job.job_id, status=JobStatus.RUNNING, started_at=datetime.now())
        with self._lock:
            job.is_running = True
            job.last_run = datetime.now()
            self.stats["active_jobs"] = sum(1 for j in self.jobs.values() if j.is_running)
        try:
            outcome = await job.func() if asyncio.iscoroutinefunction(job.func) else job.func()
            result.status = JobStatus.COMPLETED
            result.result = outcome
        except Exception as exc:
            result.status = JobStatus.FAILED
            result.error = str(exc)
            logger.exception("Job %s failed", job.name)
            with self._lock:
                job.error_count += 1
                job.last_error = str(exc)
                self.stats["failed_jobs"] += 1
        finally:
            result.completed_at = datetime.now()
            result.duration_seconds = (result.completed_at - result.started_at).total_seconds()
            with self._lock:
                job.is_running = False
                if job.interval and not job.run_once and job.enabled:
                    job.next_run = datetime.now() + timedelta(seconds=job.interval)
                elif job.run_once:
                    job.enabled = False
                self.stats["active_jobs"] = sum(1 for j in self.jobs.values() if j.is_running)
            self.job_results[job.job_id] = result

    # ------------------------------------------------------------------
    # Default job implementations (copied verbatim)
    # ------------------------------------------------------------------

    async def _update_market_data(self):
        try:
            active_symbols = self.websocket_manager.get_active_symbols() or [
                "TCS.NS", "INFY.NS", "RELIANCE.NS", "HDFCBANK.NS", "ICICIBANK.NS"
            ]
            active_symbols = active_symbols[:50]
            updated = 0
            for symbol in active_symbols:
                live_update = await self.data_service.get_live_price(symbol)
                if live_update:
                    await self.websocket_manager.send_price_update(live_update)
                    updated += 1
            return {"updated_symbols": updated, "total_symbols": len(active_symbols)}
        except Exception:
            logger.exception("Error in market data update")
            raise

    async def _generate_trading_signals(self):
        try:
            symbols = ["TCS.NS", "INFY.NS", "RELIANCE.NS", "HDFCBANK.NS", "ICICIBANK.NS"]
            signals_generated = 0
            for symbol in symbols:
                analysis = await self.analysis_engine.analyze_stock(symbol)
                if analysis and analysis.recommendation in {"BUY", "SELL"}:
                    for signal in self.analysis_engine.get_cached_signals(symbol):
                        await self.websocket_manager.send_trading_signal(signal)
                        signals_generated += 1
            self.analysis_engine.clear_expired_signals()
            return {"signals_generated": signals_generated, "symbols_analyzed": len(symbols)}
        except Exception:
            logger.exception("Error generating trading signals")
            raise

    async def _update_market_status(self):
        try:
            status = await self.data_service.get_market_status()
            await self.websocket_manager.send_market_status(status)
            return status
        except Exception:
            logger.exception("Error updating market status")
            raise

    async def _cleanup_caches(self):
        try:
            self.analysis_engine.clear_expired_signals()
            cache_stats = self.data_service.get_cache_stats()
            return {"cache_cleanup": "completed", "cache_stats": cache_stats}
        except Exception:
            logger.exception("Error cleaning caches")
            raise

    async def _system_health_check(self):
        try:
            data_health = await self.data_service.health_check()
            analysis_health = await self.analysis_engine.health_check()
            websocket_health = await self.websocket_manager.health_check()
            overall = "healthy" if all(h.get("status") == "healthy" for h in [data_health, analysis_health, websocket_health]) else "degraded"
            return {
                "overall_status": overall,
                "data_service": data_health,
                "analysis_engine": analysis_health,
                "websocket_manager": websocket_health,
                "scheduler": self.get_scheduler_stats(),
            }
        except Exception:
            logger.exception("Health check failed")
            raise

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
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
                "last_result": result.__dict__ if result else None,
            }
        return None

    def get_all_jobs_status(self) -> List[Dict[str, Any]]:
        return [self.get_job_status(jid) for jid in self.jobs]

    def get_scheduler_stats(self) -> Dict[str, Any]:
        uptime = 0
        if self.stats["scheduler_uptime"]:
            uptime = (datetime.now() - self.stats["scheduler_uptime"]).total_seconds()
        return {
            **self.stats,
            "is_running": self.is_running,
            "uptime_seconds": uptime,
            "enabled_jobs": sum(1 for j in self.jobs.values() if j.enabled),
            "disabled_jobs": sum(1 for j in self.jobs.values() if not j.enabled),
        }


# ---------------------------------------------------------------------
# Factory helpers (kept for API compatibility)
# ---------------------------------------------------------------------

job_scheduler: Optional[JobScheduler] = None

def create_job_scheduler(data_service: RealTimeDataService, analysis_engine: AnalysisEngine,
                         websocket_manager: WebSocketManager) -> JobScheduler:
    global job_scheduler
    if job_scheduler is None:
        job_scheduler = JobScheduler(data_service, analysis_engine, websocket_manager)
    return job_scheduler

async def start_background_jobs():
    if job_scheduler:
        await job_scheduler.start()

async def stop_background_jobs():
    if job_scheduler:
        await job_scheduler.stop()


__all__ = [
    "JobStatus",
    "JobResult",
    "BackgroundJob",
    "JobScheduler",
    "create_job_scheduler",
    "start_background_jobs",
    "stop_background_jobs",
] 