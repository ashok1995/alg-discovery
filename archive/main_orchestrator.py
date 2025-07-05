#!/usr/bin/env python3
"""
Main Orchestrator Server
========================

Primary API gateway and orchestrator for the long-term investment system.
Runs on port 8000 and coordinates with:
- Long-term Investment Service (port 8001)
- Analytics & Backtesting Service (port 8002)
- Order Management Service (port 8003)

This server provides:
- Unified API endpoints
- Service coordination
- User authentication
- Dashboard data aggregation
- Investment workflow management

Usage:
    python main_orchestrator.py
    or
    uvicorn main_orchestrator:app --host 0.0.0.0 --port 8000
"""

import asyncio
import logging
import uvicorn
import httpx
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Service URLs
SERVICES = {
    'longterm': 'http://localhost:8001',
    'analytics': 'http://localhost:8002',
    'orders': 'http://localhost:8003'
}

# Global HTTP client
http_client: Optional[httpx.AsyncClient] = None

class ServiceHealthMonitor:
    """Monitor health of all microservices."""
    
    def __init__(self):
        self.service_status = {}
        self.last_check = None
    
    async def check_all_services(self) -> Dict[str, Dict]:
        """Check health of all services."""
        results = {}
        
        for service_name, base_url in SERVICES.items():
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.get(f"{base_url}/health")
                    if response.status_code == 200:
                        results[service_name] = {
                            'status': 'healthy',
                            'response_time': response.elapsed.total_seconds(),
                            'details': response.json()
                        }
                    else:
                        results[service_name] = {
                            'status': 'unhealthy',
                            'error': f"HTTP {response.status_code}"
                        }
            except Exception as e:
                results[service_name] = {
                    'status': 'unreachable',
                    'error': str(e)
                }
        
        self.service_status = results
        self.last_check = datetime.now()
        return results

health_monitor = ServiceHealthMonitor()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global http_client
    
    try:
        logger.info("🚀 Starting Main Orchestrator Server...")
        
        # Initialize HTTP client
        http_client = httpx.AsyncClient(timeout=30.0)
        
        # Initial health check of services
        await health_monitor.check_all_services()
        
        # Log service statuses
        for service, status in health_monitor.service_status.items():
            if status['status'] == 'healthy':
                logger.info(f"✅ {service.title()} service is healthy")
            else:
                logger.warning(f"⚠️ {service.title()} service is {status['status']}: {status.get('error', 'Unknown error')}")
        
        yield
        
    except Exception as e:
        logger.error(f"❌ Failed to start orchestrator: {e}")
        raise
    finally:
        if http_client:
            await http_client.aclose()
        logger.info("🛑 Main orchestrator stopped")

# Create FastAPI app
app = FastAPI(
    title="Long-Term Investment Platform API",
    description="Main orchestrator for long-term investment platform with microservices architecture",
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
class InvestmentRequest(BaseModel):
    symbols: List[str]
    total_investment: float
    risk_tolerance: str = "moderate"  # conservative, moderate, aggressive
    time_horizon: int = 5  # years

class PortfolioOptimizationRequest(BaseModel):
    symbols: List[str]
    target_return: Optional[float] = None
    risk_tolerance: str = "moderate"
    investment_amount: float

class InvestmentWorkflowRequest(BaseModel):
    symbols: List[str]
    investment_amount: float
    strategy: str = "buy_and_hold"
    auto_execute: bool = False

# Helper functions
async def call_service(service: str, endpoint: str, method: str = "GET", data: Dict = None) -> Dict:
    """Make a call to a microservice."""
    if service not in SERVICES:
        raise ValueError(f"Unknown service: {service}")
    
    url = f"{SERVICES[service]}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = await http_client.get(url)
        elif method.upper() == "POST":
            response = await http_client.post(url, json=data)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        response.raise_for_status()
        return response.json()
    
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail=f"{service} service timeout")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"{service} service error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"{service} service unavailable: {str(e)}")

# Root endpoint with simple dashboard
@app.get("/", response_class=HTMLResponse)
async def dashboard():
    """Simple dashboard homepage."""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Long-Term Investment Platform</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 40px; color: #2c3e50; }
            .services { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px; }
            .service-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; }
            .service-card h3 { color: #2c3e50; margin-top: 0; }
            .endpoints { background: #ecf0f1; padding: 20px; border-radius: 8px; }
            .endpoint { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
            .method { padding: 4px 8px; border-radius: 4px; color: white; font-weight: bold; margin-right: 10px; }
            .get { background-color: #2ecc71; }
            .post { background-color: #e74c3c; }
            a { color: #3498db; text-decoration: none; }
            a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 Long-Term Investment Platform</h1>
                <p>Microservices-based investment management system</p>
            </div>
            
            <div class="services">
                <div class="service-card">
                    <h3>📊 Main Orchestrator (Port 8000)</h3>
                    <p>Primary API gateway coordinating all services</p>
                    <p><strong>Status:</strong> <span style="color: green;">● Active</span></p>
                </div>
                
                <div class="service-card">
                    <h3>📈 Long-Term Investments (Port 8001)</h3>
                    <p>Stock analysis and long-term recommendations</p>
                    <p><a href="http://localhost:8001/docs" target="_blank">API Documentation</a></p>
                </div>
                
                <div class="service-card">
                    <h3>🔍 Analytics & Backtesting (Port 8002)</h3>
                    <p>Performance analysis and strategy backtesting</p>
                    <p><a href="http://localhost:8002/docs" target="_blank">API Documentation</a></p>
                </div>
                
                <div class="service-card">
                    <h3>💼 Order Management (Port 8003)</h3>
                    <p>Order execution and portfolio management</p>
                    <p><a href="http://localhost:8003/docs" target="_blank">API Documentation</a></p>
                </div>
            </div>
            
            <div class="endpoints">
                <h2>📋 Main API Endpoints</h2>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <code>/api/dashboard/overview</code> - Complete dashboard overview
                </div>
                
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <code>/api/invest/analyze</code> - Analyze investment opportunities
                </div>
                
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <code>/api/invest/workflow</code> - Complete investment workflow
                </div>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <code>/api/portfolio/overview</code> - Portfolio overview
                </div>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <code>/health/all</code> - Health status of all services
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <p><a href="/docs">📚 Complete API Documentation</a></p>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# Health endpoints
@app.get("/health")
async def health_check():
    """Main orchestrator health check."""
    return {
        "status": "healthy",
        "service": "Main Orchestrator",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "uptime": "N/A"
    }

@app.get("/health/all")
async def health_check_all():
    """Health check for all services."""
    service_health = await health_monitor.check_all_services()
    
    overall_status = "healthy"
    if any(service['status'] != 'healthy' for service in service_health.values()):
        overall_status = "degraded"
    
    return {
        "overall_status": overall_status,
        "services": service_health,
        "last_check": health_monitor.last_check.isoformat() if health_monitor.last_check else None,
        "timestamp": datetime.now().isoformat()
    }

# Dashboard endpoints
@app.get("/api/dashboard/overview")
async def dashboard_overview():
    """Complete dashboard overview aggregating data from all services."""
    try:
        # Gather data from all services in parallel
        tasks = [
            call_service("longterm", "/api/longterm/recommendations"),
            call_service("orders", "/api/portfolio/summary"),
            call_service("analytics", "/api/analytics/market/sectors"),
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        recommendations = results[0] if not isinstance(results[0], Exception) else {"recommendations": []}
        portfolio = results[1] if not isinstance(results[1], Exception) else {"total_portfolio_value": 0}
        sectors = results[2] if not isinstance(results[2], Exception) else {"sectors": []}
        
        return {
            "dashboard_summary": {
                "portfolio_value": portfolio.get("total_portfolio_value", 0),
                "unrealized_pnl": portfolio.get("total_unrealized_pnl", 0),
                "positions_count": portfolio.get("number_of_positions", 0),
                "recommendations_count": len(recommendations.get("recommendations", [])),
                "last_updated": datetime.now().isoformat()
            },
            "top_recommendations": recommendations.get("recommendations", [])[:5],
            "portfolio_summary": portfolio,
            "market_sectors": sectors.get("sectors", [])[:10],
            "service_status": await health_monitor.check_all_services()
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Investment workflow endpoints
@app.post("/api/invest/analyze")
async def analyze_investment(request: InvestmentRequest):
    """Comprehensive investment analysis workflow."""
    try:
        tasks = []
        
        # Get recommendations for each symbol
        for symbol in request.symbols:
            tasks.append(call_service("longterm", f"/api/longterm/analyze/{symbol}"))
        
        # Get sector analysis
        tasks.append(call_service("longterm", "/api/longterm/sectors/analysis"))
        
        # Get market outlook
        tasks.append(call_service("longterm", "/api/longterm/market/outlook"))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        symbol_analyses = []
        for i, symbol in enumerate(request.symbols):
            if not isinstance(results[i], Exception):
                symbol_analyses.append(results[i])
            else:
                symbol_analyses.append({"symbol": symbol, "error": str(results[i])})
        
        sector_analysis = results[-2] if not isinstance(results[-2], Exception) else {}
        market_outlook = results[-1] if not isinstance(results[-1], Exception) else {}
        
        # Calculate portfolio allocation suggestions
        valid_analyses = [a for a in symbol_analyses if 'error' not in a]
        if valid_analyses:
            total_score = sum(a.get('overall_score', 0) for a in valid_analyses)
            allocations = {}
            
            for analysis in valid_analyses:
                weight = analysis.get('overall_score', 0) / total_score if total_score > 0 else 1.0 / len(valid_analyses)
                allocations[analysis.get('symbol', 'UNKNOWN')] = {
                    'weight': round(weight, 3),
                    'suggested_amount': round(request.total_investment * weight, 2),
                    'score': analysis.get('overall_score', 0)
                }
        else:
            allocations = {}
        
        return {
            "analysis_summary": {
                "total_investment": request.total_investment,
                "symbols_analyzed": len(request.symbols),
                "valid_analyses": len(valid_analyses),
                "risk_tolerance": request.risk_tolerance,
                "time_horizon_years": request.time_horizon
            },
            "symbol_analyses": symbol_analyses,
            "portfolio_allocation": allocations,
            "sector_analysis": sector_analysis,
            "market_outlook": market_outlook,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in investment analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/invest/workflow")
async def investment_workflow(request: InvestmentWorkflowRequest):
    """Complete investment workflow from analysis to execution."""
    try:
        # Step 1: Analysis
        analysis_request = InvestmentRequest(
            symbols=request.symbols,
            total_investment=request.investment_amount,
            risk_tolerance="moderate"
        )
        analysis = await analyze_investment(analysis_request)
        
        # Step 2: Portfolio optimization
        portfolio_data = {
            "symbols": request.symbols,
            "target_return": None,
            "risk_tolerance": "moderate",
            "investment_amount": request.investment_amount
        }
        
        optimization = await call_service("analytics", "/api/analytics/portfolio/optimize", "POST", portfolio_data)
        
        # Step 3: Generate execution plan
        execution_plan = []
        allocations = analysis.get("portfolio_allocation", {})
        
        for symbol, allocation in allocations.items():
            execution_plan.append({
                "symbol": symbol,
                "action": "BUY",
                "amount": allocation["suggested_amount"],
                "weight": allocation["weight"],
                "order_type": "MARKET"
            })
        
        # Step 4: Execute orders (if auto_execute is True)
        executed_orders = []
        if request.auto_execute and execution_plan:
            for plan in execution_plan:
                try:
                    order_result = await call_service(
                        "orders", 
                        "/api/longterm/quick-buy", 
                        "POST", 
                        {
                            "symbol": plan["symbol"],
                            "amount": plan["amount"],
                            "order_type": plan["order_type"]
                        }
                    )
                    executed_orders.append(order_result)
                except Exception as e:
                    logger.error(f"Error executing order for {plan['symbol']}: {e}")
                    executed_orders.append({"symbol": plan["symbol"], "error": str(e)})
        
        return {
            "workflow_summary": {
                "symbols": request.symbols,
                "total_investment": request.investment_amount,
                "strategy": request.strategy,
                "auto_executed": request.auto_execute,
                "orders_executed": len(executed_orders),
                "status": "completed" if not request.auto_execute or executed_orders else "analysis_only"
            },
            "analysis": analysis,
            "optimization": optimization,
            "execution_plan": execution_plan,
            "executed_orders": executed_orders if request.auto_execute else [],
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in investment workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Portfolio aggregation endpoints
@app.get("/api/portfolio/overview")
async def portfolio_overview():
    """Aggregated portfolio overview."""
    try:
        # Get data from multiple services
        tasks = [
            call_service("orders", "/api/portfolio/summary"),
            call_service("orders", "/api/portfolio/positions"),
            call_service("orders", "/api/risk/summary"),
            call_service("orders", "/api/trading/performance")
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        portfolio_summary = results[0] if not isinstance(results[0], Exception) else {}
        positions = results[1] if not isinstance(results[1], Exception) else {"positions": []}
        risk_summary = results[2] if not isinstance(results[2], Exception) else {}
        performance = results[3] if not isinstance(results[3], Exception) else {}
        
        return {
            "portfolio_summary": portfolio_summary,
            "positions": positions.get("positions", []),
            "risk_metrics": risk_summary.get("risk_metrics", {}),
            "performance_metrics": performance.get("performance_metrics", {}),
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting portfolio overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Service proxy endpoints
@app.get("/api/longterm/{path:path}")
async def proxy_longterm_get(path: str):
    """Proxy GET requests to long-term service."""
    return await call_service("longterm", f"/api/longterm/{path}")

@app.post("/api/longterm/{path:path}")
async def proxy_longterm_post(path: str, data: Dict = None):
    """Proxy POST requests to long-term service."""
    return await call_service("longterm", f"/api/longterm/{path}", "POST", data)

@app.get("/api/analytics/{path:path}")
async def proxy_analytics_get(path: str):
    """Proxy GET requests to analytics service."""
    return await call_service("analytics", f"/api/analytics/{path}")

@app.post("/api/analytics/{path:path}")
async def proxy_analytics_post(path: str, data: Dict = None):
    """Proxy POST requests to analytics service."""
    return await call_service("analytics", f"/api/analytics/{path}", "POST", data)

@app.get("/api/orders/{path:path}")
async def proxy_orders_get(path: str):
    """Proxy GET requests to orders service."""
    return await call_service("orders", f"/api/orders/{path}")

@app.post("/api/orders/{path:path}")
async def proxy_orders_post(path: str, data: Dict = None):
    """Proxy POST requests to orders service."""
    return await call_service("orders", f"/api/orders/{path}", "POST", data)

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
        "main_orchestrator:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 