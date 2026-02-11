"""
Scheduling utilities
"""

import schedule
import time
import threading
from datetime import datetime, timedelta
import pytz
from shared.config.settings import (
    MARKET_DAYS, MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE,
    MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE
)
from utils.logger import get_logger

logger = get_logger(__name__, group="shared", service="utils_scheduler")

# Set timezone to IST
IST = pytz.timezone('Asia/Kolkata')

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

def run_at_market_open(func):
    """
    Run function at market open
    
    Args:
        func: Function to run
    """
    def wrapper():
        if is_market_open():
            func()
        else:
            logger.info(f"Market is closed. Skipping {func.__name__}")
    
    # Schedule to run at market open time on market days
    for day in MARKET_DAYS:
        schedule.every().day.at(f"{MARKET_OPEN_HOUR:02d}:{MARKET_OPEN_MINUTE:02d}").do(wrapper)
    
    return wrapper

def run_at_market_close(func):
    """
    Run function at market close
    
    Args:
        func: Function to run
    """
    def wrapper():
        func()
    
    # Schedule to run at market close time on market days
    for day in MARKET_DAYS:
        schedule.every().day.at(f"{MARKET_CLOSE_HOUR:02d}:{MARKET_CLOSE_MINUTE:02d}").do(wrapper)
    
    return wrapper

def run_during_market_hours(func, interval_minutes):
    """
    Run function during market hours at specified interval
    
    Args:
        func: Function to run
        interval_minutes: Interval in minutes
    """
    def wrapper():
        if is_market_open():
            func()
        else:
            logger.info(f"Market is closed. Skipping {func.__name__}")
    
    # Schedule to run every interval_minutes during market hours
    schedule.every(interval_minutes).minutes.do(wrapper)
    
    return wrapper

def run_scheduler():
    """
    Run scheduler in a loop
    """
    while True:
        schedule.run_pending()
        time.sleep(1)

def start_scheduler():
    """
    Start scheduler in a background thread
    """
    thread = threading.Thread(target=run_scheduler)
    thread.daemon = True
    thread.start()
    logger.info("Scheduler started") 