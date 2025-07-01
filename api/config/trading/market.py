"""
Market Configuration
==================

Market hours, trading sessions, and market-related settings.
"""

import os
from datetime import datetime, time
from typing import List
import pytz

class MarketConfig:
    """Market configuration settings."""
    
    def __init__(self):
        # Market hours (IST)
        self.market_hours = {
            "start_time": os.getenv("MARKET_START", "09:15"),
            "end_time": os.getenv("MARKET_END", "15:30"),
            "pre_market_start": os.getenv("PRE_MARKET_START", "09:00"),
            "post_market_end": os.getenv("POST_MARKET_END", "16:00"),
            "timezone": os.getenv("MARKET_TIMEZONE", "Asia/Kolkata"),
            "trading_days": [0, 1, 2, 3, 4]  # Monday to Friday
        }
        
        # Market holidays (can be configured via environment)
        holidays_str = os.getenv("MARKET_HOLIDAYS", 
                                "2024-01-26,2024-03-08,2024-03-29,2024-08-15,2024-10-02,2024-11-01,2024-12-25")
        self.market_holidays = [date.strip() for date in holidays_str.split(",")]
        
        # Trading session configurations
        self.sessions = {
            "regular": {
                "start": self.market_hours["start_time"],
                "end": self.market_hours["end_time"],
                "enabled": True
            },
            "pre_market": {
                "start": self.market_hours["pre_market_start"],
                "end": self.market_hours["start_time"],
                "enabled": os.getenv("PRE_MARKET_ENABLED", "false").lower() == "true"
            },
            "post_market": {
                "start": self.market_hours["end_time"],
                "end": self.market_hours["post_market_end"],
                "enabled": os.getenv("POST_MARKET_ENABLED", "false").lower() == "true"
            }
        }
        
        # No-trade zones (lunch break, closing volatility, etc.)
        self.no_trade_zones = [
            {"start": "11:30", "end": "12:00", "reason": "Lunch break"},
            {"start": "15:15", "end": "15:30", "reason": "Closing volatility"}
        ]
        
        # Market condition thresholds
        self.volatility_thresholds = {
            "low": float(os.getenv("VOLATILITY_LOW", "0.01")),
            "medium": float(os.getenv("VOLATILITY_MEDIUM", "0.02")),
            "high": float(os.getenv("VOLATILITY_HIGH", "0.04"))
        }
        
        # Trading enablement flags
        self.paper_trading_enabled = os.getenv("PAPER_TRADING", "true").lower() == "true"
        self.live_trading_enabled = os.getenv("LIVE_TRADING", "false").lower() == "true"
        self.automated_trading_enabled = os.getenv("AUTO_TRADING", "false").lower() == "true"
    
    def is_market_open(self, current_time: datetime = None) -> bool:
        """Check if market is currently open."""
        if current_time is None:
            current_time = datetime.now()
        
        try:
            tz = pytz.timezone(self.market_hours["timezone"])
            if current_time.tzinfo is None:
                current_time = tz.localize(current_time)
            else:
                current_time = current_time.astimezone(tz)
            
            # Check if it's a trading day
            if current_time.weekday() not in self.market_hours["trading_days"]:
                return False
            
            # Check if it's a holiday
            date_str = current_time.strftime("%Y-%m-%d")
            if date_str in self.market_holidays:
                return False
            
            # Check time range
            start_time = datetime.strptime(self.market_hours["start_time"], "%H:%M").time()
            end_time = datetime.strptime(self.market_hours["end_time"], "%H:%M").time()
            current_time_only = current_time.time()
            
            return start_time <= current_time_only <= end_time
        except Exception:
            return False
    
    def is_in_no_trade_zone(self, current_time: datetime = None) -> bool:
        """Check if current time is in a no-trade zone."""
        if current_time is None:
            current_time = datetime.now()
        
        current_time_str = current_time.strftime("%H:%M")
        
        for zone in self.no_trade_zones:
            start_time = datetime.strptime(zone["start"], "%H:%M").time()
            end_time = datetime.strptime(zone["end"], "%H:%M").time()
            current_time_only = current_time.time()
            
            if start_time <= current_time_only <= end_time:
                return True
        
        return False
    
    def get_session_info(self, session_name: str) -> dict:
        """Get information about a trading session."""
        return self.sessions.get(session_name, {})
    
    def is_session_active(self, session_name: str, current_time: datetime = None) -> bool:
        """Check if a specific session is currently active."""
        session = self.sessions.get(session_name)
        if not session or not session.get("enabled"):
            return False
        
        if current_time is None:
            current_time = datetime.now()
        
        try:
            start_time = datetime.strptime(session["start"], "%H:%M").time()
            end_time = datetime.strptime(session["end"], "%H:%M").time()
            current_time_only = current_time.time()
            
            return start_time <= current_time_only <= end_time
        except Exception:
            return False
    
    def get_market_status(self) -> dict:
        """Get comprehensive market status."""
        now = datetime.now()
        
        return {
            "is_open": self.is_market_open(now),
            "is_no_trade_zone": self.is_in_no_trade_zone(now),
            "current_time": now.isoformat(),
            "timezone": self.market_hours["timezone"],
            "sessions": {
                session: self.is_session_active(session, now)
                for session in self.sessions.keys()
            },
            "paper_trading_enabled": self.paper_trading_enabled,
            "live_trading_enabled": self.live_trading_enabled,
            "automated_trading_enabled": self.automated_trading_enabled
        } 