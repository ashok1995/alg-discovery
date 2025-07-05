#!/usr/bin/env python3
"""
AlgoDiscovery Trading API - FastAPI Application
==============================================

This file contains the main FastAPI application with all endpoints and routes.
It's imported by the main.py entry point.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager
from collections import deque, Counter
import time

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel
import json

# Import configurations and models
from config import app_settings as settings, server_config
from api.models.stock_models import (
    StockData, TechnicalIndicators, TradingSignal, Portfolio,
    IntradaySignal, IntradayMomentum, IntradayScreenerResult, VWAPData, IntradayAlert
)

# Import services
from api.services.data_service import RealTimeDataService, data_service as global_data_service
from api.services.analysis_engine import AnalysisEngine, analysis_engine as global_analysis_engine
from api.services.job_scheduler import JobScheduler
from api.services.websocket_manager import WebSocketManager
from api.services.intraday_service import IntradayService
from api.services.swing_trading_service import SwingTradingService
from api.services.long_term_service import LongTermInvestmentService
from api.services.config_manager import config_manager

# Order Management System imports
from order.order_manager import OrderManager
from order.risk_manager import RiskManager
from order.position_manager import PositionManager
from order.notification_service import NotificationService
from order.validators import OrderValidator
from order.execution_engine import ExecutionEngine
from order import api_routes as order_routes

# Configure logging
logger = logging.getLogger(__name__)

# Global services
data_service: Optional[RealTimeDataService] = None
analysis_engine: Optional[AnalysisEngine] = None
job_scheduler: Optional[JobScheduler] = None
scheduler_service: Optional[JobScheduler] = None
websocket_manager = WebSocketManager()
intraday_service: Optional[IntradayService] = None
swing_trading_service: Optional[SwingTradingService] = None
long_term_service: Optional[LongTermInvestmentService] = None

# Order Management System globals
order_manager: Optional[OrderManager] = None
risk_manager: Optional[RiskManager] = None
position_manager: Optional[PositionManager] = None
notification_service: Optional[NotificationService] = None
order_validator: Optional[OrderValidator] = None
execution_engine: Optional[ExecutionEngine] = None

# Global variables for tracking recommendations history for ranking
_buy_recommendations_history = deque(maxlen=10)  # Keep last 10 scans
_sell_recommendations_history = deque(maxlen=10)  # Keep last 10 scans
_last_scan_time = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global data_service, intraday_service, swing_trading_service, long_term_service, scheduler_service, websocket_manager
    global order_manager, risk_manager, position_manager, notification_service, order_validator, execution_engine
    
    try:
        logger.info("🚀 Starting AlgoDiscovery Trading API...")
        
        # Initialize Configuration Manager first
        await config_manager.initialize()
        
        # Initialize core services
        data_service = RealTimeDataService()
        
        # Initialize analysis engine
        analysis_engine = AnalysisEngine(data_service)
        
        # Initialize WebSocket manager
        websocket_manager = WebSocketManager()
        
        intraday_service = IntradayService(data_service)
        
        # Initialize Swing Trading Service with config
        swing_trading_service = SwingTradingService(data_service)
        
        # Initialize Long-Term Investment Service
        long_term_service = LongTermInvestmentService(data_service)
        logger.info("✅ Long-term investment service initialized")
        
        # Initialize Order Management System
        logger.info("🔧 Initializing Order Management System...")
        
        # Initialize notification service
        notification_service = NotificationService()
        await notification_service.start()
        logger.info("✅ Notification service initialized")
        
        # Initialize position manager
        position_manager = PositionManager(data_service)
        logger.info("✅ Position manager initialized")
        
        # Initialize risk manager
        risk_manager = RiskManager(position_manager=position_manager)
        logger.info("✅ Risk manager initialized")
        
        # Initialize order validator
        order_validator = OrderValidator()
        logger.info("✅ Order validator initialized")
        
        # Initialize execution engine
        execution_engine = ExecutionEngine()
        await execution_engine.start()
        logger.info("✅ Execution engine initialized")
        
        # Initialize order manager
        order_manager = OrderManager(
            execution_engine=execution_engine,
            position_manager=position_manager,
            risk_manager=risk_manager,
            validator=order_validator,
            notification_service=notification_service
        )
        await order_manager.start()
        logger.info("✅ Order manager initialized")
        
        # Initialize API routes with service instances
        order_routes.initialize_services(
            order_manager, risk_manager, position_manager, notification_service
        )
        logger.info("✅ Order management API routes initialized")
        
        # Initialize scheduler with all required parameters
        scheduler_service = JobScheduler(data_service, analysis_engine, websocket_manager)
        await scheduler_service.start()
        
        logger.info("✅ All services initialized successfully")
        logger.info(f"🌐 WebSocket Manager: {websocket_manager}")
        
        yield
        
    except Exception as e:
        logger.error(f"❌ Failed to start services: {e}")
        raise
    finally:
        # Cleanup
        try:
            # Stop order management services
            if order_manager:
                await order_manager.stop()
                logger.info("🛑 Order manager stopped")
            
            if execution_engine:
                await execution_engine.stop()
                logger.info("🛑 Execution engine stopped")
            
            if notification_service:
                await notification_service.stop()
                logger.info("🛑 Notification service stopped")
            
            # Stop core services
            if scheduler_service:
                await scheduler_service.stop()
            if config_manager:
                config_manager.cleanup()
            logger.info("🛑 All services stopped")
        except Exception as e:
            logger.error(f"❌ Error during cleanup: {e}")

# Create FastAPI app
app = FastAPI(
    title="AlgoDiscovery Trading API",
    description="Advanced Intraday Stock Discovery & Trading Backend",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=server_config.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include order management router
app.include_router(order_routes.router, prefix="/api/v1")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint with detailed service status"""
    try:
        # Get configuration summary
        config_summary = config_manager.get_config_summary()
        
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "data_service": "available" if data_service else "unavailable",
                "intraday_service": "available" if intraday_service else "unavailable", 
                "swing_trading_service": "available" if swing_trading_service else "unavailable",
                "scheduler_service": "available" if scheduler_service else "unavailable",
                "websocket_manager": "available" if websocket_manager else "unavailable",
                "config_manager": "available" if config_manager else "unavailable",
                "order_manager": "available" if order_manager and hasattr(order_manager, 'is_running') and order_manager.is_running else "unavailable",
                "risk_manager": "available" if risk_manager else "unavailable",
                "position_manager": "available" if position_manager else "unavailable",
                "notification_service": "available" if notification_service and hasattr(notification_service, 'is_running') and notification_service.is_running else "unavailable",
                "execution_engine": "available" if execution_engine else "unavailable"
            },
            "configuration": config_summary,
            "api_version": "2.0.0",
            "features": ["intraday_trading", "swing_trading", "configurable_strategies", "real_time_data", "order_management", "risk_controls", "position_tracking"]
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

# Import all route modules
from api.routes import intraday, swing, longterm, stock_data, signals, portfolio, websocket, admin, yahoo_finance

# Include all route modules
app.include_router(intraday.router, prefix="/api/intraday", tags=["Intraday Trading"])
app.include_router(swing.router, prefix="/api/swing", tags=["Swing Trading"])
app.include_router(longterm.router, prefix="/api/longterm", tags=["Long-term Investment"])
app.include_router(stock_data.router, prefix="/api/stock", tags=["Stock Data"])
app.include_router(signals.router, prefix="/api/signals", tags=["Trading Signals"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Portfolio"])
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(yahoo_finance.router, prefix="/api/yahoo", tags=["Yahoo Finance"])

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Handle 404 errors."""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": f"The requested resource was not found",
            "path": str(request.url.path)
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Handle 500 errors."""
    logger.error(f"Internal server error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An internal server error occurred"
        }
    ) 