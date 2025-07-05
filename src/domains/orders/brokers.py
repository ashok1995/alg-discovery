"""domains.orders.brokers

Broker adapter abstractions for the Orders domain.
• BrokerAdapter – protocol definition.
• LiveBrokerAdapter – placeholder for real broker integration.
• PaperBrokerAdapter – in-memory fill simulator for paper trading.
• get_broker_adapter() – reads the env var BROKER_MODE (live|paper).
"""

from __future__ import annotations

import os
import random
from decimal import Decimal
from uuid import UUID
from typing import Dict, List
from datetime import datetime

from domains.orders.models import OrderModel, TradeModel
from domains.orders.repositories import OrderRepository, TradeRepository
from order.models import OrderStatus, OrderSide

# ---------------------------------------------------------------------------
# Abstract interface
# ---------------------------------------------------------------------------
class BrokerAdapter:  # pragma: no cover – interface only
    async def submit(self, order: OrderModel) -> str: ...  # noqa: D401
    async def cancel(self, broker_order_id: str) -> None: ...  # noqa: D401


# ---------------------------------------------------------------------------
# Live broker (stub)
# ---------------------------------------------------------------------------
class LiveBrokerAdapter(BrokerAdapter):
    async def submit(self, order: OrderModel) -> str:  # pragma: no cover
        # TODO: integrate real broker SDK / API call
        raise NotImplementedError("Live broker integration not implemented")

    async def cancel(self, broker_order_id: str) -> None:  # pragma: no cover
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Paper-trading broker
# ---------------------------------------------------------------------------
class PaperBrokerAdapter(BrokerAdapter):
    """Simulates immediate fill at market price (or LIMIT price)."""

    def __init__(self, slippage_pct: float = 0.0005):
        self._slippage_pct = slippage_pct

    async def submit(self, order: OrderModel) -> str:
        # Simulate broker id
        broker_id = f"PAPER-{order.id}"
        fill_price = self._determine_fill_price(order)
        quantity = order.quantity

        # Mark order as filled
        OrderRepository.update(order.id, {
            "status": OrderStatus.FILLED,
            "filled_quantity": quantity,
            "average_fill_price": fill_price,
            "broker_order_id": broker_id,
            "submitted_at": datetime.utcnow(),
            "filled_at": datetime.utcnow(),
        })

        # Create Trade record
        trade = TradeModel(
            order_id=order.id,
            symbol=order.symbol,
            side=order.side,
            quantity=quantity,
            price=fill_price,
            commissions=Decimal("0"),
            fees=Decimal("0"),
            exchange="PAPER",
        )
        TradeRepository.insert(trade)
        return broker_id

    async def cancel(self, broker_order_id: str) -> None:
        # In paper mode, order is probably already filled instantly; no-op.
        pass

    # ────────────────────────────────────────────────────────────────────
    def _determine_fill_price(self, order: OrderModel) -> Decimal:
        base = order.price or Decimal(random.uniform(100, 500))  # fallback
        spread = base * Decimal(self._slippage_pct)
        return base + spread if order.side == OrderSide.BUY else base - spread


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

_BROKER_MODE = os.getenv("BROKER_MODE", "paper").lower()


def get_broker_adapter() -> BrokerAdapter:
    if _BROKER_MODE == "live":
        return LiveBrokerAdapter()
    return PaperBrokerAdapter()


__all__ = [
    "BrokerAdapter",
    "LiveBrokerAdapter",
    "PaperBrokerAdapter",
    "get_broker_adapter",
] 