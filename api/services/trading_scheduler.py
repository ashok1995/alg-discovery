"""
Trading Scheduler Service

This service manages automated cron jobs for generating trading recommendations
during market hours. It includes:
- Short-term recommendations: Every 5 minutes during market hours
- Swing recommendations: Every 5 minutes during market hours  
- Long-term recommendations: Every 30 minutes during market hours
- Market timing validation
- Database caching integration
- Error handling and retry logic
- Comprehensive execution tracking and analytics
- Historical recommendation storage for complete audit trail
"""

import asyncio
import logging
import aiohttp
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.executors.asyncio import AsyncIOExecutor
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR

from .market_timer import MarketTimer, MarketSession
from api.models.recommendation_models import (
    recommendation_cache, RecommendationType, RecommendationRequest
)
from api.models.cron_tracking_models import (
    cron_execution_tracker, CronJobType, CronJobStatus
)
from api.models.recommendation_history_models import recommendation_history_storage, RecommendationStrategy

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TradingScheduler:
    """
    Manages automated trading recommendation generation during market hours
    with comprehensive execution tracking and performance monitoring
    """
    
    def __init__(self):
        self.scheduler = None
        self.market_timer = MarketTimer()
        self.session = None
        self.server_urls = {
            'shortterm': 'http://localhost:8003',
            'swing': 'http://localhost:8002', 
            'longterm': 'http://localhost:8001'
        }
        self.retry_attempts = 3
        self.retry_delay = 30  # seconds
        
    async def start_scheduler(self):
        """Start the trading scheduler with market-aware cron jobs"""
        try:
            if self.scheduler and self.scheduler.running:
                logger.warning("⚠️ Scheduler already running")
                return
                
            # Initialize cron execution tracker
            await cron_execution_tracker.initialize()
            
            # Initialize recommendation history storage
            await recommendation_history_storage.initialize()
            
            # Setup HTTP session
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=300)  # 5 minute timeout
            )
            
            # Initialize scheduler
            executors = {
                'default': AsyncIOExecutor()
            }
            
            self.scheduler = AsyncIOScheduler(
                executors=executors,
                timezone='Asia/Kolkata'
            )
            
            # Add cron jobs for market hours only
            await self._setup_cron_jobs()
            
            # Start the scheduler
            self.scheduler.start()
            logger.info("✅ Trading scheduler started successfully")
            
            # Log current market status
            market_info = self.market_timer.get_market_session_info()
            logger.info(f"📊 Market Status: {market_info['session']} | Is Open: {market_info['is_open']}")
            
        except Exception as e:
            logger.error(f"❌ Failed to start trading scheduler: {e}")
            raise
            
    async def stop_scheduler(self):
        """Stop the trading scheduler and cleanup resources"""
        try:
            if self.scheduler and self.scheduler.running:
                self.scheduler.shutdown(wait=True)
                logger.info("✅ Scheduler stopped")
                
            if self.session:
                await self.session.close()
                logger.info("✅ HTTP session closed")
                
            # Close cron tracker connection
            await cron_execution_tracker.close()
            
            # Close recommendation history storage connection
            await recommendation_history_storage.close()
                
        except Exception as e:
            logger.error(f"❌ Failed to stop scheduler: {e}")
            
    async def _setup_cron_jobs(self):
        """Setup cron jobs for different trading strategies"""
        
        # Short-term recommendations: Every 5 minutes during market hours (9:15-15:30)
        self.scheduler.add_job(
            func=self._run_shortterm_analysis,
            trigger=CronTrigger(
                minute='*/5',
                hour='9-15',
                day_of_week='mon-fri',
                timezone='Asia/Kolkata'
            ),
            id='shortterm_recommendations',
            name='Short-term Trading Recommendations',
            max_instances=1,
            coalesce=True,
            misfire_grace_time=60
        )
        
        # Swing recommendations: Every 5 minutes during market hours (9:15-15:30)
        self.scheduler.add_job(
            func=self._run_swing_analysis,
            trigger=CronTrigger(
                minute='*/5',
                hour='9-15',
                day_of_week='mon-fri',
                timezone='Asia/Kolkata'
            ),
            id='swing_recommendations',
            name='Swing Trading Recommendations', 
            max_instances=1,
            coalesce=True,
            misfire_grace_time=60
        )
        
        # Long-term recommendations: Every 30 minutes during market hours (9:30-15:30)
        self.scheduler.add_job(
            func=self._run_longterm_analysis,
            trigger=CronTrigger(
                minute='*',
                hour='9-15',
                day_of_week='mon-fri',
                timezone='Asia/Kolkata'
            ),
            id='longterm_recommendations',
            name='Long-term Investment Recommendations',
            max_instances=1,
            coalesce=True,
            misfire_grace_time=120
        )
        
        # Cache cleanup: Every hour
        self.scheduler.add_job(
            func=self._cleanup_cache,
            trigger=CronTrigger(
                minute='0',
                timezone='Asia/Kolkata'
            ),
            id='cache_cleanup',
            name='Cache Cleanup',
            max_instances=1
        )
        
        logger.info("✅ Cron jobs configured for market hours")
        
    async def _run_shortterm_analysis(self):
        """Run short-term analysis and cache results with execution tracking"""
        execution_id = None
        scheduled_time = datetime.now()
        
        try:
            # Start tracking execution
            execution_id = await cron_execution_tracker.start_job_execution(
                job_id="shortterm_recommendations",
                job_name="Short-term Trading Recommendations",
                job_type=CronJobType.SHORTTERM_ANALYSIS,
                scheduled_time=scheduled_time,
                job_parameters={
                    "momentum": "v1.0",
                    "limit_per_query": 50,
                    "min_score": 25.0,
                    "top_recommendations": 10
                }
            )
            
            if not self.market_timer.is_market_open():
                logger.info("⏰ Skipping short-term analysis - market closed")
                
                # Record as skipped
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.SKIPPED,
                    output_summary={"reason": "market_closed", "message": "Market is closed"}
                )
                return
                
            logger.info("🔄 Running scheduled short-term analysis...")
            
            payload = {
                "momentum": "v1.0",
                "limit_per_query": 50,
                "min_score": 25.0,
                "top_recommendations": 10
            }
            
            start_time = datetime.now()
            result = await self._make_api_call(
                url=f"{self.server_urls['shortterm']}/api/shortterm/shortterm-buy-recommendations",
                payload=payload,
                strategy="short-term"
            )
            end_time = datetime.now()
            
            if result:
                count = len(result.get('recommendations', []))
                logger.info(f"✅ Short-term analysis complete: {count} recommendations cached")
                
                # Store recommendations in history database
                try:
                    market_info = self.market_timer.get_market_session_info()
                    batch_id = await recommendation_history_storage.store_recommendation_batch(
                        execution_id=execution_id,
                        cron_job_id="shortterm_recommendations",
                        strategy=RecommendationStrategy.SHORTTERM,
                        recommendations=result.get('recommendations', []),
                        metadata={
                            "algorithm_info": {
                                "version": "v1.0",
                                "strategy": "momentum",
                                "filters_applied": payload
                            },
                            "performance_metrics": {
                                "api_response_time_ms": (end_time - start_time).total_seconds() * 1000,
                                "total_processing_time_seconds": (end_time - start_time).total_seconds()
                            }
                        },
                        request_parameters=payload,
                        market_context={
                            "market_condition": market_info.get('session', 'unknown'),
                            "trading_session": market_info.get('session_id', ''),
                            "market_open": market_info.get('is_open', False),
                            "timestamp": datetime.now()
                        }
                    )
                    logger.info(f"✅ Stored short-term recommendations batch: {batch_id}")
                except Exception as storage_error:
                    logger.error(f"⚠️ Failed to store short-term recommendations: {storage_error}")
                
                # Record successful execution
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.SUCCESS,
                    output_summary={
                        "recommendations_generated": count,
                        "api_response_time_ms": (end_time - start_time).total_seconds() * 1000,
                        "strategy": "short-term",
                        "cache_updated": True,
                        "history_stored": True
                    },
                    performance_metrics={
                        "api_call_duration_seconds": (end_time - start_time).total_seconds(),
                        "recommendations_count": count,
                        "payload_size": len(str(payload))
                    }
                )
            else:
                # Record failed execution
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.FAILED,
                    error_message="API call returned no results",
                    output_summary={
                        "recommendations_generated": 0,
                        "api_response_time_ms": (end_time - start_time).total_seconds() * 1000,
                        "strategy": "short-term"
                    }
                )
            
        except Exception as e:
            logger.error(f"❌ Short-term analysis failed: {e}")
            
            # Record failed execution
            if execution_id:
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.FAILED,
                    error_message=str(e),
                    error_details={"exception_type": type(e).__name__, "strategy": "short-term"}
                )
            
    async def _run_swing_analysis(self):
        """Run swing analysis and cache results with execution tracking"""
        execution_id = None
        scheduled_time = datetime.now()
        
        try:
            # Start tracking execution
            execution_id = await cron_execution_tracker.start_job_execution(
                job_id="swing_recommendations",
                job_name="Swing Trading Recommendations",
                job_type=CronJobType.SWING_ANALYSIS,
                scheduled_time=scheduled_time,
                job_parameters={
                    "momentum": "v1.0",
                    "limit_per_query": 50,
                    "min_score": 25.0,
                    "top_recommendations": 15
                }
            )
            
            if not self.market_timer.is_market_open():
                logger.info("⏰ Skipping swing analysis - market closed")
                
                # Record as skipped
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.SKIPPED,
                    output_summary={"reason": "market_closed", "message": "Market is closed"}
                )
                return
                
            logger.info("🔄 Running scheduled swing analysis...")
            
            payload = {
                "momentum": "v1.0",
                "limit_per_query": 50,
                "min_score": 25.0,
                "top_recommendations": 15
            }
            
            start_time = datetime.now()
            result = await self._make_api_call(
                url=f"{self.server_urls['swing']}/api/swing/swing-buy-recommendations",
                payload=payload,
                strategy="swing"
            )
            end_time = datetime.now()
            
            if result:
                count = len(result.get('recommendations', []))
                logger.info(f"✅ Swing analysis complete: {count} recommendations cached")
                
                # Store recommendations in history database
                try:
                    market_info = self.market_timer.get_market_session_info()
                    batch_id = await recommendation_history_storage.store_recommendation_batch(
                        execution_id=execution_id,
                        cron_job_id="swing_recommendations",
                        strategy=RecommendationStrategy.SWING,
                        recommendations=result.get('recommendations', []),
                        metadata={
                            "algorithm_info": {
                                "version": "v1.0",
                                "strategy": "swing_momentum",
                                "filters_applied": payload
                            },
                            "performance_metrics": {
                                "api_response_time_ms": (end_time - start_time).total_seconds() * 1000,
                                "total_processing_time_seconds": (end_time - start_time).total_seconds()
                            }
                        },
                        request_parameters=payload,
                        market_context={
                            "market_condition": market_info.get('session', 'unknown'),
                            "trading_session": market_info.get('session_id', ''),
                            "market_open": market_info.get('is_open', False),
                            "timestamp": datetime.now()
                        }
                    )
                    logger.info(f"✅ Stored swing recommendations batch: {batch_id}")
                except Exception as storage_error:
                    logger.error(f"⚠️ Failed to store swing recommendations: {storage_error}")
                
                # Record successful execution
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.SUCCESS,
                    output_summary={
                        "recommendations_generated": count,
                        "api_response_time_ms": (end_time - start_time).total_seconds() * 1000,
                        "strategy": "swing",
                        "cache_updated": True,
                        "history_stored": True
                    },
                    performance_metrics={
                        "api_call_duration_seconds": (end_time - start_time).total_seconds(),
                        "recommendations_count": count,
                        "payload_size": len(str(payload))
                    }
                )
            else:
                # Record failed execution
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.FAILED,
                    error_message="API call returned no results",
                    output_summary={
                        "recommendations_generated": 0,
                        "api_response_time_ms": (end_time - start_time).total_seconds() * 1000,
                        "strategy": "swing"
                    }
                )
                
        except Exception as e:
            logger.error(f"❌ Swing analysis failed: {e}")
            
            # Record failed execution
            if execution_id:
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.FAILED,
                    error_message=str(e),
                    error_details={"exception_type": type(e).__name__, "strategy": "swing"}
                )
            
    async def _run_longterm_analysis(self):
        """Run long-term analysis and cache results with execution tracking"""
        execution_id = None
        scheduled_time = datetime.now()
        
        try:
            # Start tracking execution
            execution_id = await cron_execution_tracker.start_job_execution(
                job_id="longterm_recommendations",
                job_name="Long-term Investment Recommendations",
                job_type=CronJobType.LONGTERM_ANALYSIS,
                scheduled_time=scheduled_time,
                job_parameters={
                    "combination": {
                        "fundamental": "v1.0",
                        "momentum": "v1.0", 
                        "value": "v1.0",
                        "quality": "v1.0"
                    },
                    "limit_per_query": 50,
                    "min_score": 25.0,
                    "top_recommendations": 20
                }
            )
            
            if not self.market_timer.is_market_open():
                logger.info("⏰ Skipping long-term analysis - market closed")
                
                # Record as skipped
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.SKIPPED,
                    output_summary={"reason": "market_closed", "message": "Market is closed"}
                )
                return
                
            logger.info("🔄 Running scheduled long-term analysis...")
            
            payload = {
                "combination": {
                    "fundamental": "v1.0",
                    "momentum": "v1.0", 
                    "value": "v1.0",
                    "quality": "v1.0"
                },
                "limit_per_query": 50,
                "min_score": 25.0,
                "top_recommendations": 20
            }
            
            start_time = datetime.now()
            result = await self._make_api_call(
                url=f"{self.server_urls['longterm']}/api/longterm/long-buy-recommendations",
                payload=payload,
                strategy="long-term"
            )
            end_time = datetime.now()
            
            if result:
                count = len(result.get('recommendations', []))
                logger.info(f"✅ Long-term analysis complete: {count} recommendations cached")
                
                # Store recommendations in history database
                try:
                    market_info = self.market_timer.get_market_session_info()
                    batch_id = await recommendation_history_storage.store_recommendation_batch(
                        execution_id=execution_id,
                        cron_job_id="longterm_recommendations",
                        strategy=RecommendationStrategy.LONGTERM,
                        recommendations=result.get('recommendations', []),
                        metadata={
                            "algorithm_info": {
                                "version": "v1.0",
                                "strategy": "combination",
                                "combination_strategies": ["fundamental", "momentum", "value", "quality"],
                                "filters_applied": payload
                            },
                            "performance_metrics": {
                                "api_response_time_ms": (end_time - start_time).total_seconds() * 1000,
                                "total_processing_time_seconds": (end_time - start_time).total_seconds()
                            }
                        },
                        request_parameters=payload,
                        market_context={
                            "market_condition": market_info.get('session', 'unknown'),
                            "trading_session": market_info.get('session_id', ''),
                            "market_open": market_info.get('is_open', False),
                            "timestamp": datetime.now()
                        }
                    )
                    logger.info(f"✅ Stored long-term recommendations batch: {batch_id}")
                except Exception as storage_error:
                    logger.error(f"⚠️ Failed to store long-term recommendations: {storage_error}")
                
                # Record successful execution
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.SUCCESS,
                    output_summary={
                        "recommendations_generated": count,
                        "api_response_time_ms": (end_time - start_time).total_seconds() * 1000,
                        "strategy": "long-term",
                        "cache_updated": True,
                        "history_stored": True
                    },
                    performance_metrics={
                        "api_call_duration_seconds": (end_time - start_time).total_seconds(),
                        "recommendations_count": count,
                        "payload_size": len(str(payload))
                    }
                )
            else:
                # Record failed execution
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.FAILED,
                    error_message="API call returned no results",
                    output_summary={
                        "recommendations_generated": 0,
                        "api_response_time_ms": (end_time - start_time).total_seconds() * 1000,
                        "strategy": "long-term"
                    }
                )
                
        except Exception as e:
            logger.error(f"❌ Long-term analysis failed: {e}")
            
            # Record failed execution
            if execution_id:
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.FAILED,
                    error_message=str(e),
                    error_details={"exception_type": type(e).__name__, "strategy": "long-term"}
                )
            
    async def _make_api_call(self, url: str, payload: Dict, strategy: str) -> Optional[Dict]:
        """Make API call with retry logic"""
        
        for attempt in range(self.retry_attempts):
            try:
                async with self.session.post(
                    url,
                    json=payload,
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        logger.info(f"✅ {strategy} API call successful (attempt {attempt + 1})")
                        return result
                    else:
                        error_text = await response.text()
                        logger.warning(f"⚠️ {strategy} API call failed (attempt {attempt + 1}): {response.status} - {error_text}")
                        
            except Exception as e:
                logger.warning(f"⚠️ {strategy} API call error (attempt {attempt + 1}): {e}")
                
            # Wait before retry (except on last attempt)
            if attempt < self.retry_attempts - 1:
                await asyncio.sleep(self.retry_delay)
                
        logger.error(f"❌ {strategy} API call failed after {self.retry_attempts} attempts")
        return None
        
    async def _cleanup_cache(self):
        """Clean up expired cache entries with execution tracking"""
        execution_id = None
        scheduled_time = datetime.now()
        
        try:
            # Start tracking execution
            execution_id = await cron_execution_tracker.start_job_execution(
                job_id="cache_cleanup",
                job_name="Cache Cleanup",
                job_type=CronJobType.CACHE_CLEANUP,
                scheduled_time=scheduled_time
            )
            
            start_time = datetime.now()
            await recommendation_cache.cleanup_expired_cache()
            end_time = datetime.now()
            
            logger.info("✅ Cache cleanup completed")
            
            # Record successful execution
            await cron_execution_tracker.complete_job_execution(
                execution_id=execution_id,
                status=CronJobStatus.SUCCESS,
                output_summary={
                    "operation": "cache_cleanup",
                    "duration_ms": (end_time - start_time).total_seconds() * 1000,
                    "status": "completed"
                },
                performance_metrics={
                    "cleanup_duration_seconds": (end_time - start_time).total_seconds()
                }
            )
            
        except Exception as e:
            logger.error(f"❌ Cache cleanup failed: {e}")
            
            # Record failed execution
            if execution_id:
                await cron_execution_tracker.complete_job_execution(
                    execution_id=execution_id,
                    status=CronJobStatus.FAILED,
                    error_message=str(e),
                    error_details={"exception_type": type(e).__name__, "operation": "cache_cleanup"}
                )
            
    def get_scheduler_status(self) -> Dict[str, Any]:
        """Get current scheduler status and job information"""
        if not self.scheduler:
            return {"status": "not_initialized"}
            
        jobs = []
        for job in self.scheduler.get_jobs():
            next_run = job.next_run_time
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": next_run.isoformat() if next_run else None,
                "trigger": str(job.trigger)
            })
            
        market_info = self.market_timer.get_market_session_info()
        
        return {
            "status": "running" if self.scheduler.running else "stopped",
            "market_session": market_info,
            "jobs": jobs,
            "server_urls": self.server_urls,
            "retry_config": {
                "attempts": self.retry_attempts,
                "delay_seconds": self.retry_delay
            }
        }
        
    async def force_run_all(self) -> Dict[str, Any]:
        """Force run all trading analyses (for testing/manual execution)"""
        logger.info("🔄 Force running all trading analyses...")
        
        results = {}
        
        # Run short-term analysis
        try:
            await self._run_shortterm_analysis()
            results["shortterm"] = "success"
        except Exception as e:
            results["shortterm"] = f"failed: {e}"
            
        # Run swing analysis  
        try:
            await self._run_swing_analysis()
            results["swing"] = "success"
        except Exception as e:
            results["swing"] = f"failed: {e}"
            
        # Run long-term analysis
        try:
            await self._run_longterm_analysis()
            results["longterm"] = "success"
        except Exception as e:
            results["longterm"] = f"failed: {e}"
            
        logger.info(f"✅ Force run completed: {results}")
        return results

# Global scheduler instance
trading_scheduler = TradingScheduler() 