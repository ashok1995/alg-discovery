"""
Data handling functions for hot stocks component
"""

import streamlit as st
from utils.logger import get_logger
from datetime import datetime

logger = get_logger(__name__, group="ui_services", service="hot_stocks_data")

def fetch_stocks_data(data_service, selected_strategy=None):
    """
    Fetch stocks data from the data service
    
    Args:
        data_service: Data service instance
        selected_strategy: Optional strategy key to filter stocks
        
    Returns:
        Tuple of (hot_stocks, data_source)
    """
    try:
        # Check if we have the get_hot_swing_stocks method
        if hasattr(data_service, 'get_hot_swing_stocks'):
            logger.info(f"Fetching hot stocks from data service")
            
            # Pass the selected strategy if we have one
            if selected_strategy:
                hot_stocks = data_service.get_hot_swing_stocks(limit=10, query_key=selected_strategy)
            else:
                hot_stocks = data_service.get_hot_swing_stocks(limit=10)
            
            # Get data source info
            if hasattr(data_service, 'last_data_source'):
                data_source = data_service.last_data_source
                # Ensure source mentions ChartInk if available
                if "ChartInk" not in data_source and hasattr(data_service, 'chartink_available'):
                    if data_service.chartink_available:
                        data_source = f"ChartInk: {data_source}"
            else:
                data_source = "ChartInk (No detailed source info)"

            logger.info(f"Data source: {data_source}")
        else:
            logger.warning("get_hot_swing_stocks method not found in data service")
            hot_stocks = []
            data_source = "Unknown (Method not found)"

        # Verify we have valid data before proceeding
        if not hot_stocks or len(hot_stocks) == 0:
            st.warning("### No Stock Data Available")
            
            col1, col2 = st.columns(2)
            with col1:
                if st.button("🔄 Refresh Data"):
                    if hasattr(data_service, 'clear'):
                        data_service.clear()
                    st.experimental_rerun()
            
            with col2:
                if st.button("🔍 Run Diagnostics"):
                    st.info("Running diagnostics...")
                    if hasattr(data_service, 'test_chartink_connection'):
                        result = data_service.test_chartink_connection()
                        if result.get('success'):
                            st.success("✅ ChartInk connection is working")
                        else:
                            st.error(f"❌ ChartInk connection failed: {result.get('error', 'Unknown error')}")
                    else:
                        st.warning("Diagnostics not available for this data service")
            return None, data_source
        
        # Log the structure of the first stock to help with debugging
        if hot_stocks and len(hot_stocks) > 0:
            logger.info(f"Sample stock data structure: {list(hot_stocks[0].keys())}")
        
        return hot_stocks, data_source
        
    except Exception as e:
        # Detailed error handling
        st.error(f"Error processing stock data: {str(e)}")
        logger.error(f"Error in fetch_stocks_data: {str(e)}", exc_info=True)
        
        # Option to retry
        if st.button("Retry Loading Stocks"):
            if hasattr(data_service, 'clear'):
                data_service.clear()
            st.experimental_rerun()
        return None, "Error"

def normalize_stock_data(hot_stocks):
    """
    Normalize stock data to ensure all required fields are present
    
    Args:
        hot_stocks: List of stock dictionaries to normalize
    """
    if not hot_stocks:
        return
        
    # Add specific debug for empty tables
    if len(hot_stocks) == 0:
        logger.error("NO STOCKS DATA TO DISPLAY - Check data returned from service")
        return
    
    logger.info(f"✅ Got {len(hot_stocks)} stocks to display")
    
    # Try to normalize field names if needed
    for stock in hot_stocks:
        # If we don't have symbol but have nsecode, copy it
        if 'symbol' not in stock and 'nsecode' in stock:
            stock['symbol'] = stock['nsecode']
        
        # If we don't have company but have name, copy it
        if 'company' not in stock and 'name' in stock:
            stock['company'] = stock['name']
        elif 'name' not in stock and 'company' in stock:
            stock['name'] = stock['company']
        
        # Fix Change field if missing
        if 'change' not in stock and 'per_chg' in stock:
            stock['change'] = f"{stock['per_chg']:.2f}%"
            
        # Ensure pattern field exists
        if 'pattern' not in stock:
            stock['pattern'] = "Unknown" 