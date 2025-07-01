"""
REST API Routes for Order Management System
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query, Path
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from pydantic import BaseModel, Field
from .models import (
    OrderRequest, OrderUpdate, Order, Trade, Position,
    OrderType, OrderSide, OrderStatus, TimeInForce, PositionSide
)
from .order_manager import OrderManager
from .risk_manager import RiskManager
from .position_manager import PositionManager
from .notification_service import NotificationService


# Pydantic models for API requests/responses
class OrderRequestAPI(BaseModel):
    """API model for order creation"""
    symbol: str = Field(..., description="Trading symbol")
    side: OrderSide = Field(..., description="Order side (BUY/SELL)")
    order_type: OrderType = Field(..., description="Order type")
    quantity: int = Field(..., gt=0, description="Order quantity")
    price: Optional[Decimal] = Field(None, gt=0, description="Order price")
    stop_price: Optional[Decimal] = Field(None, gt=0, description="Stop price")
    time_in_force: TimeInForce = Field(TimeInForce.DAY, description="Time in force")
    
    # Bracket order parameters
    take_profit_price: Optional[Decimal] = Field(None, gt=0, description="Take profit price")
    stop_loss_price: Optional[Decimal] = Field(None, gt=0, description="Stop loss price")
    
    # Metadata
    client_order_id: Optional[str] = Field(None, description="Client order ID")
    notes: Optional[str] = Field(None, description="Order notes")


class OrderUpdateAPI(BaseModel):
    """API model for order updates"""
    quantity: Optional[int] = Field(None, gt=0, description="New quantity")
    price: Optional[Decimal] = Field(None, gt=0, description="New price")
    stop_price: Optional[Decimal] = Field(None, gt=0, description="New stop price")
    time_in_force: Optional[TimeInForce] = Field(None, description="New time in force")


class OrderResponse(BaseModel):
    """API response model for orders"""
    order_id: str
    symbol: str
    side: str
    order_type: str
    quantity: int
    price: Optional[float]
    stop_price: Optional[float]
    status: str
    time_in_force: str
    filled_quantity: int
    average_fill_price: Optional[float]
    created_at: datetime
    updated_at: Optional[datetime]
    client_order_id: Optional[str]
    notes: Optional[str]


class TradeResponse(BaseModel):
    """API response model for trades"""
    trade_id: str
    order_id: str
    symbol: str
    side: str
    quantity: int
    price: float
    value: float
    commission: float
    timestamp: datetime


class PositionResponse(BaseModel):
    """API response model for positions"""
    symbol: str
    side: str
    quantity: int
    average_price: float
    market_price: Optional[float]
    market_value: Optional[float]
    unrealized_pnl: Optional[float]
    realized_pnl: float
    total_pnl: float
    cost_basis: float
    last_updated: datetime


class RiskMetricsResponse(BaseModel):
    """API response model for risk metrics"""
    daily_trades: int
    max_daily_trades: int
    daily_volume: float
    max_daily_volume: float
    daily_pnl: float
    max_daily_loss: float
    open_positions: int
    max_symbols: int
    portfolio_value: float
    utilization_metrics: Dict[str, float]


# Router setup
router = APIRouter(prefix="/orders", tags=["Order Management"])

# Global instances (these would typically be injected via dependency injection)
order_manager: Optional[OrderManager] = None
risk_manager: Optional[RiskManager] = None
position_manager: Optional[PositionManager] = None
notification_service: Optional[NotificationService] = None

logger = logging.getLogger(__name__)


def get_order_manager() -> OrderManager:
    """Dependency to get OrderManager instance"""
    if order_manager is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Order management service not available"
        )
    return order_manager


def get_risk_manager() -> RiskManager:
    """Dependency to get RiskManager instance"""
    if risk_manager is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Risk management service not available"
        )
    return risk_manager


def get_position_manager() -> PositionManager:
    """Dependency to get PositionManager instance"""
    if position_manager is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Position management service not available"
        )
    return position_manager


# Order Management Endpoints

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_request: OrderRequestAPI,
    order_mgr: OrderManager = Depends(get_order_manager)
) -> OrderResponse:
    """Create a new order"""
    try:
        # Convert API model to internal model
        request = OrderRequest(
            symbol=order_request.symbol,
            side=order_request.side,
            order_type=order_request.order_type,
            quantity=order_request.quantity,
            price=order_request.price,
            stop_price=order_request.stop_price,
            time_in_force=order_request.time_in_force,
            take_profit_price=order_request.take_profit_price,
            stop_loss_price=order_request.stop_loss_price,
            client_order_id=order_request.client_order_id,
            notes=order_request.notes
        )
        
        # Create order
        order = await order_mgr.create_order(request)
        
        # Convert to response model
        return OrderResponse(
            order_id=order.order_id,
            symbol=order.symbol,
            side=order.side.value,
            order_type=order.order_type.value,
            quantity=order.quantity,
            price=float(order.price) if order.price else None,
            stop_price=float(order.stop_price) if order.stop_price else None,
            status=order.status.value,
            time_in_force=order.time_in_force.value,
            filled_quantity=order.filled_quantity,
            average_fill_price=float(order.average_fill_price) if order.average_fill_price else None,
            created_at=order.created_at,
            updated_at=order.updated_at,
            client_order_id=order.client_order_id,
            notes=order.notes
        )
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Order creation error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Order creation failed")


@router.get("/", response_model=List[OrderResponse])
async def get_orders(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    status: Optional[OrderStatus] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of orders"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    order_mgr: OrderManager = Depends(get_order_manager)
) -> List[OrderResponse]:
    """Get orders with optional filtering"""
    try:
        orders = await order_mgr.get_orders(
            symbol=symbol,
            status=status,
            limit=limit,
            offset=offset
        )
        
        return [
            OrderResponse(
                order_id=order.order_id,
                symbol=order.symbol,
                side=order.side.value,
                order_type=order.order_type.value,
                quantity=order.quantity,
                price=float(order.price) if order.price else None,
                stop_price=float(order.stop_price) if order.stop_price else None,
                status=order.status.value,
                time_in_force=order.time_in_force.value,
                filled_quantity=order.filled_quantity,
                average_fill_price=float(order.average_fill_price) if order.average_fill_price else None,
                created_at=order.created_at,
                updated_at=order.updated_at,
                client_order_id=order.client_order_id,
                notes=order.notes
            )
            for order in orders
        ]
        
    except Exception as e:
        logger.error(f"Get orders error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve orders")


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str = Path(..., description="Order ID"),
    order_mgr: OrderManager = Depends(get_order_manager)
) -> OrderResponse:
    """Get specific order by ID"""
    try:
        order = await order_mgr.get_order(order_id)
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
        return OrderResponse(
            order_id=order.order_id,
            symbol=order.symbol,
            side=order.side.value,
            order_type=order.order_type.value,
            quantity=order.quantity,
            price=float(order.price) if order.price else None,
            stop_price=float(order.stop_price) if order.stop_price else None,
            status=order.status.value,
            time_in_force=order.time_in_force.value,
            filled_quantity=order.filled_quantity,
            average_fill_price=float(order.average_fill_price) if order.average_fill_price else None,
            created_at=order.created_at,
            updated_at=order.updated_at,
            client_order_id=order.client_order_id,
            notes=order.notes
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get order error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve order")


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: str = Path(..., description="Order ID"),
    update_request: OrderUpdateAPI = None,
    order_mgr: OrderManager = Depends(get_order_manager)
) -> OrderResponse:
    """Update existing order"""
    try:
        # Convert API model to internal model
        update = OrderUpdate(
            quantity=update_request.quantity,
            price=update_request.price,
            stop_price=update_request.stop_price,
            time_in_force=update_request.time_in_force
        )
        
        order = await order_mgr.update_order(order_id, update)
        
        return OrderResponse(
            order_id=order.order_id,
            symbol=order.symbol,
            side=order.side.value,
            order_type=order.order_type.value,
            quantity=order.quantity,
            price=float(order.price) if order.price else None,
            stop_price=float(order.stop_price) if order.stop_price else None,
            status=order.status.value,
            time_in_force=order.time_in_force.value,
            filled_quantity=order.filled_quantity,
            average_fill_price=float(order.average_fill_price) if order.average_fill_price else None,
            created_at=order.created_at,
            updated_at=order.updated_at,
            client_order_id=order.client_order_id,
            notes=order.notes
        )
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Order update error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Order update failed")


@router.delete("/{order_id}")
async def cancel_order(
    order_id: str = Path(..., description="Order ID"),
    reason: str = Query("User requested", description="Cancellation reason"),
    order_mgr: OrderManager = Depends(get_order_manager)
):
    """Cancel order"""
    try:
        success = await order_mgr.cancel_order(order_id, reason)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found or cannot be cancelled")
        
        return {"message": "Order cancelled successfully", "order_id": order_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Order cancellation error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Order cancellation failed")


# Trade Endpoints

@router.get("/{order_id}/trades", response_model=List[TradeResponse])
async def get_order_trades(
    order_id: str = Path(..., description="Order ID"),
    order_mgr: OrderManager = Depends(get_order_manager)
) -> List[TradeResponse]:
    """Get trades for specific order"""
    try:
        trades = await order_mgr.get_order_trades(order_id)
        
        return [
            TradeResponse(
                trade_id=trade.trade_id,
                order_id=trade.order_id,
                symbol=trade.symbol,
                side=trade.side.value,
                quantity=trade.quantity,
                price=float(trade.price),
                value=float(trade.value),
                commission=float(trade.commission),
                timestamp=trade.timestamp
            )
            for trade in trades
        ]
        
    except Exception as e:
        logger.error(f"Get order trades error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve trades")


@router.get("/trades/", response_model=List[TradeResponse])
async def get_trades(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of trades"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    position_mgr: PositionManager = Depends(get_position_manager)
) -> List[TradeResponse]:
    """Get trades with optional filtering"""
    try:
        trades = position_mgr.get_trades(
            symbol=symbol,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset
        )
        
        return [
            TradeResponse(
                trade_id=trade.trade_id,
                order_id=trade.order_id,
                symbol=trade.symbol,
                side=trade.side.value,
                quantity=trade.quantity,
                price=float(trade.price),
                value=float(trade.value),
                commission=float(trade.commission),
                timestamp=trade.timestamp
            )
            for trade in trades
        ]
        
    except Exception as e:
        logger.error(f"Get trades error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve trades")


# Position Endpoints

@router.get("/positions/", response_model=List[PositionResponse])
async def get_positions(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    side: Optional[PositionSide] = Query(None, description="Filter by position side"),
    position_mgr: PositionManager = Depends(get_position_manager)
) -> List[PositionResponse]:
    """Get current positions"""
    try:
        if symbol:
            position = position_mgr.get_position(symbol)
            positions = [position] if position else []
        elif side:
            if side == PositionSide.LONG:
                positions = position_mgr.get_long_positions()
            else:
                positions = position_mgr.get_short_positions()
        else:
            positions = position_mgr.get_all_positions()
        
        return [
            PositionResponse(
                symbol=position.symbol,
                side=position.side.value,
                quantity=position.quantity,
                average_price=float(position.average_price),
                market_price=float(position.market_price) if position.market_price else None,
                market_value=float(position.market_value) if position.market_value else None,
                unrealized_pnl=float(position.unrealized_pnl) if position.unrealized_pnl else None,
                realized_pnl=float(position.realized_pnl),
                total_pnl=float(position.total_pnl),
                cost_basis=float(position.cost_basis),
                last_updated=position.last_updated
            )
            for position in positions
        ]
        
    except Exception as e:
        logger.error(f"Get positions error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve positions")


@router.get("/positions/{symbol}", response_model=PositionResponse)
async def get_position(
    symbol: str = Path(..., description="Trading symbol"),
    position_mgr: PositionManager = Depends(get_position_manager)
) -> PositionResponse:
    """Get position for specific symbol"""
    try:
        position = position_mgr.get_position(symbol)
        if not position:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found")
        
        return PositionResponse(
            symbol=position.symbol,
            side=position.side.value,
            quantity=position.quantity,
            average_price=float(position.average_price),
            market_price=float(position.market_price) if position.market_price else None,
            market_value=float(position.market_value) if position.market_value else None,
            unrealized_pnl=float(position.unrealized_pnl) if position.unrealized_pnl else None,
            realized_pnl=float(position.realized_pnl),
            total_pnl=float(position.total_pnl),
            cost_basis=float(position.cost_basis),
            last_updated=position.last_updated
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get position error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve position")


@router.post("/positions/{symbol}/close")
async def close_position(
    symbol: str = Path(..., description="Trading symbol"),
    position_mgr: PositionManager = Depends(get_position_manager),
    order_mgr: OrderManager = Depends(get_order_manager)
):
    """Close position for specific symbol"""
    try:
        success = await position_mgr.close_position(symbol)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Position not found or already closed")
        
        return {"message": "Position close order submitted", "symbol": symbol}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Close position error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to close position")


# Risk Management Endpoints

@router.get("/risk/metrics", response_model=RiskMetricsResponse)
async def get_risk_metrics(
    risk_mgr: RiskManager = Depends(get_risk_manager)
) -> RiskMetricsResponse:
    """Get current risk metrics"""
    try:
        metrics = risk_mgr.get_risk_metrics()
        
        return RiskMetricsResponse(
            daily_trades=metrics['daily_trades'],
            max_daily_trades=metrics['max_daily_trades'],
            daily_volume=metrics['daily_volume'],
            max_daily_volume=metrics['max_daily_volume'],
            daily_pnl=metrics['daily_pnl'],
            max_daily_loss=metrics['max_daily_loss'],
            open_positions=metrics['open_positions'],
            max_symbols=metrics['max_symbols'],
            portfolio_value=metrics['portfolio_value'],
            utilization_metrics=metrics['utilization_metrics']
        )
        
    except Exception as e:
        logger.error(f"Get risk metrics error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve risk metrics")


@router.get("/risk/analysis")
async def get_risk_analysis(
    risk_mgr: RiskManager = Depends(get_risk_manager)
) -> Dict[str, Any]:
    """Get detailed risk analysis"""
    try:
        analysis = risk_mgr.get_position_risk_analysis()
        return analysis
        
    except Exception as e:
        logger.error(f"Get risk analysis error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve risk analysis")


# Statistics and Monitoring Endpoints

@router.get("/stats")
async def get_order_stats(
    order_mgr: OrderManager = Depends(get_order_manager)
) -> Dict[str, Any]:
    """Get order management statistics"""
    try:
        stats = await order_mgr.get_statistics()
        return stats
        
    except Exception as e:
        logger.error(f"Get order stats error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve statistics")


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    try:
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "order_manager": order_manager is not None and hasattr(order_manager, 'is_running'),
                "risk_manager": risk_manager is not None,
                "position_manager": position_manager is not None,
                "notification_service": notification_service is not None
            }
        }
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }


# Initialization function
def initialize_services(
    order_mgr: OrderManager,
    risk_mgr: RiskManager,
    pos_mgr: PositionManager,
    notif_service: NotificationService
):
    """Initialize global service instances"""
    global order_manager, risk_manager, position_manager, notification_service
    order_manager = order_mgr
    risk_manager = risk_mgr
    position_manager = pos_mgr
    notification_service = notif_service 