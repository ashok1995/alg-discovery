"""
ChartInk-only Top Stocks Service
"""

import streamlit as st
import pandas as pd
import random
from datetime import datetime, timedelta
from utils.logger import get_logger
from data.chartink import get_chartink_scans

logger = get_logger(__name__)

# Define ChartInk queries for different trading strategies
CHARTINK_QUERIES = {
    "breakout": {
        "name": "Breakout Stocks",
        "query": """
        latest close > prev close and 
        latest volume > prev volume * 1.5 and 
        latest volume > 100000 and 
        latest close > latest upper * 1.01 and 
        latest close > latest sma(20) * 1.02
        """,
        "description": "Stocks breaking out above resistance with volume confirmation"
    },
    "support_bounce": {
        "name": "Support Bounce",
        "query": """
        latest close > min(5, latest low) * 1.02 and 
        latest volume > latest sma(volume,10) * 1.2 and 
        latest low < latest sma(20) * 0.99 and 
        latest close > latest sma(20) * 0.97 and
        latest close > latest open
        """,
        "description": "Stocks bouncing from support levels with potential reversal"
    },
    "bullish_engulfing": {
        "name": "Bullish Engulfing",
        "query": """
        latest open < prev close and 
        latest close > prev open and 
        latest close > latest open and 
        prev close < prev open and
        latest volume > prev volume
        """,
        "description": "Bullish engulfing pattern forming with good volume"
    },
    "momentum": {
        "name": "Momentum Leaders",
        "query": """
        latest close > latest sma(8) and
        latest sma(8) > latest sma(20) and
        latest sma(20) > latest sma(50) and
        latest volume > 100000 and
        latest rsi(14) > 55
        """,
        "description": "Stocks showing strong momentum across multiple timeframes"
    },
    "simple_test": {
        "name": "Simple Test Query",
        "query": """
        latest close > 0 and 
        latest volume > 100000
        """,
        "description": "Basic query that should always return results (for testing)"
    }
}

# Query priority order for waterfall
QUERY_WATERFALL = [
    "breakout",         # First priority
    "support_bounce",   # Second priority
    "bullish_engulfing", # Third priority
    "momentum",         # Fourth priority
    "simple_test"       # Last resort
]

class TopStocksService:
    """
    Service for fetching top stock picks from ChartInk only
    """
    
    def __init__(self, use_test_data=False):
        """
        Initialize the service - ignores use_test_data parameter and always uses ChartInk
        """
        self.use_test_data = False  # Always use ChartInk regardless of parameter
        self.active_query = None
        
        # Initialize data source
        self.last_data_source = "ChartInk (Initializing)"
        self.chartink_available = False
        
        # Log initialization
        logger.info("======= INITIALIZING TOP STOCKS SERVICE (CHARTINK ONLY) =======")
        
        # Test ChartInk connectivity
        logger.info("Testing ChartInk connectivity...")
        test_result = self.test_chartink_connection()
        if test_result["success"]:
            logger.info("✅ ChartInk connectivity test PASSED")
            self.chartink_available = True
            self.last_data_source = "ChartInk: Connected"
        else:
            logger.error(f"❌ ChartInk connectivity test FAILED: {test_result.get('error', 'Unknown error')}")
            self.last_data_source = "ChartInk: Connection Failed"

    def __str__(self):
        """String representation always shows ChartInk"""
        return "ChartInk Service"
        
    def set_data_source(self, query_name):
        """Set data source to always mention ChartInk"""
        self.last_data_source = f"ChartInk: {query_name}"

    def get_hot_swing_stocks(self, limit=10, query_key=None):
        """
        Get hot swing stocks using waterfall algorithm or specific query
        
        Args:
            limit: Maximum number of stocks to return
            query_key: Optional specific query to use (None for waterfall)
            
        Returns:
            List of hot stocks (empty list if no results)
        """
        execution_id = random.randint(10000, 99999)
        logger.info(f"[FETCH #{execution_id}] Getting hot swing stocks (limit={limit}, query={query_key})")
        
        # Check if we have connectivity
        if not self.chartink_available:
            # Try one more time
            test_result = self.test_chartink_connection()
            if test_result["success"]:
                self.chartink_available = True
                logger.info("[FETCH #{execution_id}] ChartInk connection restored")
            else:
                logger.error("[FETCH #{execution_id}] ChartInk still unavailable")
                self.last_data_source = "ChartInk: Unavailable"
                return []  # Return empty results when ChartInk is unavailable
        
        # Use waterfall or specific query
        if query_key is None or query_key == "waterfall":
            logger.info(f"[FETCH #{execution_id}] Using waterfall algorithm")
            # When using waterfall, get more stocks than needed for better sorting
            stocks = self.get_stocks_waterfall(min_stocks=limit, max_stocks=max(50, limit*2))
            
            # Sort by percentage change (descending)
            if stocks:
                logger.info(f"Sorting {len(stocks)} stocks by percentage change (descending)")
                stocks.sort(key=lambda x: float(x.get("per_chg", 0)), reverse=True)
                
                # Take the top stocks after sorting
                if len(stocks) > limit:
                    logger.info(f"Taking top {limit} stocks after sorting by change")
                    stocks = stocks[:limit]
            
            return stocks
        else:
            # A specific query was requested
            logger.info(f"[FETCH #{execution_id}] Using specific query: {query_key}")
            stocks = self._run_single_query(query_key, limit=max(50, limit*2))
            
            # Sort by percentage change (descending)
            if stocks:
                logger.info(f"Sorting {len(stocks)} stocks by percentage change (descending)")
                stocks.sort(key=lambda x: float(x.get("per_chg", 0)), reverse=True)
                
                # Take the top stocks after sorting
                if len(stocks) > limit:
                    logger.info(f"Taking top {limit} stocks after sorting by change")
                    stocks = stocks[:limit]
            
            return stocks

    def get_stocks_waterfall(self, min_stocks=5, max_stocks=20):
        """
        Get stocks using waterfall approach - tries multiple queries in order
        until enough stocks found

        Args:
            min_stocks: Minimum number of stocks to return
            max_stocks: Maximum number of stocks to return
            
        Returns:
            List of stock dictionaries (may be empty if all queries fail)
        """
        logger.info(f"Running waterfall query (min={min_stocks}, max={max_stocks})")
        all_stocks = []
        found_queries = 0
        
        for idx, query_key in enumerate(QUERY_WATERFALL):
            logger.info(f"Waterfall [{idx+1}/{len(QUERY_WATERFALL)}]: Trying '{query_key}'")
            
            try:
                query_data = CHARTINK_QUERIES[query_key]
                query_name = query_data["name"]
                
                # Run the query
                df = get_chartink_scans(query_data["query"])
                
                # Skip if no results
                if df is None or df.empty:
                    logger.info(f"Query '{query_name}' returned no results, continuing")
                    continue
                    
                found_queries += 1
                
                # Calculate how many more stocks we need
                remaining_slots = max_stocks - len(all_stocks)
                if remaining_slots <= 0:
                    break
                    
                # Get symbols we already have to avoid duplicates
                existing_symbols = {s["symbol"] for s in all_stocks if "symbol" in s}
                
                # Process new stocks
                stocks = []
                unique_count = 0
                
                for i, row in df.iterrows():
                    symbol = row.get("nsecode", "")
                    
                    # Skip if we already have this symbol
                    if symbol in existing_symbols:
                        continue
                        
                    # Calculate signal
                    signal = "bullish" if float(row.get('per_chg', 0)) > 0 else "bearish"
                    
                    # Create stock object with CONSISTENT FIELD MAPPING
                    stock = {
                        "symbol": symbol,
                        "company": row.get("name", symbol),  # Ensure company field exists
                        "name": row.get("name", symbol),
                        "pattern": query_name,
                        "per_chg": float(row.get("per_chg", 0)),
                        "change": f"{float(row.get('per_chg', 0)):.2f}%",  # Formatted change as string
                        "volume": int(row.get("volume", 0)),
                        "close": float(row.get("close", 0)),
                        "query_key": query_key,
                        "signal": signal  # Add signal field for UI
                    }
                    
                    stocks.append(stock)
                    existing_symbols.add(symbol)
                    unique_count += 1
                    
                    # Stop if we have enough from this query
                    if unique_count >= remaining_slots:
                        break
                
                # Add the new stocks to our collection
                all_stocks.extend(stocks)
                logger.info(f"Added {unique_count} unique stocks from '{query_name}'")
                
                # If we have enough stocks, we can stop
                if len(all_stocks) >= min_stocks:
                    logger.info(f"Reached min stocks ({min_stocks}), can stop waterfall")
                    break
                    
            except Exception as e:
                logger.error(f"Error processing query '{query_key}': {e}")
        
        # Truncate if we got more than the max
        if len(all_stocks) > max_stocks:
            logger.info(f"Reached max stocks ({max_stocks}), truncating results")
            all_stocks = all_stocks[:max_stocks]
        
        # Set the data source
        if found_queries > 0:
            self.last_data_source = f"ChartInk: Waterfall ({found_queries} queries)"
        else:
            self.last_data_source = "ChartInk: No results from waterfall"
        
        # Log what we're returning
        logger.info(f"Waterfall complete! Found {len(all_stocks)} stocks using {found_queries} queries")
        
        # DEBUG THE RETURNED DATA STRUCTURE
        if all_stocks:
            first_stock = all_stocks[0]
            logger.info(f"First stock fields: {list(first_stock.keys())}")
            logger.info(f"First stock values: symbol={first_stock.get('symbol')}, company={first_stock.get('company')}, pattern={first_stock.get('pattern')}")
        else:
            logger.warning("NO STOCKS FOUND IN WATERFALL - returning empty list")
        
        return all_stocks

    def _run_single_query(self, query_key, limit=10):
        """
        Run a single ChartInk query with debugging
        
        Args:
            query_key: Key of the query to run
            limit: Maximum stocks to return
            
        Returns:
            List of stock dictionaries (empty list if no results)
        """
        if query_key not in CHARTINK_QUERIES:
            logger.error(f"Query key '{query_key}' not found in CHARTINK_QUERIES")
            self.last_data_source = f"ChartInk Error: Invalid query '{query_key}'"
            return []
            
        try:
            query_data = CHARTINK_QUERIES[query_key]
            query = query_data["query"]
            query_name = query_data["name"]
            
            logger.info(f"Running single query: {query_key} - {query_name}")
            
            # Execute query
            df = get_chartink_scans(query)
            
            if df is None or df.empty:
                logger.warning(f"Query '{query_name}' returned no results")
                self.last_data_source = f"ChartInk: No results for {query_name}"
                return []
            
            # Process results - MAKE SURE ALL REQUIRED FIELDS ARE INCLUDED
            stocks = []
            for i, row in df.head(limit).iterrows():
                # Calculate a signal value (bullish/bearish/neutral)
                signal = "bullish" if float(row.get('per_chg', 0)) > 0 else "bearish"
                
                stock = {
                    "symbol": row.get("nsecode", ""),
                    "name": row.get("name", row.get("nsecode", "")),
                    "change": f"{row.get('per_chg', 0):.2f}%", 
                    "per_chg": float(row.get("per_chg", 0)),
                    "volume": int(row.get("volume", 0)),
                    "close": float(row.get("close", 0)),
                    "pattern": query_name,
                    "query_key": query_key,
                    "company": row.get("name", row.get("nsecode", "")),  # Ensure company field exists
                    "signal": signal  # Add signal field for UI
                }
                stocks.append(stock)
            
            self.last_data_source = f"ChartInk: {query_name}"
            
            # CRITICAL: Log the stocks being returned for debugging
            logger.info(f"Returning {len(stocks)} stocks from query '{query_name}'")
            if stocks:
                symbols = [s["symbol"] for s in stocks]
                logger.info(f"Stock symbols: {', '.join(symbols[:5])}")
            
            return stocks
            
        except Exception as e:
            logger.error(f"Error running query '{query_key}': {e}")
            self.last_data_source = f"ChartInk Error: {str(e)[:30]}..."
            return []

    def get_available_queries(self):
        """Return available ChartInk queries"""
        return CHARTINK_QUERIES
        
    def clear(self):
        """Clear cached data and force refresh"""
        try:
            # No fetch_top_stocks to clear - this function is now implementation detail
            logger.info("Cache cleared - always fetching fresh data")
            return True
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return False

    def test_chartink_connection(self):
        """
        Test connectivity to ChartInk with simple query
        
        Returns:
            dict with test results
        """
        logger.info("Testing ChartInk API connection")
        start_time = datetime.now()
        
        try:
            # Use the simplest query
            test_query = "latest close > 0 and latest volume > 100000"
            df = get_chartink_scans(test_query)
            
            elapsed = (datetime.now() - start_time).total_seconds()
            
            if df is not None and not df.empty:
                result_count = len(df)
                logger.info(f"✅ ChartInk connection SUCCESS: {result_count} results in {elapsed:.2f}s")
                
                # Get samples
                samples = []
                if 'nsecode' in df.columns:
                    samples = df['nsecode'].head(5).tolist()
                
                return {
                    "success": True,
                    "elapsed_seconds": elapsed,
                    "result_count": result_count,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "samples": samples
                }
            else:
                logger.error("❌ ChartInk connection test failed: No results")
                return {
                    "success": False,
                    "elapsed_seconds": elapsed,
                    "error": "No results returned",
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
        
        except Exception as e:
            elapsed = (datetime.now() - start_time).total_seconds()
            logger.error(f"❌ ChartInk connection test failed: {str(e)}")
            return {
                "success": False,
                "elapsed_seconds": elapsed,
                "error": str(e),
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            } 

    def get_watchlist(self, watch_type=None):
        """Placeholder for watchlist functionality - returns empty list
        
        Args:
            watch_type: Optional type of watchlist to return
        """
        logger.info(f"get_watchlist method called (not fully implemented) - type: {watch_type}")
        return []

    def add_to_watchlist(self, item):
        """Placeholder for add to watchlist functionality"""
        logger.info(f"Adding {item.get('symbol', 'unknown')} to watchlist (not fully implemented)")
        return True 