#!/usr/bin/env python3
"""
FastAPI Backend for AlgoDiscovery Trading System
==============================================

A comprehensive backend API providing:
- Intraday stock discovery and screening
- Real-time momentum analysis
- Trading signals generation
- Volume and breakout analysis
- WebSocket connections for live updates
- Advanced technical analysis
"""

import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import uvicorn
from contextlib import asynccontextmanager
from collections import deque, Counter
import time

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
import json

# Import configurations and models
from config import app_settings as settings, server_config  # Use absolute import
from models.stock_models import (
    StockData, TechnicalIndicators, TradingSignal, Portfolio,
    IntradaySignal, IntradayMomentum, IntradayScreenerResult, VWAPData, IntradayAlert
)

# Import services
from services.data_service import RealTimeDataService, data_service as global_data_service
from services.analysis_engine import AnalysisEngine, analysis_engine as global_analysis_engine
from services.job_scheduler import JobScheduler
from services.websocket_manager import WebSocketManager
from services.intraday_service import IntradayService
from services.swing_trading_service import SwingTradingService
from services.config_manager import config_manager

# Order Management System imports
from order.order_manager import OrderManager
from order.risk_manager import RiskManager
from order.position_manager import PositionManager
from order.notification_service import NotificationService
from order.validators import OrderValidator
from order.execution_engine import ExecutionEngine
from order import api_routes as order_routes

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global services
data_service: Optional[RealTimeDataService] = None
analysis_engine: Optional[AnalysisEngine] = None
job_scheduler: Optional[JobScheduler] = None
scheduler_service: Optional[JobScheduler] = None
websocket_manager = WebSocketManager()
intraday_service: Optional[IntradayService] = None
swing_trading_service: Optional[SwingTradingService] = None

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
    global data_service, intraday_service, swing_trading_service, scheduler_service, websocket_manager
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

# =====================================================================
# INTRADAY STOCK DISCOVERY ENDPOINTS
# =====================================================================

@app.get("/api/intraday/screener/{criteria}", response_model=List[IntradayScreenerResult])
async def screen_stocks(
    criteria: str = "momentum_breakout",
    symbols: Optional[str] = Query(None, description="Comma-separated list of symbols"),
    limit: int = Query(20, description="Maximum number of results")
):
    """
    Screen stocks based on intraday criteria.
    
    Available criteria:
    - momentum_breakout: High momentum with breakout potential
    - gap_and_go: Stocks with significant gaps
    - volume_spike: Unusual volume activity
    - consolidation_breakout: Breakout from consolidation
    """
    try:
        if not intraday_service:
            raise HTTPException(status_code=503, detail="Intraday service not available")
        
        custom_symbols = None
        if symbols:
            custom_symbols = [s.strip().upper() for s in symbols.split(",")]
        
        results = await intraday_service.screener.screen_stocks(criteria, custom_symbols)
        
        return results[:limit]
    except Exception as e:
        logger.error(f"Error in stock screening: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Screening failed: {str(e)}")

@app.get("/api/intraday/top-movers", response_model=List[IntradayScreenerResult])
async def get_top_movers(
    direction: str = Query("both", description="Direction: up, down, or both"),
    limit: int = Query(10, description="Maximum number of results")
):
    """Get top moving stocks for intraday trading."""
    try:
        if not intraday_service:
            raise HTTPException(status_code=503, detail="Intraday service not available")
        
        results = await intraday_service.get_top_movers(direction, limit)
        return results
    except Exception as e:
        logger.error(f"Error getting top movers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get top movers: {str(e)}")

@app.get("/api/intraday/breakout-candidates", response_model=List[IntradayScreenerResult])
async def get_breakout_candidates(
    limit: int = Query(10, description="Maximum number of results")
):
    """Get stocks with high breakout potential."""
    try:
        if not intraday_service:
            raise HTTPException(status_code=503, detail="Intraday service not available")
        
        results = await intraday_service.get_breakout_candidates(limit)
        return results
    except Exception as e:
        logger.error(f"Error getting breakout candidates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get breakout candidates: {str(e)}")

@app.get("/api/intraday/volume-leaders", response_model=List[IntradayScreenerResult])
async def get_volume_leaders(
    limit: int = Query(10, description="Maximum number of results")
):
    """Get stocks with unusual volume activity."""
    try:
        if not intraday_service:
            raise HTTPException(status_code=503, detail="Intraday service not available")
        
        results = await intraday_service.get_volume_leaders(limit)
        return results
    except Exception as e:
        logger.error(f"Error getting volume leaders: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get volume leaders: {str(e)}")

@app.get("/api/intraday/gap-stocks", response_model=List[IntradayScreenerResult])
async def get_gap_stocks(
    min_gap: float = Query(2.0, description="Minimum gap percentage"),
    limit: int = Query(10, description="Maximum number of results")
):
    """Get stocks with significant gaps."""
    try:
        if not intraday_service:
            raise HTTPException(status_code=503, detail="Intraday service not available")
        
        results = await intraday_service.get_gap_stocks(min_gap, limit)
        return results
    except Exception as e:
        logger.error(f"Error getting gap stocks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get gap stocks: {str(e)}")

@app.get("/api/intraday/momentum/{symbol}", response_model=IntradayMomentum)
async def get_intraday_momentum(symbol: str):
    """Get detailed intraday momentum analysis for a specific stock."""
    try:
        if not intraday_service or not data_service:
            raise HTTPException(status_code=503, detail="Required services not available")
        
        # Get stock data
        stock_data = await data_service.get_stock_data(symbol.upper())
        if not stock_data:
            raise HTTPException(status_code=404, detail=f"Stock data not found for {symbol}")
        
        # Get technical indicators
        indicators = await data_service.get_technical_indicators(symbol.upper(), period="5d")
        if not indicators:
            raise HTTPException(status_code=404, detail=f"Technical indicators not available for {symbol}")
        
        # Calculate momentum
        momentum = await intraday_service.screener._calculate_intraday_momentum(
            symbol.upper(), stock_data, indicators
        )
        
        return momentum
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting momentum for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get momentum: {str(e)}")

@app.get("/api/intraday/vwap/{symbol}", response_model=VWAPData)
async def get_vwap_data(symbol: str):
    """Get VWAP (Volume Weighted Average Price) data for a stock."""
    try:
        if not intraday_service or not data_service:
            raise HTTPException(status_code=503, detail="Required services not available")
        
        # Get stock data
        stock_data = await data_service.get_stock_data(symbol.upper())
        if not stock_data:
            raise HTTPException(status_code=404, detail=f"Stock data not found for {symbol}")
        
        # Calculate VWAP
        vwap_data = await intraday_service.screener._calculate_vwap(symbol.upper(), stock_data)
        if not vwap_data:
            raise HTTPException(status_code=404, detail=f"VWAP data not available for {symbol}")
        
        return vwap_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting VWAP for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get VWAP: {str(e)}")

@app.get("/api/intraday/signals", response_model=List[IntradaySignal])
async def get_intraday_signals(
    symbols: Optional[str] = Query(None, description="Comma-separated list of symbols"),
    limit: int = Query(10, description="Maximum number of signals")
):
    """Get intraday trading signals."""
    try:
        if not intraday_service:
            raise HTTPException(status_code=503, detail="Intraday service not available")
        
        # Generate signals using the signal generator
        custom_symbols = None
        if symbols:
            custom_symbols = [s.strip().upper() for s in symbols.split(",")]
        
        signals = await intraday_service.signal_generator.generate_intraday_signals(custom_symbols)
        
        return signals[:limit]
    except Exception as e:
        logger.error(f"Error getting intraday signals: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get signals: {str(e)}")

@app.get("/api/intraday/buy-recommendations", response_model=List[IntradaySignal])
async def get_intraday_buy_recommendations(
    limit: int = Query(10, description="Maximum number of buy recommendations")
):
    """
    Get intraday buy recommendations based on bullish momentum, breakouts, and volume analysis.
    
    Returns stocks with:
    - Strong upward momentum (score > 60)
    - Bullish breakout potential
    - High volume confirmation
    - RSI not overbought (< 80)
    """
    try:
        if not intraday_service:
            raise HTTPException(status_code=503, detail="Intraday service not available")
        
        buy_recommendations = await intraday_service.get_intraday_buy_recommendations(limit)
        
        logger.info(f"Generated {len(buy_recommendations)} buy recommendations")
        return buy_recommendations
    except Exception as e:
        logger.error(f"Error getting buy recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get buy recommendations: {str(e)}")

@app.get("/api/intraday/sell-recommendations", response_model=List[IntradaySignal])
async def get_intraday_sell_recommendations(
    limit: int = Query(10, description="Maximum number of sell recommendations")
):
    """
    Get intraday sell recommendations based on bearish momentum, overbought conditions, and breakdown patterns.
    
    Returns stocks with:
    - Weak momentum indicating downtrend
    - High volume selling pressure
    - Overbought conditions ready for reversal
    - Bearish breakdown patterns
    """
    try:
        if not intraday_service:
            raise HTTPException(status_code=503, detail="Intraday service not available")
        
        sell_recommendations = await intraday_service.get_intraday_sell_recommendations(limit)
        
        logger.info(f"Generated {len(sell_recommendations)} sell recommendations")
        return sell_recommendations
    except Exception as e:
        logger.error(f"Error getting sell recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get sell recommendations: {str(e)}")

from pydantic import BaseModel

class RecommendationsRequest(BaseModel):
    limit: Optional[int] = 10

@app.get("/api/intraday/recommendations-table")
@app.post("/api/intraday/recommendations-table")
async def get_intraday_recommendations_table(
    request: Optional[RecommendationsRequest] = None,
    limit: int = Query(10, description="Maximum number of recommendations per side")
):
    """
    Get intraday buy and sell recommendations in a formatted table structure.
    Supports both GET and POST requests.
    
    For GET requests: Use query parameter 'limit'
    For POST requests: Send JSON body with 'limit' field
    
    This endpoint returns both buy and sell recommendations side by side,
    formatted for easy display with statistics and market summary.
    """
    try:
        # Handle both GET and POST requests
        if request:
            # POST request - use limit from request body
            effective_limit = request.limit
        else:
            # GET request - use query parameter
            effective_limit = limit
        
        # Get buy and sell recommendations concurrently
        if not intraday_service:
            raise HTTPException(status_code=503, detail="Intraday service not available")
        
        buy_recommendations = await intraday_service.get_intraday_buy_recommendations(effective_limit)
        sell_recommendations = await intraday_service.get_intraday_sell_recommendations(effective_limit)
        
        def format_recommendation_for_table(signal: IntradaySignal) -> Dict[str, Any]:
            return {
                "symbol": signal.symbol,
                "signal_type": signal.signal_type,
                "strength": signal.strength,
                "confidence": signal.confidence,
                "current_price": signal.current_price,
                "target_price": signal.target_price,
                "stop_loss": signal.stop_loss,
                "volume_ratio": signal.volume_ratio,
                "momentum_score": signal.momentum_score,
                "timestamp": signal.timestamp.isoformat(),
                "reason": signal.reason[:50] + "..." if signal.reason and len(signal.reason) > 50 else signal.reason or "Technical analysis"
            }
        
        # Format buy recommendations
        buy_table_data = [format_recommendation_for_table(signal) for signal in buy_recommendations]
        
        # Format sell recommendations  
        sell_table_data = [format_recommendation_for_table(signal) for signal in sell_recommendations]
        
        # Calculate summary statistics
        buy_stats = {
            "total_count": len(buy_recommendations),
            "avg_confidence": sum(r.confidence for r in buy_recommendations) / len(buy_recommendations) if buy_recommendations else 0,
            "avg_strength": sum(r.strength for r in buy_recommendations) / len(buy_recommendations) if buy_recommendations else 0,
            "high_confidence_count": sum(1 for r in buy_recommendations if r.confidence >= 70)
        }
        
        sell_stats = {
            "total_count": len(sell_recommendations),
            "avg_confidence": sum(r.confidence for r in sell_recommendations) / len(sell_recommendations) if sell_recommendations else 0,
            "avg_strength": sum(r.strength for r in sell_recommendations) / len(sell_recommendations) if sell_recommendations else 0,
            "high_confidence_count": sum(1 for r in sell_recommendations if r.confidence >= 70)
        }
        
        # Prepare table headers
        table_headers = [
            "Symbol", "Type", "Strength", "Confidence", "Price", "Target", 
            "Stop Loss", "Volume", "Momentum", "Time", "Reason"
        ]
        
        response = {
            "timestamp": datetime.now().isoformat(),
            "table_format": {
                "headers": table_headers,
                "buy_side": {
                    "title": "🟢 BUY RECOMMENDATIONS",
                    "data": buy_table_data,
                    "stats": {
                        "count": buy_stats["total_count"],
                        "avg_confidence": f"{buy_stats['avg_confidence']:.1f}%",
                        "avg_strength": f"{buy_stats['avg_strength']:.1f}",
                        "high_confidence": buy_stats["high_confidence_count"]
                    }
                },
                "sell_side": {
                    "title": "🔴 SELL RECOMMENDATIONS", 
                    "data": sell_table_data,
                    "stats": {
                        "count": sell_stats["total_count"],
                        "avg_confidence": f"{sell_stats['avg_confidence']:.1f}%",
                        "avg_strength": f"{sell_stats['avg_strength']:.1f}",
                        "high_confidence": sell_stats["high_confidence_count"]
                    }
                }
            },
            "raw_data": {
                "buy_recommendations": [signal.dict() for signal in buy_recommendations],
                "sell_recommendations": [signal.dict() for signal in sell_recommendations]
            },
            "market_summary": {
                "total_opportunities": len(buy_recommendations) + len(sell_recommendations),
                "total_buy_count": len(buy_recommendations),
                "total_sell_count": len(sell_recommendations),
                "avg_buy_confidence": buy_stats["avg_confidence"],
                "avg_sell_confidence": sell_stats["avg_confidence"],
                "buy_vs_sell_ratio": len(buy_recommendations) / max(len(sell_recommendations), 1) if sell_recommendations else "∞",
                "market_sentiment": "Bullish" if len(buy_recommendations) > len(sell_recommendations) else "Bearish" if len(sell_recommendations) > len(buy_recommendations) else "Neutral"
            }
        }
        
        logger.info(f"Generated table with {len(buy_recommendations)} buy and {len(sell_recommendations)} sell recommendations (limit: {effective_limit})")
        return response
        
    except Exception as e:
        logger.error(f"Error getting recommendations table: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations table: {str(e)}")

@app.get("/api/intraday/table", response_class=HTMLResponse)
async def get_intraday_table_html(
    limit: int = Query(10, description="Maximum number of recommendations per side")
):
    """
    Get intraday recommendations in a beautiful HTML table format for easy viewing.
    
    This endpoint returns a fully formatted HTML page with:
    - Side-by-side buy and sell recommendations
    - Color-coded entries and indicators
    - Real-time statistics and summaries
    - Responsive design for mobile and desktop
    """
    try:
        # Get the table data from our API endpoint
        table_data = await get_intraday_recommendations_table(limit)
        
        # Add debugging
        logger.info(f"Table data keys: {list(table_data.keys())}")
        
        # Ensure we have the required structure
        if 'table_format' not in table_data:
            raise ValueError("Missing table_format in response")
        
        table_format = table_data['table_format']
        buy_side = table_format['buy_side']
        sell_side = table_format['sell_side']
        market_summary = table_data['market_summary']
        
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AlgoDiscovery - Intraday Recommendations</title>
            <style>
                * {{
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }}
                
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                }}
                
                .container {{
                    max-width: 1600px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 15px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    overflow: hidden;
                }}
                
                .header {{
                    background: linear-gradient(135deg, #2c3e50, #34495e);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }}
                
                .header h1 {{
                    font-size: 2.5em;
                    margin-bottom: 10px;
                }}
                
                .header p {{
                    font-size: 1.2em;
                    opacity: 0.9;
                }}
                
                .timestamp {{
                    background: #ecf0f1;
                    padding: 15px;
                    text-align: center;
                    border-bottom: 2px solid #bdc3c7;
                }}
                
                .main-content {{
                    display: flex;
                    min-height: 600px;
                }}
                
                .side {{
                    flex: 1;
                    padding: 30px;
                }}
                
                .buy-side {{
                    background: linear-gradient(135deg, #e8f8f5, #d5f4e6);
                    border-right: 3px solid #27ae60;
                }}
                
                .sell-side {{
                    background: linear-gradient(135deg, #fdf2f2, #fadbd8);
                }}
                
                .side-header {{
                    text-align: center;
                    margin-bottom: 25px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #ecf0f1;
                }}
                
                .side-title {{
                    font-size: 1.8em;
                    font-weight: bold;
                    margin-bottom: 10px;
                }}
                
                .buy-title {{
                    color: #27ae60;
                }}
                
                .sell-title {{
                    color: #e74c3c;
                }}
                
                .stats {{
                    display: flex;
                    justify-content: space-around;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                    gap: 10px;
                }}
                
                .stat-item {{
                    background: white;
                    padding: 10px 15px;
                    border-radius: 8px;
                    text-align: center;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    min-width: 80px;
                }}
                
                .stat-value {{
                    font-size: 1.3em;
                    font-weight: bold;
                    color: #2c3e50;
                }}
                
                .stat-label {{
                    font-size: 0.9em;
                    color: #7f8c8d;
                    margin-top: 3px;
                }}
                
                .recommendations-table {{
                    width: 100%;
                    border-collapse: collapse;
                    background: white;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                }}
                
                .recommendations-table th {{
                    background: #34495e;
                    color: white;
                    padding: 12px 8px;
                    text-align: left;
                    font-weight: 600;
                    font-size: 0.9em;
                }}
                
                .recommendations-table td {{
                    padding: 10px 8px;
                    border-bottom: 1px solid #ecf0f1;
                    font-size: 0.85em;
                }}
                
                .recommendations-table tr:hover {{
                    background: #f8f9fa;
                }}
                
                .symbol {{
                    font-weight: bold;
                    color: #2c3e50;
                    font-size: 0.9em;
                }}
                
                .confidence {{
                    font-weight: 600;
                }}
                
                .high-confidence {{
                    color: #27ae60;
                }}
                
                .medium-confidence {{
                    color: #f39c12;
                }}
                
                .low-confidence {{
                    color: #e74c3c;
                }}
                
                .market-summary {{
                    background: #2c3e50;
                    color: white;
                    padding: 25px;
                    text-align: center;
                }}
                
                .summary-stats {{
                    display: flex;
                    justify-content: space-around;
                    margin-top: 15px;
                    flex-wrap: wrap;
                    gap: 20px;
                }}
                
                .summary-item {{
                    text-align: center;
                }}
                
                .summary-value {{
                    font-size: 2em;
                    font-weight: bold;
                    margin-bottom: 5px;
                }}
                
                .summary-label {{
                    font-size: 1em;
                    opacity: 0.8;
                }}
                
                .refresh-btn {{
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 15px 25px;
                    border-radius: 50px;
                    cursor: pointer;
                    font-size: 1em;
                    box-shadow: 0 5px 15px rgba(52, 152, 219, 0.3);
                    transition: all 0.3s ease;
                }}
                
                .refresh-btn:hover {{
                    background: #2980b9;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(52, 152, 219, 0.4);
                }}
                
                @media (max-width: 768px) {{
                    .main-content {{
                        flex-direction: column;
                    }}
                    
                    .side {{
                        padding: 20px;
                    }}
                    
                    .buy-side {{
                        border-right: none;
                        border-bottom: 3px solid #27ae60;
                    }}
                    
                    .stats {{
                        justify-content: center;
                    }}
                    
                    .recommendations-table th,
                    .recommendations-table td {{
                        padding: 8px 5px;
                        font-size: 0.8em;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 AlgoDiscovery Trading</h1>
                    <p>Intraday Buy & Sell Recommendations</p>
                </div>
                
                <div class="timestamp">
                    <strong>Last Updated:</strong> {table_data['timestamp'][:19].replace('T', ' ')} IST
                </div>
                
                <div class="main-content">
                    <div class="side buy-side">
                        <div class="side-header">
                            <div class="side-title buy-title">{buy_side['title']}</div>
                            <div class="stats">
                                <div class="stat-item">
                                    <div class="stat-value">{buy_side['stats']['count']}</div>
                                    <div class="stat-label">Signals</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">{buy_side['stats']['avg_confidence']}</div>
                                    <div class="stat-label">Avg Confidence</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">{buy_side['stats']['high_confidence']}</div>
                                    <div class="stat-label">High Confidence</div>
                                </div>
                            </div>
                        </div>
                        
                        <table class="recommendations-table">
                            <thead>
                                <tr>
                                    <th>Symbol</th>
                                    <th>Strength</th>
                                    <th>Confidence</th>
                                    <th>Price</th>
                                    <th>Target</th>
                                    <th>Stop Loss</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>"""
        
        # Add buy recommendations rows
        for row in buy_side['data']:
            confidence_val = float(row['confidence'].replace('%', ''))
            confidence_class = 'high-confidence' if confidence_val >= 70 else 'medium-confidence' if confidence_val >= 50 else 'low-confidence'
            
            html_content += f"""
                                <tr>
                                    <td class="symbol">{row['symbol']}</td>
                                    <td>{row['strength']}</td>
                                    <td class="confidence {confidence_class}">{row['confidence']}</td>
                                    <td>{row['current_price']}</td>
                                    <td>{row['target_price']}</td>
                                    <td>{row['stop_loss']}</td>
                                    <td>{row['timestamp']}</td>
                                </tr>"""
        
        if not buy_side['data']:
            html_content += """
                                <tr>
                                    <td colspan="7" style="text-align: center; padding: 30px; color: #7f8c8d;">
                                        No buy recommendations available at this time
                                    </td>
                                </tr>"""
        
        html_content += f"""
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="side sell-side">
                        <div class="side-header">
                            <div class="side-title sell-title">{sell_side['title']}</div>
                            <div class="stats">
                                <div class="stat-item">
                                    <div class="stat-value">{sell_side['stats']['count']}</div>
                                    <div class="stat-label">Signals</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">{sell_side['stats']['avg_confidence']}</div>
                                    <div class="stat-label">Avg Confidence</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">{sell_side['stats']['high_confidence']}</div>
                                    <div class="stat-label">High Confidence</div>
                                </div>
                            </div>
                        </div>
                        
                        <table class="recommendations-table">
                            <thead>
                                <tr>
                                    <th>Symbol</th>
                                    <th>Strength</th>
                                    <th>Confidence</th>
                                    <th>Price</th>
                                    <th>Target</th>
                                    <th>Stop Loss</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>"""
        
        # Add sell recommendations rows  
        for row in sell_side['data']:
            confidence_val = float(row['confidence'].replace('%', ''))
            confidence_class = 'high-confidence' if confidence_val >= 70 else 'medium-confidence' if confidence_val >= 50 else 'low-confidence'
            
            html_content += f"""
                                <tr>
                                    <td class="symbol">{row['symbol']}</td>
                                    <td>{row['strength']}</td>
                                    <td class="confidence {confidence_class}">{row['confidence']}</td>
                                    <td>{row['current_price']}</td>
                                    <td>{row['target_price']}</td>
                                    <td>{row['stop_loss']}</td>
                                    <td>{row['timestamp']}</td>
                                </tr>"""
        
        if not sell_side['data']:
            html_content += """
                                <tr>
                                    <td colspan="7" style="text-align: center; padding: 30px; color: #7f8c8d;">
                                        No sell recommendations available at this time
                                    </td>
                                </tr>"""
        
        buy_vs_sell_ratio = market_summary['buy_vs_sell_ratio']
        if isinstance(buy_vs_sell_ratio, (int, float)):
            ratio_display = f"{buy_vs_sell_ratio:.2f}"
        else:
            ratio_display = str(buy_vs_sell_ratio)
        
        html_content += f"""
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="market-summary">
                    <h3>📊 Market Summary</h3>
                    <div class="summary-stats">
                        <div class="summary-item">
                            <div class="summary-value">{market_summary['total_opportunities']}</div>
                            <div class="summary-label">Total Opportunities</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">{market_summary['market_sentiment']}</div>
                            <div class="summary-label">Market Sentiment</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">{ratio_display}</div>
                            <div class="summary-label">Buy/Sell Ratio</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <button class="refresh-btn" onclick="window.location.reload()">
                🔄 Refresh
            </button>
            
            <script>
                // Auto-refresh every 5 minutes
                setTimeout(() => {{
                    window.location.reload();
                }}, 300000);
                
                // Add some interactivity
                document.querySelectorAll('.recommendations-table tr').forEach(row => {{
                    row.addEventListener('click', function() {{
                        const symbol = this.querySelector('.symbol');
                        if (symbol) {{
                            console.log('Clicked on:', symbol.textContent);
                            // You could add more functionality here
                        }}
                    }});
                }});
            </script>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        logger.error(f"Error generating HTML table: {str(e)}")
        return HTMLResponse(content=f"""
        <html>
            <body style="font-family: Arial; padding: 50px; text-align: center;">
                <h1 style="color: red;">Error Loading Recommendations</h1>
                <p>{str(e)}</p>
                <a href="/api/intraday/table" style="color: blue;">Try Again</a>
            </body>
        </html>
        """, status_code=500)

@app.get("/api/intraday/screening-criteria")
async def get_screening_criteria():
    """Get available screening criteria and their descriptions."""
    try:
        if not intraday_service:
            raise HTTPException(status_code=503, detail="Intraday service not available")
        
        criteria_info = {
            "momentum_breakout": {
                "description": "High momentum stocks with breakout potential",
                "parameters": intraday_service.screener.screening_criteria["momentum_breakout"]
            },
            "gap_and_go": {
                "description": "Stocks with significant overnight gaps",
                "parameters": intraday_service.screener.screening_criteria["gap_and_go"]
            },
            "volume_spike": {
                "description": "Stocks with unusual volume activity",
                "parameters": intraday_service.screener.screening_criteria["volume_spike"]
            },
            "consolidation_breakout": {
                "description": "Breakouts from consolidation patterns",
                "parameters": intraday_service.screener.screening_criteria["consolidation_breakout"]
            }
        }
        
        return criteria_info
    except Exception as e:
        logger.error(f"Error getting screening criteria: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get criteria: {str(e)}")

# =====================================================================
# ORIGINAL STOCK DATA ENDPOINTS (Enhanced)
# =====================================================================

@app.get("/api/stock/{symbol}", response_model=StockData)
async def get_stock_data(symbol: str):
    """Get current stock data for a symbol."""
    try:
        if not data_service:
            raise HTTPException(status_code=503, detail="Data service not available")
        
        stock_data = await data_service.get_stock_data(symbol.upper())
        if not stock_data:
            raise HTTPException(status_code=404, detail=f"Stock data not found for {symbol}")
        
        return stock_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting stock data for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stock data: {str(e)}")

@app.get("/api/stocks/multiple")
async def get_multiple_stocks(
    symbols: str = Query(..., description="Comma-separated list of stock symbols"),
    use_cache: bool = Query(True, description="Use cached data if available")
):
    """Get data for multiple stocks at once."""
    try:
        if not data_service:
            raise HTTPException(status_code=503, detail="Data service not available")
        
        symbol_list = [s.strip().upper() for s in symbols.split(",")]
        stock_data_map = await data_service.get_multiple_stocks(symbol_list, use_cache)
        
        return {
            "symbols": symbol_list,
            "data": stock_data_map,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting multiple stocks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stock data: {str(e)}")

@app.get("/api/stock/{symbol}/historical")
async def get_historical_data(
    symbol: str,
    period: str = Query("1mo", description="Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)"),
    interval: str = Query("1d", description="Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)")
):
    """Get historical stock data."""
    try:
        if not data_service:
            raise HTTPException(status_code=503, detail="Data service not available")
        
        historical_data = await data_service.get_historical_data(symbol.upper(), period, interval)
        if not historical_data:
            raise HTTPException(status_code=404, detail=f"Historical data not found for symbol {symbol}")
        
        return {
            "symbol": symbol.upper(),
            "period": period,
            "interval": interval,
            "data": historical_data,
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting historical data for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get historical data: {str(e)}")

@app.get("/api/stock/{symbol}/technical", response_model=TechnicalIndicators)
async def get_technical_indicators(
    symbol: str,
    period: str = Query("1mo", description="Time period for calculation")
):
    """Get technical indicators for a stock."""
    try:
        if not data_service:
            raise HTTPException(status_code=503, detail="Data service not available")
        
        indicators = await data_service.get_technical_indicators(symbol.upper(), period)
        if not indicators:
            raise HTTPException(status_code=404, detail=f"Technical indicators not available for {symbol}")
        
        return indicators
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting technical indicators for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get technical indicators: {str(e)}")

# =====================================================================
# TRADING SIGNALS ENDPOINTS
# =====================================================================

@app.get("/api/signals/{symbol}", response_model=List[TradingSignal])
async def get_trading_signals(symbol: str):
    """Get trading signals for a specific stock."""
    try:
        if not analysis_engine:
            raise HTTPException(status_code=503, detail="Analysis engine not available")
        
        signals = await analysis_engine.generate_signals(symbol.upper())
        return signals
    except Exception as e:
        logger.error(f"Error getting signals for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get signals: {str(e)}")

@app.get("/api/signals", response_model=List[TradingSignal])
async def get_all_signals():
    """Get all active trading signals."""
    try:
        if not analysis_engine:
            raise HTTPException(status_code=503, detail="Analysis engine not available")
        
        signals = await analysis_engine.get_all_signals()
        return signals
    except Exception as e:
        logger.error(f"Error getting all signals: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get signals: {str(e)}")

# =====================================================================
# PORTFOLIO ENDPOINTS
# =====================================================================

@app.get("/api/portfolio", response_model=Portfolio)
async def get_portfolio():
    """Get current portfolio data."""
    try:
        # Mock portfolio data - in production, this would come from a database
        portfolio = Portfolio(
            total_value=100000.0,
            cash_balance=25000.0,
            invested_amount=75000.0,
            unrealized_pnl=2500.0,
            realized_pnl=1000.0,
            day_change=2500.0,
            day_change_percent=2.5,
            positions=[],  # Would be populated from database
            last_updated=datetime.now()
        )
        return portfolio
    except Exception as e:
        logger.error(f"Error getting portfolio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get portfolio: {str(e)}")

# =====================================================================
# WEBSOCKET ENDPOINTS
# =====================================================================

@app.websocket("/ws/live-data")
async def websocket_live_data(websocket: WebSocket):
    """WebSocket endpoint for live stock data updates."""
    await websocket.accept()
    client_id = str(uuid.uuid4())
    
    try:
        # Add client to websocket manager
        websocket_manager.add_connection(client_id, websocket)
        logger.info(f"Client {client_id} connected to live data stream")
        
        # Keep connection alive and handle messages
        while True:
            try:
                # Wait for client messages (subscription requests)
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message.get("action") == "subscribe" and "symbols" in message:
                    symbols = message["symbols"]
                    logger.info(f"Client {client_id} subscribed to: {symbols}")
                    # Store subscription info (could be enhanced to track per-client subscriptions)
                    
                elif message.get("action") == "unsubscribe":
                    logger.info(f"Client {client_id} unsubscribed")
                    
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"error": "Invalid JSON format"}))
            except WebSocketDisconnect:
                break
                
    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected from live data stream")
    except Exception as e:
        logger.error(f"Error in live data websocket for client {client_id}: {str(e)}")
    finally:
        websocket_manager.remove_connection(client_id)

@app.websocket("/ws/signals")
async def websocket_signals(websocket: WebSocket):
    """WebSocket endpoint for live trading signals."""
    await websocket.accept()
    client_id = str(uuid.uuid4())
    
    try:
        websocket_manager.add_connection(client_id, websocket)
        logger.info(f"Client {client_id} connected to signals stream")
        
        # Send initial signals
        if analysis_engine:
            try:
                initial_signals = await analysis_engine.get_all_signals()
                await websocket.send_text(json.dumps({
                    "type": "initial_signals",
                    "data": [signal.dict() for signal in initial_signals]
                }))
            except Exception as e:
                logger.error(f"Error sending initial signals: {str(e)}")
        
        # Keep connection alive
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message.get("action") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"error": "Invalid JSON format"}))
            except WebSocketDisconnect:
                break
                
    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected from signals stream")
    except Exception as e:
        logger.error(f"Error in signals websocket for client {client_id}: {str(e)}")
    finally:
        websocket_manager.remove_connection(client_id)

# =====================================================================
# BACKGROUND TASKS AND JOBS
# =====================================================================

@app.post("/api/admin/start-background-jobs")
async def start_background_jobs(background_tasks: BackgroundTasks):
    """Start background jobs manually (admin endpoint)."""
    try:
        if not job_scheduler:
            raise HTTPException(status_code=503, detail="Job scheduler not available")
        
        # Start jobs
        await job_scheduler.start_market_data_job()
        await job_scheduler.start_signal_generation_job()
        
        logger.info("Background jobs started manually")
        
        return {
            "status": "success",
            "message": "Background jobs started",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error starting background jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start jobs: {str(e)}")

@app.post("/api/admin/stop-background-jobs")
async def stop_background_jobs():
    """Stop background jobs manually (admin endpoint)."""
    try:
        if not job_scheduler:
            raise HTTPException(status_code=503, detail="Job scheduler not available")
        
        await job_scheduler.stop_all_jobs()
        
        logger.info("Background jobs stopped manually")
        
        return {
            "status": "success",
            "message": "Background jobs stopped",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error stopping background jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to stop jobs: {str(e)}")

# =====================================================================
# UTILITY ENDPOINTS
# =====================================================================

@app.get("/api/market-status")
async def get_market_status():
    """Get current market status."""
    try:
        # Simple market hours check (can be enhanced)
        now = datetime.now()
        market_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
        market_close = now.replace(hour=15, minute=30, second=0, microsecond=0)
        
        is_market_open = market_open <= now <= market_close and now.weekday() < 5
        
        return {
            "is_open": is_market_open,
            "current_time": now.isoformat(),
            "market_open": market_open.isoformat(),
            "market_close": market_close.isoformat(),
            "timezone": "Asia/Kolkata"
        }
    except Exception as e:
        logger.error(f"Error getting market status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get market status: {str(e)}")

@app.get("/api/version")
async def get_version():
    """Get API version information."""
    return {
        "name": "AlgoDiscovery Trading API",
        "version": "2.0.0",
        "features": [
            "Intraday Stock Discovery",
            "Real-time Data Streaming",
            "Advanced Technical Analysis",
            "Trading Signals Generation",
            "Portfolio Management",
            "WebSocket Support",
            "Background Job Processing",
            "Direct Yahoo Finance Integration"
        ],
        "endpoints": {
            "intraday": "/api/intraday/*",
            "stock_data": "/api/stock/*",
            "yahoo_finance": "/api/yahoo/*",
            "signals": "/api/signals/*",
            "portfolio": "/api/portfolio",
            "websocket": "/ws/*",
            "health": "/health"
        },
        "yahoo_finance_endpoints": {
            "comprehensive_data": "/api/yahoo/{symbol}",
            "current_price": "/api/yahoo/{symbol}/price",
            "historical_data": "/api/yahoo/{symbol}/history",
            "batch_data": "/api/yahoo/batch",
            "examples": [
                "/api/yahoo/AAPL",
                "/api/yahoo/TCS.NS/price",
                "/api/yahoo/RELIANCE.NS/history?period=1y&interval=1d",
                "/api/yahoo/batch?symbols=AAPL,MSFT,GOOGL"
            ]
        }
    }

# =====================================================================
# YAHOO FINANCE DIRECT ENDPOINTS
# =====================================================================

@app.get("/api/yahoo/{symbol}")
async def get_yahoo_finance_stock(
    symbol: str,
    period: str = Query("1mo", description="Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)"),
    interval: str = Query("1d", description="Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)"),
    include_info: bool = Query(True, description="Include company information")
):
    """
    Get comprehensive stock data directly from Yahoo Finance.
    
    This endpoint provides:
    - Current price and change data
    - Company information (name, sector, market cap, etc.)
    - Historical price data for the specified period
    - Technical metrics (52-week high/low, P/E ratio, etc.)
    
    Examples:
    - /api/yahoo/AAPL - Apple stock with default 1-month daily data
    - /api/yahoo/TCS.NS?period=1y&interval=1wk - TCS yearly data with weekly intervals
    - /api/yahoo/RELIANCE.NS?period=5d&interval=15m - Reliance 5-day data with 15-minute intervals
    """
    try:
        if not data_service:
            raise HTTPException(status_code=503, detail="Data service not available")
        
        yahoo_data = await data_service.get_yahoo_finance_data(
            symbol.upper(), period, interval, include_info
        )
        
        if not yahoo_data:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
        
        return yahoo_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Yahoo Finance data for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch data: {str(e)}")

@app.get("/api/yahoo/{symbol}/price")
async def get_yahoo_stock_price(symbol: str):
    """
    Get current stock price and basic info from Yahoo Finance.
    
    This is a lightweight endpoint that returns just the essential price information:
    - Current price
    - Change and change percentage
    - Volume
    - Day high/low
    - Previous close
    
    Example: /api/yahoo/AAPL/price
    """
    try:
        if not data_service:
            raise HTTPException(status_code=503, detail="Data service not available")
        
        yahoo_data = await data_service.get_yahoo_finance_data(
            symbol.upper(), period="1d", interval="1m", include_info=False
        )
        
        if not yahoo_data:
            raise HTTPException(status_code=404, detail=f"No price data found for symbol {symbol}")
        
        # Return only price-related data
        price_data = {
            "symbol": yahoo_data["symbol"],
            "name": yahoo_data["name"],
            "current_price": yahoo_data["current_price"],
            "previous_close": yahoo_data["previous_close"],
            "change": yahoo_data["change"],
            "change_percent": yahoo_data["change_percent"],
            "volume": yahoo_data["volume"],
            "day_high": yahoo_data["day_high"],
            "day_low": yahoo_data["day_low"],
            "currency": yahoo_data["currency"],
            "last_updated": yahoo_data["last_updated"]
        }
        
        return price_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Yahoo Finance price for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch price: {str(e)}")

@app.get("/api/yahoo/{symbol}/history")
async def get_yahoo_stock_history(
    symbol: str,
    period: str = Query("1mo", description="Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)"),
    interval: str = Query("1d", description="Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)")
):
    """
    Get historical stock data from Yahoo Finance.
    
    This endpoint focuses specifically on historical price data with flexible
    time periods and intervals for technical analysis and charting.
    
    Time Periods:
    - 1d, 5d: Intraday data
    - 1mo, 3mo, 6mo: Short to medium term
    - 1y, 2y, 5y, 10y: Long term analysis
    - ytd: Year to date
    - max: Maximum available history
    
    Intervals:
    - 1m, 2m, 5m, 15m, 30m: Intraday intervals
    - 1h, 90m: Hourly data
    - 1d: Daily data (default)
    - 1wk, 1mo: Weekly/Monthly for long-term analysis
    
    Examples:
    - /api/yahoo/AAPL/history?period=1y&interval=1d
    - /api/yahoo/TCS.NS/history?period=5d&interval=15m
    """
    try:
        if not data_service:
            raise HTTPException(status_code=503, detail="Data service not available")
        
        historical_data = await data_service.get_historical_data(symbol.upper(), period, interval)
        
        if not historical_data:
            raise HTTPException(status_code=404, detail=f"No historical data found for symbol {symbol}")
        
        return historical_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Yahoo Finance history for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")

@app.get("/api/yahoo/batch")
async def get_yahoo_batch_prices(
    symbols: str = Query(..., description="Comma-separated list of stock symbols"),
    include_history: bool = Query(False, description="Include historical data"),
    period: str = Query("5d", description="Historical period if include_history=true"),
    interval: str = Query("1d", description="Historical interval if include_history=true")
):
    """
    Get current prices for multiple stocks from Yahoo Finance in batch.
    
    This endpoint allows fetching data for multiple stocks in a single request,
    which is more efficient than making individual requests.
    
    Parameters:
    - symbols: Comma-separated list (e.g., "AAPL,MSFT,GOOGL" or "TCS.NS,RELIANCE.NS,INFY.NS")
    - include_history: Whether to include historical data for each symbol
    - period/interval: Used only if include_history=true
    
    Examples:
    - /api/yahoo/batch?symbols=AAPL,MSFT,GOOGL
    - /api/yahoo/batch?symbols=TCS.NS,RELIANCE.NS&include_history=true&period=1mo
    """
    try:
        if not data_service:
            raise HTTPException(status_code=503, detail="Data service not available")
        
        symbol_list = [s.strip().upper() for s in symbols.split(",")]
        
        if len(symbol_list) > 20:  # Limit to prevent abuse
            raise HTTPException(status_code=400, detail="Maximum 20 symbols allowed per request")
        
        batch_results = {}
        tasks = []
        
        for symbol in symbol_list:
            if include_history:
                task = data_service.get_yahoo_finance_data(symbol, period, interval, include_info=False)
            else:
                task = data_service.get_yahoo_finance_data(symbol, period="1d", interval="1m", include_info=False)
            tasks.append((symbol, task))
        
        # Execute all requests concurrently
        results = await asyncio.gather(*[task for symbol, task in tasks], return_exceptions=True)
        
        # Process results
        for (symbol, _), result in zip(tasks, results):
            if isinstance(result, Exception):
                batch_results[symbol] = {
                    "error": str(result),
                    "status": "failed"
                }
            elif result is None:
                batch_results[symbol] = {
                    "error": "No data available",
                    "status": "not_found"
                }
            else:
                if not include_history:
                    # Return only price data for efficiency
                    batch_results[symbol] = {
                        "symbol": result["symbol"],
                        "name": result["name"],
                        "current_price": result["current_price"],
                        "change": result["change"],
                        "change_percent": result["change_percent"],
                        "volume": result["volume"],
                        "status": "success"
                    }
                else:
                    batch_results[symbol] = result
                    batch_results[symbol]["status"] = "success"
        
        return {
            "symbols": symbol_list,
            "count": len(symbol_list),
            "results": batch_results,
            "include_history": include_history,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Yahoo Finance batch request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch request failed: {str(e)}")

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

# Add new Pydantic models for the POST endpoints
class RealTimeRequest(BaseModel):
    limit: Optional[int] = 10
    refresh_interval: Optional[int] = 60  # seconds
    enable_ranking: Optional[bool] = True
    ranking_window: Optional[int] = 5  # number of recent scans to keep for ranking
    confidence_threshold: Optional[float] = 50.0
    strength_threshold: Optional[float] = 60.0
    chartink_theme: Optional[str] = "intraday_buy"  # Chartink theme for stock discovery

class RealTimeRecommendation(BaseModel):
    symbol: str
    signal_type: str
    entry_price: float
    target_price: float
    stop_loss: float
    confidence: float
    strength: float
    volume_ratio: float
    momentum_score: float
    rank_score: float  # New field for ranking
    frequency_score: int  # How often this stock appears
    recency_score: int  # How recent this stock's appearance
    timestamp: datetime
    reason: str
    technical_indicators: Dict[str, Any]
    risk_reward_ratio: float

# Add new POST endpoints after the existing recommendation endpoints

@app.post("/api/intraday/realtime-buy-recommendations")
async def get_realtime_buy_recommendations(request: RealTimeRequest):
    """
    POST endpoint for real-time intraday buy recommendations with re-ranking.
    
    This endpoint processes live market data and provides ranked buy recommendations
    based on:
    - Real-time stock scanning and analysis
    - Frequency-based ranking (stocks appearing multiple times)
    - Recency weighting (more recent signals weighted higher)
    - Technical strength and confidence filtering
    - Volume and momentum analysis
    
    Features:
    - Continuous re-ranking based on appearance frequency
    - Real-time market data processing
    - Configurable thresholds and parameters
    - Historical tracking for better signal validation
    """
    global _buy_recommendations_history, _last_scan_time
    
    try:
        if not intraday_service:
            raise HTTPException(status_code=503, detail="Intraday service not available")
        
        logger.info(f"Processing real-time buy recommendations request with limit: {request.limit}")
        
        # Get fresh recommendations from multiple sources
        current_time = datetime.now()
        
        # Get base recommendations
        buy_recommendations = await intraday_service.get_intraday_buy_recommendations(request.limit * 2)
        
        # Get additional candidates from screener
        breakout_candidates = await intraday_service.get_breakout_candidates(request.limit)
        volume_leaders = await intraday_service.get_volume_leaders(request.limit)
        
        # Combine all candidates
        all_candidates = {}
        
        # Process base recommendations
        for rec in buy_recommendations:
            if (rec.confidence >= request.confidence_threshold and 
                rec.strength >= request.strength_threshold):
                all_candidates[rec.symbol] = {
                    'recommendation': rec,
                    'source': 'intraday_service'
                }
        
        # Process breakout candidates
        for candidate in breakout_candidates:
            if candidate.overall_score >= request.strength_threshold:
                # Convert to recommendation format
                rec = IntradaySignal(
                    id=str(uuid.uuid4()),
                    symbol=candidate.symbol,
                    signal_type=SignalType.BUY,
                    entry_price=candidate.current_price,
                    target_price=candidate.current_price * 1.03,
                    stop_loss=candidate.current_price * 0.98,
                    confidence=min(candidate.overall_score, 95.0),
                    strength=candidate.overall_score,
                    timeframe="intraday",
                    reasoning=f"Breakout candidate: momentum {candidate.momentum_score:.1f}, volume {candidate.volume_ratio:.1f}x",
                    indicators={
                        "rsi": candidate.rsi or 0,
                        "momentum_score": candidate.momentum_score,
                        "volume_ratio": candidate.volume_ratio
                    },
                    volume_spike=candidate.volume_ratio > 2.0,
                    breakout_type="bullish_breakout"
                )
                all_candidates[candidate.symbol] = {
                    'recommendation': rec,
                    'source': 'breakout_screener'
                }
        
        # Process volume leaders
        for candidate in volume_leaders:
            if (candidate.overall_score >= request.strength_threshold and 
                candidate.change_percent > 0):
                rec = IntradaySignal(
                    id=str(uuid.uuid4()),
                    symbol=candidate.symbol,
                    signal_type=SignalType.BUY,
                    entry_price=candidate.current_price,
                    target_price=candidate.current_price * 1.025,
                    stop_loss=candidate.current_price * 0.985,
                    confidence=min(candidate.volume_score, 90.0),
                    strength=candidate.overall_score,
                    timeframe="intraday",
                    reasoning=f"Volume leader: {candidate.volume_ratio:.1f}x volume, {candidate.change_percent:.1f}% gain",
                    indicators={
                        "volume_ratio": candidate.volume_ratio,
                        "momentum_score": candidate.momentum_score,
                        "change_percent": candidate.change_percent
                    },
                    volume_spike=True,
                    breakout_type="volume_breakout"
                )
                all_candidates[candidate.symbol] = {
                    'recommendation': rec,
                    'source': 'volume_screener'
                }
        
        # Apply ranking if enabled
        if request.enable_ranking:
            # Store current symbols for ranking
            current_symbols = list(all_candidates.keys())
            _buy_recommendations_history.append(current_symbols)
            
            # Calculate ranking scores
            ranking_scores = _calculate_ranking_scores(_buy_recommendations_history, request.ranking_window)
            
            # Apply ranking to candidates
            for symbol in all_candidates:
                rank_data = ranking_scores.get(symbol, {'rank_score': 0, 'frequency': 1, 'recency': 0})
                all_candidates[symbol]['rank_score'] = rank_data['rank_score']
                all_candidates[symbol]['frequency_score'] = rank_data['frequency']
                all_candidates[symbol]['recency_score'] = rank_data['recency']
        else:
            # No ranking, set default scores
            for symbol in all_candidates:
                all_candidates[symbol]['rank_score'] = all_candidates[symbol]['recommendation'].strength
                all_candidates[symbol]['frequency_score'] = 1
                all_candidates[symbol]['recency_score'] = 1
        
        # Convert to response format
        realtime_recommendations = []
        for symbol, data in all_candidates.items():
            rec = data['recommendation']
            
            realtime_rec = RealTimeRecommendation(
                symbol=rec.symbol,
                signal_type=rec.signal_type,
                entry_price=rec.entry_price,
                target_price=rec.target_price,
                stop_loss=rec.stop_loss,
                confidence=rec.confidence,
                strength=rec.strength,
                volume_ratio=rec.volume_ratio if rec.volume_ratio else 1.0,
                momentum_score=rec.momentum_score if rec.momentum_score else rec.strength,
                rank_score=data.get('rank_score', rec.strength),
                frequency_score=data.get('frequency_score', 1),
                recency_score=data.get('recency_score', 1),
                timestamp=current_time,
                reason=rec.reasoning or "Technical analysis signal",
                technical_indicators=rec.indicators or {},
                risk_reward_ratio=rec.risk_reward_ratio if rec.risk_reward_ratio else 1.5
            )
            realtime_recommendations.append(realtime_rec)
        
        # Sort by rank score (if ranking enabled) or strength
        sort_key = 'rank_score' if request.enable_ranking else 'strength'
        realtime_recommendations.sort(
            key=lambda x: getattr(x, sort_key), 
            reverse=True
        )
        
        # Limit results
        final_recommendations = realtime_recommendations[:request.limit]
        
        _last_scan_time = current_time
        
        # Prepare response
        response = {
            "timestamp": current_time.isoformat(),
            "total_candidates_found": len(all_candidates),
            "recommendations_returned": len(final_recommendations),
            "ranking_enabled": request.enable_ranking,
            "scan_sources": ["intraday_service", "breakout_screener", "volume_screener"],
            "filters_applied": {
                "confidence_threshold": request.confidence_threshold,
                "strength_threshold": request.strength_threshold,
                "limit": request.limit
            },
            "market_conditions": {
                "scan_time": current_time.isoformat(),
                "active_signals": len(final_recommendations),
                "avg_confidence": sum(r.confidence for r in final_recommendations) / len(final_recommendations) if final_recommendations else 0,
                "avg_strength": sum(r.strength for r in final_recommendations) / len(final_recommendations) if final_recommendations else 0,
                "high_confidence_count": sum(1 for r in final_recommendations if r.confidence >= 70)
            },
            "recommendations": [rec.dict() for rec in final_recommendations],
            "ranking_stats": {
                "history_length": len(_buy_recommendations_history),
                "ranking_window": request.ranking_window,
                "last_scan_time": _last_scan_time.isoformat() if _last_scan_time else None
            } if request.enable_ranking else None
        }
        
        logger.info(f"Generated {len(final_recommendations)} real-time buy recommendations")
        return response
        
    except Exception as e:
        logger.error(f"Error in real-time buy recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get real-time buy recommendations: {str(e)}")


@app.post("/api/intraday/realtime-sell-recommendations")
async def get_realtime_sell_recommendations(request: RealTimeRequest):
    """
    POST endpoint for real-time intraday sell recommendations with re-ranking.
    
    This endpoint processes live market data and provides ranked sell recommendations
    based on:
    - Real-time bearish signal detection
    - Overbought condition analysis
    - Breakdown pattern recognition
    - Frequency-based ranking and recency weighting
    - Volume and momentum confirmation
    """
    global _sell_recommendations_history, _last_scan_time
    
    try:
        if not intraday_service:
            raise HTTPException(status_code=503, detail="Intraday service not available")
        
        logger.info(f"Processing real-time sell recommendations request with limit: {request.limit}")
        
        current_time = datetime.now()
        
        # Get fresh sell recommendations
        sell_recommendations = await intraday_service.get_intraday_sell_recommendations(request.limit * 2)
        
        # Get additional bearish candidates from screening
        all_stocks = await intraday_service.screener.screen_stocks("momentum_breakout")
        
        all_candidates = {}
        
        # Process base sell recommendations
        for rec in sell_recommendations:
            if (rec.confidence >= request.confidence_threshold and 
                rec.strength >= request.strength_threshold):
                all_candidates[rec.symbol] = {
                    'recommendation': rec,
                    'source': 'intraday_service'
                }
        
        # Look for additional bearish signals
        for candidate in all_stocks:
            # Bearish breakdown signals
            if (candidate.change_percent < -1.5 and 
                candidate.momentum_score < 40 and 
                candidate.volume_ratio > 1.5):
                
                rec = IntradaySignal(
                    id=str(uuid.uuid4()),
                    symbol=candidate.symbol,
                    signal_type=SignalType.SELL,
                    entry_price=candidate.current_price,
                    target_price=candidate.current_price * 0.97,
                    stop_loss=candidate.current_price * 1.02,
                    confidence=min((100 - candidate.momentum_score), 85.0),
                    strength=100 - candidate.momentum_score,
                    timeframe="intraday",
                    reasoning=f"Bearish breakdown: weak momentum {candidate.momentum_score:.1f}, selling volume {candidate.volume_ratio:.1f}x",
                    indicators={
                        "momentum_score": candidate.momentum_score,
                        "volume_ratio": candidate.volume_ratio,
                        "change_percent": candidate.change_percent
                    },
                    volume_spike=True,
                    breakout_type="bearish_breakdown"
                )
                all_candidates[candidate.symbol] = {
                    'recommendation': rec,
                    'source': 'bearish_screener'
                }
            
            # Overbought reversal signals
            elif (candidate.rsi and candidate.rsi > 75 and 
                  candidate.change_percent > 3.0 and 
                  candidate.volatility_score > 60):
                
                rec = IntradaySignal(
                    id=str(uuid.uuid4()),
                    symbol=candidate.symbol,
                    signal_type=SignalType.SELL,
                    entry_price=candidate.current_price,
                    target_price=candidate.current_price * 0.95,
                    stop_loss=candidate.current_price * 1.025,
                    confidence=75.0,
                    strength=candidate.rsi,
                    timeframe="intraday",
                    reasoning=f"Overbought reversal: RSI {candidate.rsi:.1f}, extended rally showing exhaustion",
                    indicators={
                        "rsi": candidate.rsi,
                        "volatility_score": candidate.volatility_score,
                        "change_percent": candidate.change_percent
                    },
                    volume_spike=candidate.volume_ratio > 1.5,
                    breakout_type="overbought_reversal"
                )
                all_candidates[candidate.symbol] = {
                    'recommendation': rec,
                    'source': 'reversal_screener'
                }
        
        # Apply ranking if enabled
        if request.enable_ranking:
            current_symbols = list(all_candidates.keys())
            _sell_recommendations_history.append(current_symbols)
            
            ranking_scores = _calculate_ranking_scores(_sell_recommendations_history, request.ranking_window)
            
            for symbol in all_candidates:
                rank_data = ranking_scores.get(symbol, {'rank_score': 0, 'frequency': 1, 'recency': 0})
                all_candidates[symbol]['rank_score'] = rank_data['rank_score']
                all_candidates[symbol]['frequency_score'] = rank_data['frequency']
                all_candidates[symbol]['recency_score'] = rank_data['recency']
        else:
            for symbol in all_candidates:
                all_candidates[symbol]['rank_score'] = all_candidates[symbol]['recommendation'].strength
                all_candidates[symbol]['frequency_score'] = 1
                all_candidates[symbol]['recency_score'] = 1
        
        # Convert to response format
        realtime_recommendations = []
        for symbol, data in all_candidates.items():
            rec = data['recommendation']
            
            realtime_rec = RealTimeRecommendation(
                symbol=rec.symbol,
                signal_type=rec.signal_type,
                entry_price=rec.entry_price,
                target_price=rec.target_price,
                stop_loss=rec.stop_loss,
                confidence=rec.confidence,
                strength=rec.strength,
                volume_ratio=rec.volume_ratio if rec.volume_ratio else 1.0,
                momentum_score=rec.momentum_score if rec.momentum_score else rec.strength,
                rank_score=data.get('rank_score', rec.strength),
                frequency_score=data.get('frequency_score', 1),
                recency_score=data.get('recency_score', 1),
                timestamp=current_time,
                reason=rec.reasoning or "Technical analysis signal",
                technical_indicators=rec.indicators or {},
                risk_reward_ratio=rec.risk_reward_ratio if rec.risk_reward_ratio else 2.0
            )
            realtime_recommendations.append(realtime_rec)
        
        # Sort by rank score or strength
        sort_key = 'rank_score' if request.enable_ranking else 'strength'
        realtime_recommendations.sort(
            key=lambda x: getattr(x, sort_key), 
            reverse=True
        )
        
        final_recommendations = realtime_recommendations[:request.limit]
        _last_scan_time = current_time
        
        response = {
            "timestamp": current_time.isoformat(),
            "total_candidates_found": len(all_candidates),
            "recommendations_returned": len(final_recommendations),
            "ranking_enabled": request.enable_ranking,
            "scan_sources": ["intraday_service", "bearish_screener", "reversal_screener"],
            "filters_applied": {
                "confidence_threshold": request.confidence_threshold,
                "strength_threshold": request.strength_threshold,
                "limit": request.limit
            },
            "market_conditions": {
                "scan_time": current_time.isoformat(),
                "active_signals": len(final_recommendations),
                "avg_confidence": sum(r.confidence for r in final_recommendations) / len(final_recommendations) if final_recommendations else 0,
                "avg_strength": sum(r.strength for r in final_recommendations) / len(final_recommendations) if final_recommendations else 0,
                "high_confidence_count": sum(1 for r in final_recommendations if r.confidence >= 70)
            },
            "recommendations": [rec.dict() for rec in final_recommendations],
            "ranking_stats": {
                "history_length": len(_sell_recommendations_history),
                "ranking_window": request.ranking_window,
                "last_scan_time": _last_scan_time.isoformat() if _last_scan_time else None
            } if request.enable_ranking else None
        }
        
        logger.info(f"Generated {len(final_recommendations)} real-time sell recommendations")
        return response
        
    except Exception as e:
        logger.error(f"Error in real-time sell recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get real-time sell recommendations: {str(e)}")


def _calculate_ranking_scores(recommendations_history, ranking_window):
    """
    Calculate ranking scores based on frequency and recency.
    Similar to the logic in 5min_stocks.py but adapted for recommendations.
    """
    # Flatten the history to get all symbols
    flat_list = []
    for symbol_list in recommendations_history:
        flat_list.extend(symbol_list)
    
    # Calculate frequency scores
    frequency = Counter(flat_list)
    
    # Calculate recency scores (more recent = higher score)
    recency_rank = {}
    for recency_score, symbol_list in enumerate(reversed(recommendations_history)):
        for symbol in symbol_list:
            if symbol not in recency_rank:  # Only take the most recent occurrence
                recency_rank[symbol] = recency_score
    
    # Combine frequency and recency for final ranking
    ranking_scores = {}
    for symbol in frequency:
        freq_score = frequency[symbol]
        rec_score = recency_rank.get(symbol, 0)
        
        # Combined rank score (frequency weighted higher)
        rank_score = (freq_score * 2) + rec_score
        
        ranking_scores[symbol] = {
            'rank_score': rank_score,
            'frequency': freq_score,
            'recency': rec_score
        }
    
    return ranking_scores


@app.post("/api/intraday/realtime-combined")
async def get_realtime_combined_recommendations(request: RealTimeRequest):
    """
    POST endpoint that combines both buy and sell real-time recommendations.
    
    This endpoint provides a unified view of all intraday opportunities with:
    - Combined buy and sell signals
    - Unified ranking system
    - Market opportunity overview
    - Real-time processing and re-ranking
    """
    try:
        # Get both buy and sell recommendations
        buy_response = await get_realtime_buy_recommendations(request)
        sell_response = await get_realtime_sell_recommendations(request)
        
        combined_response = {
            "timestamp": datetime.now().isoformat(),
            "buy_recommendations": {
                "count": buy_response["recommendations_returned"],
                "data": buy_response["recommendations"],
                "market_conditions": buy_response["market_conditions"]
            },
            "sell_recommendations": {
                "count": sell_response["recommendations_returned"],
                "data": sell_response["recommendations"],
                "market_conditions": sell_response["market_conditions"]
            },
            "combined_stats": {
                "total_opportunities": buy_response["recommendations_returned"] + sell_response["recommendations_returned"],
                "buy_vs_sell_ratio": buy_response["recommendations_returned"] / max(sell_response["recommendations_returned"], 1),
                "market_sentiment": "Bullish" if buy_response["recommendations_returned"] > sell_response["recommendations_returned"] else "Bearish" if sell_response["recommendations_returned"] > buy_response["recommendations_returned"] else "Neutral",
                "ranking_enabled": request.enable_ranking,
                "scan_sources": list(set(buy_response["scan_sources"] + sell_response["scan_sources"]))
            },
            "request_parameters": {
                "limit": request.limit,
                "confidence_threshold": request.confidence_threshold,
                "strength_threshold": request.strength_threshold,
                "ranking_enabled": request.enable_ranking,
                "ranking_window": request.ranking_window
            }
        }
        
        logger.info(f"Generated combined real-time recommendations: {buy_response['recommendations_returned']} buy, {sell_response['recommendations_returned']} sell")
        return combined_response
        
    except Exception as e:
        logger.error(f"Error in combined real-time recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get combined recommendations: {str(e)}")

# Add new simplified endpoints after the existing realtime endpoints

@app.post("/api/intraday/buy")
async def get_intraday_buy_endpoint(request: RealTimeRequest):
    """Simplified intraday buy recommendations with Chartink integration"""
    try:
        logger.info(f"🎯 Getting intraday buy recommendations with Chartink theme: {request.chartink_theme}")
        
        # Get buy recommendations with Chartink theme
        recommendations = await intraday_service.get_intraday_buy_recommendations(
            limit=request.limit or 10,
            chartink_theme=request.chartink_theme or "intraday_buy"
        )
        
        # Convert to response format
        processed_recommendations = []
        for signal in recommendations:
            if (signal.confidence * 100 >= request.confidence_threshold and 
                signal.strength >= request.strength_threshold):
                
                processed_recommendations.append({
                    "symbol": signal.symbol,
                    "signal_type": signal.signal_type.value,
                    "entry_price": signal.entry_price,
                    "target_price": signal.target_price,
                    "stop_loss": signal.stop_loss,
                    "confidence": signal.confidence * 100,
                    "strength": signal.strength,
                    "timestamp": datetime.now(),
                    "reason": signal.reasoning,
                    "technical_indicators": signal.indicators,
                    "risk_reward_ratio": signal.risk_reward_ratio,
                    "chartink_source": signal.indicators.get("chartink_source", request.chartink_theme)
                })
        
        return {
            "timestamp": datetime.now(),
            "total_candidates_found": len(recommendations),
            "recommendations_returned": len(processed_recommendations),
            "ranking_enabled": request.enable_ranking,
            "scan_sources": ["intraday_service", "breakout_screener", "volume_screener"],
            "chartink_theme": request.chartink_theme,
            "filters_applied": {
                "confidence_threshold": request.confidence_threshold,
                "strength_threshold": request.strength_threshold,
                "limit": request.limit
            },
            "market_conditions": {
                "scan_time": datetime.now(),
                "active_signals": len(processed_recommendations),
                "avg_confidence": sum(r["confidence"] for r in processed_recommendations) / len(processed_recommendations) if processed_recommendations else 0,
                "avg_strength": sum(r["strength"] for r in processed_recommendations) / len(processed_recommendations) if processed_recommendations else 0,
                "high_confidence_count": len([r for r in processed_recommendations if r["confidence"] >= 70])
            },
            "recommendations": processed_recommendations,
            "ranking_stats": {
                "history_length": 1,
                "ranking_window": request.ranking_window,
                "last_scan_time": datetime.now()
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting intraday buy recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/intraday/sell")
async def get_intraday_sell_endpoint(request: RealTimeRequest):
    """Simplified intraday sell recommendations with Chartink integration"""
    try:
        logger.info(f"📉 Getting intraday sell recommendations with Chartink theme: {request.chartink_theme}")
        
        # Get sell recommendations with Chartink theme
        recommendations = await intraday_service.get_intraday_sell_recommendations(
            limit=request.limit or 10,
            chartink_theme=request.chartink_theme or "intraday_buy"
        )
        
        # Convert to response format
        processed_recommendations = []
        for signal in recommendations:
            if (signal.confidence * 100 >= request.confidence_threshold and 
                signal.strength >= request.strength_threshold):
                
                processed_recommendations.append({
                    "symbol": signal.symbol,
                    "signal_type": signal.signal_type.value,
                    "entry_price": signal.entry_price,
                    "target_price": signal.target_price,
                    "stop_loss": signal.stop_loss,
                    "confidence": signal.confidence * 100,
                    "strength": signal.strength,
                    "timestamp": datetime.now(),
                    "reason": signal.reasoning,
                    "technical_indicators": signal.indicators,
                    "risk_reward_ratio": signal.risk_reward_ratio,
                    "chartink_source": signal.indicators.get("chartink_source", request.chartink_theme)
                })
        
        return {
            "timestamp": datetime.now(),
            "total_candidates_found": len(recommendations),
            "recommendations_returned": len(processed_recommendations),
            "ranking_enabled": request.enable_ranking,
            "scan_sources": ["intraday_service", "bearish_screener", "reversal_screener"],
            "chartink_theme": request.chartink_theme,
            "filters_applied": {
                "confidence_threshold": request.confidence_threshold,
                "strength_threshold": request.strength_threshold,
                "limit": request.limit
            },
            "market_conditions": {
                "scan_time": datetime.now(),
                "active_signals": len(processed_recommendations),
                "avg_confidence": sum(r["confidence"] for r in processed_recommendations) / len(processed_recommendations) if processed_recommendations else 0,
                "avg_strength": sum(r["strength"] for r in processed_recommendations) / len(processed_recommendations) if processed_recommendations else 0,
                "high_confidence_count": len([r for r in processed_recommendations if r["confidence"] >= 70])
            },
            "recommendations": processed_recommendations,
            "ranking_stats": {
                "history_length": 1,
                "ranking_window": request.ranking_window,
                "last_scan_time": datetime.now()
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting intraday sell recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================================
# SWING TRADING ENDPOINTS
# =====================================================================

@app.get("/api/swing/buy-recommendations", response_model=List[IntradaySignal])
async def get_swing_buy_recommendations(
    limit: int = Query(10, description="Maximum number of swing buy recommendations"),
    confidence_threshold: float = Query(60.0, description="Minimum confidence threshold (0-100)"),
    strength_threshold: float = Query(65.0, description="Minimum strength threshold (0-100)")
):
    """
    Get swing trading buy recommendations (3-10 day holding period).
    
    Features:
    - Multi-timeframe technical analysis
    - Chartink theme integration for stock discovery
    - RSI, MACD, and trend analysis
    - Volume confirmation
    - Risk-reward optimization
    """
    try:
        if not swing_trading_service:
            raise HTTPException(status_code=503, detail="Swing trading service not available")
        
        recommendations = await swing_trading_service.get_swing_buy_recommendations(
            limit=limit,
            confidence_threshold=confidence_threshold,
            strength_threshold=strength_threshold
        )
        
        logger.info(f"✅ Generated {len(recommendations)} swing buy recommendations")
        return recommendations
        
    except Exception as e:
        logger.error(f"Error getting swing buy recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get swing buy recommendations: {str(e)}")

@app.get("/api/short-term/buy-recommendations", response_model=List[IntradaySignal])
async def get_short_term_buy_recommendations(
    limit: int = Query(10, description="Maximum number of short-term buy recommendations"),
    confidence_threshold: float = Query(55.0, description="Minimum confidence threshold (0-100)"),
    strength_threshold: float = Query(60.0, description="Minimum strength threshold (0-100)")
):
    """
    Get short-term buy recommendations (1-4 week holding period).
    
    Features:
    - Focus on momentum and reversal patterns
    - Higher risk-reward ratios
    - Volume and volatility analysis
    - Breakout confirmation signals
    """
    try:
        if not swing_trading_service:
            raise HTTPException(status_code=503, detail="Swing trading service not available")
        
        recommendations = await swing_trading_service.get_short_term_buy_recommendations(
            limit=limit,
            confidence_threshold=confidence_threshold,
            strength_threshold=strength_threshold
        )
        
        logger.info(f"✅ Generated {len(recommendations)} short-term buy recommendations")
        return recommendations
        
    except Exception as e:
        logger.error(f"Error getting short-term buy recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get short-term buy recommendations: {str(e)}")

@app.get("/api/long-term/buy-recommendations", response_model=List[IntradaySignal])
async def get_long_term_buy_recommendations(
    limit: int = Query(10, description="Maximum number of long-term buy recommendations"),
    confidence_threshold: float = Query(50.0, description="Minimum confidence threshold (0-100)"),
    strength_threshold: float = Query(55.0, description="Minimum strength threshold (0-100)")
):
    """
    Get long-term buy recommendations (1-6 month holding period).
    
    Features:
    - Fundamental and technical convergence
    - Lower risk thresholds for patient capital
    - Trend continuation analysis
    - Quality stock selection with growth potential
    """
    try:
        if not swing_trading_service:
            raise HTTPException(status_code=503, detail="Swing trading service not available")
        
        recommendations = await swing_trading_service.get_long_term_buy_recommendations(
            limit=limit,
            confidence_threshold=confidence_threshold,
            strength_threshold=strength_threshold
        )
        
        logger.info(f"✅ Generated {len(recommendations)} long-term buy recommendations")
        return recommendations
        
    except Exception as e:
        logger.error(f"Error getting long-term buy recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get long-term buy recommendations: {str(e)}")

@app.get("/api/trading/all-timeframes")
async def get_all_timeframe_recommendations(
    limit_per_strategy: int = Query(5, description="Maximum number of recommendations per strategy")
):
    """
    Get trading recommendations across all timeframes.
    
    Returns:
    - swing_buy: 3-10 day positions
    - short_term_buy: 1-4 week positions  
    - long_term_buy: 1-6 month positions
    """
    try:
        if not swing_trading_service:
            raise HTTPException(status_code=503, detail="Swing trading service not available")
        
        all_recommendations = await swing_trading_service.get_all_timeframe_recommendations(
            limit_per_strategy=limit_per_strategy
        )
        
        # Add summary statistics
        summary = {
            "swing_buy_count": len(all_recommendations["swing_buy"]),
            "short_term_buy_count": len(all_recommendations["short_term_buy"]),
            "long_term_buy_count": len(all_recommendations["long_term_buy"]),
            "total_recommendations": (
                len(all_recommendations["swing_buy"]) + 
                len(all_recommendations["short_term_buy"]) + 
                len(all_recommendations["long_term_buy"])
            ),
            "timestamp": datetime.now().isoformat()
        }
        
        return {
            "recommendations": all_recommendations,
            "summary": summary
        }
        
    except Exception as e:
        logger.error(f"Error getting all timeframe recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get multi-timeframe recommendations: {str(e)}")

@app.get("/api/trading/strategies")
async def get_trading_strategies():
    """Get information about available trading strategies and their characteristics."""
    return {
        "strategies": {
            "swing_buy": {
                "name": "Swing Trading",
                "timeframe": "3-10 days",
                "holding_period": "Short to medium term",
                "target_return": "8%",
                "stop_loss": "5%",
                "risk_level": "Medium",
                "best_for": "Active traders seeking quick profits",
                "characteristics": [
                    "Technical breakout patterns",
                    "Volume confirmation",
                    "RSI optimization (35-65)",
                    "Trend continuation focus"
                ]
            },
            "short_term_buy": {
                "name": "Short-Term Position Trading", 
                "timeframe": "1-4 weeks",
                "holding_period": "Medium term",
                "target_return": "15%",
                "stop_loss": "8%",
                "risk_level": "Medium-High",
                "best_for": "Traders with moderate risk appetite",
                "characteristics": [
                    "Momentum and reversal patterns",
                    "Higher volatility tolerance",
                    "RSI range (30-70)",
                    "Breakout confirmation signals"
                ]
            },
            "long_term_buy": {
                "name": "Long-Term Investment",
                "timeframe": "1-6 months", 
                "holding_period": "Long term",
                "target_return": "25%",
                "stop_loss": "12%",
                "risk_level": "Medium-Low",
                "best_for": "Patient investors seeking substantial returns",
                "characteristics": [
                    "Fundamental + technical convergence",
                    "Quality stock selection",
                    "Broader RSI range (25-75)",
                    "Trend continuation analysis"
                ]
            }
        },
        "risk_management": {
            "position_sizing": "Based on volatility and timeframe",
            "stop_losses": "Automatically calculated per strategy",
            "risk_reward_ratios": "Optimized for each timeframe",
            "diversification": "Multiple Chartink themes for discovery"
        },
        "technical_analysis": {
            "indicators_used": ["RSI", "MACD", "SMA", "EMA", "Bollinger Bands", "Volume Analysis"],
            "confirmation_signals": "Multiple indicator confluence required",
            "trend_analysis": "Multi-timeframe trend confirmation",
            "volume_analysis": "Volume spike and pattern confirmation"
        }
    }

# Configuration Management Endpoints
@app.get("/api/config/strategies")
async def get_strategy_configurations():
    """Get all strategy configurations"""
    try:
        strategies = config_manager.get_all_strategies()
        
        strategy_info = {}
        for name, config in strategies.items():
            strategy_info[name] = {
                "name": config.name,
                "timeframe": config.timeframe,
                "target_return": config.target_return,
                "stop_loss": config.stop_loss,
                "analysis_criteria": config.analysis_criteria,
                "seed_algorithms": {
                    "chartink_themes": [
                        {
                            "name": algo.name,
                            "weight": algo.weight,
                            "limit": algo.limit,
                            "enabled": algo.enabled,
                            "filters": algo.filters
                        } for algo in config.seed_algorithms.get('chartink_themes', [])
                    ],
                    "custom_scanners": [
                        {
                            "name": algo.name,
                            "weight": algo.weight,
                            "limit": algo.limit,
                            "enabled": algo.enabled,
                            "parameters": algo.filters
                        } for algo in config.seed_algorithms.get('custom_scanners', [])
                    ]
                }
            }
        
        return {
            "strategies": strategy_info,
            "global_settings": config_manager.get_global_settings(),
            "experimental_features": config_manager.get_experimental_features()
        }
        
    except Exception as e:
        logger.error(f"Error getting strategy configurations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/config/strategy/{strategy_name}")
async def get_strategy_configuration(strategy_name: str):
    """Get configuration for a specific strategy"""
    try:
        strategy_config = config_manager.get_strategy_config(strategy_name)
        if not strategy_config:
            raise HTTPException(status_code=404, detail=f"Strategy '{strategy_name}' not found")
        
        return {
            "name": strategy_config.name,
            "timeframe": strategy_config.timeframe,
            "target_return": strategy_config.target_return,
            "stop_loss": strategy_config.stop_loss,
            "analysis_criteria": strategy_config.analysis_criteria,
            "seed_algorithms": {
                "chartink_themes": [
                    {
                        "name": algo.name,
                        "weight": algo.weight,
                        "limit": algo.limit,
                        "enabled": algo.enabled,
                        "filters": algo.filters
                    } for algo in strategy_config.seed_algorithms.get('chartink_themes', [])
                ],
                "custom_scanners": [
                    {
                        "name": algo.name,
                        "weight": algo.weight,
                        "limit": algo.limit,
                        "enabled": algo.enabled,
                        "parameters": algo.filters
                    } for algo in strategy_config.seed_algorithms.get('custom_scanners', [])
                ]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting strategy configuration for {strategy_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/config/strategy/{strategy_name}/algorithm/{algorithm_name}/weight")
async def update_algorithm_weight(strategy_name: str, algorithm_name: str, new_weight: float):
    """Update the weight of a specific algorithm for experimentation"""
    try:
        if not (0.0 <= new_weight <= 1.0):
            raise HTTPException(status_code=400, detail="Weight must be between 0.0 and 1.0")
        
        success = config_manager.update_strategy_weight(strategy_name, algorithm_name, new_weight)
        if not success:
            raise HTTPException(status_code=404, detail=f"Algorithm '{algorithm_name}' not found in strategy '{strategy_name}'")
        
        # Save configuration
        await config_manager.save_config()
        
        return {
            "message": f"Updated {algorithm_name} weight to {new_weight} for {strategy_name}",
            "strategy": strategy_name,
            "algorithm": algorithm_name,
            "new_weight": new_weight,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating algorithm weight: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/config/strategy/{strategy_name}/algorithm/{algorithm_name}/toggle")
async def toggle_algorithm(strategy_name: str, algorithm_name: str):
    """Enable/disable a specific algorithm"""
    try:
        success = config_manager.toggle_algorithm(strategy_name, algorithm_name)
        if not success:
            raise HTTPException(status_code=404, detail=f"Algorithm '{algorithm_name}' not found in strategy '{strategy_name}'")
        
        # Get updated status
        strategy_config = config_manager.get_strategy_config(strategy_name)
        algorithm_status = None
        
        if strategy_config:
            for algorithm_type in strategy_config.seed_algorithms:
                for algo in strategy_config.seed_algorithms[algorithm_type]:
                    if algo.name == algorithm_name:
                        algorithm_status = "enabled" if algo.enabled else "disabled"
                        break
        
        # Save configuration
        await config_manager.save_config()
        
        return {
            "message": f"{algorithm_name} {algorithm_status} for {strategy_name}",
            "strategy": strategy_name,
            "algorithm": algorithm_name,
            "status": algorithm_status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling algorithm: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/config/seed-algorithms/{strategy_name}")
async def get_seed_algorithms(strategy_name: str):
    """Get all seed algorithms for a strategy with their performance metrics"""
    try:
        chartink_algorithms = config_manager.get_seed_algorithms(strategy_name, 'chartink_themes')
        custom_algorithms = config_manager.get_seed_algorithms(strategy_name, 'custom_scanners')
        
        if not chartink_algorithms and not custom_algorithms:
            raise HTTPException(status_code=404, detail=f"No seed algorithms found for strategy '{strategy_name}'")
        
        return {
            "strategy": strategy_name,
            "chartink_themes": [
                {
                    "name": algo.name,
                    "weight": algo.weight,
                    "limit": algo.limit,
                    "enabled": algo.enabled,
                    "filters": algo.filters
                } for algo in chartink_algorithms
            ],
            "custom_scanners": [
                {
                    "name": algo.name,
                    "weight": algo.weight,
                    "limit": algo.limit,
                    "enabled": algo.enabled,
                    "parameters": algo.filters
                } for algo in custom_algorithms
            ],
            "total_algorithms": len(chartink_algorithms) + len(custom_algorithms),
            "enabled_algorithms": len([algo for algo in chartink_algorithms if algo.enabled]) + 
                                len([algo for algo in custom_algorithms if algo.enabled])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting seed algorithms for {strategy_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/config/reload")
async def reload_configuration():
    """Manually reload configuration from file"""
    try:
        await config_manager.reload_config()
        
        summary = config_manager.get_config_summary()
        
        return {
            "message": "Configuration reloaded successfully",
            "summary": summary,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error reloading configuration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/config/experimental-features")
async def get_experimental_features():
    """Get experimental features configuration"""
    try:
        experimental_features = config_manager.get_experimental_features()
        
        return {
            "experimental_features": experimental_features,
            "enabled_count": sum(
                1 for feature in experimental_features.values() 
                if isinstance(feature, dict) and feature.get('enabled', False)
            )
        }
        
    except Exception as e:
        logger.error(f"Error getting experimental features: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Updated Swing Trading Endpoints with Configuration Support
@app.get("/api/swing/buy-recommendations-config")
async def get_swing_buy_recommendations_with_config(
    limit: int = 10,
    confidence_threshold: float = 60.0,
    strategy_name: str = "swing_buy"
):
    """Get swing buy recommendations using configurable seed algorithms"""
    try:
        if not swing_trading_service:
            raise HTTPException(status_code=503, detail="Swing trading service unavailable")
        
        # Get candidates using configuration
        candidates = await swing_trading_service.analyzer.get_candidates_from_config(strategy_name)
        if not candidates:
            return []
        
        # Analyze candidates
        recommendations = []
        analysis_criteria = config_manager.get_analysis_criteria(strategy_name)
        
        for symbol in candidates[:limit * 3]:  # Get more candidates than needed
            try:
                analysis = await swing_trading_service.analyzer.analyze_stock_with_config(symbol, strategy_name)
                if analysis and analysis['confidence'] >= confidence_threshold:
                    recommendations.append(analysis)
                    
                if len(recommendations) >= limit:
                    break
                    
            except Exception as e:
                logger.debug(f"Error analyzing {symbol}: {e}")
                continue
        
        # Sort by confidence and strength
        recommendations.sort(key=lambda x: (x['confidence'], x['strength']), reverse=True)
        
        return recommendations
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting configurable swing buy recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    logger.info("🚀 Starting AlgoDiscovery Trading API Server...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8888,
        reload=True,
        log_level="info"
    ) 