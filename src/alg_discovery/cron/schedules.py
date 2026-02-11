"""
Centralised schedule definitions for Alg Discovery.

Provides helper coroutines to start common schedulers in parallel. For now we
wire up RecommendationScheduler and TradingScheduler; additional job classes
can be added here as needed.
"""

from __future__ import annotations

import asyncio
import logging

from .jobs.recommendation_scheduler import RecommendationScheduler
from .jobs.trading_scheduler import TradingScheduler

logger = logging.getLogger(__name__)


async def start_all() -> None:
    """Start the main cron schedulers concurrently and keep them alive."""
    rec_scheduler = RecommendationScheduler()
    trading_scheduler = TradingScheduler()

    # Launch both schedulers concurrently.
    await asyncio.gather(
        rec_scheduler.start_scheduler(),
        trading_scheduler.start_scheduler(),
    )

    logger.info("All cron schedulers started.")

    # Prevent routine from exiting (keeps event-loop active for APS).
    while True:
        await asyncio.sleep(60)


def run() -> None:  # pragma: no cover – thin wrapper for CLI entrypoint
    """Blocking helper to run within a standard synchronous context."""
    asyncio.run(start_all()) 