"""
Data service wrapper with ChartInk priority
"""

from utils.logger import get_logger

logger = get_logger(__name__)

def ensure_data_service(data_obj):
    """
    Ensure the provided object uses ChartInk data
    
    Returns:
        An object that will use ChartInk data
    """
    # Always create a new TopStocksService for ChartInk data
    try:
        from data.top_stocks_service import TopStocksService
        logger.info("Creating new TopStocksService to ensure ChartInk data")
        return TopStocksService()
    except Exception as e:
        logger.error(f"Error creating TopStocksService: {e}")
        # Return original object as fallback
        return data_obj 

def get_data_service():
    """
    Get a data service instance, creating one if needed
    
    Returns:
        A data service instance (MongoDB or TopStocksService)
    """
    import streamlit as st
    from data.top_stocks_service import TopStocksService
    
    # Check if we already have a data service in session state
    if "data_service" in st.session_state:
        return st.session_state.data_service
    
    # Otherwise create a new one
    try:
        # Try to import MongoDB service
        from data.mongodb import MongoDBService
        data_service = MongoDBService()
        logger.info("Created new MongoDB data service")
    except Exception as e:
        # Fall back to TopStocksService
        logger.warning(f"Could not create MongoDB service: {e}. Using TopStocksService.")
        data_service = TopStocksService()
        logger.info("Created new TopStocksService (no MongoDB)")
    
    # Store in session state for reuse
    st.session_state.data_service = data_service
    
    return data_service 