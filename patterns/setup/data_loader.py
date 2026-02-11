"""
Utility script to load test data from CSV files
"""

import os
import pandas as pd
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class TestDataLoader:
    """
    Class to load test data from CSV files for development and testing
    """
    
    def __init__(self, data_dir="setup/data"):
        """
        Initialize the data loader with the directory containing test data files
        
        Args:
            data_dir: Directory containing the CSV files
        """
        self.data_dir = data_dir
        logger.info(f"TestDataLoader initialized with data directory: {data_dir}")
    
    def get_hot_stocks(self, limit=10):
        """
        Get hot stocks from test data
        
        Args:
            limit: Maximum number of stocks to return
            
        Returns:
            List of hot stock dictionaries
        """
        try:
            file_path = os.path.join(self.data_dir, "hot_stocks.csv")
            df = pd.read_csv(file_path)
            
            # Ensure we don't return more than what was requested
            if len(df) > limit:
                df = df.sample(limit)
            
            # Convert to list of dictionaries
            hot_stocks = df.to_dict(orient="records")
            logger.info(f"Loaded {len(hot_stocks)} test hot stocks")
            return hot_stocks
        except Exception as e:
            logger.error(f"Error loading hot stocks: {e}")
            return []
    
    def get_watchlist(self, watch_type=None):
        """
        Get watchlist from test data
        
        Args:
            watch_type: Filter by watchlist type (swing, day, etc.)
            
        Returns:
            List of watchlist dictionaries
        """
        try:
            file_path = os.path.join(self.data_dir, "watchlist.csv")
            df = pd.read_csv(file_path)
            
            # Convert string dates to datetime objects
            df["added_at"] = pd.to_datetime(df["added_at"])
            
            # Filter by type if specified
            if watch_type:
                df = df[df["type"] == watch_type]
            
            # Convert to list of dictionaries
            watchlist = df.to_dict(orient="records")
            logger.info(f"Loaded {len(watchlist)} test watchlist items")
            return watchlist
        except Exception as e:
            logger.error(f"Error loading watchlist: {e}")
            return []
    
    def get_trade_history(self, status=None, limit=50):
        """
        Get trade history from test data
        
        Args:
            status: Filter by trade status (open, closed)
            limit: Maximum number of trades to return
            
        Returns:
            List of trade dictionaries
        """
        try:
            file_path = os.path.join(self.data_dir, "trade_history.csv")
            df = pd.read_csv(file_path)
            
            # Convert string dates to datetime objects
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            
            # Filter by status if specified
            if status:
                df = df[df["status"] == status]
            
            # Sort by timestamp (most recent first)
            df = df.sort_values(by="timestamp", ascending=False)
            
            # Limit the number of records
            if len(df) > limit:
                df = df.head(limit)
            
            # Convert to list of dictionaries
            trades = df.to_dict(orient="records")
            logger.info(f"Loaded {len(trades)} test trade history records")
            return trades
        except Exception as e:
            logger.error(f"Error loading trade history: {e}")
            return []
    
    def add_to_watchlist(self, item):
        """
        Add an item to the test watchlist (simulates DB write)
        
        Args:
            item: Dictionary with watchlist item details
            
        Returns:
            Boolean indicating success
        """
        try:
            logger.info(f"Added {item.get('symbol')} to test watchlist (simulation)")
            return True
        except Exception as e:
            logger.error(f"Error adding to watchlist: {e}")
            return False
    
    def save_paper_trade(self, trade_data):
        """
        Save a paper trade to the test data (simulates DB write)
        
        Args:
            trade_data: Dictionary with trade details
            
        Returns:
            Generated trade ID
        """
        try:
            # Generate a random trade ID (for simulation)
            import random
            trade_id = random.randint(2000, 9999)
            logger.info(f"Saved paper trade with ID {trade_id} (simulation)")
            return trade_id
        except Exception as e:
            logger.error(f"Error saving paper trade: {e}")
            return None 