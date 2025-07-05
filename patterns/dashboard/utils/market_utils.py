"""
Market time and status utilities
"""

from datetime import datetime, timedelta
import pytz

# Set timezone to IST
IST = pytz.timezone('Asia/Kolkata')

from shared.config.settings import (
    MARKET_DAYS, MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE,
    MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE
)

def is_market_open():
    """
    Check if market is open
    
    Returns:
        Boolean indicating if market is open
    """
    now = datetime.now(IST)
    
    # Check if today is a market day
    if now.strftime('%A') not in MARKET_DAYS:
        return False
    
    # Check if current time is within market hours
    market_open = now.replace(hour=MARKET_OPEN_HOUR, minute=MARKET_OPEN_MINUTE, second=0, microsecond=0)
    market_close = now.replace(hour=MARKET_CLOSE_HOUR, minute=MARKET_CLOSE_MINUTE, second=0, microsecond=0)
    
    return market_open <= now <= market_close

def format_time_until_market_open():
    """
    Format time until market open/close
    
    Returns:
        String with market time information
    """
    now = datetime.now(IST)
    today = now.strftime('%A')
    
    if today not in MARKET_DAYS:
        # Find the next market day
        days_ahead = 1
        while (now + timedelta(days=days_ahead)).strftime('%A') not in MARKET_DAYS:
            days_ahead += 1
        
        next_market_day = (now + timedelta(days=days_ahead)).strftime('%A')
        return f"Market closed until {next_market_day}"
    
    market_open = now.replace(hour=MARKET_OPEN_HOUR, minute=MARKET_OPEN_MINUTE, second=0, microsecond=0)
    
    if now < market_open:
        # Market opens today
        time_diff = market_open - now
        hours, remainder = divmod(time_diff.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        return f"Market opens in {hours:02d}:{minutes:02d}:{seconds:02d}"
    
    market_close = now.replace(hour=MARKET_CLOSE_HOUR, minute=MARKET_CLOSE_MINUTE, second=0, microsecond=0)
    
    if now < market_close:
        # Market is open
        time_diff = market_close - now
        hours, remainder = divmod(time_diff.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        return f"Market closes in {hours:02d}:{minutes:02d}:{seconds:02d}"
    
    # Market is closed for the day
    return "Market closed for the day" 