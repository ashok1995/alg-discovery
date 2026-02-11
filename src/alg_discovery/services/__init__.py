"""
Services Package
================

Core services for the automated trading system including:
- Data fetching and caching
- Analysis and signal generation
- WebSocket communication
- Background job scheduling
"""

from api.services.data_service import RealTimeDataService, DataCache, DataSource
from api.services.analysis_engine import AnalysisEngine, TradingStrategy, RSIMomentumStrategy, MACDStrategy, BollingerBandsStrategy
from api.services.websocket_manager import WebSocketManager, ConnectionManager
from api.services.job_scheduler import JobScheduler, BackgroundJob, JobStatus, JobResult

# --- CRON SHIMS (auto-generated) -------------------------------------------------
# Expose schedulers at legacy import path `alg_discovery.services.*scheduler` so
# that code which migrates to the new cron package can still import from here.
# -------------------------------------------------------------------------------

from importlib import import_module as _imp

for _mod_name in (
    "job_scheduler",
    "recommendation_scheduler",
    "trading_scheduler",
    "market_timer",
):
    try:
        globals()[_mod_name] = _imp(f"alg_discovery.services.{_mod_name}")
    except ModuleNotFoundError:  # pragma: no cover
        # During partial refactor some modules may be missing; ignore.
        pass

__all__ = [
    # Data Service
    "RealTimeDataService",
    "DataCache", 
    "DataSource",
    
    # Analysis Engine
    "AnalysisEngine",
    "TradingStrategy",
    "RSIMomentumStrategy",
    "MACDStrategy", 
    "BollingerBandsStrategy",
    
    # WebSocket Manager
    "WebSocketManager",
    "ConnectionManager",
    
    # Job Scheduler
    "JobScheduler",
    "BackgroundJob",
    "JobStatus",
    "JobResult"
] 