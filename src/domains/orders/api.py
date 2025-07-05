"""domains.orders.api

FastAPI router exposing Order endpoints while following the `end-point-development-rules`.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID

from .schemas import OrderCreate, OrderPublic, OrderUpdateIn, OrderList
from .services import OrderService, RiskService, NotificationService, ExecutionService
from .repositories import OrderRepository, TradeRepository
from .brokers import get_broker_adapter

router = APIRouter(prefix="/orders", tags=["orders"])

# DI factory ----------------------------------------------------------------

def get_order_service() -> OrderService:
    return OrderService(
        repo=OrderRepository,
        execution=ExecutionService(get_broker_adapter()),
        risk=RiskService(),
        notifier=NotificationService(),
    )

# Helpers -------------------------------------------------------------------

def to_public(order) -> OrderPublic:  # order is ORM instance
    return OrderPublic.from_orm(order)

# Endpoints -----------------------------------------------------------------

@router.post("", response_model=OrderPublic, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    svc: OrderService = Depends(get_order_service),
):
    order = await svc.create_order(payload)  # type: ignore[arg-type]
    return to_public(order)


@router.get("/{order_id}", response_model=OrderPublic)
async def get_order(order_id: UUID, svc: OrderService = Depends(get_order_service)):
    order = svc._repo.find(id=order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="order not found")
    return to_public(order[0])


@router.patch("/{order_id}", response_model=OrderPublic)
async def amend_order(
    order_id: UUID,
    updates: OrderUpdateIn,
    svc: OrderService = Depends(get_order_service),
):
    upd = updates.dict(exclude_unset=True)
    if not upd:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="no fields to update")
    order = await svc.amend_order(order_id=order_id, **upd)  # type: ignore
    return to_public(order)


@router.post("/{order_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_order(order_id: UUID, svc: OrderService = Depends(get_order_service)):
    await svc.cancel_order(order_id)
    return None


@router.get("", response_model=OrderList)
async def list_orders(svc: OrderService = Depends(get_order_service)):
    orders = svc._repo.find()
    return {"orders": [to_public(o) for o in orders]} 