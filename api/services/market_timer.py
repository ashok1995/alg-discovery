#!/usr/bin/env python3
"""
Market Timer Service
===================

Handles Indian stock market timing, business day checks, and 
market-aware cron job scheduling for trading recommendations.
"""

import logging
from datetime import datetime, time, timedelta
from typing import Optional, List, Tuple
from enum import Enum
import pytz

logger = logging.getLogger(__name__)

class MarketSession(Enum):
    """Indian stock market session types."""
    PRE_MARKET = "pre_market"      # 9:00-9:15 AM
    REGULAR = "regular"            # 9:15 AM - 3:30 PM
    POST_MARKET = "post_market"    # 3:30-4:00 PM
    CLOSED = "closed"              # Outside trading hours
    WEEKEND = "weekend"            # Saturday/Sunday
    HOLIDAY = "holiday"            # Market holidays

class MarketTimer:
    """Market timing and scheduling utilities for Indian stock market."""
    
    def __init__(self):
        # Indian Standard Time
        self.ist = pytz.timezone('Asia/Kolkata')
        
        # Market timings (IST)
        self.pre_market_start = time(9, 0)      # 9:00 AM
        self.market_open = time(9, 15)          # 9:15 AM
        self.market_close = time(15, 30)        # 3:30 PM
        self.post_market_end = time(16, 0)      # 4:00 PM
        
        # Market holidays (2024) - Add more as needed
        self.market_holidays = {
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
    
    def get_current_ist_time(self) -> datetime:
        """Get current time in IST."""
        return datetime.now(self.ist)
    
    def is_market_day(self, date: Optional[datetime] = None) -> bool:
        """Check if given date is a market trading day."""
        if date is None:
            date = self.get_current_ist_time()
        
        # Weekend check
        if date.weekday() >= 5:  # Saturday = 5, Sunday = 6
            return False
        
        # Holiday check
        date_str = date.strftime('%Y-%m-%d')
        if date_str in self.market_holidays:
            return False
        
        return True
    
    def get_market_session(self, dt: Optional[datetime] = None) -> MarketSession:
        """Get current market session status."""
        if dt is None:
            dt = self.get_current_ist_time()
        
        # Check if it's a market day
        if not self.is_market_day(dt):
            return MarketSession.WEEKEND if dt.weekday() >= 5 else MarketSession.HOLIDAY
        
        current_time = dt.time()
        
        if current_time < self.pre_market_start:
            return MarketSession.CLOSED
        elif self.pre_market_start <= current_time < self.market_open:
            return MarketSession.PRE_MARKET
        elif self.market_open <= current_time < self.market_close:
            return MarketSession.REGULAR
        elif self.market_close <= current_time < self.post_market_end:
            return MarketSession.POST_MARKET
        else:
            return MarketSession.CLOSED
    
    def is_market_open(self, dt: Optional[datetime] = None) -> bool:
        """Check if market is currently open for trading."""
        session = self.get_market_session(dt)
        return session == MarketSession.REGULAR
    
    def is_trading_hours(self, dt: Optional[datetime] = None) -> bool:
        """Check if it's within trading hours (including pre/post market)."""
        session = self.get_market_session(dt)
        return session in [MarketSession.PRE_MARKET, MarketSession.REGULAR, MarketSession.POST_MARKET]
    
    def should_run_cron_job(self, dt: Optional[datetime] = None) -> bool:
        """Check if cron jobs should run (only during market hours)."""
        return self.is_market_open(dt)
    
    def get_next_market_open(self, from_time: Optional[datetime] = None) -> datetime:
        """Get the next market opening time."""
        if from_time is None:
            from_time = self.get_current_ist_time()
        
        # Start from the next day if we're past market close
        if from_time.time() >= self.market_close:
            next_day = from_time + timedelta(days=1)
        else:
            next_day = from_time
        
        # Find the next market day
        while not self.is_market_day(next_day):
            next_day += timedelta(days=1)
        
        # Return market open time for that day
        return next_day.replace(
            hour=self.market_open.hour,
            minute=self.market_open.minute,
            second=0,
            microsecond=0
        )
    
    def get_next_market_close(self, from_time: Optional[datetime] = None) -> datetime:
        """Get the next market closing time."""
        if from_time is None:
            from_time = self.get_current_ist_time()
        
        # If market is open today, return today's close
        if self.is_market_day(from_time) and from_time.time() < self.market_close:
            return from_time.replace(
                hour=self.market_close.hour,
                minute=self.market_close.minute,
                second=0,
                microsecond=0
            )
        
        # Otherwise find next market day and return its close
        next_open = self.get_next_market_open(from_time)
        return next_open.replace(
            hour=self.market_close.hour,
            minute=self.market_close.minute,
            second=0,
            microsecond=0
        )
    
    def get_market_session_info(self, dt: Optional[datetime] = None) -> dict:
        """Get detailed market session information."""
        if dt is None:
            dt = self.get_current_ist_time()
        
        session = self.get_market_session(dt)
        is_open = self.is_market_open(dt)
        
        next_open = None
        next_close = None
        time_to_open = None
        time_to_close = None
        
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
            "is_market_open": is_open,
            "is_trading_hours": self.is_trading_hours(dt),
            "is_market_day": self.is_market_day(dt),
            "should_run_cron": self.should_run_cron_job(dt),
            "next_market_open": next_open.isoformat() if next_open else None,
            "next_market_close": next_close.isoformat() if next_close else None,
            "time_to_open_minutes": int(time_to_open.total_seconds() / 60) if time_to_open else None,
            "time_to_close_minutes": int(time_to_close.total_seconds() / 60) if time_to_close else None,
            "next_session_time": next_open.isoformat() if next_open else next_close.isoformat() if next_close else None,
            "market_timings": {
                "pre_market": "09:00 - 09:15 IST",
                "regular_session": "09:15 - 15:30 IST",
                "post_market": "15:30 - 16:00 IST"
            }
        }
    
    def get_cron_schedule_times(self) -> List[Tuple[int, int]]:
        """Get list of (hour, minute) tuples for cron job scheduling during market hours."""
        schedule_times = []
        
        # Market hours: 9:15 AM to 3:30 PM
        start_hour = 9
        start_minute = 15
        end_hour = 15
        end_minute = 30
        
        # For swing and short-term (every 5 minutes)
        current_time = datetime.combine(datetime.today(), time(start_hour, start_minute))
        end_time = datetime.combine(datetime.today(), time(end_hour, end_minute))
        
        while current_time <= end_time:
            schedule_times.append((current_time.hour, current_time.minute))
            current_time += timedelta(minutes=5)
        
        return schedule_times
    
    def get_longterm_cron_schedule_times(self) -> List[Tuple[int, int]]:
        """Get list of (hour, minute) tuples for long-term cron job scheduling (every 30 minutes)."""
        schedule_times = []
        
        # Market hours: 9:15 AM to 3:30 PM
        start_hour = 9
        start_minute = 15
        end_hour = 15
        end_minute = 30
        
        # For long-term (every 30 minutes)
        current_time = datetime.combine(datetime.today(), time(start_hour, start_minute))
        end_time = datetime.combine(datetime.today(), time(end_hour, end_minute))
        
        while current_time <= end_time:
            schedule_times.append((current_time.hour, current_time.minute))
            current_time += timedelta(minutes=30)
        
        return schedule_times
    
    def format_market_status_message(self, dt: Optional[datetime] = None) -> str:
        """Get a human-readable market status message."""
        info = self.get_market_session_info(dt)
        
        if info['is_market_open']:
            return f"🟢 Market is OPEN (closes in {info['time_to_close_minutes']} minutes)"
        elif info['session'] == 'pre_market':
            return f"🟡 Pre-market session (opens in {info['time_to_open_minutes']} minutes)"
        elif info['session'] == 'post_market':
            return f"🟡 Post-market session (next open: {info['next_market_open']})"
        elif info['session'] == 'weekend':
            return f"🔴 Weekend - Market closed (next open: {info['next_market_open']})"
        elif info['session'] == 'holiday':
            return f"🔴 Market holiday (next open: {info['next_market_open']})"
        else:
            return f"🔴 Market closed (opens in {info['time_to_open_minutes']} minutes)"

# Global market timer instance
market_timer = MarketTimer() 