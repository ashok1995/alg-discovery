#!/usr/bin/env python3
"""
Trading Cron Manager

Master service for managing automated trading recommendations with:
- Market-aware cron job scheduling
- Database caching with MongoDB/file fallback
- Real-time market timing validation
- Centralized control interface
- Health monitoring and status reporting
- Separate strategies for different trading types

Usage:
    python cron/main.py    # Start all services
"""

import asyncio
import logging
import signal
import sys
import json
from datetime import datetime
from typing import Dict, Any
from pathlib import Path

# Setup paths for imports
sys.path.append(str(Path(__file__).parent.parent))

from api.services.trading_scheduler import trading_scheduler
from api.services.market_timer import MarketTimer
from api.models.recommendation_models import recommendation_cache

# Import strategy-specific cron jobs
from cron.strategies.intraday_buy import IntradayBuyCron
from cron.strategies.intraday_sell import IntradaySellCron
from cron.strategies.short_buy import ShortBuyCron
from cron.strategies.swing_buy import SwingBuyCron
from cron.strategies.long_buy import LongBuyCron

logger = logging.getLogger(__name__)

class TradingCronManager:
    """
    Master manager for all trading cron operations with separate strategies
    """
    
    def __init__(self):
        self.market_timer = MarketTimer()
        self.running = False
        self.start_time = None
        
        # Initialize strategy-specific cron jobs
        self.intraday_buy_cron = IntradayBuyCron()
        self.intraday_sell_cron = IntradaySellCron()
        self.short_buy_cron = ShortBuyCron()
        self.swing_buy_cron = SwingBuyCron()
        self.long_buy_cron = LongBuyCron()
        
        # Strategy registry
        self.strategies = {
            'intraday_buy': self.intraday_buy_cron,
            'intraday_sell': self.intraday_sell_cron,
            'short_buy': self.short_buy_cron,
            'swing_buy': self.swing_buy_cron,
            'long_buy': self.long_buy_cron
        }
        
    async def start_all_services(self):
        """Start all trading services and cron jobs"""
        try:
            logger.info("🚀 Starting Trading Cron Manager...")
            self.start_time = datetime.now()
            
            # Initialize cache
            logger.info("📦 Initializing recommendation cache...")
            await recommendation_cache.initialize()
            
            # Start scheduler
            logger.info("⏰ Starting trading scheduler...")
            await trading_scheduler.start_scheduler()
            
            # Log market status
            market_info = self.market_timer.get_market_session_info()
            logger.info(f"📊 Market Status: {market_info['session']} | Is Open: {market_info['is_open']}")
            
            if market_info['is_open']:
                logger.info("✅ Market is open - cron jobs will execute")
            else:
                logger.info("⏰ Market is closed - cron jobs will wait for market hours")
                if market_info.get('next_market_open'):
                    logger.info(f"📅 Next market open: {market_info['next_market_open']}")
            
            # Set up signal handlers for graceful shutdown
            signal.signal(signal.SIGINT, self._signal_handler)
            signal.signal(signal.SIGTERM, self._signal_handler)
            
            # Start all strategy cron jobs
            await self._start_all_strategies()
            
            self.running = True
            logger.info("✅ Trading Cron Manager started successfully")
            logger.info("📋 Scheduled Jobs:")
            logger.info("   - Intraday Buy: Every 5 minutes (market hours)")
            logger.info("   - Intraday Sell: Every 5 minutes (market hours)")
            logger.info("   - Short Buy: Every 5 minutes (market hours)")
            logger.info("   - Swing Buy: Every 5 minutes (market hours)")
            logger.info("   - Long Buy: Every 30 minutes (market hours)")
            logger.info("   - Cache cleanup: Every hour")
            
            # Keep the service running
            while self.running:
                await asyncio.sleep(60)  # Check every minute
                
        except Exception as e:
            logger.error(f"❌ Failed to start services: {e}")
            await self.stop_all_services()
            sys.exit(1)
            
    async def _start_all_strategies(self):
        """Start all strategy-specific cron jobs"""
        try:
            logger.info("🔄 Starting all trading strategies...")
            
            # Start each strategy
            for strategy_name, strategy_cron in self.strategies.items():
                try:
                    await strategy_cron.start()
                    logger.info(f"✅ {strategy_name} cron started")
                except Exception as e:
                    logger.error(f"❌ Failed to start {strategy_name} cron: {e}")
                    
            logger.info("✅ All strategies started")
            
        except Exception as e:
            logger.error(f"❌ Error starting strategies: {e}")
            raise
            
    async def stop_all_services(self):
        """Stop all trading services gracefully"""
        try:
            logger.info("🛑 Stopping Trading Cron Manager...")
            self.running = False
            
            # Stop all strategies
            await self._stop_all_strategies()
            
            # Stop scheduler
            await trading_scheduler.stop_scheduler()
            
            # Close cache connections
            await recommendation_cache.close()
            
            logger.info("✅ All services stopped successfully")
            
        except Exception as e:
            logger.error(f"❌ Error stopping services: {e}")
            
    async def _stop_all_strategies(self):
        """Stop all strategy-specific cron jobs"""
        try:
            logger.info("🛑 Stopping all trading strategies...")
            
            # Stop each strategy
            for strategy_name, strategy_cron in self.strategies.items():
                try:
                    await strategy_cron.stop()
                    logger.info(f"✅ {strategy_name} cron stopped")
                except Exception as e:
                    logger.error(f"❌ Error stopping {strategy_name} cron: {e}")
                    
            logger.info("✅ All strategies stopped")
            
        except Exception as e:
            logger.error(f"❌ Error stopping strategies: {e}")
            
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"📡 Received signal {signum}, initiating graceful shutdown...")
        self.running = False
        
    async def get_comprehensive_status(self) -> Dict[str, Any]:
        """Get detailed status of all services"""
        try:
            # Market status
            market_info = self.market_timer.get_market_session_info()
            
            # Scheduler status  
            scheduler_status = trading_scheduler.get_scheduler_status()
            
            # Cache status
            cache_stats = await recommendation_cache.get_cache_stats()
            
            # Strategy statuses
            strategy_statuses = {}
            for strategy_name, strategy_cron in self.strategies.items():
                try:
                    strategy_statuses[strategy_name] = await strategy_cron.get_status()
                except Exception as e:
                    strategy_statuses[strategy_name] = {"error": str(e)}
            
            # Runtime info
            uptime = None
            if self.start_time:
                uptime_delta = datetime.now() - self.start_time
                uptime = {
                    "seconds": uptime_delta.total_seconds(),
                    "human_readable": str(uptime_delta).split('.')[0]
                }
            
            return {
                "service": {
                    "status": "running" if self.running else "stopped",
                    "start_time": self.start_time.isoformat() if self.start_time else None,
                    "uptime": uptime
                },
                "market": market_info,
                "scheduler": scheduler_status,
                "cache": cache_stats,
                "strategies": strategy_statuses,
                "summary": {
                    "market_open": market_info.get('is_open', False),
                    "jobs_active": scheduler_status.get('status') == 'running',
                    "cache_connected": cache_stats.get('connected', False),
                    "total_cached_recommendations": cache_stats.get('total_count', 0),
                    "active_strategies": len([s for s in strategy_statuses.values() if s.get('status') == 'running'])
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting status: {e}")
            return {"error": str(e)}
            
    async def force_run_all_analyses(self) -> Dict[str, Any]:
        """Force run all trading analyses manually"""
        logger.info("🔄 Forcing all trading analyses...")
        
        try:
            # Get current market status
            market_info = self.market_timer.get_market_session_info()
            
            # Force run all strategies
            results = {}
            for strategy_name, strategy_cron in self.strategies.items():
                try:
                    strategy_results = await strategy_cron.force_run()
                    results[strategy_name] = strategy_results
                except Exception as e:
                    results[strategy_name] = {"error": str(e)}
            
            return {
                "status": "completed",
                "market_info": market_info,
                "results": results,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error in force run: {e}")
            return {"status": "failed", "error": str(e)}
            
    async def get_strategy_status(self, strategy_name: str) -> Dict[str, Any]:
        """Get status of a specific strategy"""
        if strategy_name not in self.strategies:
            return {"error": f"Strategy '{strategy_name}' not found"}
            
        try:
            return await self.strategies[strategy_name].get_status()
        except Exception as e:
            return {"error": str(e)}
            
    async def force_run_strategy(self, strategy_name: str) -> Dict[str, Any]:
        """Force run a specific strategy"""
        if strategy_name not in self.strategies:
            return {"error": f"Strategy '{strategy_name}' not found"}
            
        try:
            return await self.strategies[strategy_name].force_run()
        except Exception as e:
            return {"error": str(e)} 