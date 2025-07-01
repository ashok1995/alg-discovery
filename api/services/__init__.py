"""
Services Package
================

Core services for the automated trading system including:
- Data fetching and caching
- Analysis and signal generation
- WebSocket communication
- Background job scheduling
"""

from services.data_service import RealTimeDataService, DataCache, DataSource
from services.analysis_engine import AnalysisEngine, TradingStrategy, RSIMomentumStrategy, MACDStrategy, BollingerBandsStrategy
from services.websocket_manager import WebSocketManager, ConnectionManager
from services.job_scheduler import JobScheduler, BackgroundJob, JobStatus, JobResult

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