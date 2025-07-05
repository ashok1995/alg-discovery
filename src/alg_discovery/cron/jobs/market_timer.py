#!/usr/bin/env python3
"""
Market Timer Service
===================

Handles Indian stock market timing, business-day checks, and helpers used by
cron schedulers for trading recommendations.

Moved from ``alg_discovery.services.market_timer`` to
``alg_discovery.cron.jobs.market_timer``.
"""

from __future__ import annotations

import logging
from datetime import datetime, time, timedelta
from typing import Optional, List, Tuple
from enum import Enum
import pytz

logger = logging.getLogger(__name__)


class MarketSession(Enum):
    """Indian stock market session types."""

    PRE_MARKET = "pre_market"      # 9:00-9:15 AM
    REGULAR = "regular"            # 9:15 AM-3:30 PM
    POST_MARKET = "post_market"    # 3:30-4:00 PM
    CLOSED = "closed"              # Outside trading hours
    WEEKEND = "weekend"            # Saturday/Sunday
    HOLIDAY = "holiday"            # Market holidays


class MarketTimer:
    """Market timing and scheduling utilities for Indian stock market."""

    def __init__(self):
        # Indian Standard Time
        self.ist = pytz.timezone("Asia/Kolkata")

        # Market timings (IST)
        self.pre_market_start = time(9, 0)      # 9:00 AM
        self.market_open = time(9, 15)          # 9:15 AM
        self.market_close = time(15, 30)        # 3:30 PM
        self.post_market_end = time(16, 0)      # 4:00 PM

        # Market holidays (2024) – extend as needed
        self.market_holidays: set[str] = {
            "2024-01-26",  # Republic Day
            "2024-03-08",  # Holi
            "2024-03-29",  # Good Friday
            "2024-04-11",  # Eid al-Fitr
            "2024-04-17",  # Ram Navami
            "2024-05-01",  # Maharashtra Day
            "2024-06-17",  # Eid al-Adha
            "2024-08-15",  # Independence Day
            "2024-08-19",  # Muharram
            "2024-08-26",  # Janmashtami
            "2024-10-02",  # Gandhi Jayanti
            "2024-10-12",  # Dussehra
            "2024-11-01",  # Diwali
            "2024-11-15",  # Guru Nanak Jayanti
            "2024-12-25",  # Christmas
        }

    # ---------------------------------------------------------------------
    # Basic helpers
    # ---------------------------------------------------------------------

    def get_current_ist_time(self) -> datetime:
        """Return current time in IST."""
        return datetime.now(self.ist)

    def is_market_day(self, date: Optional[datetime] = None) -> bool:
        """Return True if *date* is a trading day (excludes weekends / holidays)."""
        date = date or self.get_current_ist_time()

        # Weekend check (Saturday=5, Sunday=6)
        if date.weekday() >= 5:
            return False

        # Exchange holiday check
        if date.strftime("%Y-%m-%d") in self.market_holidays:
            return False

        return True

    # ------------------------------------------------------------------
    # Session helpers
    # ------------------------------------------------------------------

    def get_market_session(self, dt: Optional[datetime] = None) -> MarketSession:
        """Return the current :class:`MarketSession`."""
        dt = dt or self.get_current_ist_time()

        # Non-trading day
        if not self.is_market_day(dt):
            return MarketSession.WEEKEND if dt.weekday() >= 5 else MarketSession.HOLIDAY

        current = dt.time()
        if current < self.pre_market_start:
            return MarketSession.CLOSED
        if self.pre_market_start <= current < self.market_open:
            return MarketSession.PRE_MARKET
        if self.market_open <= current < self.market_close:
            return MarketSession.REGULAR
        if self.market_close <= current < self.post_market_end:
            return MarketSession.POST_MARKET
        return MarketSession.CLOSED

    def is_market_open(self, dt: Optional[datetime] = None) -> bool:
        return self.get_market_session(dt) == MarketSession.REGULAR

    def is_trading_hours(self, dt: Optional[datetime] = None) -> bool:
        """Return True during pre-, regular-, or post-market."""
        return self.get_market_session(dt) in {
            MarketSession.PRE_MARKET,
            MarketSession.REGULAR,
            MarketSession.POST_MARKET,
        }

    def should_run_cron_job(self, dt: Optional[datetime] = None) -> bool:
        """Convenience helper used by schedulers."""
        return self.is_market_open(dt)

    # ------------------------------------------------------------------
    # Next open / close helpers
    # ------------------------------------------------------------------

    def _advance_to_next_trading_day(self, from_time: datetime) -> datetime:
        """Return the next datetime that is a trading day (skip weekends / holidays)."""
        next_day = from_time + timedelta(days=1)
        while not self.is_market_day(next_day):
            next_day += timedelta(days=1)
        return next_day

    def get_next_market_open(self, from_time: Optional[datetime] = None) -> datetime:
        from_time = from_time or self.get_current_ist_time()
        if from_time.time() >= self.market_close:
            from_time = self._advance_to_next_trading_day(from_time)
        while not self.is_market_day(from_time):
            from_time = self._advance_to_next_trading_day(from_time)
        return from_time.replace(hour=self.market_open.hour, minute=self.market_open.minute, second=0, microsecond=0)

    def get_next_market_close(self, from_time: Optional[datetime] = None) -> datetime:
        from_time = from_time or self.get_current_ist_time()
        if self.is_market_day(from_time) and from_time.time() < self.market_close:
            return from_time.replace(hour=self.market_close.hour, minute=self.market_close.minute, second=0, microsecond=0)
        next_open = self.get_next_market_open(from_time)
        return next_open.replace(hour=self.market_close.hour, minute=self.market_close.minute, second=0, microsecond=0)

    # ------------------------------------------------------------------
    # Convenience info helpers used by dashboards / API
    # ------------------------------------------------------------------

    def get_market_session_info(self, dt: Optional[datetime] = None) -> dict:
        dt = dt or self.get_current_ist_time()
        session = self.get_market_session(dt)
        is_open = session == MarketSession.REGULAR

        next_open: Optional[datetime] = None
        next_close: Optional[datetime] = None
        time_to_open: Optional[timedelta] = None
        time_to_close: Optional[timedelta] = None

        if is_open:
            next_close = self.get_next_market_close(dt)
            time_to_close = next_close - dt
        else:
            next_open = self.get_next_market_open(dt)
            time_to_open = next_open - dt

        return {
            "current_time_ist": dt.isoformat(),
            "session": session.value,
            "is_open": is_open,
            "is_market_open": is_open,  # backward-compat alias
            "is_trading_hours": self.is_trading_hours(dt),
            "is_market_day": self.is_market_day(dt),
            "should_run_cron": self.should_run_cron_job(dt),
            "next_market_open": next_open.isoformat() if next_open else None,
            "next_market_close": next_close.isoformat() if next_close else None,
            "time_to_open_minutes": int(time_to_open.total_seconds() / 60) if time_to_open else None,
            "time_to_close_minutes": int(time_to_close.total_seconds() / 60) if time_to_close else None,
            "next_session_time": (next_open or next_close).isoformat() if (next_open or next_close) else None,
            "market_timings": {
                "pre_market": "09:00 - 09:15 IST",
                "regular_session": "09:15 - 15:30 IST",
                "post_market": "15:30 - 16:00 IST",
            },
        }

    # ------------------------------------------------------------------
    # Cron schedule helpers
    # ------------------------------------------------------------------

    def get_cron_schedule_times(self) -> List[Tuple[int, int]]:
        """Return (hour, minute) pairs every 5 minutes during market hours."""
        schedule_times: List[Tuple[int, int]] = []
        current_time = datetime.combine(datetime.today(), time(9, 15))
        end_time = datetime.combine(datetime.today(), time(15, 30))
        while current_time <= end_time:
            schedule_times.append((current_time.hour, current_time.minute))
            current_time += timedelta(minutes=5)
        return schedule_times

    def get_longterm_cron_schedule_times(self) -> List[Tuple[int, int]]:
        """Return (hour, minute) pairs every 30 minutes during market hours."""
        schedule_times: List[Tuple[int, int]] = []
        current_time = datetime.combine(datetime.today(), time(9, 15))
        end_time = datetime.combine(datetime.today(), time(15, 30))
        while current_time <= end_time:
            schedule_times.append((current_time.hour, current_time.minute))
            current_time += timedelta(minutes=30)
        return schedule_times

    # ------------------------------------------------------------------
    # Pretty formatting helpers
    # ------------------------------------------------------------------

    def format_market_status_message(self, dt: Optional[datetime] = None) -> str:
        """Return human-readable emoji + status for dashboards."""
        info = self.get_market_session_info(dt)
        if info["is_market_open"]:
            return f"🟢 Market is OPEN (closes in {info['time_to_close_minutes']} minutes)"
        if info["session"] == "pre_market":
            return f"🟡 Pre-market session (opens in {info['time_to_open_minutes']} minutes)"
        if info["session"] == "post_market":
            return f"🟡 Post-market session (next open: {info['next_market_open']})"
        if info["session"] == "weekend":
            return f"🔴 Weekend – Market closed (next open: {info['next_market_open']})"
        if info["session"] == "holiday":
            return f"🔴 Market holiday (next open: {info['next_market_open']})"
        return f"🔴 Market closed (opens in {info['time_to_open_minutes']} minutes)"


# ---------------------------------------------------------------------
# Module-level singleton (common pattern across codebase)
# ---------------------------------------------------------------------
market_timer = MarketTimer()

__all__ = [
    "MarketTimer",
    "market_timer",
    "MarketSession",
] 