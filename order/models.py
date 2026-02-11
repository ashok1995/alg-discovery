"""
Data models for the order management system
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
from decimal import Decimal


class OrderType(Enum):
    """Order types supported by the system"""
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP_LOSS = "STOP_LOSS"
    STOP_LOSS_LIMIT = "STOP_LOSS_LIMIT"
    TAKE_PROFIT = "TAKE_PROFIT"
    TAKE_PROFIT_LIMIT = "TAKE_PROFIT_LIMIT"
    BRACKET = "BRACKET"  # OCO with stop loss and target
    COVER = "COVER"      # Cover order with stop loss


class OrderSide(Enum):
    """Order side - buy or sell"""
    BUY = "BUY"
    SELL = "SELL"


class OrderStatus(Enum):
    """Order status lifecycle"""
    PENDING = "PENDING"           # Order created but not submitted
    SUBMITTED = "SUBMITTED"       # Order submitted to broker
    ACKNOWLEDGED = "ACKNOWLEDGED" # Order acknowledged by broker
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"            # Order completely filled
    CANCELLED = "CANCELLED"      # Order cancelled
    REJECTED = "REJECTED"        # Order rejected by broker
    EXPIRED = "EXPIRED"          # Order expired
    TRIGGERED = "TRIGGERED"      # Stop order triggered
    PENDING_CANCEL = "PENDING_CANCEL"  # Cancel request submitted


class TimeInForce(Enum):
    """Time in force options"""
    DAY = "DAY"         # Valid for the trading day
    GTC = "GTC"         # Good till cancelled
    IOC = "IOC"         # Immediate or cancel
    FOK = "FOK"         # Fill or kill
    GTD = "GTD"         # Good till date


class PositionSide(Enum):
    """Position side"""
    LONG = "LONG"
    SHORT = "SHORT"
    FLAT = "FLAT"


@dataclass
class OrderRequest:
    """Request to create a new order"""
    symbol: str
    side: OrderSide
    order_type: OrderType
    quantity: int
    price: Optional[Decimal] = None
    stop_price: Optional[Decimal] = None
    time_in_force: TimeInForce = TimeInForce.DAY
    
    # For bracket orders
    target_price: Optional[Decimal] = None
    stop_loss_price: Optional[Decimal] = None
    
    # Strategy and metadata
    strategy_id: Optional[str] = None
    parent_order_id: Optional[str] = None
    tags: Dict[str, Any] = field(default_factory=dict)
    
    def validate(self) -> List[str]:
        """Validate order request and return list of errors"""
        errors = []
        
        if not self.symbol:
            errors.append("Symbol is required")
        
        if self.quantity <= 0:
            errors.append("Quantity must be positive")
        
        if self.order_type in [OrderType.LIMIT, OrderType.STOP_LOSS_LIMIT, OrderType.TAKE_PROFIT_LIMIT]:
            if not self.price:
                errors.append(f"Price is required for {self.order_type.value} orders")
        
        if self.order_type in [OrderType.STOP_LOSS, OrderType.STOP_LOSS_LIMIT]:
            if not self.stop_price:
                errors.append(f"Stop price is required for {self.order_type.value} orders")
        
        if self.order_type == OrderType.BRACKET:
            if not self.target_price or not self.stop_loss_price:
                errors.append("Both target and stop loss prices required for bracket orders")
        
        return errors


@dataclass
class OrderUpdate:
    """Request to update an existing order"""
    order_id: str
    quantity: Optional[int] = None
    price: Optional[Decimal] = None
    stop_price: Optional[Decimal] = None
    time_in_force: Optional[TimeInForce] = None
    
    def has_updates(self) -> bool:
        """Check if there are any updates"""
        return any([
            self.quantity is not None,
            self.price is not None,
            self.stop_price is not None,
            self.time_in_force is not None
        ])


@dataclass
class Order:
    """Core order model"""
    order_id: str
    symbol: str
    side: OrderSide
    order_type: OrderType
    quantity: int
    price: Optional[Decimal]
    stop_price: Optional[Decimal]
    time_in_force: TimeInForce
    status: OrderStatus
    
    # Execution details
    filled_quantity: int = 0
    average_fill_price: Optional[Decimal] = None
    
    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    submitted_at: Optional[datetime] = None
    filled_at: Optional[datetime] = None
    
    # Bracket order details
    target_price: Optional[Decimal] = None
    stop_loss_price: Optional[Decimal] = None
    parent_order_id: Optional[str] = None
    child_order_ids: List[str] = field(default_factory=list)
    
    # Strategy and metadata
    strategy_id: Optional[str] = None
    broker_order_id: Optional[str] = None
    tags: Dict[str, Any] = field(default_factory=dict)
    
    # Execution details
    commissions: Decimal = Decimal('0')
    fees: Decimal = Decimal('0')
    slippage: Optional[Decimal] = None
    
    @classmethod
    def from_request(cls, request: OrderRequest) -> 'Order':
        """Create order from order request"""
        return cls(
            order_id=str(uuid.uuid4()),
            symbol=request.symbol,
            side=request.side,
            order_type=request.order_type,
            quantity=request.quantity,
            price=request.price,
            stop_price=request.stop_price,
            time_in_force=request.time_in_force,
            status=OrderStatus.PENDING,
            target_price=request.target_price,
            stop_loss_price=request.stop_loss_price,
            parent_order_id=request.parent_order_id,
            strategy_id=request.strategy_id,
            tags=request.tags.copy()
        )
    
    @property
    def is_filled(self) -> bool:
        """Check if order is completely filled"""
        return self.status == OrderStatus.FILLED
    
    @property
    def is_active(self) -> bool:
        """Check if order is active (can be filled)"""
        return self.status in [
            OrderStatus.SUBMITTED,
            OrderStatus.ACKNOWLEDGED,
            OrderStatus.PARTIALLY_FILLED,
            OrderStatus.TRIGGERED
        ]
    
    @property
    def is_terminal(self) -> bool:
        """Check if order is in terminal state"""
        return self.status in [
            OrderStatus.FILLED,
            OrderStatus.CANCELLED,
            OrderStatus.REJECTED,
            OrderStatus.EXPIRED
        ]
    
    @property
    def remaining_quantity(self) -> int:
        """Get remaining quantity to be filled"""
        return self.quantity - self.filled_quantity
    
    @property
    def fill_percentage(self) -> float:
        """Get percentage of order filled"""
        if self.quantity == 0:
            return 0.0
        return (self.filled_quantity / self.quantity) * 100
    
    def update_status(self, new_status: OrderStatus) -> None:
        """Update order status with timestamp"""
        self.status = new_status
        self.updated_at = datetime.utcnow()
        
        if new_status == OrderStatus.SUBMITTED:
            self.submitted_at = datetime.utcnow()
        elif new_status == OrderStatus.FILLED:
            self.filled_at = datetime.utcnow()
    
    def apply_fill(self, fill_quantity: int, fill_price: Decimal) -> None:
        """Apply a fill to the order"""
        self.filled_quantity += fill_quantity
        
        # Update average fill price
        if self.average_fill_price is None:
            self.average_fill_price = fill_price
        else:
            total_value = (self.average_fill_price * (self.filled_quantity - fill_quantity) +
                          fill_price * fill_quantity)
            self.average_fill_price = total_value / self.filled_quantity
        
        # Update status
        if self.filled_quantity >= self.quantity:
            self.update_status(OrderStatus.FILLED)
        else:
            self.update_status(OrderStatus.PARTIALLY_FILLED)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert order to dictionary for API responses"""
        return {
            'order_id': self.order_id,
            'symbol': self.symbol,
            'side': self.side.value,
            'order_type': self.order_type.value,
            'quantity': self.quantity,
            'price': float(self.price) if self.price else None,
            'stop_price': float(self.stop_price) if self.stop_price else None,
            'time_in_force': self.time_in_force.value,
            'status': self.status.value,
            'filled_quantity': self.filled_quantity,
            'average_fill_price': float(self.average_fill_price) if self.average_fill_price else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'filled_at': self.filled_at.isoformat() if self.filled_at else None,
            'target_price': float(self.target_price) if self.target_price else None,
            'stop_loss_price': float(self.stop_loss_price) if self.stop_loss_price else None,
            'parent_order_id': self.parent_order_id,
            'child_order_ids': self.child_order_ids,
            'strategy_id': self.strategy_id,
            'broker_order_id': self.broker_order_id,
            'tags': self.tags,
            'commissions': float(self.commissions),
            'fees': float(self.fees),
            'slippage': float(self.slippage) if self.slippage else None,
            'remaining_quantity': self.remaining_quantity,
            'fill_percentage': self.fill_percentage
        }


@dataclass
class Trade:
    """Individual trade execution"""
    trade_id: str
    order_id: str
    symbol: str
    side: OrderSide
    quantity: int
    price: Decimal
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    # Additional details
    commissions: Decimal = Decimal('0')
    fees: Decimal = Decimal('0')
    exchange: Optional[str] = None
    
    @property
    def value(self) -> Decimal:
        """Total trade value"""
        return self.price * self.quantity
    
    @property
    def net_value(self) -> Decimal:
        """Net trade value after commissions and fees"""
        return self.value - self.commissions - self.fees
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert trade to dictionary"""
        return {
            'trade_id': self.trade_id,
            'order_id': self.order_id,
            'symbol': self.symbol,
            'side': self.side.value,
            'quantity': self.quantity,
            'price': float(self.price),
            'timestamp': self.timestamp.isoformat(),
            'commissions': float(self.commissions),
            'fees': float(self.fees),
            'exchange': self.exchange,
            'value': float(self.value),
            'net_value': float(self.net_value)
        }


@dataclass
class Position:
    """Trading position in a symbol"""
    symbol: str
    side: PositionSide
    quantity: int
    average_price: Decimal
    market_price: Decimal
    
    # P&L calculations
    unrealized_pnl: Decimal = Decimal('0')
    realized_pnl: Decimal = Decimal('0')
    
    # Timestamps
    opened_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    
    # Associated orders
    order_ids: List[str] = field(default_factory=list)
    
    @property
    def market_value(self) -> Decimal:
        """Current market value of position"""
        return self.market_price * abs(self.quantity)
    
    @property
    def cost_basis(self) -> Decimal:
        """Cost basis of position"""
        return self.average_price * abs(self.quantity)
    
    @property
    def total_pnl(self) -> Decimal:
        """Total P&L (realized + unrealized)"""
        return self.realized_pnl + self.unrealized_pnl
    
    def update_market_price(self, new_price: Decimal) -> None:
        """Update market price and calculate unrealized P&L"""
        self.market_price = new_price
        self.updated_at = datetime.utcnow()
        
        if self.quantity != 0:
            price_diff = new_price - self.average_price
            if self.side == PositionSide.SHORT:
                price_diff = -price_diff
            self.unrealized_pnl = price_diff * abs(self.quantity)
    
    def add_trade(self, trade: Trade) -> None:
        """Add a trade to this position"""
        if trade.symbol != self.symbol:
            raise ValueError("Trade symbol doesn't match position symbol")
        
        # Update position based on trade
        if self.quantity == 0:
            # New position
            self.side = PositionSide.LONG if trade.side == OrderSide.BUY else PositionSide.SHORT
            self.quantity = trade.quantity if trade.side == OrderSide.BUY else -trade.quantity
            self.average_price = trade.price
        else:
            # Existing position
            trade_quantity = trade.quantity if trade.side == OrderSide.BUY else -trade.quantity
            
            if (self.quantity > 0 and trade_quantity > 0) or (self.quantity < 0 and trade_quantity < 0):
                # Adding to position
                total_cost = self.cost_basis + trade.price * abs(trade_quantity)
                self.quantity += trade_quantity
                self.average_price = total_cost / abs(self.quantity)
            else:
                # Reducing position or reversing
                if abs(trade_quantity) >= abs(self.quantity):
                    # Position closed or reversed
                    pnl_quantity = abs(self.quantity)
                    if self.side == PositionSide.LONG:
                        self.realized_pnl += (trade.price - self.average_price) * pnl_quantity
                    else:
                        self.realized_pnl += (self.average_price - trade.price) * pnl_quantity
                    
                    remaining_quantity = abs(trade_quantity) - abs(self.quantity)
                    if remaining_quantity > 0:
                        # Position reversed
                        self.quantity = remaining_quantity if trade.side == OrderSide.BUY else -remaining_quantity
                        self.side = PositionSide.LONG if trade.side == OrderSide.BUY else PositionSide.SHORT
                        self.average_price = trade.price
                    else:
                        # Position closed
                        self.quantity = 0
                        self.side = PositionSide.FLAT
                else:
                    # Partially reducing position
                    if self.side == PositionSide.LONG:
                        self.realized_pnl += (trade.price - self.average_price) * trade.quantity
                    else:
                        self.realized_pnl += (self.average_price - trade.price) * trade.quantity
                    self.quantity += trade_quantity
        
        self.order_ids.append(trade.order_id)
        self.updated_at = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert position to dictionary"""
        return {
            'symbol': self.symbol,
            'side': self.side.value,
            'quantity': self.quantity,
            'average_price': float(self.average_price),
            'market_price': float(self.market_price),
            'market_value': float(self.market_value),
            'cost_basis': float(self.cost_basis),
            'unrealized_pnl': float(self.unrealized_pnl),
            'realized_pnl': float(self.realized_pnl),
            'total_pnl': float(self.total_pnl),
            'opened_at': self.opened_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'order_ids': self.order_ids
        } 