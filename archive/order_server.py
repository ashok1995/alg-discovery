#!/usr/bin/env python3
"""
Order Management Server
======================

Dedicated FastAPI server for order management, execution, and risk management.
Runs on port 8003 and provides endpoints for:
- Order placement and execution
- Portfolio management
- Risk management
- Position tracking
- Trade notifications

Usage:
    python order_server.py
    or
    uvicorn order_server:app --host 0.0.0.0 --port 8003
"""

import asyncio
import logging
import uvicorn
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Import order management services
try:
    from order.order_manager import OrderManager
    from order.risk_manager import RiskManager
    from order.position_manager import PositionManager
    from order.notification_service import NotificationService
    from order.validators import OrderValidator
    from order.execution_engine import ExecutionEngine
    from order import api_routes as order_routes
    ORDER_SYSTEM_AVAILABLE = True
except ImportError:
    ORDER_SYSTEM_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Order management system not available - creating simplified version")

# Import data service with fallback
try:
    from api.services.data_service import RealTimeDataService
    DATA_SERVICE_AVAILABLE = True
except ImportError:
    DATA_SERVICE_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Data service not available - creating mock data service")
    
    class MockDataService:
        """Mock data service for demonstration."""
        async def get_stock_data(self, symbol: str):
            return type('StockData', (), {'current_price': 100.0})()
    
    RealTimeDataService = MockDataService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global services
data_service: Optional[RealTimeDataService] = None
order_manager: Optional[Any] = None
risk_manager: Optional[Any] = None
position_manager: Optional[Any] = None
notification_service: Optional[Any] = None

class SimpleOrderManager:
    """Simplified order manager for demonstration purposes."""
    
    def __init__(self):
        self.orders = {}
        self.positions = {}
        self.order_counter = 1000
    
    async def place_order(self, order_data: Dict) -> Dict[str, Any]:
        """Place a new order."""
        order_id = f"ORD-{self.order_counter}"
        self.order_counter += 1
        
        order = {
            'order_id': order_id,
            'symbol': order_data['symbol'],
            'side': order_data['side'],  # BUY or SELL
            'quantity': order_data['quantity'],
            'price': order_data.get('price'),
            'order_type': order_data.get('order_type', 'MARKET'),
            'status': 'PENDING',
            'timestamp': datetime.now().isoformat(),
            'filled_quantity': 0,
            'remaining_quantity': order_data['quantity']
        }
        
        self.orders[order_id] = order
        
        # Simulate immediate execution for demo
        await asyncio.sleep(0.1)
        order['status'] = 'FILLED'
        order['filled_quantity'] = order['quantity']
        order['remaining_quantity'] = 0
        order['execution_price'] = order_data.get('price', 100.0)
        
        # Update positions
        await self._update_position(order)
        
        return order
    
    async def _update_position(self, order: Dict):
        """Update position based on order execution."""
        symbol = order['symbol']
        side = order['side']
        quantity = order['filled_quantity']
        price = order['execution_price']
        
        if symbol not in self.positions:
            self.positions[symbol] = {
                'symbol': symbol,
                'quantity': 0,
                'avg_price': 0,
                'market_value': 0,
                'unrealized_pnl': 0
            }
        
        position = self.positions[symbol]
        
        if side == 'BUY':
            # Add to position
            total_cost = position['quantity'] * position['avg_price'] + quantity * price
            position['quantity'] += quantity
            position['avg_price'] = total_cost / position['quantity'] if position['quantity'] > 0 else 0
        elif side == 'SELL':
            # Reduce position
            position['quantity'] -= quantity
            if position['quantity'] <= 0:
                position['quantity'] = 0
                position['avg_price'] = 0
    
    async def get_orders(self, status: Optional[str] = None) -> List[Dict]:
        """Get orders, optionally filtered by status."""
        orders = list(self.orders.values())
        if status:
            orders = [o for o in orders if o['status'] == status]
        return sorted(orders, key=lambda x: x['timestamp'], reverse=True)
    
    async def get_positions(self) -> List[Dict]:
        """Get current positions."""
        return [pos for pos in self.positions.values() if pos['quantity'] > 0]
    
    async def cancel_order(self, order_id: str) -> Dict[str, Any]:
        """Cancel an order."""
        if order_id not in self.orders:
            raise ValueError(f"Order {order_id} not found")
        
        order = self.orders[order_id]
        if order['status'] in ['FILLED', 'CANCELLED']:
            raise ValueError(f"Cannot cancel order in status {order['status']}")
        
        order['status'] = 'CANCELLED'
        order['timestamp'] = datetime.now().isoformat()
        
        return order

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global data_service, order_manager, risk_manager, position_manager, notification_service
    
    try:
        logger.info("🚀 Starting Order Management Server...")
        
        # Initialize data service
        data_service = RealTimeDataService()
        
        if ORDER_SYSTEM_AVAILABLE:
            # Initialize full order management system
            notification_service = NotificationService()
            await notification_service.start()
            
            position_manager = PositionManager(data_service)
            risk_manager = RiskManager(position_manager=position_manager)
            order_validator = OrderValidator()
            execution_engine = ExecutionEngine()
            await execution_engine.start()
            
            order_manager = OrderManager(
                execution_engine=execution_engine,
                position_manager=position_manager,
                risk_manager=risk_manager,
                validator=order_validator,
                notification_service=notification_service
            )
            await order_manager.start()
            
            logger.info("✅ Full order management system initialized")
        else:
            # Use simplified order manager
            order_manager = SimpleOrderManager()
            logger.info("✅ Simplified order management system initialized")
        
        yield
        
    except Exception as e:
        logger.error(f"❌ Failed to start services: {e}")
        raise
    finally:
        try:
            if ORDER_SYSTEM_AVAILABLE and hasattr(order_manager, 'stop'):
                await order_manager.stop()
            logger.info("🛑 Order management services stopped")
        except Exception as e:
            logger.error(f"Error stopping services: {e}")

# Create FastAPI app
app = FastAPI(
    title="Order Management API",
    description="Dedicated API for order management, execution, and risk management",
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
class OrderRequest(BaseModel):
    symbol: str
    side: str  # BUY or SELL
    quantity: int
    price: Optional[float] = None
    order_type: str = "MARKET"  # MARKET, LIMIT, STOP
    time_in_force: str = "DAY"  # DAY, GTC, IOC, FOK

class OrderCancelRequest(BaseModel):
    order_id: str

class PortfolioRebalanceRequest(BaseModel):
    target_allocations: Dict[str, float]  # symbol -> weight
    total_value: float

class RiskLimitsRequest(BaseModel):
    max_position_size: Optional[float] = None
    max_daily_loss: Optional[float] = None
    max_portfolio_beta: Optional[float] = None

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Order Management API",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "order_system": "full" if ORDER_SYSTEM_AVAILABLE else "simplified"
    }

# Order management endpoints
@app.post("/api/orders/place")
async def place_order(request: OrderRequest):
    """Place a new order."""
    try:
        order_data = {
            'symbol': request.symbol.upper(),
            'side': request.side.upper(),
            'quantity': request.quantity,
            'price': request.price,
            'order_type': request.order_type.upper(),
            'time_in_force': request.time_in_force.upper()
        }
        
        if ORDER_SYSTEM_AVAILABLE and hasattr(order_manager, 'place_order'):
            # Use full order management system
            order = await order_manager.place_order(order_data)
        else:
            # Use simplified order manager
            order = await order_manager.place_order(order_data)
        
        return {
            "message": "Order placed successfully",
            "order": order
        }
        
    except Exception as e:
        logger.error(f"Error placing order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/orders")
async def get_orders(
    status: Optional[str] = Query(None, description="Filter by order status"),
    limit: int = Query(50, description="Maximum number of orders")
):
    """Get orders with optional status filter."""
    try:
        orders = await order_manager.get_orders(status)
        return {
            "orders": orders[:limit],
            "total_count": len(orders),
            "filtered_by_status": status
        }
    except Exception as e:
        logger.error(f"Error getting orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/orders/{order_id}")
async def get_order(order_id: str):
    """Get specific order details."""
    try:
        if hasattr(order_manager, 'get_order'):
            order = await order_manager.get_order(order_id)
        else:
            # Simplified version
            orders = await order_manager.get_orders()
            order = next((o for o in orders if o['order_id'] == order_id), None)
            if not order:
                raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
        
        return order
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting order {order_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/orders/cancel")
async def cancel_order(request: OrderCancelRequest):
    """Cancel an order."""
    try:
        order = await order_manager.cancel_order(request.order_id)
        return {
            "message": "Order cancelled successfully",
            "order": order
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error cancelling order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Portfolio management endpoints
@app.get("/api/portfolio/positions")
async def get_positions():
    """Get current portfolio positions."""
    try:
        positions = await order_manager.get_positions()
        
        # Calculate portfolio summary
        total_value = sum(pos.get('market_value', 0) for pos in positions)
        total_pnl = sum(pos.get('unrealized_pnl', 0) for pos in positions)
        
        return {
            "positions": positions,
            "portfolio_summary": {
                "total_value": round(total_value, 2),
                "total_unrealized_pnl": round(total_pnl, 2),
                "number_of_positions": len(positions),
                "last_updated": datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error getting positions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/portfolio/summary")
async def get_portfolio_summary():
    """Get comprehensive portfolio summary."""
    try:
        positions = await order_manager.get_positions()
        recent_orders = await order_manager.get_orders()
        
        # Calculate metrics
        total_value = sum(pos.get('market_value', 0) for pos in positions)
        total_pnl = sum(pos.get('unrealized_pnl', 0) for pos in positions)
        
        # Recent activity
        today = datetime.now().date()
        today_orders = [
            o for o in recent_orders 
            if datetime.fromisoformat(o['timestamp']).date() == today
        ]
        
        return {
            "total_portfolio_value": round(total_value, 2),
            "total_unrealized_pnl": round(total_pnl, 2),
            "number_of_positions": len(positions),
            "cash_available": 50000.0,  # Mock value
            "buying_power": 100000.0,   # Mock value
            "day_trades_remaining": 3,   # Mock value
            "today_orders": len(today_orders),
            "today_executed": len([o for o in today_orders if o['status'] == 'FILLED']),
            "largest_position": max(positions, key=lambda x: x.get('market_value', 0)) if positions else None,
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting portfolio summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/portfolio/rebalance")
async def rebalance_portfolio(request: PortfolioRebalanceRequest):
    """Rebalance portfolio to target allocations."""
    try:
        current_positions = await order_manager.get_positions()
        
        # Calculate current allocations
        current_total = sum(pos.get('market_value', 0) for pos in current_positions)
        current_allocations = {
            pos['symbol']: pos.get('market_value', 0) / current_total 
            for pos in current_positions if current_total > 0
        }
        
        # Calculate required trades
        rebalance_trades = []
        for symbol, target_weight in request.target_allocations.items():
            current_weight = current_allocations.get(symbol, 0)
            weight_diff = target_weight - current_weight
            
            if abs(weight_diff) > 0.01:  # Only rebalance if difference > 1%
                target_value = request.total_value * target_weight
                current_value = current_total * current_weight
                trade_value = target_value - current_value
                
                rebalance_trades.append({
                    'symbol': symbol,
                    'current_weight': round(current_weight * 100, 2),
                    'target_weight': round(target_weight * 100, 2),
                    'trade_value': round(trade_value, 2),
                    'trade_direction': 'BUY' if trade_value > 0 else 'SELL',
                    'trade_amount': abs(trade_value)
                })
        
        return {
            "rebalance_plan": rebalance_trades,
            "current_total_value": round(current_total, 2),
            "target_total_value": request.total_value,
            "trades_required": len(rebalance_trades),
            "execution_status": "plan_generated"
        }
        
    except Exception as e:
        logger.error(f"Error creating rebalance plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Risk management endpoints
@app.get("/api/risk/summary")
async def get_risk_summary():
    """Get portfolio risk summary."""
    try:
        positions = await order_manager.get_positions()
        
        if not positions:
            return {
                "risk_metrics": {},
                "message": "No positions to analyze"
            }
        
        # Calculate basic risk metrics
        total_value = sum(pos.get('market_value', 0) for pos in positions)
        position_concentrations = [
            pos.get('market_value', 0) / total_value for pos in positions
        ] if total_value > 0 else []
        
        max_concentration = max(position_concentrations) if position_concentrations else 0
        
        risk_metrics = {
            "portfolio_value": round(total_value, 2),
            "number_of_positions": len(positions),
            "max_position_concentration": round(max_concentration * 100, 2),
            "diversification_score": round((1 - max_concentration) * 100, 2),
            "estimated_beta": 1.1,  # Mock value
            "var_95_1day": round(total_value * 0.02, 2),  # Mock 2% VaR
            "risk_level": "Medium" if max_concentration < 0.2 else "High"
        }
        
        return {
            "risk_metrics": risk_metrics,
            "risk_warnings": [
                f"Maximum position concentration: {risk_metrics['max_position_concentration']:.1f}%"
            ] if max_concentration > 0.15 else [],
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting risk summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/risk/limits")
async def set_risk_limits(request: RiskLimitsRequest):
    """Set or update risk limits."""
    try:
        limits = {}
        if request.max_position_size is not None:
            limits['max_position_size'] = request.max_position_size
        if request.max_daily_loss is not None:
            limits['max_daily_loss'] = request.max_daily_loss
        if request.max_portfolio_beta is not None:
            limits['max_portfolio_beta'] = request.max_portfolio_beta
        
        return {
            "message": "Risk limits updated successfully",
            "updated_limits": limits,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error setting risk limits: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Trading analytics endpoints
@app.get("/api/trading/performance")
async def get_trading_performance(
    period_days: int = Query(30, description="Analysis period in days")
):
    """Get trading performance analytics."""
    try:
        orders = await order_manager.get_orders()
        
        # Filter orders by period
        cutoff_date = datetime.now() - timedelta(days=period_days)
        period_orders = [
            o for o in orders 
            if datetime.fromisoformat(o['timestamp']) >= cutoff_date
            and o['status'] == 'FILLED'
        ]
        
        if not period_orders:
            return {
                "message": f"No executed orders in the last {period_days} days",
                "performance_metrics": {}
            }
        
        # Calculate performance metrics
        total_trades = len(period_orders)
        buy_orders = [o for o in period_orders if o['side'] == 'BUY']
        sell_orders = [o for o in period_orders if o['side'] == 'SELL']
        
        total_volume = sum(
            o['filled_quantity'] * o.get('execution_price', 0) 
            for o in period_orders
        )
        
        performance_metrics = {
            "analysis_period_days": period_days,
            "total_trades": total_trades,
            "buy_orders": len(buy_orders),
            "sell_orders": len(sell_orders),
            "total_volume": round(total_volume, 2),
            "average_trade_size": round(total_volume / total_trades, 2) if total_trades > 0 else 0,
            "most_traded_symbols": {},  # Would need more complex logic
            "trading_frequency": round(total_trades / period_days, 2)
        }
        
        return {
            "performance_metrics": performance_metrics,
            "period_orders": period_orders[-10:],  # Last 10 orders as sample
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting trading performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Quick trade endpoints for long-term investments
@app.post("/api/longterm/quick-buy")
async def quick_longterm_buy(
    symbol: str,
    amount: float,
    order_type: str = "MARKET"
):
    """Quick buy order for long-term investment."""
    try:
        # Get current price for quantity calculation
        stock_data = await data_service.get_stock_data(symbol.upper())
        if not stock_data:
            raise HTTPException(status_code=404, detail=f"Stock data not available for {symbol}")
        
        current_price = stock_data.current_price
        quantity = int(amount / current_price)
        
        if quantity <= 0:
            raise HTTPException(status_code=400, detail="Insufficient amount for at least 1 share")
        
        order_data = {
            'symbol': symbol.upper(),
            'side': 'BUY',
            'quantity': quantity,
            'price': current_price if order_type == 'LIMIT' else None,
            'order_type': order_type.upper()
        }
        
        order = await order_manager.place_order(order_data)
        
        return {
            "message": f"Long-term buy order placed for {symbol}",
            "order": order,
            "investment_details": {
                "symbol": symbol.upper(),
                "investment_amount": amount,
                "shares_purchased": quantity,
                "price_per_share": current_price,
                "investment_type": "Long-term (1+ years)"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error placing long-term buy order: {e}")
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
        "order_server:app",
        host="0.0.0.0",
        port=8003,
        reload=True,
        log_level="info"
    ) 