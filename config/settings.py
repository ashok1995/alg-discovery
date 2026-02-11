"""
Configuration settings
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Application settings

# MongoDB Settings
MONGODB_URI = "mongodb://localhost:27017"
MONGODB_DB = "st-analysis-dev"

# Logging Settings
LOG_LEVEL = "INFO"
LOG_FILE = "app.log"

# Other application settings
DEBUG = True

# ChartInk settings
CHARTINK_URL = "https://chartink.com/screener/process"
CHARTINK_REFERER = "https://chartink.com/screener/"

# Market settings
MARKET_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
MARKET_OPEN_HOUR = 9
MARKET_OPEN_MINUTE = 15
MARKET_CLOSE_HOUR = 15
MARKET_CLOSE_MINUTE = 30

# Trading settings
DEFAULT_RISK_PERCENT = 1.0  # 1% risk per trade
DEFAULT_REWARD_RISK_RATIO = 2.0  # 2:1 reward-to-risk ratio
MAX_POSITIONS = 5  # Maximum number of open positions
ACCOUNT_BALANCE = 100000  # Initial account balance

# API settings
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY", "")
YAHOO_FINANCE_PROXY = os.getenv("YAHOO_FINANCE_PROXY", "")

# Dashboard settings
DASHBOARD_PORT = int(os.getenv("DASHBOARD_PORT", "8501"))
DASHBOARD_HOST = os.getenv("DASHBOARD_HOST", "localhost")

# Yahoo Finance settings
YAHOO_INTERVAL_MAPPING = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "60m",
    "1d": "1d",
    "1wk": "1wk",
    "1mo": "1mo"
}

# Scheduling settings
INTRADAY_SCAN_INTERVAL = 5  # minutes
SWING_SCAN_INTERVAL = 30    # minutes
LONG_TERM_SCAN_INTERVAL = 60  # minutes
MARKET_CONDITION_SCAN_INTERVAL = 60  # minutes

# Market conditions
MONGO_COLLECTIONS = {
    "stocks": "stocks",
    "patterns": "patterns",
    "market_conditions": "market_conditions",
    "trades": "trades",
    "watchlists": "watchlists"
}

# Trading settings
DEFAULT_RISK_PERCENT = 1.0  # Risk 1% of capital per trade
DEFAULT_REWARD_RISK_RATIO = 2.0  # Target 2:1 reward to risk ratio

# Market hours (IST)
MARKET_OPEN_HOUR = 9
MARKET_OPEN_MINUTE = 15
MARKET_CLOSE_HOUR = 15
MARKET_CLOSE_MINUTE = 30
MARKET_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

# Logging settings
LOG_LEVEL = "INFO"
LOG_FILE = "stock_system.log" 