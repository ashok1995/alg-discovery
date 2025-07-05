#!/usr/bin/env python3
"""
Long-Term Investment Server
===========================

Dedicated FastAPI server for long-term investment endpoints.
Runs on port 8001 to separate long-term investment services.
Focuses on Indian equity markets (BSE/NSE) with seed algorithms and re-ranking.
Includes database caching for improved performance.
"""

import asyncio
import logging
import uvicorn
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os
import json
import time
import uuid
from pathlib import Path
from utils.api_logger import APILogger

# Add the parent directory to the path to access modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment configuration for longterm server
from api.env_loader import load_server_environment, setup_logging

# Setup environment and logging
server_config = load_server_environment('longterm')
if server_config:
    setup_logging('longterm')
else:
    # Fallback logging configuration
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

from api.services.long_term_service import LongTermInvestmentService
from api.services.data_service import RealTimeDataService

# Add models for caching
from models.recommendation_models import (
    recommendation_cache, 
    RecommendationType, 
    RecommendationRequest
)
from models.recommendation_history_models import (
    recommendation_history_storage,
    RecommendationStrategy,
    RecommendationSource
)
from api.services.market_timer import market_timer

# Import combination testing and query functions
from api.tests.test_queries import test_query_silent

logger = logging.getLogger(__name__)

# Global services
data_service: Optional[RealTimeDataService] = None
long_term_service: Optional[LongTermInvestmentService] = None

# Initialize API logger
api_logger = APILogger("longterm")

def load_long_term_config():
    """Load the long term config with all query variants"""
    config_path = os.path.join(os.path.dirname(__file__), 'config', 'long_term_config.json')
    with open(config_path, 'r') as f:
        return json.load(f)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage the lifespan of the long-term investment service."""
    global data_service, long_term_service
    
    logger.info("🚀 Starting Long-Term Investment Service on port 8001...")
    
    try:
        # Initialize services
        data_service = RealTimeDataService()
        long_term_service = LongTermInvestmentService(data_service)
        
        # Load configuration
        config = load_long_term_config()
        app.state.config = config
        
        logger.info("✅ Long-term investment service initialized")
        yield
        
    except Exception as e:
        logger.error(f"Error initializing long-term investment service: {e}")
        raise
    finally:
        logger.info("🛑 Shutting down Long-Term Investment Service")

# Get server configuration
app_config = server_config or {
    'server_type': 'longterm',
    'port': 8001,
    'host': 'localhost',
    'cors_origins': ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:3000']
}

# Create FastAPI app
app = FastAPI(
    title="Indian Long-Term Investment API",
    description="Dedicated API for long-term investment analysis and recommendations focused on BSE/NSE Indian equity markets using combination query variants",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware with configuration from environment
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_config.get('cors_origins', ["*"]),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for the Indian long-term investment service."""
    return {
        "status": "healthy",
        "service": "indian-long-term-investment",
        "market_focus": "BSE/NSE Indian Equities",
        "algorithm_type": "Combination Query Variants",
        "port": 8001,
        "timestamp": datetime.now().isoformat(),
        "services": {
            "data_service": data_service is not None,
            "long_term_service": long_term_service is not None
        },
        "config_loaded": hasattr(app.state, 'config')
    }

# Request models
class LongBuyRequest(BaseModel):
    combination: Optional[Dict[str, str]] = None  # {"fundamental": "v1.0", "momentum": "v1.1", etc}
    limit_per_query: Optional[int] = 50  # Increased from 30 to 50 for more stocks from ChartInk
    min_score: Optional[float] = 25.0  # Score on 0-100 scale (25 = appears in 1+ categories)
    top_recommendations: Optional[int] = 20
    force_refresh: Optional[bool] = False  # Force fresh analysis bypassing cache

class CombinationTestRequest(BaseModel):
    fundamental_version: str
    momentum_version: str
    value_version: str
    quality_version: str
    limit_per_query: Optional[int] = 50  # Increased from 30 to 50 for more stocks from ChartInk

# GET Endpoints
@app.get("/api/longterm/recommendations")
async def get_longterm_recommendations(
    limit: int = Query(10, description="Maximum number of recommendations"),
    min_score: float = Query(60.0, description="Minimum score for recommendations")
):
    """
    Get long-term investment recommendations using versioned seed algorithms + re-ranking
    
    Returns stocks that pass versioned seed algorithm filters and are re-ranked based on
    market sentiment, sector rotation, and other factors.
    """
    try:
        logger.info(f"🔍 Getting recommendations (limit: {limit}, min_score: {min_score})")
        
        recommendations_data = await long_term_service.get_recommendations(
            limit=limit, 
            min_score=min_score
        )
        
        return recommendations_data
        
    except Exception as e:
        logger.error(f"❌ Error in recommendations endpoint: {e}")
        return {
            "error": "Failed to get recommendations",
            "details": str(e),
            "recommendations": [],
            "total_found": 0,
            "limit": limit,
            "min_score": min_score
        }

@app.get("/api/longterm/portfolio/suggestions")
async def get_portfolio_suggestions(
    portfolio_value: float = Query(100000, description="Total portfolio value"),
    risk_tolerance: str = Query("moderate", description="Risk tolerance: conservative, moderate, aggressive")
):
    """Get portfolio allocation suggestions for long-term investing."""
    try:
        if not long_term_service:
            raise HTTPException(status_code=503, detail="Long-term investment service not available")
        
        suggestions = await long_term_service.get_portfolio_suggestions(
            portfolio_value=portfolio_value,
            risk_tolerance=risk_tolerance
        )
        
        return suggestions
    except Exception as e:
        logger.error(f"Error getting portfolio suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/longterm/market/outlook")
async def get_market_outlook():
    """Get long-term market outlook and sentiment analysis."""
    try:
        if not long_term_service:
            raise HTTPException(status_code=503, detail="Long-term investment service not available")
        
        outlook = await long_term_service.get_market_outlook()
        return outlook
    except Exception as e:
        logger.error(f"Error getting market outlook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/longterm/sectors/analysis")
async def get_sector_analysis(
    limit_per_sector: int = Query(3, description="Maximum recommendations per sector")
):
    """Get sector-wise analysis for long-term investing."""
    try:
        if not long_term_service:
            raise HTTPException(status_code=503, detail="Long-term investment service not available")
        
        analysis = await long_term_service.get_sector_analysis(limit_per_sector=limit_per_sector)
        return analysis
    except Exception as e:
        logger.error(f"Error getting sector analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/longterm/analyze/{symbol}")
async def analyze_single_stock(symbol: str):
    """Analyze a single stock for long-term investment potential."""
    try:
        if not long_term_service:
            raise HTTPException(status_code=503, detail="Long-term investment service not available")
        
        analysis = await long_term_service.analyze_single_stock(symbol.upper())
        
        if not analysis:
            raise HTTPException(status_code=404, detail=f"Unable to analyze {symbol} - insufficient data")
        
        return {
            "symbol": symbol.upper(),
            "analysis": analysis,
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/longterm/watchlist/default")
async def get_default_watchlist():
    """Get the default watchlist for long-term investing."""
    try:
        if not long_term_service:
            raise HTTPException(status_code=503, detail="Long-term investment service not available")
        
        return {
            "watchlist": long_term_service.default_watchlist,
            "total_stocks": len(long_term_service.default_watchlist),
            "description": "Default large-cap stocks for long-term investment analysis",
            "sector_etfs": long_term_service.sector_etfs
        }
    except Exception as e:
        logger.error(f"Error getting default watchlist: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/longterm/strategy/info")
async def get_strategy_info():
    """Get current long-term investment strategy configuration."""
    try:
        if not long_term_service:
            raise HTTPException(status_code=503, detail="Long-term investment service not available")
        
        strategy_info = long_term_service.get_strategy_info()
        return strategy_info
    except Exception as e:
        logger.error(f"Error getting strategy info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# POST Endpoints for Real-time Analysis
@app.post("/api/longterm/long-buy-recommendations")
async def get_long_buy_recommendations(request: LongBuyRequest, raw_request: Request):
    """
    Get long-term investment recommendations using comprehensive fundamental + technical analysis.
    
    This endpoint provides sophisticated long-term stock recommendations by combining:
    - Fundamental analysis for financial health
    - Momentum analysis for technical strength  
    - Value analysis for fair pricing
    - Quality analysis for business excellence
    - Database caching for improved performance
    - Force refresh option to bypass cache
    
    The scoring system produces a 0-100 scale where:
    - 70-100: Strong long-term investment candidates
    - 50-69: Good investment options
    - 25-49: Moderate potential, needs further research
    - <25: Low confidence recommendations
    """
    try:
        logger.info("🚀 LONG-TERM INVESTMENT ANALYSIS STARTED")
        start_time = time.time()
        
        # Log the raw request body for debugging
        raw_body = await raw_request.body()
        try:
            raw_json = raw_body.decode()
            logger.info(f"RAW REQUEST BODY: {raw_json}")
            api_logger.log_request(json.loads(raw_json), '/api/longterm/long-buy-recommendations')
        except Exception as e:
            logger.warning(f"Could not decode raw request body: {e}")
            api_logger.log_request(str(raw_body), '/api/longterm/long-buy-recommendations')

        # Get configuration
        config = app.state.config
        
        # Default combination - use all four pillars of long-term investing
        default_combination = {
            "fundamental": "v1.0",
            "momentum": "v1.0", 
            "value": "v1.0",
            "quality": "v1.0"
        }
        
        combination = request.combination or default_combination
        
        logger.info(f"📊 Long-term combination: {combination}")
        logger.info(f"🔄 Force refresh: {request.force_refresh}")
        
        # Create cache request object
        cache_request = RecommendationRequest(
            combination=combination,
            limit_per_query=request.limit_per_query or 50,
            min_score=request.min_score or 25.0,
            top_recommendations=request.top_recommendations or 20,
            refresh=request.force_refresh or False  # Use force_refresh parameter
        )
        
        # Check cache first (unless force_refresh is True)
        if not request.force_refresh:
            logger.info("🔍 Checking cache for recent recommendations...")
            cached_result = await recommendation_cache.get_cached_recommendation(
                RecommendationType.LONG_TERM, 
                cache_request
            )
            
            if cached_result:
                processing_time = time.time() - start_time
                logger.info(f"✅ CACHE HIT - Returning cached long-term recommendations (processing: {processing_time:.2f}s)")
                
                # Add cache info to metadata
                cached_result['metadata']['cache_hit'] = True
                cached_result['metadata']['cache_processing_time_seconds'] = round(processing_time, 2)
                cached_result['metadata']['fresh_analysis'] = False
                cached_result['metadata']['force_refresh'] = False
                
                return cached_result
            else:
                logger.info("❌ CACHE MISS - Running fresh analysis...")
        else:
            logger.info("🔄 FORCE REFRESH - Bypassing cache and running fresh analysis...")
        
        # Extract individual versions
        fundamental_v = combination.get("fundamental", "v1.0")
        momentum_v = combination.get("momentum", "v1.0")
        value_v = combination.get("value", "v1.0")
        quality_v = combination.get("quality", "v1.0")
        
        logger.info(f"🎯 Running combination analysis: F={fundamental_v}, M={momentum_v}, V={value_v}, Q={quality_v}")
        
        # Run the comprehensive analysis
        result = await run_combination_analysis(
            config, 
            fundamental_v, 
            momentum_v, 
            value_v, 
            quality_v, 
            limit=request.limit_per_query or 50
        )
        
        # Get top stocks
        top_stocks = result.get('top_stocks', [])
        logger.info(f"📊 Analysis returned {len(top_stocks)} stocks")
        
        # Filter by minimum score if specified
        if request.min_score and request.min_score > 0:
            original_count = len(top_stocks)
            top_stocks = [stock for stock in top_stocks if stock['score'] >= request.min_score]
            filtered_count = len(top_stocks)
            logger.info(f"🔍 Score filtering (min_score={request.min_score}): {original_count} -> {filtered_count} stocks")
        
        # Limit to top recommendations
        top_stocks = top_stocks[:request.top_recommendations or 20]
        logger.info(f"📋 Final selection: {len(top_stocks)} stocks")
        
        # Convert to the expected recommendation format
        recommendations = []
        for stock in top_stocks:
            recommendation = {
                "symbol": stock['symbol'],
                "name": stock.get('name', stock['symbol']),
                "price": float(stock.get('price', 0)) if stock.get('price') != 'N/A' else 0.0,
                "score": float(stock['score']),
                "per_change": float(stock.get('per_change', 0)) if stock.get('per_change') != 'N/A' else 0.0,
                "volume": int(stock.get('volume', 0)) if stock.get('volume') != 'N/A' else 0,
                "recommendation_type": (
                    "Strong Long-term Buy" if stock['score'] >= 70 else 
                    "Long-term Buy" if stock['score'] >= 50 else 
                    "Hold"
                ),
                "appearances": len(stock['categories']),
                "category_count": len(stock['categories']),
                "categories": list(stock['categories']),
                "fundamental": "fundamental" in stock['categories'],
                "momentum": "momentum" in stock['categories'],
                "value": "value" in stock['categories'],
                "quality": "quality" in stock['categories']
            }
            recommendations.append(recommendation)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Build comprehensive metadata
        metadata = {
            "combination_used": combination,
            "performance_metrics": result.get('metrics', {}),
            "category_breakdown": result.get('category_results', {}),
            "total_recommendations": len(recommendations),
            "request_parameters": request.dict(),
            "timestamp": datetime.now().isoformat(),
            "processing_time_seconds": round(processing_time, 2),
            "cache_hit": False,
            "fresh_analysis": True,
            "force_refresh": request.force_refresh or False,
            "algorithm_info": {
                "approach": "Multi-factor long-term analysis with re-ranking",
                "timeframe": "6-18 months",
                "categories": ["fundamental", "momentum", "value", "quality"],
                "scoring": "Weighted sum with re-ranking criteria (0-100 scale)",
                "max_possible_score": 100.0,
                "score_breakdown": "Equal weight distribution + re-ranking boosts",
                "data_source": "ChartInk with nsecode symbols"
            }
        }
        
        # Build final response
        response_data = {
            "status": "success",
            "recommendations": recommendations,
            "metadata": metadata,
            "columns": [
                "symbol", "name", "price", "score", "per_change", "volume",
                "recommendation_type", "appearances", "category_count", 
                "fundamental", "momentum", "value", "quality", "categories"
            ]
        }
        
        # Always cache the results after fresh analysis (regardless of market hours when force_refresh is used)
        try:
            await recommendation_cache.store_recommendation(
                RecommendationType.LONG_TERM,
                cache_request,
                recommendations,
                metadata
            )
            if request.force_refresh:
                logger.info(f"✅ Force refresh: Updated cache with {len(recommendations)} long-term recommendations")
            else:
                logger.info(f"✅ Cached {len(recommendations)} long-term recommendations")
        except Exception as cache_error:
            logger.warning(f"⚠️ Failed to cache results: {cache_error}")
        
        # Store in historical database when force_refresh is used (API-triggered analysis)
        if request.force_refresh:
            try:
                execution_id = f"api_longterm_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}"
                market_info = market_timer.get_market_session_info()
                
                batch_id = await recommendation_history_storage.store_recommendation_batch(
                    execution_id=execution_id,
                    cron_job_id="api_longterm_force_refresh",
                    strategy=RecommendationStrategy.LONGTERM,
                    recommendations=recommendations,
                    metadata={
                        "algorithm_info": metadata.get("algorithm_info", {}),
                        "performance_metrics": {
                            "api_response_time_ms": processing_time * 1000,
                            "total_processing_time_seconds": processing_time,
                            "cache_bypassed": True,
                            "force_refresh": True
                        },
                        "source_info": {
                            "trigger": "api_force_refresh",
                            "endpoint": "/api/longterm/long-buy-recommendations",
                            "user_agent": "API_Client"
                        }
                    },
                    request_parameters={
                        "combination": combination,
                        "limit_per_query": request.limit_per_query or 50,
                        "min_score": request.min_score or 25.0,
                        "top_recommendations": request.top_recommendations or 20,
                        "force_refresh": True
                    },
                    market_context={
                        "market_condition": market_info.get('session', 'unknown'),
                        "trading_session": market_info.get('session_id', ''),
                        "market_open": market_info.get('is_open', False),
                        "timestamp": datetime.now(),
                        "source": "api_request"
                    }
                )
                logger.info(f"✅ Stored long-term recommendations batch in history: {batch_id}")
                
                # Add historical storage info to response metadata
                metadata["historical_storage"] = {
                    "batch_id": batch_id,
                    "execution_id": execution_id,
                    "stored": True
                }
                
            except Exception as storage_error:
                logger.warning(f"⚠️ Failed to store long-term recommendations in history: {storage_error}")
                metadata["historical_storage"] = {
                    "stored": False,
                    "error": str(storage_error)
                }
        
        # Update response data with any metadata changes
        response_data["metadata"] = metadata
        
        logger.info(f"✅ LONG-TERM ANALYSIS COMPLETED in {processing_time:.2f}s")
        logger.info(f"📈 Top recommendation: {recommendations[0]['symbol']} (score: {recommendations[0]['score']:.1f})" if recommendations else "❌ No recommendations found")
        
        # Log the response
        api_logger.log_response(response_data, '/api/longterm/long-buy-recommendations')
        
        return response_data
        
    except Exception as e:
        logger.error(f"❌ Error in long-term analysis: {str(e)}")
        import traceback
        logger.error(f"📋 Full traceback:\n{traceback.format_exc()}")
        error_response = {
            "status": "error",
            "message": str(e)
        }
        # Log the error
        api_logger.log_error(str(e), '/api/longterm/long-buy-recommendations', error_response)
        raise HTTPException(status_code=500, detail=f"Long-term analysis failed: {str(e)}")

@app.post("/api/longterm/portfolio/optimize")
async def optimize_longterm_portfolio(request: LongBuyRequest):
    """Optimize portfolio for long-term investing."""
    try:
        if not long_term_service:
            raise HTTPException(status_code=503, detail="Long-term investment service not available")
        
        # Get portfolio suggestions
        portfolio_suggestions = await long_term_service.get_portfolio_suggestions(
            portfolio_value=request.limit_per_query or 100000,
            risk_tolerance=request.min_score or "moderate"
        )
        
        # Get sector analysis for diversification insights
        sector_analysis = await long_term_service.get_sector_analysis(limit_per_sector=3)
        
        return {
            "portfolio_optimization": portfolio_suggestions,
            "sector_diversification": sector_analysis,
            "optimization_date": datetime.now().isoformat(),
            "request_parameters": request.dict()
        }
    except Exception as e:
        logger.error(f"Error optimizing long-term portfolio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/longterm/batch-analysis")
async def batch_analysis(request: LongBuyRequest):
    """Perform batch analysis on multiple stocks."""
    try:
        if not long_term_service:
            raise HTTPException(status_code=503, detail="Long-term investment service not available")
        
        if not request.combination:
            raise HTTPException(status_code=400, detail="Combination is required for batch analysis")
        
        # Analyze each combination
        analysis_results = []
        for combination in request.combination.values():
            analysis = await long_term_service.analyze_combination(combination)
            if analysis:
                analysis_results.append({
                    "combination": combination,
                    "analysis": analysis
                })
        
        return {
            "batch_analysis": analysis_results,
            "total_analyzed": len(analysis_results),
            "total_requested": len(request.combination),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error performing batch analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/longterm/demo/recommendations")
async def get_demo_recommendations():
    """Demo long-term investment recommendations with Chartink filtering + re-ranking for Indian stocks"""
    return {
        "timestamp": datetime.now().isoformat(),
        "algorithm_type": "Chartink Filtering + Re-ranking",
        "market_focus": "BSE/NSE Indian Equities",
        "filtering_approach": "Two-stage: Chartink seed algorithm filters followed by market sentiment re-ranking",
        "recommendations": [
            {
                "symbol": "RELIANCE.NS",
                "final_score": 84.5,
                "chartink_score": 78.0,
                "reranking_score": 92.5,
                "recommendation": "Strong Buy", 
                "target_price": 2850.0,
                "current_price": 2450.0,
                "upside_potential": 16.3,
                "risk_level": "Low",
                "sector": "Energy",
                "market_cap": "Large Cap",
                "exchange": "NSE",
                "chartink_theme": "long_term_buy",
                "chartink_filter": "fundamental_growth", 
                "volume": 15420000,
                "algorithm_details": {
                    "chartink_filtering": "Passed fundamental_growth filter - Strong revenue growth, low debt",
                    "re_ranking_factors": {
                        "sector_rotation": "Energy sector (Favored)",
                        "market_sentiment": "Positive (3.2)",
                        "liquidity_factor": "High liquidity"
                    },
                    "final_score_calculation": "Chartink (78.0) * 0.6 + Re-ranking (92.5) * 0.4"
                },
                "analysis_summary": "Stock selected via Chartink fundamental_growth screening and re-ranked based on market sentiment, sector rotation, and liquidity factors. Final score: 84.5/100"
            },
            {
                "symbol": "TCS.NS", 
                "final_score": 82.1,
                "chartink_score": 85.0,
                "reranking_score": 77.5,
                "recommendation": "Strong Buy",
                "target_price": 4100.0,
                "current_price": 3650.0,
                "upside_potential": 12.3,
                "risk_level": "Low",
                "sector": "Technology",
                "market_cap": "Large Cap", 
                "exchange": "NSE",
                "chartink_theme": "long_term_buy",
                "chartink_filter": "value_with_momentum",
                "volume": 8960000,
                "algorithm_details": {
                    "chartink_filtering": "Passed value_with_momentum filter - Strong fundamentals with technical momentum",
                    "re_ranking_factors": {
                        "sector_rotation": "Technology sector (Favored)",
                        "market_sentiment": "Positive (2.8)",
                        "liquidity_factor": "High liquidity"
                    },
                    "final_score_calculation": "Chartink (85.0) * 0.6 + Re-ranking (77.5) * 0.4"
                },
                "analysis_summary": "Stock selected via Chartink value_with_momentum screening and re-ranked based on market sentiment, sector rotation, and liquidity factors. Final score: 82.1/100"
            },
            {
                "symbol": "HDFCBANK.NS",
                "final_score": 79.8,
                "chartink_score": 82.0,
                "reranking_score": 76.0,
                "recommendation": "Buy",
                "target_price": 1720.0, 
                "current_price": 1580.0,
                "upside_potential": 8.9,
                "risk_level": "Low",
                "sector": "Banking",
                "market_cap": "Large Cap",
                "exchange": "NSE", 
                "chartink_theme": "long_term_buy",
                "chartink_filter": "fundamental_growth",
                "volume": 12300000,
                "algorithm_details": {
                    "chartink_filtering": "Passed fundamental_growth filter - Consistent ROE, strong capital adequacy",
                    "re_ranking_factors": {
                        "sector_rotation": "Banking sector (Favored)",
                        "market_sentiment": "Positive (1.9)",
                        "liquidity_factor": "High liquidity"
                    },
                    "final_score_calculation": "Chartink (82.0) * 0.6 + Re-ranking (76.0) * 0.4"
                },
                "analysis_summary": "Stock selected via Chartink fundamental_growth screening and re-ranked based on market sentiment, sector rotation, and liquidity factors. Final score: 79.8/100"
            }
        ],
        "filtering_summary": {
            "total_stocks_screened": "500+ stocks via Chartink API",
            "chartink_filters_applied": ["fundamental_growth", "value_with_momentum"],
            "stocks_passed_chartink": 45,
            "re_ranking_applied": True,
            "final_qualified_stocks": 3,
            "algorithm_approach": "Chartink acts as initial filter to identify fundamentally strong stocks, then re-ranking algorithm applies market sentiment, sector rotation, and liquidity analysis"
        },
        "chartink_integration": {
            "api_status": "Connected",
            "filters_used": {
                "long_term_buy": {
                    "fundamental_growth": "Growth stocks with strong fundamentals (PE<30, Revenue Growth>5%)",
                    "value_with_momentum": "Value stocks showing price momentum (P/E ratio, weekly performance)"
                }
            },
            "data_freshness": "Real-time from Chartink screening engine"
        },
        "re_ranking_factors": {
            "sector_rotation": {
                "weight": 0.25,
                "favored_sectors": ["Technology", "Banking", "Pharma"]
            },
            "market_sentiment": {
                "weight": 0.30,
                "current_status": "Positive bias"
            },
            "liquidity": {
                "weight": 0.20,
                "measurement": "Average daily volume"
            },
            "volatility": {
                "weight": 0.15,
                "preference": "Lower volatility preferred"
            },
            "peer_comparison": {
                "weight": 0.10,
                "method": "Sector relative performance"
            }
        }
    }

@app.get("/api/longterm/demo/portfolio")
async def get_demo_portfolio():
    """Get demo portfolio suggestions for Indian stocks."""
    return {
        "portfolio_optimization": {
            "portfolio_value": 100000,
            "currency": "INR",
            "market_focus": "Indian Equities (BSE/NSE)",
            "recommended_allocation": {
                "stocks": 75,
                "bonds": 15,
                "gold": 8,
                "fd_ppf": 2
            },
            "sector_allocation": {
                "Technology": 20,
                "Banking": 18,
                "Energy": 12,
                "FMCG": 10,
                "Pharma": 8,
                "Auto": 7,
                "Infrastructure": 5
            },
            "recommended_stocks": [
                {
                    "symbol": "RELIANCE.NS", 
                    "allocation": 8.0, 
                    "shares": 3,
                    "amount": 7350,
                    "rationale": "Energy sector leader with petrochemicals diversification",
                    "exchange": "NSE"
                },
                {
                    "symbol": "TCS.NS", 
                    "allocation": 7.0, 
                    "shares": 2,
                    "amount": 7000,
                    "rationale": "IT sector leader with global presence",
                    "exchange": "NSE"
                },
                {
                    "symbol": "HDFCBANK.NS", 
                    "allocation": 6.0, 
                    "shares": 4,
                    "amount": 6480,
                    "rationale": "Premium private bank with strong fundamentals",
                    "exchange": "NSE"
                },
                {
                    "symbol": "HINDUNILVR.NS", 
                    "allocation": 5.0, 
                    "shares": 2,
                    "amount": 5000,
                    "rationale": "FMCG leader with strong brand portfolio",
                    "exchange": "NSE"
                },
                {
                    "symbol": "INFY.NS", 
                    "allocation": 4.0, 
                    "shares": 3,
                    "amount": 4200,
                    "rationale": "IT services with strong digital capabilities",
                    "exchange": "NSE"
                }
            ],
            "total_stock_allocation": 30030,
            "cash_remaining": 69970,
            "diversification_notes": [
                "Diversified across 5 major Indian sectors",
                "Focus on large-cap stocks for stability",
                "Regular SIP recommended for rupee cost averaging"
            ]
        },
        "risk_profile": "Moderate",
        "expected_annual_return": "12-15%",
        "indian_specific_advice": [
            "Consider ELSS for tax saving under Section 80C",
            "SIP approach for disciplined investing",
            "Review portfolio during quarterly earnings season"
        ],
        "demo_data": True,
        "timestamp": datetime.now().isoformat(),
        "currency": "INR"
    }

@app.get("/api/longterm/demo/sectors")
async def get_demo_sector_analysis():
    """Get demo sector analysis for Indian markets."""
    return {
        "sector_analysis": {
            "Technology": {
                "outlook": "Positive",
                "score": 85,
                "top_picks": ["TCS.NS", "INFY.NS", "HCLTECH.NS"],
                "growth_potential": "High",
                "key_drivers": ["Digital transformation", "Cloud adoption", "Global IT spending"],
                "market_cap_range": "3L-13L Cr"
            },
            "Banking": {
                "outlook": "Stable",
                "score": 78,
                "top_picks": ["HDFCBANK.NS", "ICICIBANK.NS", "KOTAKBANK.NS"],
                "growth_potential": "Moderate",
                "key_drivers": ["Credit growth", "Digital banking", "Financial inclusion"],
                "market_cap_range": "2L-12L Cr"
            },
            "Energy": {
                "outlook": "Neutral",
                "score": 72,
                "top_picks": ["RELIANCE.NS", "ONGC.NS", "BPCL.NS"],
                "growth_potential": "Moderate",
                "key_drivers": ["Oil prices", "Refining margins", "Green energy transition"],
                "market_cap_range": "1L-17L Cr"
            },
            "FMCG": {
                "outlook": "Stable",
                "score": 75,
                "top_picks": ["HINDUNILVR.NS", "ITC.NS", "NESTLEIND.NS"],
                "growth_potential": "Moderate",
                "key_drivers": ["Rural demand", "Premium products", "E-commerce growth"],
                "market_cap_range": "50K-6L Cr"
            },
            "Pharma": {
                "outlook": "Positive",
                "score": 80,
                "top_picks": ["SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS"],
                "growth_potential": "High",
                "key_drivers": ["Generic drugs", "US FDA approvals", "Biosimilars"],
                "market_cap_range": "30K-2L Cr"
            }
        },
        "indian_market_trends": [
            "Digital India initiatives boosting tech sector",
            "Banking sector benefiting from formalization",
            "Pharma sector gaining from global generics demand",
            "FMCG companies adapting to changing consumption patterns",
            "Energy sector transitioning towards renewables"
        ],
        "macro_factors": {
            "gdp_growth": "6-7%",
            "inflation": "4-6%",
            "policy_rate": "6.5%",
            "fiscal_deficit": "5.9% of GDP"
        },
        "investment_themes": [
            "Digitalization across sectors",
            "Financial inclusion and formalization",
            "Infrastructure development",
            "Healthcare accessibility",
            "Sustainable energy transition"
        ],
        "demo_data": True,
        "timestamp": datetime.now().isoformat(),
        "currency": "INR",
        "market_focus": "Indian Equities (BSE/NSE)"
    }

@app.post("/api/longterm/fundamental-analysis")
async def get_fundamental_analysis(symbol: str = Query(..., description="Stock symbol to analyze")):
    """
    Get comprehensive fundamental analysis for a single stock
    
    Provides detailed fundamental metrics, scoring, and investment recommendations
    using Yahoo Finance data and advanced scoring algorithms.
    """
    logger.info(f"📊 Getting fundamental analysis for {symbol}")
    
    try:
        # Get fundamental analysis from the reranker
        from api.services.fundamental_reranker import FundamentalReranker
        reranker = FundamentalReranker()
        
        report = await reranker.get_stock_report(symbol)
        
        if "error" in report:
            raise HTTPException(
                status_code=404,
                detail=f"Unable to generate fundamental analysis for {symbol}: {report['error']}"
            )
        
        return {
            "status": "success",
            "symbol": symbol,
            "analysis": report,
            "timestamp": datetime.now().isoformat(),
            "disclaimer": "This analysis is for educational purposes only. Please consult with a financial advisor before making investment decisions.",
            "data_source": "Yahoo Finance + Advanced Scoring Algorithms"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating fundamental analysis for {symbol}: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error generating fundamental analysis: {str(e)}"
        )

# Temporary debug endpoint for testing queries
@app.post("/debug/test-simple-query")
async def debug_test_simple_query():
    """Debug endpoint to test a very simple Chartink query"""
    try:
        # Test with a very basic query
        simple_query = "( {cash} ( latest close > 10 and latest volume > 1000 ) )"
        
        logger.info(f"Testing simple query: {simple_query}")
        result = chartink_service.get_stocks_by_filter(simple_query, "debug_test")
        
        return {
            "query": simple_query,
            "result_count": len(result) if result is not None else 0,
            "columns": list(result.columns) if result is not None and not result.empty else [],
            "sample_data": result.head(3).to_dict('records') if result is not None and not result.empty else []
        }
    except Exception as e:
        logger.error(f"Error in debug test: {e}")
        return {"error": str(e), "query": simple_query}

@app.get("/api/longterm/available-variants")
async def get_available_variants():
    """Get all available query variants by category for combination building."""
    try:
        config = app.state.config
        variants_summary = {}
        
        for category, variants in config['sub_algorithm_variants'].items():
            variants_summary[category] = {}
            for version, variant_data in variants.items():
                variants_summary[category][version] = {
                    "name": variant_data['name'],
                    "description": variant_data['description'],
                    "weight": variant_data['weight'],
                    "expected_results": variant_data.get('expected_results', 'N/A')
                }
        
        return {
            "status": "success",
            "variants": variants_summary,
            "total_categories": len(variants_summary),
            "total_combinations": len(config['sub_algorithm_variants']['fundamental']) * 
                                 len(config['sub_algorithm_variants']['momentum']) * 
                                 len(config['sub_algorithm_variants']['value']) * 
                                 len(config['sub_algorithm_variants']['quality']),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting available variants: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/longterm/test-combination")
async def test_combination(request: CombinationTestRequest):
    """
    Test a specific combination of query variants and return detailed results.
    
    This endpoint allows testing custom combinations and provides detailed 
    performance metrics for analysis.
    """
    try:
        config = app.state.config
        
        logger.info(f"🧪 Testing combination: F:{request.fundamental_version} M:{request.momentum_version} V:{request.value_version} Q:{request.quality_version}")
        
        result = await run_combination_analysis(
            config,
            request.fundamental_version,
            request.momentum_version,
            request.value_version,
            request.quality_version,
            request.limit_per_query or 50
        )
        
        return {
            "status": "success",
            "test_results": result,
            "combination_tested": {
                "fundamental": request.fundamental_version,
                "momentum": request.momentum_version,
                "value": request.value_version,
                "quality": request.quality_version
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error testing combination: {e}")
        raise HTTPException(status_code=500, detail=f"Error testing combination: {str(e)}")

async def run_combination_analysis(config, fundamental_v, momentum_v, value_v, quality_v, limit=50):
    """Run combination analysis using the test_single_combination logic."""
    from collections import defaultdict
    
    categories = ['fundamental', 'momentum', 'value', 'quality']
    versions = [fundamental_v, momentum_v, value_v, quality_v]
    
    all_stocks = defaultdict(float)  # symbol -> total_score
    stock_appearances = defaultdict(int)
    stock_categories = defaultdict(set)
    category_results = {}
    
    total_weight = 0
    total_stocks_found = 0
    
    # Test each category
    for category, version in zip(categories, versions):
        try:
            variant_data = config['sub_algorithm_variants'][category][version]
            query = variant_data['query']
            weight = variant_data['weight']
            name = variant_data['name']
            
            logger.info(f"  🔍 {category.capitalize()} ({version}): {name}")
            
            # Run the query
            results = test_query_silent(query, limit=limit)
            
            if results and 'data' in results and results.get('success', False):
                stocks = results['data']
                stocks_found = len(stocks)
                logger.info(f"     ✅ Found {stocks_found} stocks")
                
                category_results[category] = {
                    'version': version,
                    'name': name,
                    'stocks_found': stocks_found,
                    'weight': weight,
                    'stocks': stocks,
                    'query_success': True
                }
                
                total_stocks_found += stocks_found
                total_weight += weight
                
                # Score stocks from this category
                for stock in stocks:
                    symbol = stock.get('nsecode', 'UNKNOWN')
                    all_stocks[symbol] += weight * 100  # Scale to 0-100 range
                    stock_appearances[symbol] += 1
                    stock_categories[symbol].add(category)
            else:
                logger.warning(f"     ❌ No results for {category} {version}")
                category_results[category] = {
                    'version': version,
                    'name': name,
                    'stocks_found': 0,
                    'weight': weight,
                    'stocks': [],
                    'query_success': False,
                    'error': results.get('error', 'No data returned') if results else 'Query failed'
                }
        except Exception as e:
            logger.error(f"     💥 Error in {category} {version}: {e}")
            category_results[category] = {
                'version': version,
                'name': 'Error',
                'stocks_found': 0,
                'weight': 0,
                'stocks': [],
                'query_success': False,
                'error': str(e)
            }
    
    # Calculate combination metrics
    unique_stocks = len(all_stocks)
    multi_category_stocks = sum(1 for s in stock_categories.values() if len(s) > 1)
    
    # Get top stocks from this combination
    sorted_stocks = sorted(all_stocks.items(), key=lambda x: x[1], reverse=True)
    top_stocks = []
    
    for symbol, score in sorted_stocks[:20]:  # Get top 20
        # Get stock details
        stock_details = None
        for cat_data in category_results.values():
            if cat_data.get('stocks'):
                for stock in cat_data['stocks']:
                    if stock.get('nsecode') == symbol:
                        stock_details = stock
                        break
            if stock_details:
                break
        
        if stock_details:
            top_stocks.append({
                'symbol': symbol,
                'name': stock_details.get('name', 'N/A'),
                'price': stock_details.get('close', 'N/A'),
                'score': round(score, 2),
                'appearances': stock_appearances[symbol],
                'categories': list(stock_categories[symbol]),
                'volume': stock_details.get('volume', 'N/A'),
                'per_change': stock_details.get('per_chg', stock_details.get('per_change', 'N/A'))
            })
    
    # Calculate performance score
    diversity_score = (multi_category_stocks / max(unique_stocks, 1)) * 100 if unique_stocks > 0 else 0
    coverage_score = (unique_stocks / max(total_stocks_found, 1)) * 100 if total_stocks_found > 0 else 0
    weight_efficiency = (total_weight / 4) if total_weight > 0 else 0  # Average weight
    
    performance_score = (diversity_score * 0.4 + coverage_score * 0.3 + weight_efficiency * 100 * 0.3)
    
    # Log analysis summary
    logger.info(f"📊 Analysis Complete: {unique_stocks} unique stocks, {multi_category_stocks} multi-category")
    
    return {
        'combination': {
            'fundamental': fundamental_v,
            'momentum': momentum_v,
            'value': value_v,
            'quality': quality_v
        },
        'metrics': {
            'unique_stocks': unique_stocks,
            'total_stocks_found': total_stocks_found,
            'multi_category_stocks': multi_category_stocks,
            'diversity_score': round(diversity_score, 2),
            'coverage_score': round(coverage_score, 2),
            'performance_score': round(performance_score, 2),
            'total_weight': total_weight
        },
        'top_stocks': top_stocks,
        'category_results': category_results,
        'tested_at': datetime.now().isoformat()
    }

if __name__ == "__main__":
    logger.info("🚀 Starting Long-Term Investment API Server on port 8001...")
    from warnings import warn

    warn(
        "Running 'longterm_server' directly is deprecated. Use the central FastAPI app.",
        DeprecationWarning,
    ) 