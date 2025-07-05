"""
Utility functions for hot stocks component
"""

import streamlit as st
from datetime import datetime
from utils.logger import get_logger

logger = get_logger(__name__, group="ui_services", service="hot_stocks_utils")

def add_to_watchlist(symbol, stock_data, data_service):
    """
    Helper function to add a stock to watchlist
    
    Args:
        symbol: Stock symbol
        stock_data: Dictionary containing stock data
        data_service: Data service instance
        
    Returns:
        Boolean indicating success
    """
    try:
        # Create watchlist item from stock data
        watchlist_item = {
            "symbol": symbol,
            "name": stock_data.get("name", ""),
            "type": "swing",
            "pattern": stock_data.get("pattern", "Unknown"),
            "entry_price": float(stock_data.get("close", 0)) or float(stock_data.get("price", 0)),
            "current_price": float(stock_data.get("close", 0)) or float(stock_data.get("price", 0)),
            "added_at": datetime.now(),
            "notes": f"Added from hot stocks list. Pattern: {stock_data.get('pattern', 'Unknown')}"
        }
        
        # Try to add to watchlist via data service
        if hasattr(data_service, "add_to_watchlist"):
            result = data_service.add_to_watchlist(watchlist_item)
            if result:
                st.success(f"Added {symbol} to watchlist")
                # Also store in session state for immediate visibility
                if "watchlist" in st.session_state:
                    st.session_state.watchlist.append(watchlist_item)
                return True
            else:
                st.warning(f"Could not add {symbol} to watchlist")
                return False
        else:
            st.warning("Watchlist functionality not available")
            logger.warning("add_to_watchlist method not found in data service")
            return False
            
    except Exception as e:
        st.error(f"Error adding to watchlist: {e}")
        logger.error(f"Error adding {symbol} to watchlist: {e}")
        return False

def buy_stock_popup(symbol, stock_data):
    """
    Sets up session state to display an inline compact form for buying a stock
    
    Args:
        symbol: Stock symbol
        stock_data: Dictionary containing stock data
    """
    # Set session state to show the buy form
    st.session_state.selected_stock = symbol
    st.session_state.buy_form_active = True
    st.session_state.show_stock_popup = False 