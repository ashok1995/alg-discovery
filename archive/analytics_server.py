#!/usr/bin/env python3
"""
Analytics & Backtesting Server
=============================

Dedicated FastAPI server for analytics, backtesting, and performance analysis.
Runs on port 8002 and provides endpoints for:
- Strategy backtesting
- Portfolio optimization
- Risk analysis
- Performance metrics
- Market correlation analysis

Usage:
    python analytics_server.py
    or
    uvicorn analytics_server:app --host 0.0.0.0 --port 8002
"""

import asyncio
import logging
import uvicorn
import numpy as np
import pandas as pd
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
    """Mock long-term service for analytics."""
    
    def __init__(self, data_service):
        self.data_service = data_service
    
    async def get_long_term_recommendations(self, symbols=None, limit=20, min_score=60.0):
        """Generate mock recommendations for analytics."""
        default_stocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX']
        stocks_to_analyze = symbols if symbols else default_stocks[:limit]
        
        recommendations = []
        for symbol in stocks_to_analyze:
            recommendations.append({
                'symbol': symbol,
                'expected_return': round(np.random.uniform(8, 15), 1),
                'risk_score': round(np.random.uniform(20, 40), 1),
                'overall_score': round(np.random.uniform(70, 95), 1)
            })
        
        return recommendations

class AnalyticsEngine:
    """Analytics engine for backtesting and performance analysis."""
    
    def __init__(self, data_service):
        self.data_service = data_service
    
    async def backtest_strategy(self, symbols: List[str], strategy_config: Dict, 
                               start_date: str, end_date: str) -> Dict[str, Any]:
        """Backtest a trading strategy."""
        try:
            results = {}
            total_return = 0
            total_trades = 0
            winning_trades = 0
            
            for symbol in symbols:
                # Get historical data
                historical_data = await self.data_service.get_historical_data(
                    symbol, period="2y"
                )
                
                if historical_data is None or historical_data.empty:
                    continue
                
                # Simple buy-and-hold simulation
                start_price = historical_data['Close'].iloc[0]
                end_price = historical_data['Close'].iloc[-1]
                symbol_return = (end_price - start_price) / start_price * 100
                
                results[symbol] = {
                    'return_pct': round(symbol_return, 2),
                    'start_price': round(start_price, 2),
                    'end_price': round(end_price, 2),
                    'volatility': round(historical_data['Close'].pct_change().std() * np.sqrt(252) * 100, 2)
                }
                
                total_return += symbol_return
                total_trades += 1
                if symbol_return > 0:
                    winning_trades += 1
            
            # Calculate portfolio metrics
            avg_return = total_return / total_trades if total_trades > 0 else 0
            win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
            
            return {
                'strategy_config': strategy_config,
                'backtest_period': {'start': start_date, 'end': end_date},
                'portfolio_results': {
                    'total_return_pct': round(total_return, 2),
                    'average_return_pct': round(avg_return, 2),
                    'win_rate_pct': round(win_rate, 2),
                    'total_trades': total_trades,
                    'winning_trades': winning_trades
                },
                'individual_results': results,
                'analysis_date': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in backtesting: {e}")
            raise
    
    async def calculate_portfolio_metrics(self, portfolio: List[Dict]) -> Dict[str, Any]:
        """Calculate comprehensive portfolio metrics."""
        try:
            total_value = sum(pos['allocation_amount'] for pos in portfolio)
            returns = []
            weights = []
            
            for position in portfolio:
                weight = position['allocation_amount'] / total_value
                expected_return = position.get('expected_return', 0)
                weights.append(weight)
                returns.append(expected_return)
            
            # Portfolio expected return
            portfolio_return = sum(w * r for w, r in zip(weights, returns))
            
            # Simple portfolio risk calculation (would need correlation matrix for proper calculation)
            portfolio_risk = np.sqrt(sum(w**2 * 20**2 for w in weights))  # Assuming 20% volatility
            
            # Sharpe ratio (assuming 3% risk-free rate)
            risk_free_rate = 3.0
            sharpe_ratio = (portfolio_return - risk_free_rate) / portfolio_risk if portfolio_risk > 0 else 0
            
            # Diversification metrics
            num_sectors = len(set(pos.get('sector', 'Unknown') for pos in portfolio))
            max_weight = max(weights) if weights else 0
            
            return {
                'total_value': round(total_value, 2),
                'expected_return': round(portfolio_return, 2),
                'estimated_risk': round(portfolio_risk, 2),
                'sharpe_ratio': round(sharpe_ratio, 2),
                'num_positions': len(portfolio),
                'num_sectors': num_sectors,
                'max_position_weight': round(max_weight * 100, 2),
                'diversification_score': round((1 - max_weight) * 100, 2),
                'risk_level': 'Low' if portfolio_risk < 15 else 'Medium' if portfolio_risk < 25 else 'High'
            }
            
        except Exception as e:
            logger.error(f"Error calculating portfolio metrics: {e}")
            raise
    
    async def compare_strategies(self, strategies: List[Dict]) -> Dict[str, Any]:
        """Compare multiple investment strategies."""
        try:
            comparison_results = []
            
            for strategy in strategies:
                # Simulate strategy performance
                symbols = strategy.get('symbols', [])
                if not symbols:
                    continue
                
                strategy_return = 0
                strategy_risk = 0
                
                for symbol in symbols[:10]:  # Limit to 10 symbols for demo
                    try:
                        historical_data = await self.data_service.get_historical_data(symbol, "1y")
                        if historical_data is not None and len(historical_data) > 0:
                            returns = historical_data['Close'].pct_change().dropna()
                            annual_return = returns.mean() * 252 * 100
                            annual_vol = returns.std() * np.sqrt(252) * 100
                            
                            strategy_return += annual_return / len(symbols)
                            strategy_risk += annual_vol / len(symbols)
                    except:
                        continue
                
                comparison_results.append({
                    'strategy_name': strategy.get('name', 'Unknown'),
                    'expected_return': round(strategy_return, 2),
                    'estimated_risk': round(strategy_risk, 2),
                    'sharpe_ratio': round((strategy_return - 3) / strategy_risk if strategy_risk > 0 else 0, 2),
                    'symbols_count': len(symbols)
                })
            
            # Sort by Sharpe ratio
            comparison_results.sort(key=lambda x: x['sharpe_ratio'], reverse=True)
            
            return {
                'strategy_comparison': comparison_results,
                'best_strategy': comparison_results[0] if comparison_results else None,
                'analysis_date': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error comparing strategies: {e}")
            raise

# Global services
data_service: Optional[Any] = None
longterm_service: Optional[Any] = None
analytics_engine: Optional[AnalyticsEngine] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global data_service, longterm_service, analytics_engine
    
    try:
        logger.info("🚀 Starting Analytics and Backtesting Server...")
        
        if FULL_SERVICES_AVAILABLE:
            # Use full services
            data_service = RealTimeDataService()
            longterm_service = LongTermInvestmentService(data_service)
            analytics_engine = AnalyticsEngine(data_service)
            logger.info("✅ Full analytics services initialized")
        else:
            # Use mock services
            data_service = MockDataService()
            longterm_service = MockLongTermService(data_service)
            analytics_engine = AnalyticsEngine(data_service)
            logger.info("✅ Mock analytics services initialized")
        
        yield
        
    except Exception as e:
        logger.error(f"❌ Failed to start services: {e}")
        raise
    finally:
        logger.info("🛑 Analytics services stopped")

# Create FastAPI app
app = FastAPI(
    title="Analytics & Backtesting API",
    description="Dedicated API for trading analytics, backtesting, and research tools",
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

# Pydantic models
class BacktestRequest(BaseModel):
    symbols: List[str]
    strategy_name: str = "long_term_buy_hold"
    start_date: str = "2022-01-01"
    end_date: str = "2024-01-01"
    initial_capital: float = 100000

class PortfolioAnalysisRequest(BaseModel):
    portfolio: List[Dict[str, Any]]

class StrategyComparisonRequest(BaseModel):
    strategies: List[Dict[str, Any]]

class RiskAnalysisRequest(BaseModel):
    symbols: List[str]
    portfolio_weights: Optional[List[float]] = None

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Analytics & Backtesting API",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

# Backtesting endpoints
@app.post("/api/analytics/backtest")
async def run_backtest(request: BacktestRequest):
    """Run a backtest for the specified strategy and symbols."""
    try:
        strategy_config = {
            "name": request.strategy_name,
            "initial_capital": request.initial_capital
        }
        
        results = await analytics_engine.backtest_strategy(
            symbols=request.symbols,
            strategy_config=strategy_config,
            start_date=request.start_date,
            end_date=request.end_date
        )
        
        return results
    except Exception as e:
        logger.error(f"Error running backtest: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/backtest/quick/{symbol}")
async def quick_backtest(symbol: str, period: str = Query("1y", description="Backtest period")):
    """Run a quick backtest for a single symbol."""
    try:
        results = await analytics_engine.backtest_strategy(
            symbols=[symbol.upper()],
            strategy_config={"name": "buy_hold", "period": period},
            start_date="auto",
            end_date="auto"
        )
        
        return results
    except Exception as e:
        logger.error(f"Error in quick backtest: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Portfolio analysis endpoints
@app.post("/api/analytics/portfolio/analyze")
async def analyze_portfolio(request: PortfolioAnalysisRequest):
    """Analyze portfolio performance and risk metrics."""
    try:
        metrics = await analytics_engine.calculate_portfolio_metrics(request.portfolio)
        return metrics
    except Exception as e:
        logger.error(f"Error analyzing portfolio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analytics/portfolio/optimize")
async def optimize_portfolio(
    symbols: List[str],
    target_return: float = Query(12.0, description="Target annual return %"),
    risk_tolerance: str = Query("moderate", description="Risk tolerance level")
):
    """Optimize portfolio allocation for given symbols."""
    try:
        # Get recommendations for all symbols
        recommendations = await longterm_service.get_long_term_recommendations(
            symbols=symbols,
            limit=len(symbols),
            min_score=0
        )
        
        if not recommendations:
            raise HTTPException(status_code=404, detail="No analysis available for provided symbols")
        
        # Simple optimization based on scores and risk tolerance
        risk_multipliers = {"conservative": 0.7, "moderate": 1.0, "aggressive": 1.3}
        multiplier = risk_multipliers.get(risk_tolerance, 1.0)
        
        # Calculate weights based on scores and adjust for risk tolerance
        total_score = sum(rec['overall_score'] for rec in recommendations)
        optimized_portfolio = []
        
        for rec in recommendations:
            base_weight = rec['overall_score'] / total_score
            adjusted_weight = base_weight * multiplier
            
            optimized_portfolio.append({
                'symbol': rec['symbol'],
                'weight': round(adjusted_weight, 4),
                'expected_return': rec['expected_return'],
                'overall_score': rec['overall_score'],
                'reasoning': f"Weight based on score {rec['overall_score']}/100 adjusted for {risk_tolerance} risk"
            })
        
        # Normalize weights to sum to 1
        total_weight = sum(pos['weight'] for pos in optimized_portfolio)
        for pos in optimized_portfolio:
            pos['weight'] = round(pos['weight'] / total_weight, 4)
            pos['weight_percentage'] = round(pos['weight'] * 100, 2)
        
        return {
            'optimized_portfolio': optimized_portfolio,
            'target_return': target_return,
            'risk_tolerance': risk_tolerance,
            'optimization_date': datetime.now().isoformat(),
            'notes': [
                f"Portfolio optimized for {risk_tolerance} risk tolerance",
                f"Weights based on fundamental and technical analysis scores",
                "Consider rebalancing quarterly to maintain target allocation"
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error optimizing portfolio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Risk analysis endpoints
@app.post("/api/analytics/risk/analyze")
async def analyze_risk(request: RiskAnalysisRequest):
    """Analyze risk for given symbols and portfolio weights."""
    try:
        risk_metrics = {}
        
        for symbol in request.symbols:
            try:
                # Get historical data for risk calculation
                historical_data = await data_service.get_historical_data(symbol, "2y")
                if historical_data is None:
                    continue
                
                returns = historical_data['Close'].pct_change().dropna()
                
                # Calculate risk metrics
                annual_vol = returns.std() * np.sqrt(252) * 100
                var_95 = returns.quantile(0.05) * 100  # Value at Risk (95%)
                max_drawdown = ((historical_data['Close'] / historical_data['Close'].expanding().max()) - 1).min() * 100
                
                risk_metrics[symbol] = {
                    'annual_volatility': round(annual_vol, 2),
                    'value_at_risk_95': round(var_95, 2),
                    'max_drawdown': round(max_drawdown, 2),
                    'beta': round(np.random.uniform(0.7, 1.3), 2),  # Placeholder - would need market data
                    'risk_level': 'Low' if annual_vol < 20 else 'Medium' if annual_vol < 35 else 'High'
                }
                
            except Exception as e:
                logger.warning(f"Error calculating risk for {symbol}: {e}")
                continue
        
        # Portfolio-level risk if weights provided
        portfolio_risk = None
        if request.portfolio_weights and len(request.portfolio_weights) == len(request.symbols):
            weights = np.array(request.portfolio_weights)
            volatilities = [risk_metrics.get(symbol, {}).get('annual_volatility', 20) for symbol in request.symbols]
            # Simplified portfolio volatility (assumes zero correlation)
            portfolio_vol = np.sqrt(np.sum((weights * volatilities) ** 2))
            
            portfolio_risk = {
                'portfolio_volatility': round(portfolio_vol, 2),
                'diversification_benefit': round((sum(weights * volatilities) - portfolio_vol), 2),
                'risk_contribution': {
                    symbol: round(weight * vol, 2) 
                    for symbol, weight, vol in zip(request.symbols, weights, volatilities)
                }
            }
        
        return {
            'individual_risk_metrics': risk_metrics,
            'portfolio_risk': portfolio_risk,
            'analysis_date': datetime.now().isoformat(),
            'methodology': 'Historical volatility-based risk analysis'
        }
        
    except Exception as e:
        logger.error(f"Error in risk analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Strategy comparison endpoints
@app.post("/api/analytics/strategies/compare")
async def compare_strategies(request: StrategyComparisonRequest):
    """Compare multiple investment strategies."""
    try:
        comparison = await analytics_engine.compare_strategies(request.strategies)
        return comparison
    except Exception as e:
        logger.error(f"Error comparing strategies: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Market analysis endpoints
@app.get("/api/analytics/market/correlation")
async def analyze_market_correlation(
    symbols: str = Query(..., description="Comma-separated list of symbols"),
    period: str = Query("1y", description="Analysis period")
):
    """Analyze correlation between stocks."""
    try:
        symbol_list = [s.strip().upper() for s in symbols.split(',')]
        correlation_matrix = {}
        
        # Get historical data for all symbols
        all_data = {}
        for symbol in symbol_list:
            data = await data_service.get_historical_data(symbol, period)
            if data is not None:
                all_data[symbol] = data['Close'].pct_change().dropna()
        
        # Calculate correlation matrix
        for symbol1 in all_data:
            correlation_matrix[symbol1] = {}
            for symbol2 in all_data:
                if len(all_data[symbol1]) > 0 and len(all_data[symbol2]) > 0:
                    # Align the data by dates
                    merged = pd.concat([all_data[symbol1], all_data[symbol2]], axis=1, join='inner')
                    if len(merged) > 30:  # Need sufficient data points
                        corr = merged.iloc[:, 0].corr(merged.iloc[:, 1])
                        correlation_matrix[symbol1][symbol2] = round(corr, 3) if not pd.isna(corr) else 0
                    else:
                        correlation_matrix[symbol1][symbol2] = 0
                else:
                    correlation_matrix[symbol1][symbol2] = 0
        
        return {
            'correlation_matrix': correlation_matrix,
            'analysis_period': period,
            'symbols_analyzed': len(all_data),
            'analysis_date': datetime.now().isoformat(),
            'interpretation': {
                'high_correlation': '>0.7 - Stocks move similarly',
                'moderate_correlation': '0.3-0.7 - Some similarity in movement',
                'low_correlation': '<0.3 - Independent movement',
                'negative_correlation': '<0 - Opposite movement'
            }
        }
        
    except Exception as e:
        logger.error(f"Error in correlation analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/market/sectors")
async def analyze_sector_performance(period: str = Query("1y", description="Analysis period")):
    """Analyze sector performance using ETFs."""
    try:
        sector_etfs = {
            'Technology': 'XLK',
            'Healthcare': 'XLV',
            'Financials': 'XLF',
            'Consumer Discretionary': 'XLY',
            'Energy': 'XLE',
            'Utilities': 'XLU',
            'Real Estate': 'XLRE',
            'Materials': 'XLB',
            'Industrials': 'XLI',
            'Consumer Staples': 'XLP'
        }
        
        sector_performance = []
        
        for sector, etf in sector_etfs.items():
            try:
                data = await data_service.get_historical_data(etf, period)
                if data is not None and len(data) > 0:
                    start_price = data['Close'].iloc[0]
                    end_price = data['Close'].iloc[-1]
                    returns = data['Close'].pct_change().dropna()
                    
                    performance = {
                        'sector': sector,
                        'etf_symbol': etf,
                        'total_return': round((end_price - start_price) / start_price * 100, 2),
                        'volatility': round(returns.std() * np.sqrt(252) * 100, 2),
                        'max_drawdown': round(((data['Close'] / data['Close'].expanding().max()) - 1).min() * 100, 2),
                        'current_price': round(end_price, 2)
                    }
                    
                    sector_performance.append(performance)
                    
            except Exception as e:
                logger.warning(f"Error analyzing sector {sector}: {e}")
                continue
        
        # Sort by total return
        sector_performance.sort(key=lambda x: x['total_return'], reverse=True)
        
        return {
            'sector_performance': sector_performance,
            'analysis_period': period,
            'best_performing_sector': sector_performance[0] if sector_performance else None,
            'worst_performing_sector': sector_performance[-1] if sector_performance else None,
            'analysis_date': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in sector analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Research tools
@app.get("/api/analytics/research/momentum")
async def analyze_momentum(
    symbols: str = Query(..., description="Comma-separated list of symbols"),
    lookback_days: int = Query(30, description="Momentum calculation period")
):
    """Analyze momentum for given symbols."""
    try:
        symbol_list = [s.strip().upper() for s in symbols.split(',')]
        momentum_analysis = []
        
        for symbol in symbol_list:
            try:
                data = await data_service.get_historical_data(symbol, "6mo")
                if data is None or len(data) < lookback_days:
                    continue
                
                current_price = data['Close'].iloc[-1]
                past_price = data['Close'].iloc[-(lookback_days+1)]
                momentum = (current_price - past_price) / past_price * 100
                
                # Price relative to moving averages
                ma_20 = data['Close'].tail(20).mean()
                ma_50 = data['Close'].tail(50).mean() if len(data) >= 50 else ma_20
                
                momentum_analysis.append({
                    'symbol': symbol,
                    'momentum_pct': round(momentum, 2),
                    'current_price': round(current_price, 2),
                    'price_vs_ma20': round((current_price - ma_20) / ma_20 * 100, 2),
                    'price_vs_ma50': round((current_price - ma_50) / ma_50 * 100, 2),
                    'momentum_rank': 'Strong' if momentum > 10 else 'Moderate' if momentum > 5 else 'Weak' if momentum > 0 else 'Negative'
                })
                
            except Exception as e:
                logger.warning(f"Error analyzing momentum for {symbol}: {e}")
                continue
        
        # Sort by momentum
        momentum_analysis.sort(key=lambda x: x['momentum_pct'], reverse=True)
        
        return {
            'momentum_analysis': momentum_analysis,
            'lookback_period_days': lookback_days,
            'strongest_momentum': momentum_analysis[0] if momentum_analysis else None,
            'analysis_date': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in momentum analysis: {e}")
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
        "analytics_server:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info"
    ) 