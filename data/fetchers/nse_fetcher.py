import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime, timedelta, time
import pytz
import logging
import time as tm

class NSEDataFetcher:
    """Fetcher for NSE (National Stock Exchange) data"""
    
    def __init__(self):
        self.suffix = ".NS"  # NSE suffix for Yahoo Finance
        self.ist_tz = pytz.timezone('Asia/Kolkata')
        self.market_start = pd.Timestamp('09:15:00').time()
        self.market_end = pd.Timestamp('15:30:00').time()
        # List of major NSE stocks (NIFTY 50 stocks)
        self.nifty50_symbols = [
            "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
            "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
            "LT.NS", "AXISBANK.NS", "BAJFINANCE.NS", "ASIANPAINT.NS", "MARUTI.NS",
            "TITAN.NS", "ULTRACEMCO.NS", "TATAMOTORS.NS", "SUNPHARMA.NS", "BAJAJFINSV.NS",
            "WIPRO.NS", "HCLTECH.NS", "TECHM.NS", "POWERGRID.NS", "NTPC.NS",
            "ADANIENT.NS", "JSWSTEEL.NS", "TATASTEEL.NS", "M&M.NS", "ONGC.NS"
        ]
        
        # Add more stocks from NIFTY Next 50 for broader coverage
        self.nifty_next50_symbols = [
            "ADANIGREEN.NS", "ADANIPORTS.NS", "APOLLOHOSP.NS", "BAJAJ-AUTO.NS",
            "BANDHANBNK.NS", "BERGEPAINT.NS", "BIOCON.NS", "BOSCHLTD.NS",
            "CHOLAFIN.NS", "DABUR.NS", "DIVISLAB.NS", "DLF.NS", "DMART.NS",
            "GAIL.NS", "GODREJCP.NS", "HAVELLS.NS", "HDFCLIFE.NS", "HINDALCO.NS",
            "ICICIPRULI.NS", "INDUSINDBK.NS", "NAUKRI.NS"
        ]
        
        # Combine both lists
        self.all_symbols = self.nifty50_symbols + self.nifty_next50_symbols
        self.default_symbols = [
            "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
            "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
            "AXISBANK.NS", "TATAMOTORS.NS", "MARUTI.NS", "SUNPHARMA.NS", "INDUSINDBK.NS",
            "BAJAJFINSV.NS", "ASIANPAINT.NS", "ULTRACEMCO.NS", "TITAN.NS", "BAJFINANCE.NS"
        ]
        
        # Cache for data to avoid unnecessary API calls
        self.data_cache = {}
        self.cache_expiry = {}  # Store when cache entries expire
        self.cache_duration = {
            "1m": 60,           # 1 minute data expires in 60 seconds
            "5m": 5 * 60,       # 5 minute data expires in 5 minutes
            "15m": 15 * 60,
            "30m": 30 * 60,
            "1h": 60 * 60,
            "1d": 24 * 60 * 60, # Daily data expires in 24 hours
            "1wk": 7 * 24 * 60 * 60,
            "1mo": 30 * 24 * 60 * 60
        }
        
        # Indian market timezone
        self.ist_tz = pytz.timezone('Asia/Kolkata')
        
        # Market hours (IST)
        self.market_open = time(9, 15)
        self.market_close = time(15, 30)
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def is_market_hour(self, timestamp):
        """Check if timestamp is within market hours"""
        # Convert to IST
        ist_time = timestamp.astimezone(self.ist_tz).time()
        # Check if time is between market hours
        return self.market_start <= ist_time <= self.market_end

    def get_current_data(self):
        """
        Fetch current market data for NSE stocks
        Returns DataFrame with current price and price changes
        """
        data = []
        
        for symbol in self.all_symbols:
            try:
                # Fetch data using yfinance
                stock = yf.Ticker(symbol)
                hist = stock.history(period="2d")  # Get last 2 days for calculating change
                
                if len(hist) >= 2:
                    current_price = hist['Close'].iloc[-1]
                    prev_price = hist['Close'].iloc[-2]
                    change = current_price - prev_price
                    percent_change = (change / prev_price) * 100
                    volume = hist['Volume'].iloc[-1]
                    
                    data.append({
                        'symbol': symbol.replace('.NS', ''),  # Remove .NS suffix for display
                        'current_price': current_price,
                        'change': change,
                        'percent_change': percent_change,
                        'volume': volume
                    })
            
            except Exception as e:
                print(f"Error fetching data for {symbol}: {e}")
                continue
        
        return pd.DataFrame(data)

    def get_top_movers(self, n=10):
        """
        Get top gainers and losers
        Args:
            n: Number of stocks to return for each category
        Returns:
            tuple: (top_gainers DataFrame, top_losers DataFrame)
        """
        df = self.get_current_data()
        
        # Sort for gainers and losers
        gainers = df.nlargest(n, 'percent_change')
        losers = df.nsmallest(n, 'percent_change')
        
        return gainers, losers

    def get_historical_data(self, symbol, start_date, end_date, interval="1d"):
        """
        Fetch historical OHLCV data for a given symbol
        
        Args:
            symbol (str): Stock symbol
            start_date: Start date
            end_date: End date
            interval (str): Data interval (1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo)
            
        Returns:
            pandas.DataFrame: OHLCV data
        """
        # Ensure dates are datetime objects
        if isinstance(start_date, str):
            start_date = pd.to_datetime(start_date)
        if isinstance(end_date, str):
            end_date = pd.to_datetime(end_date)
            
        # CRITICAL: Ensure end_date is not in the future
        current_time = datetime.now()
        if end_date > current_time:
            self.logger.warning(f"End date {end_date} is in the future! Using current time instead.")
            end_date = current_time
            
        # CRITICAL: Ensure start_date is not in the future
        if start_date > current_time:
            self.logger.warning(f"Start date {start_date} is in the future! Using one month ago instead.")
            start_date = current_time - timedelta(days=30)
            
        # CRITICAL: Ensure start_date is before end_date
        if start_date >= end_date:
            self.logger.warning(f"Start date {start_date} is not before end date {end_date}! Adjusting start date.")
            start_date = end_date - timedelta(days=30)
            
        # Convert to string format for cache key and logging
        start_str = start_date.strftime('%Y-%m-%d')
        end_str = end_date.strftime('%Y-%m-%d')
        
        self.logger.info(f"Fetching data for {symbol} from {start_str} to {end_str} with interval {interval}")
        
        # Generate cache key
        cache_key = f"{symbol}_{interval}_{start_str}_{end_str}"
        
        # Check if data is in cache and not expired
        current_time_epoch = tm.time()
        if (cache_key in self.data_cache and 
            cache_key in self.cache_expiry and 
            current_time_epoch < self.cache_expiry[cache_key]):
            self.logger.info(f"Using cached data for {cache_key}")
            return self.data_cache[cache_key]
        
        # Fetch data from yfinance
        try:
            # Use native yfinance parameters with string dates
            self.logger.info(f"Downloading data via yfinance: {symbol}, {start_str} to {end_str}, interval={interval}")
            
            ticker = yf.Ticker(symbol)
            data = ticker.history(
                start=start_str,
                end=end_str,
                interval=interval
            )
            
            self.logger.info(f"Downloaded {len(data)} rows of data")
            
            # Handle empty data
            if data.empty:
                self.logger.warning(f"No data returned for {symbol}")
                return pd.DataFrame()
            
            # Log data range
            if not data.empty:
                self.logger.info(f"Data range: {data.index.min()} to {data.index.max()}")
            
            # Filter for market hours for intraday data
            if interval in ["1m", "5m", "15m", "30m", "1h"]:
                # Convert index to IST timezone for filtering
                if data.index.tz is not None:
                    data.index = data.index.tz_convert(self.ist_tz)
                else:
                    data.index = data.index.tz_localize('UTC').tz_convert(self.ist_tz)
                
                # Filter for market hours (9:15 AM to 3:30 PM IST, weekdays)
                original_len = len(data)
                data = data[
                    (data.index.time >= self.market_open) & 
                    (data.index.time <= self.market_close) &
                    (data.index.dayofweek < 5)  # Monday=0, Friday=4
                ]
                self.logger.info(f"Filtered for market hours: {original_len} → {len(data)} rows")
            
            # Cache the data
            self.data_cache[cache_key] = data
            # Set cache expiry
            self.cache_expiry[cache_key] = current_time_epoch + self.cache_duration.get(interval, 300)
            
            return data
            
        except Exception as e:
            self.logger.error(f"Error fetching data for {symbol}: {str(e)}", exc_info=True)
            return pd.DataFrame()
            
    def get_latest_price(self, symbol):
        """Get latest price for a symbol"""
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period="1d")
            if data.empty:
                return None
            return data['Close'].iloc[-1]
        except Exception as e:
            self.logger.error(f"Error fetching latest price for {symbol}: {str(e)}")
            return None
    
    def get_top_gainers(self, limit=10):
        """Get top gaining stocks"""
        # For now, return simulated data
        return [
            {"symbol": "TATASTEEL.NS", "change_pct": 3.45, "price": 134.50},
            {"symbol": "HINDALCO.NS", "change_pct": 2.78, "price": 564.20},
            {"symbol": "ADANIPORTS.NS", "change_pct": 2.34, "price": 876.40},
            {"symbol": "INDUSINDBK.NS", "change_pct": 2.12, "price": 1345.75},
            {"symbol": "BAJAJFINSV.NS", "change_pct": 1.87, "price": 1567.60},
            {"symbol": "DIVISLAB.NS", "change_pct": 1.65, "price": 3654.25},
            {"symbol": "AXISBANK.NS", "change_pct": 1.43, "price": 876.30},
            {"symbol": "HDFCLIFE.NS", "change_pct": 1.32, "price": 654.40},
            {"symbol": "TITAN.NS", "change_pct": 1.21, "price": 2543.65},
            {"symbol": "M&M.NS", "change_pct": 1.15, "price": 954.30}
        ][:limit]
    
    def get_top_losers(self, limit=10):
        """Get top losing stocks"""
        # Simulated data
        return [
            {"symbol": "SUNPHARMA.NS", "change_pct": -2.34, "price": 765.40},
            {"symbol": "DRREDDY.NS", "change_pct": -1.96, "price": 4532.50},
            {"symbol": "HEROMOTOCO.NS", "change_pct": -1.87, "price": 2876.30},
            {"symbol": "CIPLA.NS", "change_pct": -1.65, "price": 954.75},
            {"symbol": "HCLTECH.NS", "change_pct": -1.43, "price": 1165.80},
            {"symbol": "TECHM.NS", "change_pct": -1.32, "price": 1087.65},
            {"symbol": "COALINDIA.NS", "change_pct": -1.21, "price": 243.50},
            {"symbol": "IOC.NS", "change_pct": -1.10, "price": 121.85},
            {"symbol": "NTPC.NS", "change_pct": -0.95, "price": 176.35},
            {"symbol": "BPCL.NS", "change_pct": -0.87, "price": 354.70}
        ][:limit]
    
    def get_volume_shockers(self, limit=10):
        """Get stocks with unusual volume"""
        # Simulated data
        return [
            {"symbol": "RELIANCE.NS", "volume_change": 178.5, "volume": 12456789},
            {"symbol": "TATAMOTORS.NS", "volume_change": 145.2, "volume": 8765432},
            {"symbol": "INFY.NS", "volume_change": 132.7, "volume": 6543210},
            {"symbol": "ZOMATO.NS", "volume_change": 128.3, "volume": 9876543},
            {"symbol": "IRCTC.NS", "volume_change": 124.5, "volume": 5432109},
            {"symbol": "SBIN.NS", "volume_change": 118.9, "volume": 7654321},
            {"symbol": "ADANIENT.NS", "volume_change": 116.4, "volume": 3456789},
            {"symbol": "ITC.NS", "volume_change": 112.8, "volume": 8901234},
            {"symbol": "HDFCBANK.NS", "volume_change": 109.3, "volume": 4321098},
            {"symbol": "WIPRO.NS", "volume_change": 107.6, "volume": 3210987}
        ][:limit]
    
    def get_price_shockers(self, limit=10):
        """Get stocks with unusual price movements"""
        # Simulated data
        return [
            {"symbol": "NYKAA.NS", "price_change": 12.6, "price": 176.50},
            {"symbol": "PAYTM.NS", "price_change": 10.8, "price": 543.25},
            {"symbol": "POLICYBZR.NS", "price_change": 9.5, "price": 654.30},
            {"symbol": "DELHIVERY.NS", "price_change": 8.7, "price": 345.75},
            {"symbol": "PNB.NS", "price_change": -8.5, "price": 43.20},
            {"symbol": "YESBANK.NS", "price_change": -7.9, "price": 15.45},
            {"symbol": "ADANIPOWER.NS", "price_change": 7.6, "price": 321.85},
            {"symbol": "SUZLON.NS", "price_change": 7.4, "price": 21.35},
            {"symbol": "ZEEL.NS", "price_change": -7.2, "price": 234.55},
            {"symbol": "IDEA.NS", "price_change": -6.8, "price": 8.75}
        ][:limit]
    
    def get_symbols(self):
        """Get list of available symbols"""
        return self.default_symbols

    def get_market_indices(self):
        """Get market indices data"""
        # Simulate data for now
        return [
            {'name': 'NIFTY 50', 'last': 19200, 'change': 0.75},
            {'name': 'SENSEX', 'last': 64500, 'change': 0.82},
            {'name': 'NIFTY BANK', 'last': 43200, 'change': 0.65},
        ]

    def get_all_symbols(self):
        """Get list of all NSE symbols"""
        # This is a placeholder - implement with actual NSE symbols
        return [
            "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
            "HINDUNILVR", "ITC", "SBIN", "BHARTIARTL", "KOTAKBANK"
        ]

    @staticmethod
    def get_stock_data(symbol, interval='5m', start_date=None, end_date=None):
        """Fetch stock data with dynamic period calculation"""
        try:
            # Add .NS suffix if not present
            if not symbol.endswith('.NS'):
                symbol = f"{symbol}.NS"

            # Define interval mappings and their corresponding periods
            # Based on Yahoo Finance's valid interval/period combinations
            interval_periods = {
                '1m': '7d',      # 1 minute data - last 7 days
                '2m': '60d',     # 2 minute data - last 60 days
                '5m': '60d',     # 5 minute data - last 60 days
                '15m': '60d',    # 15 minute data - last 60 days
                '30m': '60d',    # 30 minute data - last 60 days
                '60m': '730d',   # 1 hour data - last 730 days (2 years)
                '90m': '60d',    # 90 minute data - last 60 days
                '1h': '730d',    # 1 hour data - last 730 days
                '1d': 'max',     # Daily data - maximum available
                '5d': 'max',     # 5 day data - maximum available
                '1wk': 'max',    # Weekly data - maximum available
                '1mo': 'max',    # Monthly data - maximum available
                '3mo': 'max'     # 3 month data - maximum available
            }

            ticker = yf.Ticker(symbol)
            
            # Use period-based fetching instead of date range
            period = interval_periods.get(interval, '60d')
            hist = ticker.history(period=period, interval=interval)
            
            if hist.empty:
                print(f"No data returned for {symbol}")
                return None

            # Limit to last 120 candles if we have more
            if len(hist) > 120:
                hist = hist.tail(120)

            return hist

        except Exception as e:
            print(f"Error fetching data for {symbol}: {str(e)}")
            return None

    @staticmethod
    def get_symbol_list():
        """Get list of available NSE symbols"""
        # Common NSE stocks (you can expand this list)
        nse_symbols = [
            # NIFTY 50 stocks
            'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
            'HINDUNILVR', 'ITC', 'SBIN', 'BHARTIARTL', 'HDFC',
            'KOTAKBANK', 'BAJFINANCE', 'LICI', 'HCLTECH', 'AXISBANK',
            'ASIANPAINT', 'MARUTI', 'WIPRO', 'SUNPHARMA', 'TITAN',
            'ULTRACEMCO', 'BAJAJFINSV', 'NESTLEIND', 'TATAMOTORS', 'POWERGRID',
            'ADANIENT', 'LTIM', 'NTPC', 'ADANIPORTS', 'JSWSTEEL',
            'TATASTEEL', 'GRASIM', 'DRREDDY', 'COALINDIA', 'HINDALCO',
            'M&M', 'TECHM', 'APOLLOHOSP', 'BRITANNIA', 'CIPLA',
            'BAJAJ-AUTO', 'INDUSINDBK', 'EICHERMOT', 'DIVISLAB', 'TATACONSUM',
            'SBILIFE', 'UPL', 'HEROMOTOCO', 'BPCL', 'HINDUNILVR',
            
            # Additional large & mid-cap stocks
            'ZOMATO', 'PAYTM', 'NYKAA', 'PNB', 'BANKBARODA',
            'IDEA', 'YESBANK', 'SUZLON', 'IRCTC', 'POLICYBZR',
            'TATAPOWER', 'VEDL', 'DLF', 'JINDALSTEL', 'SAIL',
            'ONGC', 'IOC', 'RECLTD', 'PFC', 'NMDC',
            'ASHOKLEY', 'MOTHERSON', 'HAVELLS', 'DABUR', 'MARICO',
            'GODREJCP', 'PIDILITIND', 'SIEMENS', 'ABB', 'BHEL',
            'ADANIPOWER', 'ADANIGREEN', 'TATACOMM', 'MCDOWELL-N', 'BIOCON',
            'LUPIN', 'AUROPHARMA', 'GLENMARK', 'TORNTPHARM', 'CADILAHC'
        ]
        return [f"{symbol}.NS" for symbol in nse_symbols]

    @staticmethod
    def is_market_open():
        """Check if NSE market is currently open"""
        ist = pytz.timezone('Asia/Kolkata')
        now = datetime.now(ist)
        
        # NSE market hours: 9:15 AM to 3:30 PM IST, Monday to Friday
        if now.weekday() >= 5:  # Saturday or Sunday
            return False
        
        market_start = now.replace(hour=9, minute=15, second=0, microsecond=0)
        market_end = now.replace(hour=15, minute=30, second=0, microsecond=0)
        
        return market_start <= now <= market_end 