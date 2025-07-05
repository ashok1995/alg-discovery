#!/usr/bin/env python3
"""
Recommendation Scheduler Service
================================

Cron scheduler responsible for periodically generating and caching trading
recommendations for swing-, short-term, and long-term strategies.

Moved from ``alg_discovery.services.recommendation_scheduler`` to
``alg_discovery.cron.jobs.recommendation_scheduler`` so all cron logic now
lives under the *cron* package.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Dict, Any

from apscheduler.executors.asyncio import AsyncIOExecutor
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

# Local cron utilities
from .market_timer import market_timer, MarketSession  # noqa: F401  (exported)

# Domain-specific imports (unchanged)
from api.models.recommendation_models import (
    recommendation_cache,
    RecommendationType,
    RecommendationRequest,
)

logger = logging.getLogger(__name__)


class RecommendationScheduler:
    """APScheduler wrapper for generating recommendations during market hours."""

    def __init__(self) -> None:
        # Configure APScheduler
        self.scheduler = AsyncIOScheduler(
            jobstores={"default": MemoryJobStore()},
            executors={"default": AsyncIOExecutor()},
            job_defaults={"coalesce": True, "max_instances": 1, "misfire_grace_time": 30},
            timezone="Asia/Kolkata",
        )

        # Default recommendation requests per strategy
        self.default_requests: Dict[RecommendationType, RecommendationRequest] = {
            RecommendationType.SWING: RecommendationRequest(
                combination={"momentum": "v1.0", "breakout": "v1.0"},
                limit_per_query=50,
                min_score=30.0,
                top_recommendations=20,
                refresh=True,
            ),
            RecommendationType.SHORT_TERM: RecommendationRequest(
                combination={"momentum": "v1.0"},
                limit_per_query=50,
                min_score=30.0,
                top_recommendations=20,
                refresh=True,
            ),
            RecommendationType.LONG_TERM: RecommendationRequest(
                combination={
                    "fundamental": "v1.0",
                    "momentum": "v1.0",
                    "value": "v1.0",
                    "quality": "v1.0",
                },
                limit_per_query=50,
                min_score=25.0,
                top_recommendations=20,
                refresh=True,
            ),
        }

        self.is_running: bool = False
        self.job_stats: Dict[str, Any] = {
            "swing_jobs": 0,
            "shortterm_jobs": 0,
            "longterm_jobs": 0,
            "total_successful": 0,
            "total_failed": 0,
            "last_run_times": {},
        }

    # ------------------------------------------------------------------
    # Lifecycle helpers
    # ------------------------------------------------------------------

    async def start_scheduler(self) -> None:
        if self.is_running:
            logger.warning("Scheduler is already running")
            return

        logger.info("🚀 Starting Recommendation Scheduler …")

        # Swing / short-term every 5 min during market hours
        for job_id, func, name in [
            ("swing_cron_job", self._run_swing_analysis, "Swing Trading Analysis"),
            ("shortterm_cron_job", self._run_shortterm_analysis, "Short-term Trading Analysis"),
        ]:
            self.scheduler.add_job(
                func,
                trigger=CronTrigger(hour="9-15", minute="*/5", day_of_week="mon-fri"),
                id=job_id,
                name=name,
                replace_existing=True,
            )

        # Long-term every 30 min (15 & 45 past each hour)
        self.scheduler.add_job(
            self._run_longterm_analysis,
            trigger=CronTrigger(
                hour="9-15",
                minute="15,45",
                day_of_week="mon-fri",
            ),
            id="longterm_cron_job",
            name="Long-term Investment Analysis",
            replace_existing=True,
        )

        # Cache cleanup hourly
        self.scheduler.add_job(
            self._cleanup_cache,
            trigger=CronTrigger(minute=0),
            id="cache_cleanup_job",
            name="Cache Cleanup",
            replace_existing=True,
        )

        # Market status ping every minute
        self.scheduler.add_job(
            self._log_market_status,
            trigger=CronTrigger(hour="9-16", minute="*", day_of_week="mon-fri"),
            id="market_status_job",
            name="Market Status Check",
            replace_existing=True,
        )

        self.scheduler.start()
        self.is_running = True

        logger.info("✅ Recommendation Scheduler started — %d jobs", len(self.scheduler.get_jobs()))
        for job in self.scheduler.get_jobs():
            logger.info("  📅 %s: next run at %s", job.name, job.next_run_time)

    async def stop_scheduler(self) -> None:
        if not self.is_running:
            logger.warning("Scheduler is not running")
            return
        logger.info("🛑 Stopping Recommendation Scheduler …")
        self.scheduler.shutdown(wait=True)
        self.is_running = False
        logger.info("✅ Scheduler stopped")

    # ------------------------------------------------------------------
    # Private job runners
    # ------------------------------------------------------------------

    async def _run_swing_analysis(self):
        if not market_timer.should_run_cron_job():
            logger.info("⏭️ Swing analysis skipped — market closed")
            return
        logger.info("🔄 Running swing trading analysis …")
        start_time = datetime.now()
        try:
            from swing_server import analysis_engine  # deferred import
            request = self.default_requests[RecommendationType.SWING]
            result = await analysis_engine.run_combination_analysis(
                combination=request.combination,
                limit_per_query=request.limit_per_query,
            )
            await self._process_and_cache_results(RecommendationType.SWING, request, result)
            self.job_stats["swing_jobs"] += 1
            self.job_stats["total_successful"] += 1
            self.job_stats["last_run_times"]["swing"] = start_time.isoformat()
            logger.info("✅ Swing analysis finished in %.2fs", (datetime.now() - start_time).total_seconds())
        except Exception as exc:
            self.job_stats["total_failed"] += 1
            logger.exception("❌ Swing analysis failed: %s", exc)

    async def _run_shortterm_analysis(self):
        if not market_timer.should_run_cron_job():
            logger.info("⏭️ Short-term analysis skipped — market closed")
            return
        logger.info("🔄 Running short-term trading analysis …")
        start_time = datetime.now()
        try:
            from shortterm_server import analysis_engine  # deferred import
            request = self.default_requests[RecommendationType.SHORT_TERM]
            result = await analysis_engine.run_combination_analysis(
                combination=request.combination,
                limit_per_query=request.limit_per_query,
            )
            await self._process_and_cache_results(RecommendationType.SHORT_TERM, request, result)
            self.job_stats["shortterm_jobs"] += 1
            self.job_stats["total_successful"] += 1
            self.job_stats["last_run_times"]["shortterm"] = start_time.isoformat()
            logger.info("✅ Short-term analysis finished in %.2fs", (datetime.now() - start_time).total_seconds())
        except Exception as exc:
            self.job_stats["total_failed"] += 1
            logger.exception("❌ Short-term analysis failed: %s", exc)

    async def _run_longterm_analysis(self):
        if not market_timer.should_run_cron_job():
            logger.info("⏭️ Long-term analysis skipped — market closed")
            return
        logger.info("🔄 Running long-term investment analysis …")
        start_time = datetime.now()
        try:
            # Circular-import-safe
            from api.longterm_server import run_combination_analysis, app  # type: ignore
            request = self.default_requests[RecommendationType.LONG_TERM]
            config = app.state.config  # type: ignore[attr-defined]
            result = await run_combination_analysis(
                config,
                request.combination.get("fundamental", "v1.0"),
                request.combination.get("momentum", "v1.0"),
                request.combination.get("value", "v1.0"),
                request.combination.get("quality", "v1.0"),
                request.limit_per_query,
            )
            await self._process_and_cache_longterm_results(request, result)
            self.job_stats["longterm_jobs"] += 1
            self.job_stats["total_successful"] += 1
            self.job_stats["last_run_times"]["longterm"] = start_time.isoformat()
            logger.info("✅ Long-term analysis finished in %.2fs", (datetime.now() - start_time).total_seconds())
        except Exception as exc:
            self.job_stats["total_failed"] += 1
            logger.exception("❌ Long-term analysis failed: %s", exc)

    # ------------------------------------------------------------------
    # Result processing helpers (unchanged logic, just reformatted)  
    # ------------------------------------------------------------------

    async def _process_and_cache_results(self, rec_type: RecommendationType, request: RecommendationRequest, result: Dict):
        """Process analysis results and cache them (swing / short-term)."""
        try:
            # Extract recommendations from result
            stocks_with_scores = result.get("stocks_with_scores", {})
            stock_details = result.get("stock_details", {})
            stock_categories = result.get("stock_categories", {})

            # Build recommendations list
            recommendations: list[dict] = []
            for symbol, score in list(stocks_with_scores.items())[: request.top_recommendations]:
                details = stock_details.get(symbol, {})
                categories = stock_categories.get(symbol, [])
                recommendations.append(
                    {
                        "symbol": symbol,
                        "name": details.get("name", symbol),
                        "price": float(details.get("price", 0)),
                        "score": float(score),
                        "per_change": float(details.get("per_change", 0)),
                        "volume": int(details.get("volume", 0)),
                        "recommendation_type": (
                            "Strong Buy" if score >= 70 else "Buy" if score >= 50 else "Watch"
                        ),
                        "appearances": len(categories),
                        "category_count": len(categories),
                        "categories": categories,
                        "momentum": "momentum" in categories,
                        "breakout": "breakout" in categories,
                        "reversal": "reversal" in categories,
                        "sector_rotation": "sector_rotation" in categories,
                    }
                )

            metadata = {
                "combination_used": request.combination,
                "performance_metrics": result.get("metrics", {}),
                "category_breakdown": result.get("category_results", {}),
                "total_recommendations": len(recommendations),
                "processing_time_seconds": result.get("metrics", {}).get("processing_time", 0),
                "algorithm_info": {
                    "approach": f"Multi-factor {rec_type.value} analysis with ChartInk data",
                    "data_source": "ChartInk with nsecode symbols",
                    "cron_generated": True,
                    "generated_at": datetime.now().isoformat(),
                },
                "timestamp": datetime.now().isoformat(),
            }

            success = await recommendation_cache.store_recommendation(
                rec_type, request, recommendations, metadata
            )
            if success:
                logger.info("✅ Cached %d %s recommendations", len(recommendations), rec_type.value)
            else:
                logger.error("❌ Failed to cache %s recommendations", rec_type.value)
        except Exception:
            logger.exception("Error processing %s results", rec_type.value)

    async def _process_and_cache_longterm_results(self, request: RecommendationRequest, result: Dict):
        """Process long-term analysis results and cache them."""
        try:
            top_stocks = result.get("top_stocks", [])[: request.top_recommendations]
            recommendations: list[dict] = []
            for stock in top_stocks:
                recommendations.append(
                    {
                        "symbol": stock["symbol"],
                        "name": stock.get("name", stock["symbol"]),
                        "price": float(stock.get("price", 0)) if stock.get("price") != "N/A" else 0.0,
                        "score": float(stock["score"]),
                        "per_change": float(stock.get("per_change", 0)) if stock.get("per_change") != "N/A" else 0.0,
                        "volume": int(stock.get("volume", 0)) if stock.get("volume") != "N/A" else 0,
                        "recommendation_type": (
                            "Strong Buy" if stock["score"] >= 70 else "Buy" if stock["score"] >= 50 else "Hold"
                        ),
                        "appearances": len(stock["categories"]),
                        "category_count": len(stock["categories"]),
                        "categories": list(stock["categories"]),
                        "fundamental": "fundamental" in stock["categories"],
                        "momentum": "momentum" in stock["categories"],
                        "value": "value" in stock["categories"],
                        "quality": "quality" in stock["categories"],
                    }
                )

            metadata = {
                "combination_used": request.combination,
                "performance_metrics": result.get("metrics", {}),
                "category_breakdown": result.get("category_results", {}),
                "total_recommendations": len(recommendations),
                "processing_time_seconds": result.get("processing_time_seconds", 0),
                "algorithm_info": {
                    "approach": "Multi-factor long-term analysis with re-ranking",
                    "timeframe": "6-18 months",
                    "categories": ["fundamental", "momentum", "value", "quality"],
                    "scoring": "Weighted sum with re-ranking criteria (0-100 scale)",
                    "data_source": "ChartInk with nsecode symbols",
                    "cron_generated": True,
                    "generated_at": datetime.now().isoformat(),
                },
                "timestamp": datetime.now().isoformat(),
            }

            success = await recommendation_cache.store_recommendation(
                RecommendationType.LONG_TERM, request, recommendations, metadata
            )
            if success:
                logger.info("✅ Cached %d long-term recommendations", len(recommendations))
            else:
                logger.error("❌ Failed to cache long-term recommendations")
        except Exception:
            logger.exception("Error processing long-term results")

    async def _cleanup_cache(self):
        logger.info("🧹 Running cache cleanup …")
        try:
            await recommendation_cache.cleanup_expired_cache()
            logger.info("✅ Cache cleanup completed")
        except Exception:
            logger.exception("❌ Cache cleanup failed")

    async def _log_market_status(self):
        try:
            status_info = market_timer.get_market_session_info()
            current_minute = datetime.now().minute
            if current_minute % 30 == 0 or status_info["session"] in {"pre_market", "post_market"}:
                logger.info("📊 Market Status: %s", market_timer.format_market_status_message())
        except Exception:
            logger.exception("Error checking market status")

    # Public helper
    def get_scheduler_status(self) -> Dict[str, Any]:
        jobs = [
            {
                "id": job.id,
                "name": job.name,
                "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger),
            }
            for job in self.scheduler.get_jobs()
        ]
        return {
            "scheduler_running": self.is_running,
            "market_status": market_timer.get_market_session_info(),
            "job_statistics": self.job_stats,
            "scheduled_jobs": jobs,
            "total_jobs": len(jobs),
            "scheduler_timezone": str(self.scheduler.timezone),
        }

    async def run_manual_job(self, job_type: str) -> None:
        logger.info("🔧 Manually triggering %s job …", job_type)
        mapping = {
            "swing": self._run_swing_analysis,
            "shortterm": self._run_shortterm_analysis,
            "longterm": self._run_longterm_analysis,
            "cleanup": self._cleanup_cache,
        }
        if job_type not in mapping:
            raise ValueError(f"Unknown job type: {job_type}")
        await mapping[job_type]()
        logger.info("✅ Manual %s job completed", job_type)


# Singleton instance (used by external modules/tests)
recommendation_scheduler = RecommendationScheduler()

__all__ = [
    "RecommendationScheduler",
    "recommendation_scheduler",
] 