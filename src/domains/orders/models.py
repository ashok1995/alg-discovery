"""domains.orders.models

SQLAlchemy persistence models for the order-management domain.  These models
mirror the dataclass definitions already present in `order/models.py`, enabling
us to store orders & trades in PostgreSQL via the shared `common.db` engine.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy import (
    Column,
    String,
    Enum as SAEnum,
    Integer,
    Numeric,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from common.db import Base
from order.models import OrderType, OrderSide, OrderStatus, TimeInForce  # reuse enums


class OrderModel(Base):
    """Relational representation of a trading order."""

    __tablename__ = "orders"

    id: uuid.UUID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    symbol: str = Column(String(32), index=True, nullable=False)
    side: OrderSide = Column(SAEnum(OrderSide), nullable=False)
    order_type: OrderType = Column(SAEnum(OrderType), nullable=False)

    quantity: int = Column(Integer, nullable=False)
    price: Optional[Decimal] = Column(Numeric(20, 6), nullable=True)
    stop_price: Optional[Decimal] = Column(Numeric(20, 6), nullable=True)

    time_in_force: TimeInForce = Column(SAEnum(TimeInForce), nullable=False, default=TimeInForce.DAY)
    status: OrderStatus = Column(SAEnum(OrderStatus), nullable=False, default=OrderStatus.PENDING)

    filled_quantity: int = Column(Integer, nullable=False, default=0)
    average_fill_price: Optional[Decimal] = Column(Numeric(20, 6))

    target_price: Optional[Decimal] = Column(Numeric(20, 6))
    stop_loss_price: Optional[Decimal] = Column(Numeric(20, 6))

    parent_order_id: Optional[uuid.UUID] = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True)

    strategy_id: Optional[str] = Column(String(64))
    broker_order_id: Optional[str] = Column(String(64))
    tags: Dict[str, Any] = Column(JSON, nullable=False, default=dict)

    commissions: Decimal = Column(Numeric(20, 6), nullable=False, default=0)
    fees: Decimal = Column(Numeric(20, 6), nullable=False, default=0)
    slippage: Optional[Decimal] = Column(Numeric(20, 6))

    created_at: datetime = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: datetime = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    submitted_at: Optional[datetime] = Column(DateTime(timezone=True))
    filled_at: Optional[datetime] = Column(DateTime(timezone=True))

    # Relationships -------------------------------------------------------
    parent_order = relationship("OrderModel", remote_side=[id], backref="child_orders", lazy="joined")
    trades = relationship("TradeModel", back_populates="order", lazy="joined")

    # Convenience ---------------------------------------------------------
    def __repr__(self) -> str:  # pragma: no cover
        return f"<Order {self.id} {self.symbol} {self.side.value} {self.status.value}>"


class TradeModel(Base):
    """Executed trade linked to an order."""

    __tablename__ = "trades"

    id: uuid.UUID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: uuid.UUID = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, index=True)
    symbol: str = Column(String(32), index=True, nullable=False)
    side: OrderSide = Column(SAEnum(OrderSide), nullable=False)

    quantity: int = Column(Integer, nullable=False)
    price: Decimal = Column(Numeric(20, 6), nullable=False)

    timestamp: datetime = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    commissions: Decimal = Column(Numeric(20, 6), nullable=False, default=0)
    fees: Decimal = Column(Numeric(20, 6), nullable=False, default=0)
    exchange: Optional[str] = Column(String(32))

    order = relationship("OrderModel", back_populates="trades")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Trade {self.id} {self.symbol} qty={self.quantity} price={self.price}>"


__all__ = [
    "OrderModel",
    "TradeModel",
] 