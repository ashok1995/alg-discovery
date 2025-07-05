#!/usr/bin/env python3
"""
Long-Term Investment Server
==========================

Dedicated FastAPI server for long-term investment analysis and recommendations.
Runs on port 8001 and provides endpoints for:
- Long-term stock analysis (1+ year horizon)
- Portfolio suggestions
- Market outlook analysis
- Sector analysis
- Investment strategy configuration

Usage:
    python longterm_server.py
    or
    uvicorn longterm_server:app --host 0.0.0.0 --port 8001
"""

import asyncio
import logging
import uvicorn
import numpy as np
import yfinance as yf
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Import services with fallback
try:
    from api.services.data_service import RealTimeDataService
    from api.services.long_term_service import LongTermInvestmentService
    FULL_SERVICES_AVAILABLE = True
except ImportError:
    FULL_SERVICES_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Full services not available - creating simplified version")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Mock services for standalone operation
class MockDataService:
    """Mock data service for demonstration."""
    
    async def get_stock_data(self, symbol: str):
        """Get basic stock data using yfinance."""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            hist = ticker.history(period="1d")
            
            if not hist.empty:
                current_price = hist['Close'].iloc[-1]
            else:
                current_price = info.get('currentPrice', 100.0)
            
            return type('StockData', (), {
                'current_price': current_price,
                'symbol': symbol,
                'info': info
            })()
        except Exception as e:
            logger.error(f"Error getting stock data for {symbol}: {e}")
            return type('StockData', (), {
                'current_price': 100.0,
                'symbol': symbol,
                'info': {}
            })()
    
    async def get_historical_data(self, symbol: str, period: str = "1y"):
        """Get historical data using yfinance."""
        try:
            ticker = yf.Ticker(symbol)
            return ticker.history(period=period)
        except Exception as e:
            logger.error(f"Error getting historical data for {symbol}: {e}")
            return None

class MockLongTermService:
    """Mock long-term investment service for demonstration."""
    
    def __init__(self, data_service):
        self.data_service = data_service
        # Popular long-term investment stocks
        self.default_stocks = [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
            'BRK-B', 'JNJ', 'V', 'PG', 'DIS', 'MA', 'UNH', 'HD', 'BAC', 'XOM',
            'JPM', 'PFE', 'ABBV', 'CVX', 'LLY', 'KO', 'PEP', 'TMO', 'COST',
            'AVGO', 'ABT', 'ACN', 'ADBE', 'CRM', 'VZ', 'DHR', 'MRK', 'TXN',
            'NEE', 'WMT', 'QCOM', 'HON', 'RTX', 'UPS', 'LOW', 'AMGN', 'ORCL'
        ]
    
    async def get_long_term_recommendations(self, symbols=None, limit=20, min_score=60.0):
        """Generate mock long-term recommendations."""
        recommendations = []
        stocks_to_analyze = symbols if symbols else self.default_stocks[:limit]
        
        for symbol in stocks_to_analyze:
            try:
                stock_data = await self.data_service.get_stock_data(symbol)
                historical_data = await self.data_service.get_historical_data(symbol, "1y")
                
                # Calculate basic metrics
                current_price = stock_data.current_price
                info = getattr(stock_data, 'info', {})
                
                # Generate mock analysis scores
                fundamental_score = np.random.uniform(50, 95)
                technical_score = np.random.uniform(40, 90)
                growth_score = np.random.uniform(45, 95)
                overall_score = (fundamental_score + technical_score + growth_score) / 3
                
                if overall_score >= min_score:
                    recommendation = {
                        'symbol': symbol,
                        'company_name': info.get('longName', f"{symbol} Inc."),
                        'current_price': round(current_price, 2),
                        'sector': info.get('sector', 'Technology'),
                        'industry': info.get('industry', 'Software'),
                        'market_cap': info.get('marketCap', 0),
                        'scores': {
                            'overall_score': round(overall_score, 1),
                            'fundamental_score': round(fundamental_score, 1),
                            'technical_score': round(technical_score, 1),
                            'growth_score': round(growth_score, 1)
                        },
                        'metrics': {
                            'pe_ratio': info.get('trailingPE', 0),
                            'peg_ratio': info.get('pegRatio', 0),
                            'debt_to_equity': info.get('debtToEquity', 0),
                            'roe': info.get('returnOnEquity', 0),
                            'revenue_growth': info.get('revenueGrowth', 0)
                        },
                        'recommendation': 'BUY' if overall_score >= 80 else 'HOLD' if overall_score >= 70 else 'WATCH',
                        'target_price': round(current_price * np.random.uniform(1.1, 1.3), 2),
                        'time_horizon': '12-24 months',
                        'risk_level': 'Medium' if overall_score >= 75 else 'High'
                    }
                    recommendations.append(recommendation)
                    
            except Exception as e:
                logger.error(f"Error analyzing {symbol}: {e}")
                continue
        
        # Sort by overall score
        recommendations.sort(key=lambda x: x['scores']['overall_score'], reverse=True)
        return recommendations[:limit]
    
    async def analyze_single_stock(self, symbol: str):
        """Analyze a single stock in detail."""
        try:
            stock_data = await self.data_service.get_stock_data(symbol)
            historical_data = await self.data_service.get_historical_data(symbol, "2y")
            
            current_price = stock_data.current_price
            info = getattr(stock_data, 'info', {})
            
            # Calculate technical indicators
            analysis = {
                'symbol': symbol,
                'company_info': {
                    'name': info.get('longName', f"{symbol} Inc."),
                    'sector': info.get('sector', 'Technology'),
                    'industry': info.get('industry', 'Software'),
                    'market_cap': info.get('marketCap', 0),
                    'employees': info.get('fullTimeEmployees', 0),
                    'website': info.get('website', ''),
                    'business_summary': info.get('longBusinessSummary', '')[:300] + '...'
                },
                'price_info': {
                    'current_price': round(current_price, 2),
                    'day_high': info.get('dayHigh', current_price),
                    'day_low': info.get('dayLow', current_price),
                    'fifty_two_week_high': info.get('fiftyTwoWeekHigh', current_price),
                    'fifty_two_week_low': info.get('fiftyTwoWeekLow', current_price),
                    'volume': info.get('volume', 0),
                    'avg_volume': info.get('averageVolume', 0)
                },
                'financial_metrics': {
                    'pe_ratio': info.get('trailingPE', 0),
                    'forward_pe': info.get('forwardPE', 0),
                    'peg_ratio': info.get('pegRatio', 0),
                    'price_to_book': info.get('priceToBook', 0),
                    'debt_to_equity': info.get('debtToEquity', 0),
                    'current_ratio': info.get('currentRatio', 0),
                    'roe': info.get('returnOnEquity', 0),
                    'roa': info.get('returnOnAssets', 0),
                    'gross_margin': info.get('grossMargins', 0),
                    'operating_margin': info.get('operatingMargins', 0),
                    'profit_margin': info.get('profitMargins', 0)
                },
                'growth_metrics': {
                    'revenue_growth': info.get('revenueGrowth', 0),
                    'earnings_growth': info.get('earningsGrowth', 0),
                    'revenue_per_share': info.get('revenuePerShare', 0),
                    'book_value': info.get('bookValue', 0),
                    'earnings_per_share': info.get('trailingEps', 0),
                    'forward_eps': info.get('forwardEps', 0)
                },
                'analyst_info': {
                    'recommendation': info.get('recommendationKey', 'hold').upper(),
                    'target_price': info.get('targetMeanPrice', current_price),
                    'number_of_analysts': info.get('numberOfAnalystOpinions', 0)
                },
                'long_term_analysis': {
                    'investment_thesis': f"Long-term investment opportunity in {info.get('sector', 'Technology')} sector with solid fundamentals.",
                    'strengths': [
                        "Strong market position",
                        "Consistent revenue growth",
                        "Solid financial metrics"
                    ],
                    'risks': [
                        "Market volatility",
                        "Sector competition",
                        "Economic uncertainty"
                    ],
                    'time_horizon': '12-24 months',
                    'risk_rating': 'Medium'
                },
                'analysis_date': datetime.now().isoformat()
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error in detailed analysis for {symbol}: {e}")
            raise
    
    async def get_portfolio_suggestions(self, portfolio_value=100000, risk_tolerance="moderate"):
        """Generate portfolio allocation suggestions."""
        try:
            # Get top recommendations
            recommendations = await self.get_long_term_recommendations(limit=15, min_score=70)
            
            # Portfolio allocation based on risk tolerance
            if risk_tolerance == "conservative":
                allocation_weights = [0.25, 0.20, 0.15, 0.12, 0.10, 0.08, 0.05, 0.05]
            elif risk_tolerance == "aggressive":
                allocation_weights = [0.30, 0.25, 0.20, 0.15, 0.10]
            else:  # moderate
                allocation_weights = [0.20, 0.18, 0.15, 0.12, 0.10, 0.08, 0.07, 0.05, 0.05]
            
            portfolio_suggestions = []
            total_allocated = 0
            
            for i, rec in enumerate(recommendations[:len(allocation_weights)]):
                weight = allocation_weights[i]
                allocation_amount = portfolio_value * weight
                shares = int(allocation_amount / rec['current_price'])
                actual_amount = shares * rec['current_price']
                
                portfolio_suggestions.append({
                    'symbol': rec['symbol'],
                    'company_name': rec['company_name'],
                    'sector': rec['sector'],
                    'allocation_percentage': round(weight * 100, 1),
                    'allocation_amount': round(allocation_amount, 2),
                    'suggested_shares': shares,
                    'actual_investment': round(actual_amount, 2),
                    'current_price': rec['current_price'],
                    'overall_score': rec['scores']['overall_score'],
                    'recommendation': rec['recommendation'],
                    'expected_return': round(np.random.uniform(8, 15), 1)
                })
                total_allocated += actual_amount
            
            # Calculate portfolio metrics
            sectors = {}
            for suggestion in portfolio_suggestions:
                sector = suggestion['sector']
                sectors[sector] = sectors.get(sector, 0) + suggestion['allocation_percentage']
            
            cash_remaining = portfolio_value - total_allocated
            
            return {
                'portfolio_suggestions': portfolio_suggestions,
                'portfolio_summary': {
                    'total_portfolio_value': portfolio_value,
                    'allocated_amount': round(total_allocated, 2),
                    'cash_remaining': round(cash_remaining, 2),
                    'number_of_positions': len(portfolio_suggestions),
                    'risk_tolerance': risk_tolerance,
                    'expected_annual_return': round(np.mean([p['expected_return'] for p in portfolio_suggestions]), 1),
                    'diversification_score': len(sectors)
                },
                'sector_allocation': sectors,
                'investment_strategy': {
                    'approach': 'Long-term buy and hold',
                    'rebalancing_frequency': 'Quarterly',
                    'time_horizon': '1-5 years',
                    'risk_management': 'Position sizing and diversification'
                },
                'analysis_date': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating portfolio suggestions: {e}")
            raise

# Global services
data_service: Optional[Any] = None
longterm_service: Optional[Any] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global data_service, longterm_service
    
    try:
        logger.info("🚀 Starting Long-Term Investment Server...")
        
        if FULL_SERVICES_AVAILABLE:
            # Use full services
            data_service = RealTimeDataService()
            longterm_service = LongTermInvestmentService(data_service)
            logger.info("✅ Full long-term investment services initialized")
        else:
            # Use mock services
            data_service = MockDataService()
            longterm_service = MockLongTermService(data_service)
            logger.info("✅ Mock long-term investment services initialized")
        
        yield
        
    except Exception as e:
        logger.error(f"❌ Failed to start services: {e}")
        raise
    finally:
        logger.info("🛑 Long-term investment services stopped")

# Create FastAPI app
app = FastAPI(
    title="Long-Term Investment API",
    description="Dedicated API for long-term investment analysis and portfolio management",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class LongTermAnalysisRequest(BaseModel):
    symbols: Optional[List[str]] = None
    limit: int = 20
    min_score: float = 60.0

class PortfolioRequest(BaseModel):
    portfolio_value: float = 100000
    risk_tolerance: str = "moderate"  # conservative, moderate, aggressive

class StrategyUpdateRequest(BaseModel):
    min_market_cap: Optional[float] = None
    max_pe_ratio: Optional[float] = None
    min_roe: Optional[float] = None
    min_revenue_growth: Optional[float] = None
    target_return: Optional[float] = None

class SingleStockRequest(BaseModel):
    symbol: str

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Long-Term Investment API",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

# Long-term investment endpoints
@app.get("/api/longterm/recommendations")
async def get_longterm_recommendations(
    symbols: Optional[str] = Query(None, description="Comma-separated list of symbols"),
    limit: int = Query(20, description="Maximum number of recommendations"),
    min_score: float = Query(60.0, description="Minimum overall score")
):
    """Get long-term investment recommendations."""
    try:
        symbol_list = symbols.split(',') if symbols else None
        recommendations = await longterm_service.get_long_term_recommendations(
            symbols=symbol_list,
            limit=limit,
            min_score=min_score
        )
        
        return {
            "recommendations": recommendations,
            "total_count": len(recommendations),
            "analysis_date": datetime.now().isoformat(),
            "criteria": {
                "min_score": min_score,
                "investment_horizon": "1+ years"
            }
        }
    except Exception as e:
        logger.error(f"Error getting long-term recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/longterm/recommendations")
async def post_longterm_recommendations(request: LongTermAnalysisRequest):
    """Get long-term investment recommendations via POST."""
    try:
        recommendations = await longterm_service.get_long_term_recommendations(
            symbols=request.symbols,
            limit=request.limit,
            min_score=request.min_score
        )
        
        return {
            "recommendations": recommendations,
            "total_count": len(recommendations),
            "analysis_date": datetime.now().isoformat(),
            "request_parameters": request.dict()
        }
    except Exception as e:
        logger.error(f"Error getting long-term recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/longterm/analyze/{symbol}")
async def analyze_single_stock(symbol: str):
    """Analyze a single stock for long-term investment."""
    try:
        analysis = await longterm_service.analyze_single_stock(symbol.upper())
        
        if not analysis:
            raise HTTPException(status_code=404, detail=f"Analysis not available for {symbol}")
        
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/longterm/analyze")
async def analyze_single_stock_post(request: SingleStockRequest):
    """Analyze a single stock via POST."""
    try:
        analysis = await longterm_service.analyze_single_stock(request.symbol.upper())
        
        if not analysis:
            raise HTTPException(status_code=404, detail=f"Analysis not available for {request.symbol}")
        
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing {request.symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/longterm/portfolio/suggestions")
async def get_portfolio_suggestions(
    portfolio_value: float = Query(100000, description="Total portfolio value"),
    risk_tolerance: str = Query("moderate", description="Risk tolerance: conservative, moderate, aggressive")
):
    """Get portfolio allocation suggestions for long-term investing."""
    try:
        suggestions = await longterm_service.get_portfolio_suggestions(
            portfolio_value=portfolio_value,
            risk_tolerance=risk_tolerance
        )
        
        return suggestions
    except Exception as e:
        logger.error(f"Error getting portfolio suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/longterm/portfolio/suggestions")
async def post_portfolio_suggestions(request: PortfolioRequest):
    """Get portfolio allocation suggestions via POST."""
    try:
        suggestions = await longterm_service.get_portfolio_suggestions(
            portfolio_value=request.portfolio_value,
            risk_tolerance=request.risk_tolerance
        )
        
        return suggestions
    except Exception as e:
        logger.error(f"Error getting portfolio suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/longterm/sectors/analysis")
async def get_sector_analysis(
    limit_per_sector: int = Query(3, description="Number of recommendations per sector")
):
    """Get sector-wise long-term investment analysis."""
    try:
        sector_analysis = await longterm_service.get_sector_analysis(
            limit_per_sector=limit_per_sector
        )
        
        return sector_analysis
    except Exception as e:
        logger.error(f"Error getting sector analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/longterm/market/outlook")
async def get_market_outlook():
    """Get overall market outlook for long-term investing."""
    try:
        outlook = await longterm_service.get_market_outlook()
        return outlook
    except Exception as e:
        logger.error(f"Error getting market outlook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/longterm/strategy/info")
async def get_strategy_info():
    """Get current strategy configuration."""
    try:
        strategy_info = longterm_service.get_strategy_info()
        return strategy_info
    except Exception as e:
        logger.error(f"Error getting strategy info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/longterm/strategy/update")
async def update_strategy(request: StrategyUpdateRequest):
    """Update strategy parameters."""
    try:
        # Filter out None values
        params = {k: v for k, v in request.dict().items() if v is not None}
        
        if not params:
            raise HTTPException(status_code=400, detail="No parameters provided for update")
        
        longterm_service.update_strategy_parameters(**params)
        
        return {
            "message": "Strategy parameters updated successfully",
            "updated_parameters": params,
            "current_strategy": longterm_service.get_strategy_info()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating strategy: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/longterm/watchlist/default")
async def get_default_watchlist():
    """Get the default watchlist for long-term investing."""
    return {
        "watchlist": longterm_service.default_watchlist,
        "total_stocks": len(longterm_service.default_watchlist),
        "description": "Default large-cap stocks for long-term investment analysis"
    }

@app.get("/api/longterm/sectors/etfs")
async def get_sector_etfs():
    """Get sector ETFs used for analysis."""
    return {
        "sector_etfs": longterm_service.sector_etfs,
        "description": "Sector ETFs used for broad market and sector analysis"
    }

# Batch analysis endpoint
@app.post("/api/longterm/batch/analyze")
async def batch_analyze_stocks(symbols: List[str]):
    """Analyze multiple stocks in batch."""
    try:
        if len(symbols) > 50:
            raise HTTPException(status_code=400, detail="Maximum 50 symbols allowed per batch")
        
        recommendations = await longterm_service.get_long_term_recommendations(
            symbols=symbols,
            limit=len(symbols),
            min_score=0  # Include all results
        )
        
        return {
            "batch_analysis": recommendations,
            "total_analyzed": len(symbols),
            "successful_analyses": len(recommendations),
            "analysis_date": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Top performers endpoint
@app.get("/api/longterm/top/performers")
async def get_top_performers(
    period: str = Query("all", description="Period: all, tech, healthcare, etc."),
    limit: int = Query(10, description="Number of top performers")
):
    """Get top performing stocks for long-term investment."""
    try:
        if period == "all":
            symbols = None
        elif period == "tech":
            symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'ADBE', 'CRM', 'ORCL', 'INTC']
        elif period == "healthcare":
            symbols = ['JNJ', 'UNH', 'PFE', 'ABBV', 'TMO', 'MDT', 'ABT', 'LLY']
        else:
            symbols = None
        
        recommendations = await longterm_service.get_long_term_recommendations(
            symbols=symbols,
            limit=limit,
            min_score=70.0  # High-quality only
        )
        
        return {
            "top_performers": recommendations,
            "period": period,
            "criteria": "Minimum score 70.0",
            "analysis_date": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting top performers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"error": "Endpoint not found", "detail": str(exc)}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": "Please try again later"}
    )

if __name__ == "__main__":
    uvicorn.run(
        "longterm_server:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    ) 