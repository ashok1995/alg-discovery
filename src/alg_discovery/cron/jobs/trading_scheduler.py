#!/usr/bin/env python3
"""
Trading Scheduler
================

Advanced cron scheduler for trading analysis caching during market hours.
"""

import asyncio
import logging
import aiohttp
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.executors.asyncio import AsyncIOExecutor

from .market_timer import MarketTimer, MarketSession  # noqa: F401
from api.models.recommendation_models import (
    recommendation_cache,
    RecommendationType,
    RecommendationRequest,
)
from api.models.cron_tracking_models import (
    cron_execution_tracker,
    CronJobType,
    CronJobStatus,
)
from api.models.recommendation_history_models import (
    recommendation_history_storage,
    RecommendationStrategy,
)

__all__ = [
    "TradingScheduler",
    "trading_scheduler",
]

logger = logging.getLogger(__name__)


class TradingScheduler:
    """Manages automated trading-recommendation generation with APScheduler."""

    def __init__(self) -> None:
        self.scheduler: Optional[AsyncIOScheduler] = None
        self.market_timer = MarketTimer()
        self.session: Optional[aiohttp.ClientSession] = None
        self.server_urls: Dict[str, str] = {
            "shortterm": "http://localhost:8003",
            "swing": "http://localhost:8002",
            "longterm": "http://localhost:8001",
        }
        self.retry_attempts = 3
        self.retry_delay = 30  # seconds

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def start_scheduler(self) -> None:
        if self.scheduler and self.scheduler.running:
            logger.warning("⚠️ Scheduler already running")
            return

        # Init helper services
        await cron_execution_tracker.initialize()
        await recommendation_history_storage.initialize()

        # HTTP session for API calls
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=300)
        )

        self.scheduler = AsyncIOScheduler(executors={"default": AsyncIOExecutor()}, timezone="Asia/Kolkata")
        await self._setup_cron_jobs()
        self.scheduler.start()

        logger.info("✅ Trading scheduler started successfully (%d jobs)", len(self.scheduler.get_jobs()))
        market_info = self.market_timer.get_market_session_info()
        logger.info("📊 Market Status: %s | Is Open: %s", market_info["session"], market_info["is_open"])

    async def stop_scheduler(self) -> None:
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown(wait=True)
            logger.info("✅ Scheduler stopped")
        if self.session:
            await self.session.close()
            logger.info("✅ HTTP session closed")
        await cron_execution_tracker.close()
        await recommendation_history_storage.close()

    # ------------------------------------------------------------------
    # Job setup
    # ------------------------------------------------------------------

    async def _setup_cron_jobs(self) -> None:
        # Short-term & swing every 5 min during market hours
        for job_id, func, name in [
            ("shortterm_recommendations", self._run_shortterm_analysis, "Short-term Trading"),
            ("swing_recommendations", self._run_swing_analysis, "Swing Trading"),
        ]:
            self.scheduler.add_job(
                func,
                trigger=CronTrigger(minute="*/5", hour="9-15", day_of_week="mon-fri", timezone="Asia/Kolkata"),
                id=job_id,
                name=name,
                max_instances=1,
                coalesce=True,
                misfire_grace_time=60,
            )

        # Long-term every 30 min
        self.scheduler.add_job(
            self._run_longterm_analysis,
            trigger=CronTrigger(minute="*", hour="9-15", day_of_week="mon-fri", timezone="Asia/Kolkata"),
            id="longterm_recommendations",
            name="Long-term Investment",
            max_instances=1,
            coalesce=True,
            misfire_grace_time=120,
        )

        # Cache cleanup hourly
        self.scheduler.add_job(
            self._cleanup_cache,
            trigger=CronTrigger(minute="0", timezone="Asia/Kolkata"),
            id="cache_cleanup",
            name="Cache Cleanup",
            max_instances=1,
        )

    # ------------------------------------------------------------------
    # Job runners (first: short-term)
    # ------------------------------------------------------------------

    async def _run_shortterm_analysis(self):
        execution_id: Optional[str] = None
        scheduled_time = datetime.now()
        try:
            execution_id = await cron_execution_tracker.start_job_execution(
                job_id="shortterm_recommendations",
                job_name="Short-term Trading Recommendations",
                job_type=CronJobType.SHORTTERM_ANALYSIS,
                scheduled_time=scheduled_time,
                job_parameters={
                    "momentum": "v1.0",
                    "limit_per_query": 50,
                    "min_score": 25.0,
                    "top_recommendations": 10,
                },
            )

            if not self.market_timer.is_market_open():
                logger.info("⏰ Market closed – skipping short-term analysis")
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.SKIPPED,
                    output_summary={"reason": "market_closed"},
                )
                return

            payload = {
                "momentum": "v1.0",
                "limit_per_query": 50,
                "min_score": 25.0,
                "top_recommendations": 10,
            }
            start_time = datetime.now()
            result = await self._make_api_call(
                url=f"{self.server_urls['shortterm']}/api/shortterm/shortterm-buy-recommendations",
                payload=payload,
                strategy="short-term",
            )
            end_time = datetime.now()

            if result:
                count = len(result.get("recommendations", []))
                logger.info("✅ Short-term analysis cached %d recommendations", count)
                try:
                    market_info = self.market_timer.get_market_session_info()
                    await recommendation_history_storage.store_recommendation_batch(
                        execution_id=execution_id,
                        cron_job_id="shortterm_recommendations",
                        strategy=RecommendationStrategy.SHORTTERM,
                        recommendations=result.get("recommendations", []),
                        metadata={
                            "algorithm_info": {"version": "v1.0", "strategy": "momentum", "filters_applied": payload},
                            "performance_metrics": {
                                "api_response_time_ms": (end_time - start_time).total_seconds() * 1000,
                                "total_processing_time_seconds": (end_time - start_time).total_seconds(),
                            },
                        },
                        request_parameters=payload,
                        market_context={
                            "market_condition": market_info.get("session", "unknown"),
                            "market_open": market_info.get("is_open", False),
                            "timestamp": datetime.now(),
                        },
                    )
                except Exception:
                    logger.exception("Failed to store short-term recommendations")

                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.SUCCESS,
                    output_summary={"recommendations_generated": count},
                )
            else:
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.FAILED,
                    error_message="API call returned no results",
                )
        except Exception as exc:
            logger.exception("Short-term analysis failed")
            if execution_id:
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.FAILED,
                    error_message=str(exc),
                )

    # Remaining job runners and helpers will be appended in the next edit.

    # ------------------------------------------------------------------
    # Additional job runners & helpers (swing, long-term, etc.)
    # ------------------------------------------------------------------

    async def _run_swing_analysis(self):
        # Copied verbatim from original module
        execution_id: Optional[str] = None
        scheduled_time = datetime.now()
        try:
            execution_id = await cron_execution_tracker.start_job_execution(
                job_id="swing_recommendations",
                job_name="Swing Trading Recommendations",
                job_type=CronJobType.SWING_ANALYSIS,
                scheduled_time=scheduled_time,
                job_parameters={
                    "momentum": "v1.0",
                    "limit_per_query": 50,
                    "min_score": 25.0,
                    "top_recommendations": 15,
                },
            )
            if not self.market_timer.is_market_open():
                logger.info("⏰ Market closed – skipping swing analysis")
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.SKIPPED,
                    output_summary={"reason": "market_closed"},
                )
                return

            payload = {
                "momentum": "v1.0",
                "limit_per_query": 50,
                "min_score": 25.0,
                "top_recommendations": 15,
            }
            start_time = datetime.now()
            result = await self._make_api_call(
                url=f"{self.server_urls['swing']}/api/swing/swing-buy-recommendations",
                payload=payload,
                strategy="swing",
            )
            end_time = datetime.now()

            if result:
                count = len(result.get("recommendations", []))
                logger.info("✅ Swing analysis cached %d recommendations", count)
                try:
                    market_info = self.market_timer.get_market_session_info()
                    await recommendation_history_storage.store_recommendation_batch(
                        execution_id=execution_id,
                        cron_job_id="swing_recommendations",
                        strategy=RecommendationStrategy.SWING,
                        recommendations=result.get("recommendations", []),
                        metadata={
                            "algorithm_info": {"version": "v1.0", "strategy": "swing_momentum", "filters_applied": payload},
                            "performance_metrics": {
                                "api_response_time_ms": (end_time - start_time).total_seconds() * 1000,
                                "total_processing_time_seconds": (end_time - start_time).total_seconds(),
                            },
                        },
                        request_parameters=payload,
                        market_context={
                            "market_condition": market_info.get("session", "unknown"),
                            "market_open": market_info.get("is_open", False),
                            "timestamp": datetime.now(),
                        },
                    )
                except Exception:
                    logger.exception("Failed to store swing recommendations")

                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.SUCCESS,
                    output_summary={"recommendations_generated": count},
                )
            else:
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.FAILED,
                    error_message="API call returned no results",
                )
        except Exception as exc:
            logger.exception("Swing analysis failed")
            if execution_id:
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.FAILED,
                    error_message=str(exc),
                )

    async def _run_longterm_analysis(self):
        execution_id: Optional[str] = None
        scheduled_time = datetime.now()
        try:
            execution_id = await cron_execution_tracker.start_job_execution(
                job_id="longterm_recommendations",
                job_name="Long-term Investment Recommendations",
                job_type=CronJobType.LONGTERM_ANALYSIS,
                scheduled_time=scheduled_time,
                job_parameters={
                    "combination": {"fundamental": "v1.0", "momentum": "v1.0", "value": "v1.0", "quality": "v1.0"},
                    "limit_per_query": 50,
                    "min_score": 25.0,
                    "top_recommendations": 20,
                },
            )
            if not self.market_timer.is_market_open():
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.SKIPPED,
                    output_summary={"reason": "market_closed"},
                )
                return

            payload = {
                "combination": {"fundamental": "v1.0", "momentum": "v1.0", "value": "v1.0", "quality": "v1.0"},
                "limit_per_query": 50,
                "min_score": 25.0,
                "top_recommendations": 20,
            }
            start_time = datetime.now()
            result = await self._make_api_call(
                url=f"{self.server_urls['longterm']}/api/longterm/long-buy-recommendations",
                payload=payload,
                strategy="long-term",
            )
            end_time = datetime.now()

            if result:
                count = len(result.get("recommendations", []))
                logger.info("✅ Long-term analysis cached %d recommendations", count)
                try:
                    market_info = self.market_timer.get_market_session_info()
                    await recommendation_history_storage.store_recommendation_batch(
                        execution_id=execution_id,
                        cron_job_id="longterm_recommendations",
                        strategy=RecommendationStrategy.LONGTERM,
                        recommendations=result.get("recommendations", []),
                        metadata={
                            "algorithm_info": {
                                "version": "v1.0",
                                "strategy": "combination",
                                "combination_strategies": ["fundamental", "momentum", "value", "quality"],
                                "filters_applied": payload,
                            },
                            "performance_metrics": {
                                "api_response_time_ms": (end_time - start_time).total_seconds() * 1000,
                                "total_processing_time_seconds": (end_time - start_time).total_seconds(),
                            },
                        },
                        request_parameters=payload,
                        market_context={
                            "market_condition": market_info.get("session", "unknown"),
                            "market_open": market_info.get("is_open", False),
                            "timestamp": datetime.now(),
                        },
                    )
                except Exception:
                    logger.exception("Failed to store long-term recommendations")

                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.SUCCESS,
                    output_summary={"recommendations_generated": count},
                )
            else:
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.FAILED,
                    error_message="API call returned no results",
                )
        except Exception as exc:
            logger.exception("Long-term analysis failed")
            if execution_id:
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.FAILED,
                    error_message=str(exc),
                )

    async def _make_api_call(self, url: str, payload: Dict, strategy: str) -> Optional[Dict]:
        for attempt in range(self.retry_attempts):
            try:
                async with self.session.post(url, json=payload, headers={"Content-Type": "application/json"}) as resp:
                    if resp.status == 200:
                        logger.debug("%s API call successful (attempt %d)", strategy, attempt + 1)
                        return await resp.json()
                    logger.warning("%s API call failed (attempt %d): %s", strategy, attempt + 1, resp.status)
            except Exception as exc:
                logger.warning("%s API call error (attempt %d): %s", strategy, attempt + 1, exc)
            if attempt < self.retry_attempts - 1:
                await asyncio.sleep(self.retry_delay)
        logger.error("%s API call failed after %d attempts", strategy, self.retry_attempts)
        return None

    async def _cleanup_cache(self):
        execution_id: Optional[str] = None
        scheduled_time = datetime.now()
        try:
            execution_id = await cron_execution_tracker.start_job_execution(
                job_id="cache_cleanup",
                job_name="Cache Cleanup",
                job_type=CronJobType.CACHE_CLEANUP,
                scheduled_time=scheduled_time,
            )
            start_time = datetime.now()
            await recommendation_cache.cleanup_expired_cache()
            end_time = datetime.now()
            await cron_execution_tracker.complete_job_execution(
                execution_id=execution_id,
                status=CronJobStatus.SUCCESS,
                output_summary={"operation": "cache_cleanup"},
                performance_metrics={"duration_seconds": (end_time - start_time).total_seconds()},
            )
        except Exception as exc:
            logger.exception("Cache cleanup failed")
            if execution_id:
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.FAILED,
                    error_message=str(exc),
                )

    def get_scheduler_status(self) -> Dict[str, Any]:
        if not self.scheduler:
            return {"status": "not_initialized"}
        jobs = [
            {
                "id": j.id,
                "name": j.name,
                "next_run": j.next_run_time.isoformat() if j.next_run_time else None,
                "trigger": str(j.trigger),
            }
            for j in self.scheduler.get_jobs()
        ]
        return {
            "status": "running" if self.scheduler.running else "stopped",
            "market_session": self.market_timer.get_market_session_info(),
            "jobs": jobs,
            "server_urls": self.server_urls,
            "retry": {"attempts": self.retry_attempts, "delay": self.retry_delay},
        }

    async def force_run_all(self) -> Dict[str, Any]:
        results: Dict[str, str] = {}
        for key, coro in {
            "shortterm": self._run_shortterm_analysis,
            "swing": self._run_swing_analysis,
            "longterm": self._run_longterm_analysis,
        }.items():
            try:
                await coro()
                results[key] = "success"
            except Exception as exc:
                results[key] = f"failed: {exc}"
        return results

# Singleton instance
trading_scheduler = TradingScheduler() 