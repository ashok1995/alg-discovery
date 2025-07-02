"""
Market Data Collection Cron Jobs
Intelligent market data fetching with caching and fallback mechanisms
"""

import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging
from core.background.cron_jobs.job_scheduler import (
    JobDefinition, JobPriority, add_cron_job, add_interval_job
)
from core.database.config import db_manager, get_db, get_mongo
from core.database.cache.redis_manager import cache_manager
import yfinance as yf
import requests
import pandas as pd

logger = logging.getLogger(__name__)

class MarketDataCollector:
    """Market data collection with intelligent caching"""
    
    def __init__(self):
        self.cache_manager = cache_manager
        self.market_hours = db_manager.market_hours
        
        # Default stock symbols
        self.nse_symbols = [
            "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
            "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
            "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS", "BAJFINANCE.NS",
            "HCLTECH.NS", "WIPRO.NS", "ULTRACEMCO.NS", "TITAN.NS", "NESTLEIND.NS"
        ]
        
        self.indices = ["^NSEI", "^NSEBANK", "^CNXIT"]
    
    async def fetch_real_time_data(self) -> Dict[str, Any]:
        """Fetch real-time market data"""
        try:
            logger.info("Starting real-time data collection")
            
            results = {
                'stocks': {},
                'indices': {},
                'timestamp': datetime.utcnow().isoformat(),
                'market_open': self.market_hours.is_market_open()
            }
            
            # Fetch stock data
            stock_data = await self._fetch_stock_data_batch(self.nse_symbols)
            results['stocks'] = stock_data
            
            # Fetch index data
            index_data = await self._fetch_stock_data_batch(self.indices)
            results['indices'] = index_data
            
            # Cache the results with market-aware TTL
            cache_key = f"realtime_data_{datetime.utcnow().strftime('%Y%m%d_%H%M')}"
            self.cache_manager.set(
                cache_key, 
                results, 
                prefix="market_data"
            )
            
            # Also update latest data cache
            self.cache_manager.set("latest_market_data", results, prefix="market_data")
            
            # Store in PostgreSQL for historical analysis
            await self._store_in_database(results)
            
            logger.info(f"Real-time data collection completed: {len(stock_data)} stocks, {len(index_data)} indices")
            return results
            
        except Exception as e:
            logger.error(f"Real-time data collection failed: {e}")
            
            # Try to get cached data as fallback
            cached_data = self.cache_manager.get("latest_market_data", prefix="market_data")
            if cached_data:
                logger.info("Returning cached data as fallback")
                return cached_data
            
            raise e
    
    async def _fetch_stock_data_batch(self, symbols: List[str]) -> Dict[str, Any]:
        """Fetch stock data in batches for better performance"""
        results = {}
        batch_size = 10
        
        for i in range(0, len(symbols), batch_size):
            batch = symbols[i:i + batch_size]
            
            try:
                # Use yfinance for reliable data
                tickers = yf.Tickers(' '.join(batch))
                
                for symbol in batch:
                    try:
                        ticker = tickers.tickers[symbol]
                        info = ticker.info
                        hist = ticker.history(period="1d", interval="1m")
                        
                        if not hist.empty:
                            latest = hist.iloc[-1]
                            results[symbol] = {
                                'symbol': symbol,
                                'price': float(latest['Close']),
                                'open': float(latest['Open']),
                                'high': float(latest['High']),
                                'low': float(latest['Low']),
                                'volume': int(latest['Volume']),
                                'timestamp': latest.name.isoformat(),
                                'change': float(latest['Close'] - latest['Open']),
                                'change_percent': ((latest['Close'] - latest['Open']) / latest['Open'] * 100),
                                'market_cap': info.get('marketCap', 0),
                                'pe_ratio': info.get('trailingPE', 0)
                            }
                    except Exception as e:
                        logger.warning(f"Failed to fetch data for {symbol}: {e}")
                        # Set error data
                        results[symbol] = {
                            'symbol': symbol,
                            'error': str(e),
                            'timestamp': datetime.utcnow().isoformat()
                        }
                
                # Small delay between batches to avoid rate limiting
                await asyncio.sleep(0.5)
                
            except Exception as e:
                logger.error(f"Batch fetch failed for symbols {batch}: {e}")
        
        return results
    
    async def _store_in_database(self, data: Dict[str, Any]):
        """Store market data in PostgreSQL"""
        try:
            # This would normally use proper SQLAlchemy models
            # For now, we'll store in MongoDB as fallback
            mongo_client = db_manager.get_mongo_client()
            db = mongo_client[db_manager.config.mongo_db]
            collection = db.market_data
            
            # Prepare documents for MongoDB
            documents = []
            
            # Store stock data
            for symbol, stock_data in data['stocks'].items():
                if 'error' not in stock_data:
                    doc = {
                        'type': 'stock',
                        'symbol': symbol,
                        'data': stock_data,
                        'timestamp': datetime.utcnow(),
                        'market_session': data['timestamp']
                    }
                    documents.append(doc)
            
            # Store index data
            for symbol, index_data in data['indices'].items():
                if 'error' not in index_data:
                    doc = {
                        'type': 'index',
                        'symbol': symbol,
                        'data': index_data,
                        'timestamp': datetime.utcnow(),
                        'market_session': data['timestamp']
                    }
                    documents.append(doc)
            
            if documents:
                collection.insert_many(documents)
                logger.debug(f"Stored {len(documents)} market data records in MongoDB")
                
        except Exception as e:
            logger.error(f"Failed to store market data in database: {e}")
    
    async def fetch_historical_data(self) -> Dict[str, Any]:
        """Fetch historical data for analysis"""
        try:
            logger.info("Starting historical data collection")
            
            results = {}
            
            # Fetch 1 year of data for selected stocks
            key_symbols = self.nse_symbols[:10]  # Top 10 stocks
            
            for symbol in key_symbols:
                try:
                    ticker = yf.Ticker(symbol)
                    hist = ticker.history(period="1y", interval="1d")
                    
                    if not hist.empty:
                        # Convert to dict for JSON serialization
                        hist_dict = {
                            'dates': [date.isoformat() for date in hist.index],
                            'open': hist['Open'].tolist(),
                            'high': hist['High'].tolist(),
                            'low': hist['Low'].tolist(),
                            'close': hist['Close'].tolist(),
                            'volume': hist['Volume'].tolist()
                        }
                        
                        results[symbol] = hist_dict
                        
                        # Cache individual stock history
                        cache_key = f"historical_{symbol}_1y"
                        self.cache_manager.set(
                            cache_key,
                            hist_dict,
                            ttl=86400,  # 24 hours TTL for historical data
                            prefix="historical_data"
                        )
                
                except Exception as e:
                    logger.warning(f"Failed to fetch historical data for {symbol}: {e}")
                
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.2)
            
            # Cache complete historical dataset
            self.cache_manager.set(
                "complete_historical_data",
                {
                    'data': results,
                    'timestamp': datetime.utcnow().isoformat(),
                    'symbols': list(results.keys())
                },
                ttl=86400,  # 24 hours
                prefix="historical_data"
            )
            
            logger.info(f"Historical data collection completed for {len(results)} symbols")
            return results
            
        except Exception as e:
            logger.error(f"Historical data collection failed: {e}")
            raise e
    
    def cleanup_old_data(self) -> Dict[str, Any]:
        """Clean up old cached data and database records"""
        try:
            logger.info("Starting data cleanup")
            
            results = {
                'cache_cleaned': 0,
                'db_cleaned': 0,
                'errors': []
            }
            
            # Clean up old cache entries
            try:
                # Remove cache entries older than 7 days
                pattern = "market_data:realtime_data_*"
                cleaned = self.cache_manager.invalidate_pattern(pattern)
                results['cache_cleaned'] = cleaned
                
            except Exception as e:
                error_msg = f"Cache cleanup failed: {e}"
                logger.error(error_msg)
                results['errors'].append(error_msg)
            
            # Clean up old database records
            try:
                mongo_client = db_manager.get_mongo_client()
                db = mongo_client[db_manager.config.mongo_db]
                collection = db.market_data
                
                # Remove records older than 30 days
                cutoff_date = datetime.utcnow() - timedelta(days=30)
                delete_result = collection.delete_many({
                    'timestamp': {'$lt': cutoff_date}
                })
                
                results['db_cleaned'] = delete_result.deleted_count
                
            except Exception as e:
                error_msg = f"Database cleanup failed: {e}"
                logger.error(error_msg)
                results['errors'].append(error_msg)
            
            logger.info(f"Data cleanup completed: {results['cache_cleaned']} cache entries, {results['db_cleaned']} DB records cleaned")
            return results
            
        except Exception as e:
            logger.error(f"Data cleanup failed: {e}")
            return {'error': str(e)}
    
    def warm_cache(self) -> Dict[str, Any]:
        """Pre-warm cache with frequently accessed data"""
        try:
            logger.info("Starting cache warming")
            
            results = {
                'warmed_keys': [],
                'failed_keys': [],
                'total_time': 0
            }
            
            start_time = datetime.utcnow()
            
            # Warm cache with stock lists
            try:
                self.cache_manager.set(
                    "nse_symbols",
                    self.nse_symbols,
                    ttl=86400,
                    prefix="market_config"
                )
                results['warmed_keys'].append('nse_symbols')
            except Exception as e:
                results['failed_keys'].append(f'nse_symbols: {e}')
            
            # Warm cache with market status
            try:
                market_status = {
                    'is_open': self.market_hours.is_market_open(),
                    'next_open': self.market_hours.time_until_market_open(),
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                self.cache_manager.set(
                    "market_status",
                    market_status,
                    ttl=300,  # 5 minutes
                    prefix="market_config"
                )
                results['warmed_keys'].append('market_status')
            except Exception as e:
                results['failed_keys'].append(f'market_status: {e}')
            
            end_time = datetime.utcnow()
            results['total_time'] = (end_time - start_time).total_seconds()
            
            logger.info(f"Cache warming completed: {len(results['warmed_keys'])} keys warmed, {len(results['failed_keys'])} failed")
            return results
            
        except Exception as e:
            logger.error(f"Cache warming failed: {e}")
            return {'error': str(e)}


# Initialize collector
market_data_collector = MarketDataCollector()

# Job functions
async def collect_realtime_data():
    """Job function for real-time data collection"""
    return await market_data_collector.fetch_real_time_data()

async def collect_historical_data():
    """Job function for historical data collection"""
    return await market_data_collector.fetch_historical_data()

def cleanup_old_data():
    """Job function for data cleanup"""
    return market_data_collector.cleanup_old_data()

def warm_cache():
    """Job function for cache warming"""
    return market_data_collector.warm_cache()

def setup_market_data_jobs():
    """Setup all market data related cron jobs"""
    
    logger.info("Setting up market data cron jobs")
    
    # Real-time data collection - every 1 minute during market hours
    add_interval_job(
        job_id="realtime_data_collection",
        name="Real-time Market Data Collection",
        func=collect_realtime_data,
        minutes=1
    )
    
    # Historical data collection - daily at 4 PM (after market close)
    add_cron_job(
        job_id="historical_data_collection",
        name="Historical Data Collection",
        func=collect_historical_data,
        hour=16,
        minute=0
    )
    
    # Data cleanup - daily at 2 AM
    add_cron_job(
        job_id="data_cleanup",
        name="Market Data Cleanup",
        func=cleanup_old_data,
        hour=2,
        minute=0
    )
    
    # Cache warming - every 6 hours
    add_interval_job(
        job_id="cache_warming",
        name="Cache Warming",
        func=warm_cache,
        hours=6
    )
    
    # Market opening cache warm - 15 minutes before market open
    add_cron_job(
        job_id="pre_market_cache_warm",
        name="Pre-market Cache Warming",
        func=warm_cache,
        hour=9,
        minute=0,  # 9:00 AM (15 minutes before market open)
        day_of_week='mon-fri'
    )
    
    logger.info("Market data cron jobs setup completed") 