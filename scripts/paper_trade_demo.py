#!/usr/bin/env python
"""scripts/paper_trade_demo.py

Tiny demo that creates a market order in PAPER mode and prints the result.
Ensure you have `BROKER_MODE=paper` in your environment and that you ran
`init_db.py` first.
"""
import os
from decimal import Decimal

os.environ.setdefault("BROKER_MODE", "paper")

from order.models import OrderRequest, OrderType, OrderSide  # reused dataclass
from domains.orders.services import OrderService, RiskService, NotificationService, ExecutionService
from domains.orders.repositories import OrderRepository, TradeRepository
from domains.orders.brokers import get_broker_adapter

# DI wiring --------------------------------------------------------------
exec_svc = ExecutionService(get_broker_adapter())
order_svc = OrderService(
    repo=OrderRepository,
    execution=exec_svc,
    risk=RiskService(),
    notifier=NotificationService(),
)

# Place order ------------------------------------------------------------
async def main():
    req = OrderRequest(
        symbol="AAPL",
        side=OrderSide.BUY,
        order_type=OrderType.MARKET,
        quantity=10,
    )
    order = await order_svc.create_order(req)
    print("Created order:", order)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main()) 