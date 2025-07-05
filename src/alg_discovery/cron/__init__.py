"""
Alg Discovery Cron package.

Central location for all scheduled tasks (APScheduler, Celery beat, etc.).

The concrete job implementations are still located in `alg_discovery.services.*`.
This package simply re-exports them so that new code can import from
`alg_discovery.cron` while legacy imports continue to work.
"""

# Expose important schedulers directly at package level
from .jobs.job_scheduler import JobScheduler, BackgroundJob  # type: ignore
from .jobs.trading_scheduler import TradingScheduler  # type: ignore
from .jobs.recommendation_scheduler import RecommendationScheduler  # type: ignore
from .jobs.market_timer import MarketTimer, MarketSession  # type: ignore

__all__ = [
    "JobScheduler",
    "BackgroundJob",
    "TradingScheduler",
    "RecommendationScheduler",
    "MarketTimer",
    "MarketSession",
] 