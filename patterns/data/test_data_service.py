"""
Simple test data service that uses dictionaries
"""

import pandas as pd
import random
from datetime import datetime
from utils.logger import get_logger
from setup.data_loader import TestDataLoader

logger = get_logger(__name__)

class DictDataService:
    """
    A wrapper that allows dictionary or simple objects to be used 
    as data services by adding required methods
    """
    
    def __init__(self, data_dict=None):
        """
        Initialize with optional data dictionary
        
        Args:
            data_dict: Optional dictionary to use as data source
        """
        self.data = data_dict or {}
        self.test_loader = TestDataLoader()
        logger.info("Initialized DictDataService with test data")
    
    def get_hot_swing_stocks(self, limit=10):
        """
        Get hot swing stocks from test data
        
        Args:
            limit: Maximum number of stocks to return
            
        Returns:
            List of stock dictionaries
        """
        # Try to get from dictionary first
        if 'hot_stocks' in self.data:
            stocks = self.data['hot_stocks']
            if isinstance(stocks, list) and len(stocks) > 0:
                return stocks[:limit]
        
        # Fall back to test data loader
        logger.info("Using test data loader for hot stocks")
        return self.test_loader.get_hot_stocks(limit)
    
    def get_watchlist(self, watch_type=None):
        """
        Get watchlist from test data
        
        Args:
            watch_type: Filter by watchlist type (swing, day, etc.)
            
        Returns:
            List of watchlist dictionaries
        """
        # Try to get from dictionary first
        if 'watchlist' in self.data:
            watchlist = self.data['watchlist']
            if isinstance(watchlist, list):
                if watch_type:
                    return [item for item in watchlist if item.get('type') == watch_type]
                return watchlist
        
        # Fall back to test data loader
        logger.info("Using test data loader for watchlist")
        return self.test_loader.get_watchlist(watch_type)
    
    def add_to_watchlist(self, item):
        """
        Add to watchlist
        
        Args:
            item: Dictionary with watchlist item details
            
        Returns:
            Boolean indicating success
        """
        try:
            # Initialize watchlist if not exists
            if 'watchlist' not in self.data:
                self.data['watchlist'] = []
            
            # Add the item
            self.data['watchlist'].append(item)
            logger.info(f"Added {item.get('symbol')} to watchlist")
            return True
        except Exception as e:
            logger.error(f"Error adding to watchlist: {e}")
            return False
    
    def save_paper_trade(self, trade_data):
        """
        Save paper trade
        
        Args:
            trade_data: Dictionary with trade details
            
        Returns:
            ID of the inserted document or False if failed
        """
        try:
            # Initialize trades if not exists
            if 'trades' not in self.data:
                self.data['trades'] = []
            
            # Generate a trade ID
            trade_id = random.randint(1000, 9999)
            trade_data['trade_id'] = trade_id
            
            # Add the trade
            self.data['trades'].append(trade_data)
            logger.info(f"Saved paper trade with ID {trade_id}")
            return trade_id
        except Exception as e:
            logger.error(f"Error saving paper trade: {e}")
            return False 