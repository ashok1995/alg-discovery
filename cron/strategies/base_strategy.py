#!/usr/bin/env python3
"""
Base Strategy Class for Trading Cron Jobs
=========================================

This module provides the base class that all strategy-specific cron jobs inherit from.
It provides common functionality for market timing, scheduling, and status reporting.
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod

from api.services.market_timer import MarketTimer
from api.services.trading_scheduler import trading_scheduler
from api.models.recommendation_models import recommendation_cache

logger = logging.getLogger(__name__)

class BaseStrategyCron(ABC):
    """
    Base class for all strategy-specific cron jobs
    """
    
    def __init__(self, strategy_name: str, interval_minutes: int = 5):
        self.strategy_name = strategy_name
        self.interval_minutes = interval_minutes
        self.market_timer = MarketTimer()
        self.running = False
        self.start_time = None
        self.last_run_time = None
        self.run_count = 0
        self.error_count = 0
        self.last_error = None
        
        # Get strategy-specific configuration
        self.enabled = os.getenv(f"ENABLE_{strategy_name.upper()}", "true").lower() == "true"
        self.confidence_threshold = float(os.getenv(f"{strategy_name.upper()}_CONFIDENCE_THRESHOLD", "50.0"))
        self.strength_threshold = float(os.getenv(f"{strategy_name.upper()}_STRENGTH_THRESHOLD", "60.0"))
        self.limit = int(os.getenv(f"{strategy_name.upper()}_LIMIT", "10"))
        
    async def start(self):
        """Start the strategy cron job"""
        if not self.enabled:
            logger.info(f"⏭️ {self.strategy_name} cron is disabled, skipping start")
            return
            
        try:
            logger.info(f"🚀 Starting {self.strategy_name} cron job...")
            self.running = True
            self.start_time = datetime.now()
            
            # The strategy is now ready to be called by the main scheduler
            # No need to add jobs to scheduler as they're managed in trading_scheduler.py
            
            logger.info(f"✅ {self.strategy_name} cron job started successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to start {self.strategy_name} cron: {e}")
            self.last_error = str(e)
            raise
            
    async def stop(self):
        """Stop the strategy cron job"""
        try:
            logger.info(f"🛑 Stopping {self.strategy_name} cron job...")
            self.running = False
            
            # Strategy is stopped, no need to remove from scheduler
            
            logger.info(f"✅ {self.strategy_name} cron job stopped successfully")
            
        except Exception as e:
            logger.error(f"❌ Error stopping {self.strategy_name} cron: {e}")
            
    async def _run_strategy(self):
        """Internal method to run the strategy with error handling"""
        if not self.running:
            return
            
        try:
            # Check if market is open
            market_info = self.market_timer.get_market_session_info()
            if not market_info.get('is_open', False):
                logger.debug(f"⏰ Market is closed, skipping {self.strategy_name} run")
                return
                
            logger.info(f"🔄 Running {self.strategy_name} strategy...")
            
            # Run the strategy-specific logic
            result = await self.execute_strategy()
            
            # Update statistics
            self.run_count += 1
            self.last_run_time = datetime.now()
            
            # Cache the results
            if result:
                await self._cache_results(result)
                
            logger.info(f"✅ {self.strategy_name} strategy completed successfully")
            
        except Exception as e:
            logger.error(f"❌ Error in {self.strategy_name} strategy: {e}")
            self.error_count += 1
            self.last_error = str(e)
            
    @abstractmethod
    async def execute_strategy(self) -> Dict[str, Any]:
        """
        Abstract method that must be implemented by each strategy.
        This is where the strategy-specific logic goes.
        
        Returns:
            Dict containing the strategy results
        """
        pass
        
    async def _cache_results(self, results: Dict[str, Any]):
        """Cache the strategy results"""
        try:
            cache_key = f"{self.strategy_name}_recommendations"
            await recommendation_cache.set(
                key=cache_key,
                value=results,
                ttl=3600  # 1 hour cache
            )
            logger.debug(f"💾 Cached {self.strategy_name} results")
        except Exception as e:
            logger.error(f"❌ Error caching {self.strategy_name} results: {e}")
            
    async def get_status(self) -> Dict[str, Any]:
        """Get the status of this strategy"""
        try:
            # Get cached results
            cache_key = f"{self.strategy_name}_recommendations"
            cached_results = await recommendation_cache.get(cache_key)
            
            # Calculate uptime
            uptime = None
            if self.start_time:
                uptime_delta = datetime.now() - self.start_time
                uptime = {
                    "seconds": uptime_delta.total_seconds(),
                    "human_readable": str(uptime_delta).split('.')[0]
                }
                
            return {
                "strategy_name": self.strategy_name,
                "status": "running" if self.running else "stopped",
                "enabled": self.enabled,
                "start_time": self.start_time.isoformat() if self.start_time else None,
                "uptime": uptime,
                "last_run_time": self.last_run_time.isoformat() if self.last_run_time else None,
                "run_count": self.run_count,
                "error_count": self.error_count,
                "last_error": self.last_error,
                "configuration": {
                    "interval_minutes": self.interval_minutes,
                    "confidence_threshold": self.confidence_threshold,
                    "strength_threshold": self.strength_threshold,
                    "limit": self.limit
                },
                "cached_results": cached_results is not None,
                "last_results_count": len(cached_results.get('recommendations', [])) if cached_results else 0
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting {self.strategy_name} status: {e}")
            return {"error": str(e)}
            
    async def force_run(self) -> Dict[str, Any]:
        """Force run the strategy immediately"""
        try:
            logger.info(f"🔄 Force running {self.strategy_name} strategy...")
            
            # Run the strategy
            result = await self.execute_strategy()
            
            # Cache results
            if result:
                await self._cache_results(result)
                
            return {
                "status": "completed",
                "strategy": self.strategy_name,
                "result": result,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error force running {self.strategy_name}: {e}")
            return {
                "status": "failed",
                "strategy": self.strategy_name,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            } 