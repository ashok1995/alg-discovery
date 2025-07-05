"""
Real-time Data Service
=====================

Handles stock data fetching from multiple sources with caching and real-time updates.
Provides unified interface for market data across the trading system.
"""

import asyncio
import logging
import time
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import aiohttp
import pandas as pd
import yfinance as yf
from dataclasses import dataclass
import threading
from concurrent.futures import ThreadPoolExecutor

from api.models.stock_models import (
    StockData, StockPrice, TechnicalIndicators, LiveDataUpdate
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DataSource:
    """Data source configuration."""
    name: str
    priority: int
    base_url: str
    rate_limit: float  # requests per second
    timeout: int = 30

class DataCache:
    """In-memory cache for stock data with TTL."""
    
    def __init__(self, default_ttl: int = 60):
        self.cache: Dict[str, Dict] = {}
        self.default_ttl = default_ttl
        self._lock = threading.Lock()
    
    def get(self, key: str) -> Optional[Dict]:
        """Get cached data if not expired."""
        with self._lock:
            if key in self.cache:
                data, timestamp, ttl = self.cache[key].values()
                if time.time() - timestamp < ttl:
                    return data
                else:
                    del self.cache[key]
        return None
    
    def set(self, key: str, data: Dict, ttl: Optional[int] = None) -> None:
        """Cache data with TTL."""
        ttl = ttl or self.default_ttl
        with self._lock:
            self.cache[key] = {
                'data': data,
                'timestamp': time.time(),
                'ttl': ttl
            }
    
    def invalidate(self, pattern: Optional[str] = None) -> None:
        """Invalidate cache entries matching pattern."""
        with self._lock:
            if pattern is None:
                self.cache.clear()
            else:
                keys_to_remove = [k for k in self.cache if pattern in k]
                for key in keys_to_remove:
                    del self.cache[key]
    
    def size(self) -> int:
        """Get cache size."""
        with self._lock:
            return len(self.cache)

class RealTimeDataService:
    """Real-time stock data service with multiple sources."""
    
    def __init__(self):
        self.cache = DataCache(default_ttl=30)  # 30 second cache for real-time data
        self.price_cache = DataCache(default_ttl=5)  # 5 second cache for prices
        
        # Data sources in priority order
        self.data_sources = [
            DataSource("yfinance", 1, "", 1.0),  # 1 request per second
            DataSource("alpha_vantage", 2, "https://www.alphavantage.co/query", 5.0),
            DataSource("chartink", 3, "https://chartink.com/screener/process", 0.5),
        ]
        
        self.session: Optional[aiohttp.ClientSession] = None
        self.executor = ThreadPoolExecutor(max_workers=10)
        self.last_request_time = {}
        self.is_running = False
        
        # Rate limiting
        self.rate_limiters = {
            source.name: {"last_request": 0, "limit": source.rate_limit} 
            for source in self.data_sources
        }
    
    async def __aenter__(self):
        """Async context manager entry."""
        self.session = aiohttp.ClientSession()
        self.is_running = True
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        self.is_running = False
        if self.session:
            await self.session.close()
        self.executor.shutdown(wait=True)
    
    def _check_rate_limit(self, source_name: str) -> bool:
        """Check if request is within rate limit."""
        limiter = self.rate_limiters[source_name]
        current_time = time.time()
        time_since_last = current_time - limiter["last_request"]
        min_interval = 1.0 / limiter["limit"]
        
        if time_since_last >= min_interval:
            limiter["last_request"] = current_time
            return True
        return False
    
    async def _wait_for_rate_limit(self, source_name: str) -> None:
        """Wait for rate limit to reset."""
        limiter = self.rate_limiters[source_name]
        current_time = time.time()
        time_since_last = current_time - limiter["last_request"]
        min_interval = 1.0 / limiter["limit"]
        
        if time_since_last < min_interval:
            wait_time = min_interval - time_since_last
            await asyncio.sleep(wait_time)
            limiter["last_request"] = time.time()
    
    async def get_stock_data(self, symbol: str, use_cache: bool = True) -> Optional[StockData]:
        """Get comprehensive stock data from best available source."""
        cache_key = f"stock_data_{symbol}"
        
        # Check cache first
        if use_cache:
            cached_data = self.cache.get(cache_key)
            if cached_data:
                return StockData(**cached_data)
        
        # Try data sources in priority order
        for source in self.data_sources:
            try:
                if not self._check_rate_limit(source.name):
                    await self._wait_for_rate_limit(source.name)
                
                stock_data = await self._fetch_from_source(symbol, source)
                if stock_data:
                    # Cache successful response
                    self.cache.set(cache_key, stock_data.dict())
                    return stock_data
                    
            except Exception as e:
                logger.warning(f"Failed to fetch data from {source.name}: {str(e)}")
                continue
        
        logger.error(f"Failed to fetch data for {symbol} from all sources")
        return None
    
    async def _fetch_from_source(self, symbol: str, source: DataSource) -> Optional[StockData]:
        """Fetch data from specific source."""
        if source.name == "yfinance":
            return await self._fetch_from_yfinance(symbol)
        elif source.name == "alpha_vantage":
            return await self._fetch_from_alpha_vantage(symbol)
        elif source.name == "chartink":
            return await self._fetch_from_chartink(symbol)
        return None
    
    async def _fetch_from_yfinance(self, symbol: str) -> Optional[StockData]:
        """Fetch data from Yahoo Finance using yfinance."""
        try:
            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            ticker = await loop.run_in_executor(self.executor, yf.Ticker, symbol)
            info = await loop.run_in_executor(self.executor, lambda: ticker.info)
            history = await loop.run_in_executor(
                self.executor, 
                lambda: ticker.history(period="5d", interval="1m")
            )
            
            if history.empty or not info:
                return None
            
            current_price = float(history['Close'].iloc[-1])
            prev_close = float(history['Close'].iloc[-2]) if len(history) > 1 else current_price
            change = current_price - prev_close
            change_percent = (change / prev_close * 100) if prev_close != 0 else 0
            
            # Convert history to StockPrice objects
            prices = []
            for idx, row in history.iterrows():
                price = StockPrice(
                    timestamp=idx.to_pydatetime(),
                    open=float(row['Open']),
                    high=float(row['High']),
                    low=float(row['Low']),
                    close=float(row['Close']),
                    volume=int(row['Volume'])
                )
                prices.append(price)
            
            return StockData(
                symbol=symbol,
                name=info.get('longName', symbol),
                current_price=current_price,
                change=change,
                change_percent=change_percent,
                volume=int(history['Volume'].iloc[-1]),
                market_cap=info.get('marketCap'),
                pe_ratio=info.get('trailingPE'),
                last_updated=datetime.now(),
                prices=prices
            )
            
        except Exception as e:
            logger.error(f"YFinance error for {symbol}: {str(e)}")
            return None
    
    async def _fetch_from_alpha_vantage(self, symbol: str) -> Optional[StockData]:
        """Fetch data from Alpha Vantage API."""
        # This is a placeholder - would need actual API key and implementation
        logger.info(f"Alpha Vantage source not implemented for {symbol}")
        return None
    
    async def _fetch_from_chartink(self, symbol: str) -> Optional[StockData]:
        """Fetch data from Chartink."""
        # This is a placeholder - would need actual implementation
        logger.info(f"Chartink source not implemented for {symbol}")
        return None
    
    async def get_live_price(self, symbol: str) -> Optional[LiveDataUpdate]:
        """Get real-time price update."""
        cache_key = f"live_price_{symbol}"
        
        # Check price cache (very short TTL)
        cached_price = self.price_cache.get(cache_key)
        if cached_price:
            return LiveDataUpdate(**cached_price)
        
        # Fetch fresh data
        stock_data = await self.get_stock_data(symbol, use_cache=False)
        if stock_data:
            live_update = LiveDataUpdate(
                symbol=symbol,
                price=stock_data.current_price,
                change=stock_data.change,
                change_percent=stock_data.change_percent,
                volume=stock_data.volume,
                timestamp=datetime.now()
            )
            
            # Cache for very short time
            self.price_cache.set(cache_key, live_update.dict(), ttl=5)
            return live_update
        
        return None
    
    async def get_multiple_stocks(self, symbols: List[str], use_cache: bool = True) -> Dict[str, Optional[StockData]]:
        """Get data for multiple stocks concurrently."""
        tasks = [self.get_stock_data(symbol, use_cache) for symbol in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        stock_data_map = {}
        for symbol, result in zip(symbols, results):
            if isinstance(result, Exception):
                logger.error(f"Error fetching {symbol}: {str(result)}")
                stock_data_map[symbol] = None
            else:
                stock_data_map[symbol] = result
        
        return stock_data_map
    
    async def get_technical_indicators(self, symbol: str, period: str = "1mo") -> Optional[TechnicalIndicators]:
        """Calculate technical indicators for a stock."""
        cache_key = f"indicators_{symbol}_{period}"
        
        # Check cache
        cached_indicators = self.cache.get(cache_key)
        if cached_indicators:
            return TechnicalIndicators(**cached_indicators)
        
        try:
            # Fetch historical data
            loop = asyncio.get_event_loop()
            ticker = await loop.run_in_executor(self.executor, yf.Ticker, symbol)
            history = await loop.run_in_executor(
                self.executor,
                lambda: ticker.history(period=period, interval="1d")
            )
            
            if history.empty:
                return None
            
            # Calculate indicators
            indicators = await loop.run_in_executor(
                self.executor,
                self._calculate_indicators,
                history
            )
            
            # Cache results
            self.cache.set(cache_key, indicators.dict(), ttl=300)  # 5 minute cache
            return indicators
            
        except Exception as e:
            logger.error(f"Error calculating indicators for {symbol}: {str(e)}")
            return None
    
    def _calculate_indicators(self, df: pd.DataFrame) -> TechnicalIndicators:
        """Calculate technical indicators from price data."""
        try:
            # RSI calculation
            def calculate_rsi(prices, period=14):
                delta = prices.diff()
                gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
                loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
                rs = gain / loss
                return 100 - (100 / (1 + rs))
            
            # Calculate indicators
            close_prices = df['Close']
            rsi = calculate_rsi(close_prices).iloc[-1] if len(df) >= 14 else None
            
            # Moving averages
            sma_20 = close_prices.rolling(window=20).mean().iloc[-1] if len(df) >= 20 else None
            sma_50 = close_prices.rolling(window=50).mean().iloc[-1] if len(df) >= 50 else None
            ema_12 = close_prices.ewm(span=12).mean().iloc[-1] if len(df) >= 12 else None
            ema_26 = close_prices.ewm(span=26).mean().iloc[-1] if len(df) >= 26 else None
            
            # MACD
            macd = None
            macd_signal = None
            if ema_12 is not None and ema_26 is not None:
                macd_line = close_prices.ewm(span=12).mean() - close_prices.ewm(span=26).mean()
                macd = macd_line.iloc[-1]
                macd_signal = macd_line.ewm(span=9).mean().iloc[-1]
            
            # Bollinger Bands
            if sma_20 is not None:
                rolling_std = close_prices.rolling(window=20).std().iloc[-1]
                bollinger_upper = sma_20 + (rolling_std * 2)
                bollinger_lower = sma_20 - (rolling_std * 2)
            else:
                bollinger_upper = None
                bollinger_lower = None
            
            # Volume SMA
            volume_sma = df['Volume'].rolling(window=20).mean().iloc[-1] if len(df) >= 20 else None
            
            return TechnicalIndicators(
                rsi=rsi,
                macd=macd,
                macd_signal=macd_signal,
                bollinger_upper=bollinger_upper,
                bollinger_lower=bollinger_lower,
                sma_20=sma_20,
                sma_50=sma_50,
                ema_12=ema_12,
                ema_26=ema_26,
                volume_sma=volume_sma
            )
            
        except Exception as e:
            logger.error(f"Error in indicator calculation: {str(e)}")
            return TechnicalIndicators()
    
    async def get_market_status(self) -> Dict[str, any]:
        """Get market status and trading hours."""
        try:
            # Use a major index to determine market status
            nifty_data = await self.get_stock_data("^NSEI", use_cache=True)
            
            current_time = datetime.now()
            market_open = current_time.replace(hour=9, minute=15, second=0, microsecond=0)
            market_close = current_time.replace(hour=15, minute=30, second=0, microsecond=0)
            
            is_market_hours = market_open <= current_time <= market_close
            is_weekday = current_time.weekday() < 5  # Monday = 0, Friday = 4
            
            return {
                "is_open": is_market_hours and is_weekday,
                "market_open": market_open.isoformat(),
                "market_close": market_close.isoformat(),
                "current_time": current_time.isoformat(),
                "is_weekend": not is_weekday,
                "nifty_price": nifty_data.current_price if nifty_data else None,
                "cache_size": self.cache.size(),
                "price_cache_size": self.price_cache.size()
            }
            
        except Exception as e:
            logger.error(f"Error getting market status: {str(e)}")
            return {
                "is_open": False,
                "error": str(e),
                "cache_size": self.cache.size()
            }
    
    async def start_real_time_updates(self, symbols: List[str], interval: int = 10) -> None:
        """Start background task for real-time price updates."""
        logger.info(f"Starting real-time updates for {len(symbols)} symbols")
        
        async def update_loop():
            while self.is_running:
                try:
                    # Update prices for all symbols
                    for symbol in symbols:
                        if not self.is_running:
                            break
                        await self.get_live_price(symbol)
                    
                    await asyncio.sleep(interval)
                    
                except Exception as e:
                    logger.error(f"Error in real-time update loop: {str(e)}")
                    await asyncio.sleep(interval)
        
        # Start the update loop as a background task
        asyncio.create_task(update_loop())
    
    def get_cache_stats(self) -> Dict[str, any]:
        """Get cache statistics."""
        return {
            "data_cache_size": self.cache.size(),
            "price_cache_size": self.price_cache.size(),
            "data_sources": [source.name for source in self.data_sources],
            "rate_limiters": {
                name: {
                    "limit": limiter["limit"],
                    "time_since_last": time.time() - limiter["last_request"]
                }
                for name, limiter in self.rate_limiters.items()
            }
        }
    
    async def health_check(self) -> Dict[str, any]:
        """Health check for the data service."""
        try:
            # Test with a simple stock fetch
            test_symbol = "TCS.NS"  # TCS on NSE
            start_time = time.time()
            test_data = await self.get_stock_data(test_symbol, use_cache=False)
            fetch_time = time.time() - start_time
            
            return {
                "status": "healthy" if test_data else "degraded",
                "test_symbol": test_symbol,
                "fetch_time_seconds": round(fetch_time, 2),
                "cache_stats": self.get_cache_stats(),
                "session_active": self.session is not None and not self.session.closed,
                "is_running": self.is_running
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "cache_stats": self.get_cache_stats()
            }
    
    async def get_historical_data(self, symbol: str, period: str = "1mo", interval: str = "1d") -> Optional[Dict]:
        """Get historical stock data from Yahoo Finance."""
        cache_key = f"historical_{symbol}_{period}_{interval}"
        
        # Check cache first
        cached_data = self.cache.get(cache_key)
        if cached_data:
            return cached_data
        
        try:
            loop = asyncio.get_event_loop()
            ticker = await loop.run_in_executor(self.executor, yf.Ticker, symbol)
            history = await loop.run_in_executor(
                self.executor,
                lambda: ticker.history(period=period, interval=interval)
            )
            
            if history.empty:
                return None
            
            # Convert to dictionary format
            historical_data = []
            for index, row in history.iterrows():
                historical_data.append({
                    "timestamp": index.isoformat(),
                    "open": float(row['Open']),
                    "high": float(row['High']),
                    "low": float(row['Low']),
                    "close": float(row['Close']),
                    "volume": int(row['Volume']) if pd.notna(row['Volume']) else 0
                })
            
            result = {
                "symbol": symbol,
                "period": period,
                "interval": interval,
                "data": historical_data,
                "count": len(historical_data)
            }
            
            # Cache results (longer TTL for historical data)
            self.cache.set(cache_key, result, ttl=1800)  # 30 minute cache
            return result
            
        except Exception as e:
            logger.error(f"Error fetching historical data for {symbol}: {str(e)}")
            return None
    
    async def get_yahoo_finance_data(self, symbol: str, period: str = "1mo", interval: str = "1d", 
                                   include_info: bool = True) -> Optional[Dict]:
        """Get comprehensive Yahoo Finance data including price, history, and company info."""
        try:
            loop = asyncio.get_event_loop()
            ticker = await loop.run_in_executor(self.executor, yf.Ticker, symbol)
            
            # Get current info
            info = None
            if include_info:
                try:
                    info = await loop.run_in_executor(self.executor, lambda: ticker.info)
                except Exception as e:
                    logger.warning(f"Could not fetch info for {symbol}: {str(e)}")
                    info = {}
            
            # Get historical data
            history = await loop.run_in_executor(
                self.executor,
                lambda: ticker.history(period=period, interval=interval)
            )
            
            if history.empty:
                return None
            
            # Current price data
            current_data = history.iloc[-1]
            prev_data = history.iloc[-2] if len(history) > 1 else current_data
            
            current_price = float(current_data['Close'])
            prev_close = float(prev_data['Close'])
            change = current_price - prev_close
            change_percent = (change / prev_close) * 100 if prev_close != 0 else 0
            
            # Convert historical data to list
            historical_data = []
            for index, row in history.iterrows():
                historical_data.append({
                    "timestamp": index.isoformat(),
                    "open": float(row['Open']),
                    "high": float(row['High']),
                    "low": float(row['Low']),
                    "close": float(row['Close']),
                    "volume": int(row['Volume']) if pd.notna(row['Volume']) else 0
                })
            
            # Build comprehensive response
            result = {
                "symbol": symbol,
                "name": info.get('longName', info.get('shortName', symbol)) if info else symbol,
                "current_price": current_price,
                "previous_close": prev_close,
                "change": change,
                "change_percent": change_percent,
                "volume": int(current_data['Volume']) if pd.notna(current_data['Volume']) else 0,
                "currency": info.get('currency', 'INR') if info else 'INR',
                "market_cap": info.get('marketCap') if info else None,
                "pe_ratio": info.get('trailingPE') if info else None,
                "day_high": float(current_data['High']),
                "day_low": float(current_data['Low']),
                "fifty_two_week_high": info.get('fiftyTwoWeekHigh') if info else None,
                "fifty_two_week_low": info.get('fiftyTwoWeekLow') if info else None,
                "sector": info.get('sector') if info else None,
                "industry": info.get('industry') if info else None,
                "historical_data": {
                    "period": period,
                    "interval": interval,
                    "data": historical_data,
                    "count": len(historical_data)
                },
                "last_updated": datetime.now().isoformat()
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error fetching Yahoo Finance data for {symbol}: {str(e)}")
            return None

# Global instance
data_service = RealTimeDataService() 