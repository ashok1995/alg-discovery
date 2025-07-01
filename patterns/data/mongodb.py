"""
MongoDB data access
"""

import pymongo
from datetime import datetime
from utils.logger import get_logger
import os
from config.data_config import USE_TEST_DATA, MONGODB_URI, TEST_DATA_DIR

logger = get_logger(__name__)

class DataService:
    """
    Abstract base class for data services
    """
    def get_hot_swing_stocks(self, limit=10):
        """
        Get hot swing stocks - to be implemented by subclasses
        """
        raise NotImplementedError("Subclass must implement get_hot_swing_stocks")
    
    def get_watchlist(self, watch_type=None):
        """
        Get watchlist - to be implemented by subclasses
        """
        raise NotImplementedError("Subclass must implement get_watchlist")
    
    def add_to_watchlist(self, item):
        """
        Add to watchlist - to be implemented by subclasses
        """
        raise NotImplementedError("Subclass must implement add_to_watchlist")
    
    def save_paper_trade(self, trade_data):
        """
        Save paper trade - to be implemented by subclasses
        """
        raise NotImplementedError("Subclass must implement save_paper_trade")

class MongoDBConnection(DataService):
    """
    MongoDB connection and CRUD operations
    """
    
    def __init__(self, uri=MONGODB_URI):
        """
        Initialize MongoDB connection
        
        Args:
            uri: MongoDB connection string
        """
        try:
            self.client = pymongo.MongoClient(uri)
            self.database = self.client.get_database()
            logger.info(f"Connected to MongoDB: {uri}")
        except Exception as e:
            logger.error(f"MongoDB connection error: {e}")
            self.client = None
            self.database = None
    
    def get_hot_swing_stocks(self, limit=10):
        """
        Get hot swing stocks from the database
        
        Args:
            limit: Maximum number of stocks to return
            
        Returns:
            List of hot stock dictionaries
        """
        try:
            if self.database is not None:  # Fixed: use 'is not None' instead of truth testing
                collection = self.database.get_collection("patterns")
                query = {"type": "swing", "active": True}
                projection = {"_id": 0}
                
                cursor = collection.find(query, projection).limit(limit)
                stocks = list(cursor)
                
                logger.info(f"Found {len(stocks)} hot swing stocks in database")
                return stocks
            else:
                logger.warning("Database connection not available")
                return []
        except Exception as e:
            logger.error(f"Error getting hot swing stocks: {e}")
            return []
    
    def get_watchlist(self, watch_type=None):
        """
        Get watchlist from the database
        
        Args:
            watch_type: Filter by watchlist type (swing, day, etc.)
            
        Returns:
            List of watchlist dictionaries
        """
        try:
            if self.database is not None:  # Fixed: use 'is not None' instead of truth testing
                collection = self.database.get_collection("watchlist")
                
                query = {}
                if watch_type is not None:
                    query["type"] = watch_type
                
                projection = {"_id": 0}
                
                cursor = collection.find(query, projection)
                watchlist = list(cursor)
                
                logger.info(f"Found {len(watchlist)} watchlist items in database")
                return watchlist
            else:
                logger.warning("Database connection not available")
                return []
        except Exception as e:
            logger.error(f"Error getting watchlist: {e}")
            return []
    
    def add_to_watchlist(self, item):
        """
        Add an item to the watchlist
        
        Args:
            item: Dictionary with watchlist item details
            
        Returns:
            ID of the inserted document or False if failed
        """
        try:
            if self.database is not None:  # Fixed: use 'is not None' instead of truth testing
                # Add timestamp if not provided
                if "added_at" not in item:
                    item["added_at"] = datetime.now()
                
                collection = self.database.get_collection("watchlist")
                result = collection.insert_one(item)
                
                logger.info(f"Added {item.get('symbol')} to watchlist with ID {result.inserted_id}")
                return str(result.inserted_id)
            else:
                logger.warning("Database connection not available")
                return False
        except Exception as e:
            logger.error(f"Error adding to watchlist: {e}")
            return False
    
    def save_paper_trade(self, trade_data):
        """
        Save a paper trade to the database
        
        Args:
            trade_data: Dictionary with trade details
            
        Returns:
            ID of the inserted document or False if failed
        """
        try:
            if self.database is not None:  # Fixed: use 'is not None' instead of truth testing
                # Add timestamp if not provided
                if "timestamp" not in trade_data:
                    trade_data["timestamp"] = datetime.now()
                
                collection = self.database.get_collection("paper_trades")
                result = collection.insert_one(trade_data)
                
                logger.info(f"Saved paper trade with ID {result.inserted_id}")
                return str(result.inserted_id)
            else:
                logger.warning("Database connection not available")
                return False
        except Exception as e:
            logger.error(f"Error saving paper trade: {e}")
            return False

class TestDataService(DataService):
    """
    Test data service that implements the same interface as MongoDB
    but uses CSV files instead
    """
    
    def __init__(self, data_dir=TEST_DATA_DIR):
        """
        Initialize test data service
        
        Args:
            data_dir: Directory containing test data files
        """
        from setup.data_loader import TestDataLoader
        self.loader = TestDataLoader(data_dir)
        logger.info("Using test data instead of MongoDB")
    
    def get_hot_swing_stocks(self, limit=10):
        """Implementation using test data"""
        return self.loader.get_hot_stocks(limit)
    
    def get_watchlist(self, watch_type=None):
        """Implementation using test data"""
        return self.loader.get_watchlist(watch_type)
    
    def add_to_watchlist(self, item):
        """Implementation using test data"""
        return self.loader.add_to_watchlist(item)
    
    def save_paper_trade(self, trade_data):
        """Implementation using test data"""
        return self.loader.save_paper_trade(trade_data)

def get_data_service():
    """
    Factory function to get the appropriate data service
    based on configuration
    
    Returns:
        DataService instance (either MongoDB or Test)
    """
    if USE_TEST_DATA:
        # Import here to avoid circular imports
        from data.test_data_service import DictDataService
        return DictDataService()
    else:
        return MongoDBConnection()

class MongoDB:
    """MongoDB data access"""
    
    def __init__(self, connection_string=None):
        """Initialize MongoDB connection"""
        try:
            # Use provided connection string or default
            self.connection_string = connection_string or os.getenv("MONGODB_URI", "mongodb://localhost:27017")
            self.db_name = os.getenv("MONGODB_DB", "st-analysis-dev")
            
            # Connect to MongoDB
            self.client = pymongo.MongoClient(self.connection_string)
            self.db = self.client[self.db_name]
            logger.info(f"Connected to MongoDB: {self.connection_string}/{self.db_name}")
        except Exception as e:
            logger.error(f"Error connecting to MongoDB: {e}")
            self.client = None
            self.db = None
    
    def connect(self):
        """Reconnect to MongoDB if needed"""
        if self.client is None:
            try:
                self.client = pymongo.MongoClient(self.connection_string)
                self.db = self.client[self.db_name]
                logger.info(f"Reconnected to MongoDB: {self.connection_string}/{self.db_name}")
                return True
            except Exception as e:
                logger.error(f"Error reconnecting to MongoDB: {e}")
                return False
        return True
    
    def query(self, collection, query):
        """Execute a query on a collection"""
        try:
            if self.db:
                return list(self.db[collection].find(query))
            return []
        except Exception as e:
            logger.error(f"Error executing query: {e}")
            return []
    
    # Add your MongoDB methods here
    def save_scan_result(self, scan_result):
        """
        Save scan result
        
        Args:
            scan_result: Scan result dictionary
        """
        try:
            if self.db:
                self.db.scan_results.insert_one(scan_result)
                logger.info(f"Saved scan result for {scan_result.get('symbol')}")
        except Exception as e:
            logger.error(f"Error saving scan result: {e}")
    
    def get_scan_results(self, scan_type=None, limit=100):
        """
        Get scan results
        
        Args:
            scan_type: Scan type (intraday, swing, long_term, short_sell)
            limit: Maximum number of results
        
        Returns:
            List of scan results
        """
        try:
            if self.db:
                query = {}
                
                if scan_type:
                    query["scan_type"] = scan_type
                
                return list(self.db.scan_results.find(query).sort("timestamp", -1).limit(limit))
            
            return []
        except Exception as e:
            logger.error(f"Error getting scan results: {e}")
            return []
    
    def save_market_condition(self, market_condition):
        """
        Save market condition
        
        Args:
            market_condition: Market condition dictionary
        """
        try:
            if self.db is not None:
                market_condition["timestamp"] = datetime.now()
                self.db.market_conditions.insert_one(market_condition)
                logger.info("Saved market condition")
        except Exception as e:
            logger.error(f"Error saving market condition: {e}")
    
    def get_latest_market_condition(self):
        """
        Get latest market condition
        
        Returns:
            Market condition dictionary
        """
        try:
            if self.db is not None:
                return self.db.market_conditions.find_one(sort=[("timestamp", -1)])
            
            return None
        except Exception as e:
            logger.error(f"Error getting latest market condition: {e}")
            return None
    
    def remove_from_watchlist(self, symbol, watchlist_type=None):
        """
        Remove from watchlist
        
        Args:
            symbol: Stock symbol
            watchlist_type: Watchlist type (intraday, swing, long_term, short_sell)
        """
        try:
            if self.db:
                query = {"symbol": symbol}
                
                if watchlist_type:
                    query["type"] = watchlist_type
                
                self.db.watchlist.delete_many(query)
                logger.info(f"Removed {symbol} from watchlist")
        except Exception as e:
            logger.error(f"Error removing from watchlist: {e}")
    
    def save_trade(self, trade):
        """
        Save trade
        
        Args:
            trade: Trade dictionary
        
        Returns:
            Trade ID
        """
        try:
            if self.db:
                result = self.db.trades.insert_one(trade)
                logger.info(f"Saved trade for {trade.get('symbol')}")
                return result.inserted_id
            
            return None
        except Exception as e:
            logger.error(f"Error saving trade: {e}")
            return None
    
    def get_open_trades(self):
        """
        Get open trades
        
        Returns:
            List of open trades
        """
        try:
            if self.db:
                return list(self.db.trades.find({"status": "open"}).sort("entry_timestamp", -1))
            
            return []
        except Exception as e:
            logger.error(f"Error getting open trades: {e}")
            return []
    
    def get_closed_trades(self, limit=100):
        """
        Get closed trades
        
        Args:
            limit: Maximum number of trades
        
        Returns:
            List of closed trades
        """
        try:
            if self.db:
                return list(self.db.trades.find({"status": "closed"}).sort("exit_timestamp", -1).limit(limit))
            
            return []
        except Exception as e:
            logger.error(f"Error getting closed trades: {e}")
            return []
    
    def update_trade_price(self, trade_id, current_price):
        """
        Update trade price
        
        Args:
            trade_id: Trade ID
            current_price: Current price
        """
        try:
            if self.db:
                self.db.trades.update_one(
                    {"_id": trade_id},
                    {"$set": {"current_price": current_price}}
                )
                logger.info(f"Updated trade price for {trade_id}")
        except Exception as e:
            logger.error(f"Error updating trade price: {e}")
    
    def close_trade(self, trade_id, exit_data):
        """
        Close trade
        
        Args:
            trade_id: Trade ID
            exit_data: Exit data dictionary
        """
        try:
            if self.db:
                # Get trade
                trade = self.db.trades.find_one({"_id": trade_id})
                
                if not trade:
                    logger.warning(f"Trade not found: {trade_id}")
                    return
                
                # Calculate P&L
                entry_price = trade.get("entry_price", 0)
                exit_price = exit_data.get("exit_price", 0)
                shares = trade.get("shares", 0)
                
                if trade.get("trade_type") == "long":
                    pnl_amount = (exit_price - entry_price) * shares
                    pnl_percent = (exit_price / entry_price - 1) * 100
                else:  # short
                    pnl_amount = (entry_price - exit_price) * shares
                    pnl_percent = (entry_price / exit_price - 1) * 100
                
                # Update trade
                self.db.trades.update_one(
                    {"_id": trade_id},
                    {
                        "$set": {
                            "status": "closed",
                            "exit_price": exit_price,
                            "exit_reason": exit_data.get("exit_reason"),
                            "exit_timestamp": exit_data.get("exit_timestamp"),
                            "pnl_amount": pnl_amount,
                            "pnl_percent": pnl_percent
                        }
                    }
                )
                
                logger.info(f"Closed trade for {trade.get('symbol')} with P&L: {pnl_amount:.2f} ({pnl_percent:.2f}%)")
        except Exception as e:
            logger.error(f"Error closing trade: {e}")
    
    def save_performance_metrics(self, metrics):
        """
        Save performance metrics
        
        Args:
            metrics: Performance metrics dictionary
        """
        try:
            if self.db:
                self.db.performance_metrics.insert_one(metrics)
                logger.info("Saved performance metrics")
        except Exception as e:
            logger.error(f"Error saving performance metrics: {e}")
    
    def get_latest_performance_metrics(self):
        """
        Get latest performance metrics
        
        Returns:
            Performance metrics dictionary
        """
        try:
            if self.db:
                return self.db.performance_metrics.find_one(sort=[("timestamp", -1)])
            
            return None
        except Exception as e:
            logger.error(f"Error getting latest performance metrics: {e}")
            return None
    
    def save_equity_curve(self, equity_curve):
        """
        Save equity curve
        
        Args:
            equity_curve: Equity curve list
        """
        try:
            if self.db:
                # Delete existing equity curve
                self.db.equity_curve.delete_many({})
                
                # Insert new equity curve
                if equity_curve:
                    self.db.equity_curve.insert_many(equity_curve)
                
                logger.info("Saved equity curve")
        except Exception as e:
            logger.error(f"Error saving equity curve: {e}")
    
    def get_equity_curve(self):
        """
        Get equity curve
        
        Returns:
            Equity curve list
        """
        try:
            if self.db is not None:
                return list(self.db.equity_curve.find().sort("timestamp", 1))
            else:
                logger.warning("MongoDB connection not available")
                return []
        except Exception as e:
            logger.error(f"Error getting equity curve: {e}")
            return []
    
    def save_backtest_result(self, backtest_result):
        """
        Save backtest result
        
        Args:
            backtest_result: Backtest result dictionary
        """
        try:
            if self.db:
                self.db.backtest_results.insert_one(backtest_result)
                logger.info(f"Saved backtest result for {backtest_result.get('symbol')}")
        except Exception as e:
            logger.error(f"Error saving backtest result: {e}")
    
    def get_backtest_results(self, limit=100):
        """
        Get backtest results
        
        Args:
            limit: Maximum number of results
        
        Returns:
            List of backtest results
        """
        try:
            if self.db:
                return list(self.db.backtest_results.find().sort("timestamp", -1).limit(limit))
            
            return []
        except Exception as e:
            logger.error(f"Error getting backtest results: {e}")
            return []
    
    def get_unique_scan_types(self):
        """Get unique scan types from scan results collection"""
        try:
            # Use MongoDB distinct operation to get unique values
            scan_types = self.db.scan_results.distinct("scan_type")
            return scan_types if scan_types else ["swing"]  # Return default if none found
        except Exception as e:
            logger.error(f"Error getting unique scan types: {str(e)}")
            return ["swing"]  # Return default on error
    
    def get_unique_query_names(self, scan_type="swing"):
        """Get unique query names for a specific scan type"""
        try:
            # Use MongoDB distinct with filter
            query_names = self.db.scan_results.distinct("query_name", {"scan_type": scan_type})
            return query_names if query_names else []  # Return empty list if none found
        except Exception as e:
            logger.error(f"Error getting unique query names: {str(e)}")
            return []  # Return empty list on error
    
    def get_filtered_scan_results(self, scan_type="swing", query_name=None, from_date=None, limit=100):
        """Get filtered scan results"""
        try:
            # Build filter
            filter_dict = {"scan_type": scan_type}
            
            # Add query name filter if provided
            if query_name:
                filter_dict["query_name"] = query_name
            
            # Add date filter if provided
            if from_date:
                filter_dict["timestamp"] = {"$gte": from_date}
            
            # Execute query with filter and sort by timestamp descending
            results = list(self.db.scan_results.find(
                filter_dict, 
                sort=[("timestamp", -1)],
                limit=limit
            ))
            
            return results
        except Exception as e:
            logger.error(f"Error getting filtered scan results: {str(e)}")
            return []  # Return empty list on error 