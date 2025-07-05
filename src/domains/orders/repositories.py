"""domains.orders.repositories

Pre-configured repository helpers for the Orders domain – keeps service layer
code ultra-thin.
"""

from __future__ import annotations

from common.db.repository import SQLAlchemyRepository
from common.db import get_sync_session_factory

from .models import OrderModel, TradeModel

SessionLocal = get_sync_session_factory()

OrderRepository = SQLAlchemyRepository(SessionLocal, OrderModel)
TradeRepository = SQLAlchemyRepository(SessionLocal, TradeModel)

__all__ = [
    "OrderRepository",
    "TradeRepository",
] 