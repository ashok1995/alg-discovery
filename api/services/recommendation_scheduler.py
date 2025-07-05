#!/usr/bin/env python3
"""
Recommendation Scheduler Service
===============================

Cron job scheduler for generating and caching trading recommendations
during market hours. Handles swing, short-term, and long-term analysis.
"""

import asyncio
import logging
import sys
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from pathlib import Path

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.executors.asyncio import AsyncIOExecutor

from api.services.market_timer import market_timer, MarketSession
from models.recommendation_models import (
    recommendation_cache, 
    RecommendationType, 
    RecommendationRequest
)

logger = logging.getLogger(__name__)

class RecommendationScheduler:
    """Scheduler for automated recommendation generation during market hours."""
    
    def __init__(self):
        # Configure APScheduler
        jobstores = {
            'default': MemoryJobStore()
        }
        executors = {
            'default': AsyncIOExecutor()
        }
        job_defaults = {
            'coalesce': True,
            'max_instances': 1,
            'misfire_grace_time': 30
        }
        
        self.scheduler = AsyncIOScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults,
            timezone='Asia/Kolkata'
        )
        
        # Default recommendation requests
        self.default_requests = {
            RecommendationType.SWING: RecommendationRequest(
                combination={"momentum": "v1.0", "breakout": "v1.0"},
                limit_per_query=50,
                min_score=30.0,
                top_recommendations=20,
                refresh=True
            ),
            RecommendationType.SHORT_TERM: RecommendationRequest(
                combination={"momentum": "v1.0"},
                limit_per_query=50,
                min_score=30.0,
                top_recommendations=20,
                refresh=True
            ),
            RecommendationType.LONG_TERM: RecommendationRequest(
                combination={"fundamental": "v1.0", "momentum": "v1.0", "value": "v1.0", "quality": "v1.0"},
                limit_per_query=50,
                min_score=25.0,
                top_recommendations=20,
                refresh=True
            )
        }
        
        self.is_running = False
        self.job_stats = {
            'swing_jobs': 0,
            'shortterm_jobs': 0,
            'longterm_jobs': 0,
            'total_successful': 0,
            'total_failed': 0,
            'last_run_times': {}
        }
    
    async def start_scheduler(self):
        """Start the cron job scheduler with market-aware timing."""
        if self.is_running:
            logger.warning("Scheduler is already running")
            return
        
        logger.info("🚀 Starting Recommendation Scheduler...")
        
        # Schedule swing and short-term jobs (every 5 minutes during market hours)
        self.scheduler.add_job(
            self._run_swing_analysis,
            trigger=CronTrigger(
                hour='9-15',  # 9 AM to 3 PM
                minute='*/5',  # Every 5 minutes
                day_of_week='mon-fri'  # Monday to Friday
            ),
            id='swing_cron_job',
            name='Swing Trading Analysis',
            replace_existing=True
        )
        
        self.scheduler.add_job(
            self._run_shortterm_analysis,
            trigger=CronTrigger(
                hour='9-15',  # 9 AM to 3 PM
                minute='*/5',  # Every 5 minutes
                day_of_week='mon-fri'  # Monday to Friday
            ),
            id='shortterm_cron_job',
            name='Short-term Trading Analysis',
            replace_existing=True
        )
        
        # Schedule long-term jobs (every 30 minutes during market hours)
        self.scheduler.add_job(
            self._run_longterm_analysis,
            trigger=CronTrigger(
                hour='9-15',  # 9 AM to 3 PM
                minute='15,45',  # At 15 and 45 minutes past the hour
                day_of_week='mon-fri'  # Monday to Friday
            ),
            id='longterm_cron_job',
            name='Long-term Investment Analysis',
            replace_existing=True
        )
        
        # Schedule cache cleanup (every hour)
        self.scheduler.add_job(
            self._cleanup_cache,
            trigger=CronTrigger(minute=0),  # Every hour at 0 minutes
            id='cache_cleanup_job',
            name='Cache Cleanup',
            replace_existing=True
        )
        
        # Schedule market status check (every minute during trading hours)
        self.scheduler.add_job(
            self._log_market_status,
            trigger=CronTrigger(
                hour='9-16',  # 9 AM to 4 PM
                minute='*',  # Every minute
                day_of_week='mon-fri'  # Monday to Friday
            ),
            id='market_status_job',
            name='Market Status Check',
            replace_existing=True
        )
        
        # Start the scheduler
        self.scheduler.start()
        self.is_running = True
        
        logger.info("✅ Recommendation Scheduler started successfully")
        logger.info(f"📊 Scheduled jobs: {len(self.scheduler.get_jobs())}")
        
        # Log next job times
        for job in self.scheduler.get_jobs():
            next_run = job.next_run_time
            logger.info(f"  📅 {job.name}: Next run at {next_run}")
    
    async def stop_scheduler(self):
        """Stop the cron job scheduler."""
        if not self.is_running:
            logger.warning("Scheduler is not running")
            return
        
        logger.info("🛑 Stopping Recommendation Scheduler...")
        self.scheduler.shutdown(wait=True)
        self.is_running = False
        logger.info("✅ Scheduler stopped successfully")
    
    async def _run_swing_analysis(self):
        """Run swing trading analysis and cache results."""
        if not market_timer.should_run_cron_job():
            logger.info("⏭️ Skipping swing analysis - market is closed")
            return
        
        logger.info("🔄 Running swing trading analysis...")
        start_time = datetime.now()
        
        try:
            # Import here to avoid circular imports
            from swing_server import analysis_engine
            
            request = self.default_requests[RecommendationType.SWING]
            
            # Run analysis
            result = await analysis_engine.run_combination_analysis(
                combination=request.combination,
                limit_per_query=request.limit_per_query
            )
            
            # Process and cache results
            await self._process_and_cache_results(
                RecommendationType.SWING,
                request,
                result
            )
            
            self.job_stats['swing_jobs'] += 1
            self.job_stats['total_successful'] += 1
            self.job_stats['last_run_times']['swing'] = start_time.isoformat()
            
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"✅ Swing analysis completed in {processing_time:.2f}s")
            
        except Exception as e:
            self.job_stats['total_failed'] += 1
            logger.error(f"❌ Swing analysis failed: {e}")
    
    async def _run_shortterm_analysis(self):
        """Run short-term trading analysis and cache results."""
        if not market_timer.should_run_cron_job():
            logger.info("⏭️ Skipping short-term analysis - market is closed")
            return
        
        logger.info("🔄 Running short-term trading analysis...")
        start_time = datetime.now()
        
        try:
            # Import here to avoid circular imports
            from shortterm_server import analysis_engine
            
            request = self.default_requests[RecommendationType.SHORT_TERM]
            
            # Run analysis
            result = await analysis_engine.run_combination_analysis(
                combination=request.combination,
                limit_per_query=request.limit_per_query
            )
            
            # Process and cache results
            await self._process_and_cache_results(
                RecommendationType.SHORT_TERM,
                request,
                result
            )
            
            self.job_stats['shortterm_jobs'] += 1
            self.job_stats['total_successful'] += 1
            self.job_stats['last_run_times']['shortterm'] = start_time.isoformat()
            
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"✅ Short-term analysis completed in {processing_time:.2f}s")
            
        except Exception as e:
            self.job_stats['total_failed'] += 1
            logger.error(f"❌ Short-term analysis failed: {e}")
    
    async def _run_longterm_analysis(self):
        """Run long-term investment analysis and cache results."""
        if not market_timer.should_run_cron_job():
            logger.info("⏭️ Skipping long-term analysis - market is closed")
            return
        
        logger.info("🔄 Running long-term investment analysis...")
        start_time = datetime.now()
        
        try:
            # Import here to avoid circular imports
            from api.longterm_server import run_combination_analysis
            from api.longterm_server import app
            
            request = self.default_requests[RecommendationType.LONG_TERM]
            config = app.state.config
            
            # Run analysis
            result = await run_combination_analysis(
                config,
                request.combination.get('fundamental', 'v1.0'),
                request.combination.get('momentum', 'v1.0'),
                request.combination.get('value', 'v1.0'),
                request.combination.get('quality', 'v1.0'),
                request.limit_per_query
            )
            
            # Process and cache results
            await self._process_and_cache_longterm_results(
                request,
                result
            )
            
            self.job_stats['longterm_jobs'] += 1
            self.job_stats['total_successful'] += 1
            self.job_stats['last_run_times']['longterm'] = start_time.isoformat()
            
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"✅ Long-term analysis completed in {processing_time:.2f}s")
            
        except Exception as e:
            self.job_stats['total_failed'] += 1
            logger.error(f"❌ Long-term analysis failed: {e}")
    
    async def _process_and_cache_results(self, rec_type: RecommendationType, 
                                       request: RecommendationRequest, result: Dict):
        """Process analysis results and cache them."""
        try:
            # Extract recommendations from result
            stocks_with_scores = result.get('stocks_with_scores', {})
            stock_details = result.get('stock_details', {})
            stock_categories = result.get('stock_categories', {})
            
            # Build recommendations list
            recommendations = []
            for symbol, score in list(stocks_with_scores.items())[:request.top_recommendations]:
                stock_detail = stock_details.get(symbol, {})
                categories = stock_categories.get(symbol, [])
                
                rec = {
                    "symbol": symbol,
                    "name": stock_detail.get('name', symbol),
                    "price": float(stock_detail.get('price', 0)),
                    "score": float(score),
                    "per_change": float(stock_detail.get('per_change', 0)),
                    "volume": int(stock_detail.get('volume', 0)),
                    "recommendation_type": "Strong Buy" if score >= 70 else "Buy" if score >= 50 else "Watch",
                    "appearances": len(categories),
                    "category_count": len(categories),
                    "categories": categories,
                    "momentum": "momentum" in categories,
                    "breakout": "breakout" in categories,
                    "reversal": "reversal" in categories,
                    "sector_rotation": "sector_rotation" in categories
                }
                recommendations.append(rec)
            
            # Build metadata
            metadata = {
                "combination_used": request.combination,
                "performance_metrics": result.get('metrics', {}),
                "category_breakdown": result.get('category_results', {}),
                "total_recommendations": len(recommendations),
                "processing_time_seconds": result.get('metrics', {}).get('processing_time', 0),
                "algorithm_info": {
                    "approach": f"Multi-factor {rec_type.value} analysis with ChartInk data",
                    "data_source": "ChartInk with nsecode symbols",
                    "cron_generated": True,
                    "generated_at": datetime.now().isoformat()
                },
                "timestamp": datetime.now().isoformat()
            }
            
            # Cache the results
            success = await recommendation_cache.store_recommendation(
                rec_type, request, recommendations, metadata
            )
            
            if success:
                logger.info(f"✅ Cached {len(recommendations)} {rec_type.value} recommendations")
            else:
                logger.error(f"❌ Failed to cache {rec_type.value} recommendations")
                
        except Exception as e:
            logger.error(f"Error processing {rec_type.value} results: {e}")
    
    async def _process_and_cache_longterm_results(self, request: RecommendationRequest, result: Dict):
        """Process long-term analysis results and cache them."""
        try:
            # Extract top stocks from result
            top_stocks = result.get('top_stocks', [])[:request.top_recommendations]
            
            # Build recommendations list
            recommendations = []
            for stock in top_stocks:
                rec = {
                    "symbol": stock['symbol'],
                    "name": stock.get('name', stock['symbol']),
                    "price": float(stock.get('price', 0)) if stock.get('price') != 'N/A' else 0.0,
                    "score": float(stock['score']),
                    "per_change": float(stock.get('per_change', 0)) if stock.get('per_change') != 'N/A' else 0.0,
                    "volume": int(stock.get('volume', 0)) if stock.get('volume') != 'N/A' else 0,
                    "recommendation_type": "Strong Buy" if stock['score'] >= 70 else "Buy" if stock['score'] >= 50 else "Hold",
                    "appearances": len(stock['categories']),
                    "category_count": len(stock['categories']),
                    "categories": list(stock['categories']),
                    "fundamental": "fundamental" in stock['categories'],
                    "momentum": "momentum" in stock['categories'],
                    "value": "value" in stock['categories'],
                    "quality": "quality" in stock['categories']
                }
                recommendations.append(rec)
            
            # Build metadata
            metadata = {
                "combination_used": request.combination,
                "performance_metrics": result.get('metrics', {}),
                "category_breakdown": result.get('category_results', {}),
                "total_recommendations": len(recommendations),
                "processing_time_seconds": result.get('processing_time_seconds', 0),
                "algorithm_info": {
                    "approach": "Multi-factor long-term analysis with re-ranking",
                    "timeframe": "6-18 months",
                    "categories": ["fundamental", "momentum", "value", "quality"],
                    "scoring": "Weighted sum with re-ranking criteria (0-100 scale)",
                    "data_source": "ChartInk with nsecode symbols",
                    "cron_generated": True,
                    "generated_at": datetime.now().isoformat()
                },
                "timestamp": datetime.now().isoformat()
            }
            
            # Cache the results
            success = await recommendation_cache.store_recommendation(
                RecommendationType.LONG_TERM, request, recommendations, metadata
            )
            
            if success:
                logger.info(f"✅ Cached {len(recommendations)} long-term recommendations")
            else:
                logger.error("❌ Failed to cache long-term recommendations")
                
        except Exception as e:
            logger.error(f"Error processing long-term results: {e}")
    
    async def _cleanup_cache(self):
        """Clean up expired cache entries."""
        logger.info("🧹 Running cache cleanup...")
        try:
            await recommendation_cache.cleanup_expired_cache()
            logger.info("✅ Cache cleanup completed")
        except Exception as e:
            logger.error(f"❌ Cache cleanup failed: {e}")
    
    async def _log_market_status(self):
        """Log current market status (runs every minute during trading hours)."""
        try:
            status_info = market_timer.get_market_session_info()
            
            # Only log during important transitions or every 30 minutes
            current_minute = datetime.now().minute
            if current_minute % 30 == 0 or status_info['session'] in ['pre_market', 'post_market']:
                message = market_timer.format_market_status_message()
                logger.info(f"📊 Market Status: {message}")
                
        except Exception as e:
            logger.error(f"Error checking market status: {e}")
    
    def get_scheduler_status(self) -> Dict[str, Any]:
        """Get current scheduler status and statistics."""
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger)
            })
        
        market_info = market_timer.get_market_session_info()
        
        return {
            "scheduler_running": self.is_running,
            "market_status": market_info,
            "job_statistics": self.job_stats,
            "scheduled_jobs": jobs,
            "total_jobs": len(jobs),
            "scheduler_timezone": str(self.scheduler.timezone)
        }
    
    async def run_manual_job(self, job_type: str):
        """Manually trigger a specific job type."""
        logger.info(f"🔧 Manually triggering {job_type} job...")
        
        try:
            if job_type == "swing":
                await self._run_swing_analysis()
            elif job_type == "shortterm":
                await self._run_shortterm_analysis()
            elif job_type == "longterm":
                await self._run_longterm_analysis()
            elif job_type == "cleanup":
                await self._cleanup_cache()
            else:
                raise ValueError(f"Unknown job type: {job_type}")
                
            logger.info(f"✅ Manual {job_type} job completed")
            
        except Exception as e:
            logger.error(f"❌ Manual {job_type} job failed: {e}")
            raise

# Global scheduler instance
recommendation_scheduler = RecommendationScheduler() 