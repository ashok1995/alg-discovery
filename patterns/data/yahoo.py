"""
Yahoo Finance data fetcher
"""

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from shared.config.settings import YAHOO_INTERVAL_MAPPING
from utils.logger import get_logger

logger = get_logger(__name__, group="shared", service="data_yahoo")

def get_stock_data(symbol, period="1mo", interval="1d"):
    """
    Fetch stock data from Yahoo Finance
    
    Args:
        symbol: Stock symbol (will append .NS for NSE stocks)
        period: Time period to fetch (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
        interval: Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)
    
    Returns:
        DataFrame with OHLCV data
    """
    try:
        # For NSE stocks, append .NS if not already present
        if not symbol.endswith(('.NS', '.BO')):
            symbol = f"{symbol}.NS"
            
        stock = yf.Ticker(symbol)
        df = stock.history(period=period, interval=YAHOO_INTERVAL_MAPPING.get(interval, interval))
        
        if df.empty:
            logger.warning(f"No data found for {symbol}")
            return None
            
        # Reset index to make Date a column
        df = df.reset_index()
        
        # Rename columns to standard format
        df.columns = [col if col != 'Datetime' else 'Date' for col in df.columns]
        
        return df
    except Exception as e:
        logger.error(f"Error fetching data for {symbol}: {e}")
        return None

def get_market_index_data(index_symbol="^NSEI", period="1mo", interval="1d"):
    """
    Fetch market index data from Yahoo Finance
    
    Args:
        index_symbol: Index symbol (default: ^NSEI for Nifty 50)
        period: Time period to fetch
        interval: Data interval
    
    Returns:
        DataFrame with OHLCV data for the index
    """
    try:
        return get_stock_data(index_symbol, period, interval)
    except Exception as e:
        logger.error(f"Error fetching index data for {index_symbol}: {e}")
        return None

def get_multiple_stocks_data(symbols, period="1mo", interval="1d"):
    """
    Fetch data for multiple stocks
    
    Args:
        symbols: List of stock symbols
        period: Time period to fetch
        interval: Data interval
    
    Returns:
        Dictionary of DataFrames with stock symbol as key
    """
    result = {}
    for symbol in symbols:
        df = get_stock_data(symbol, period, interval)
        if df is not None:
            result[symbol] = df
    
    return result

def get_market_data(symbol, period="1d", interval="1d"):
    """Get market data with better error handling"""
    try:
        data = yf.download(symbol, period=period, interval=interval)
        if data.empty:
            logger.warning(f"No data found for {symbol}")
            # Try fallback symbol or use cached data
            return None
        return data
    except Exception as e:
        logger.error(f"Error fetching data for {symbol}: {e}")
        return None 