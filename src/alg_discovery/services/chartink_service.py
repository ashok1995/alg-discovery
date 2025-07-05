"""
Real Chartink Service for Long-term Investment Analysis
Integrates with the existing chartink.py functionality
"""

import sys
import os
import pandas as pd
import logging
from typing import Dict, List, Any, Optional
import asyncio
import time

# Get the project root directory (go up from api/services to project root)
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
patterns_path = os.path.join(project_root, 'patterns')

# Add the patterns directory to the path
if patterns_path not in sys.path:
    sys.path.insert(0, patterns_path)

try:
    from data.chartink import get_chartink_scans, check_chartink_connectivity
    from config.queries import LONG_TERM_QUERIES
    CHARTINK_AVAILABLE = True
    logger = logging.getLogger(__name__)
    logger.info(f"✅ Successfully imported chartink modules from {patterns_path}")
except ImportError as e:
    logging.warning(f"Chartink module not available: {e}")
    logging.warning(f"Tried to import from: {patterns_path}")
    CHARTINK_AVAILABLE = False
    # Define fallback queries if import fails
    LONG_TERM_QUERIES = {
        "Value Investing": (
            "( {cash} ( "
            "latest \"market cap\" > 1000 and "
            "latest \"p/e\" < 20 and "
            "latest \"return on equity\" > 15 and "
            "latest \"debt to equity\" < 0.5 and "
            "latest close > 50 and "
            "latest volume > 10000 "
            ") )"
        ),
        "Growth Investing": (
            "( {cash} ( "
            "latest \"market cap\" > 500 and "
            "latest \"return on equity\" > 20 and "
            "latest \"return on capital employed\" > 18 and "
            "latest \"p/e\" < 25 and "
            "latest close > 100 and "
            "latest volume > 50000 "
            ") )"
        ),
        "Dividend Investing": (
            "( {cash} ( "
            "latest \"market cap\" > 2000 and "
            "latest \"dividend yield\" > 2 and "
            "latest \"p/e\" < 15 and "
            "latest \"return on equity\" > 12 and "
            "latest close > 150 and "
            "latest volume > 25000 "
            ") )"
        )
    }

logger = logging.getLogger(__name__)

class ChartinkService:
    """Real Chartink service for long-term investment analysis"""
    
    def __init__(self):
        self.last_request_time = 0
        self.min_request_interval = 2.0  # 2 seconds between requests
        self.connectivity_checked = False
        self.is_connected = False
        
        # Convert LONG_TERM_QUERIES dict to list format for easier use
        self.long_term_queries = []
        for query_name, query_config in LONG_TERM_QUERIES.items():
            self.long_term_queries.append({
                "name": query_name,
                "query": query_config,
                "description": query_name
            })
        
        # Check connectivity on initialization
        if CHARTINK_AVAILABLE:
            self._check_connectivity()
        
        logger.info(f"✅ Real Chartink service initialized (Available: {CHARTINK_AVAILABLE}, Connected: {self.is_connected})")
        logger.info(f"📊 Loaded {len(self.long_term_queries)} long-term queries: {list(map(lambda q: q['name'], self.long_term_queries))}")

    def _check_connectivity(self):
        """Check Chartink connectivity"""
        try:
            self.is_connected = check_chartink_connectivity()
            self.connectivity_checked = True
            if self.is_connected:
                logger.info("🌐 Chartink connectivity verified")
            else:
                logger.warning("⚠️ Chartink connectivity failed")
        except Exception as e:
            logger.error(f"❌ Error checking Chartink connectivity: {e}")
            self.is_connected = False

    async def _rate_limit(self):
        """Rate limiting to avoid overwhelming Chartink API"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.min_request_interval:
            sleep_time = self.min_request_interval - time_since_last
            logger.debug(f"Rate limiting: sleeping for {sleep_time:.2f}s")
            await asyncio.sleep(sleep_time)
        
        self.last_request_time = time.time()

    def get_stocks_by_filter(self, filter_query: str, trading_theme: str = 'long_term_investment') -> pd.DataFrame:
        """
        Get stocks using Chartink filter query
        
        Args:
            filter_query: Chartink query string
            trading_theme: Trading theme context
            
        Returns:
            DataFrame with stock data
        """
        if not CHARTINK_AVAILABLE:
            logger.warning("📊 Chartink not available, returning empty DataFrame")
            return pd.DataFrame()
        
        if not self.connectivity_checked or not self.is_connected:
            self._check_connectivity()
            
        if not self.is_connected:
            logger.warning("📊 Chartink not connected, returning empty DataFrame")
            return pd.DataFrame()
        
        try:
            logger.info(f"🔍 Fetching stocks for theme: {trading_theme}")
            logger.info(f"📊 Query length: {len(filter_query)} characters")
            
            # Use the existing chartink functionality
            df = get_chartink_scans(filter_query, debug=False, use_cache=True)
            
            if df is not None and not df.empty:
                # Ensure required columns exist
                if 'nsecode' not in df.columns and 'symbol' in df.columns:
                    df['nsecode'] = df['symbol']
                elif 'symbol' not in df.columns and 'nsecode' in df.columns:
                    df['symbol'] = df['nsecode']
                
                # Add trading theme context
                df['trading_theme'] = trading_theme
                df['data_source'] = 'chartink'
                
                logger.info(f"✅ Chartink returned {len(df)} stocks for {trading_theme}")
                return df
            else:
                logger.warning(f"⚠️ No stocks found for query in theme: {trading_theme}")
                return pd.DataFrame()
                
        except Exception as e:
            logger.error(f"❌ Error fetching from Chartink: {e}")
            return pd.DataFrame()

    async def get_stocks_by_query(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get stocks using a specific Chartink query string (async version)
        
        Args:
            query: Chartink query string
            limit: Maximum number of stocks to return
            
        Returns:
            List of stock dictionaries
        """
        await self._rate_limit()
        
        try:
            logger.info(f"🔍 Running custom query (limit: {limit})")
            logger.info(f"📊 Query length: {len(query)} characters")
            
            df = self.get_stocks_by_filter(query, 'custom_query')
            
            if df is not None and not df.empty:
                # Convert DataFrame to list of dictionaries
                stocks = []
                for _, row in df.head(limit).iterrows():
                    stock_data = {
                        'symbol': row.get('nsecode', row.get('symbol', '')),
                        'chartink_score': row.get('per_chg', row.get('per_change', 50)),  # Use percentage change as score
                        'close': row.get('close', 0),
                        'volume': row.get('volume', 0),
                        'per_change': row.get('per_chg', row.get('per_change', 0)),
                        'data_source': 'chartink',
                        'raw_data': row.to_dict()
                    }
                    stocks.append(stock_data)
                
                logger.info(f"✅ Query returned {len(stocks)} stocks")
                return stocks
            else:
                logger.warning("⚠️ Custom query returned no results")
                return []
                
        except Exception as e:
            logger.error(f"❌ Error running custom query: {e}")
            return []

    async def get_stocks_by_theme(self, trading_theme: str = 'long_term_investment', limit: int = 50) -> pd.DataFrame:
        """
        Get stocks for a specific trading theme using predefined queries
        
        Args:
            trading_theme: Trading theme
            limit: Maximum number of stocks to return
            
        Returns:
            DataFrame with stock data
        """
        await self._rate_limit()
        
        if trading_theme == 'long_term_investment':
            # Try each long-term query until we get results
            for i, query_config in enumerate(self.long_term_queries):
                logger.info(f"🎯 Trying {query_config['name']}: {query_config['description']} (Query {i+1}/{len(self.long_term_queries)})")
                
                df = self.get_stocks_by_filter(query_config['query'], trading_theme)
                
                if not df.empty:
                    # Add query metadata
                    df['chartink_filter'] = query_config['name']
                    df['filter_description'] = query_config['description']
                    
                    # Limit results
                    if len(df) > limit:
                        df = df.head(limit)
                    
                    logger.info(f"✅ Found {len(df)} stocks using {query_config['name']}")
                    return df
                else:
                    logger.info(f"⚠️ No results from {query_config['name']} (Query {i+1}), trying next query...")
                    await asyncio.sleep(1)  # Brief pause between queries
        
        logger.warning(f"❌ No stocks found for trading theme: {trading_theme}")
        logger.warning(f"❌ All {len(self.long_term_queries)} predefined queries failed")
        return pd.DataFrame()

    def get_available_themes(self) -> List[str]:
        """Get list of available trading themes"""
        return ['long_term_investment']

    def get_available_filters(self, trading_theme: str = 'long_term_investment') -> Dict[str, str]:
        """Get available filters for a trading theme"""
        if trading_theme == 'long_term_investment':
            return {query['name']: query['description'] for query in self.long_term_queries}
        return {}

    def test_connectivity(self) -> Dict[str, Any]:
        """Test Chartink connectivity and return status"""
        if not CHARTINK_AVAILABLE:
            return {
                "success": False,
                "error": "Chartink module not available",
                "available": False
            }
        
        try:
            self._check_connectivity()
            return {
                "success": self.is_connected,
                "available": CHARTINK_AVAILABLE,
                "connected": self.is_connected,
                "error": None if self.is_connected else "Connection failed"
            }
        except Exception as e:
            return {
                "success": False,
                "available": CHARTINK_AVAILABLE,
                "connected": False,
                "error": str(e)
            }

    def get_status(self) -> Dict[str, Any]:
        """Get current service status"""
        return {
            "service": "ChartinkService",
            "available": CHARTINK_AVAILABLE,
            "connected": self.is_connected,
            "queries_available": len(self.long_term_queries),
            "themes_supported": self.get_available_themes()
        } 