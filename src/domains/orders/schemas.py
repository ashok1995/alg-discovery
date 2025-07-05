"""domains.orders.schemas

Pydantic I/O contracts for the Orders API endpoints (separate from DB models).
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, validator

from order.models import OrderType, OrderSide, TimeInForce, OrderStatus


# ── Request models ───────────────────────────────────────────────────────
class OrderCreate(BaseModel):
    symbol: str = Field(..., example="AAPL")
    side: OrderSide
    order_type: OrderType
    quantity: int = Field(..., gt=0)
    price: Optional[Decimal] = None
    stop_price: Optional[Decimal] = None
    time_in_force: TimeInForce = TimeInForce.DAY

    target_price: Optional[Decimal] = None
    stop_loss_price: Optional[Decimal] = None
    strategy_id: Optional[str] = None
    tags: Dict[str, str] = Field(default_factory=dict)

    @validator("price", always=True)
    def _price_required_for_limit(cls, v, values):
        if values.get("order_type") in {OrderType.LIMIT, OrderType.STOP_LOSS_LIMIT} and v is None:
            raise ValueError("price is required for limit-type orders")
        return v


class OrderUpdateIn(BaseModel):
    quantity: Optional[int] = Field(None, gt=0)
    price: Optional[Decimal] = None
    stop_price: Optional[Decimal] = None
    time_in_force: Optional[TimeInForce] = None

    class Config:
        extra = "forbid"


# ── Response models ──────────────────────────────────────────────────────
class OrderPublic(BaseModel):
    id: UUID
    symbol: str
    side: OrderSide
    order_type: OrderType
    quantity: int
    price: Optional[Decimal]
    stop_price: Optional[Decimal]
    time_in_force: TimeInForce
    status: OrderStatus
    filled_quantity: int
    average_fill_price: Optional[Decimal]

    target_price: Optional[Decimal]
    stop_loss_price: Optional[Decimal]
    parent_order_id: Optional[UUID]
    strategy_id: Optional[str]

    commissions: Decimal
    fees: Decimal

    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime]
    filled_at: Optional[datetime]

    class Config:
        orm_mode = True


class OrderList(BaseModel):
    orders: List[OrderPublic]


__all__ = [
    "OrderCreate",
    "OrderUpdateIn",
    "OrderPublic",
    "OrderList",
] 