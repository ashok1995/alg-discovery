"""
Main Streamlit application that ensures TopStocksService is correctly used
"""

import streamlit as st
from utils.logger import get_logger
from data.top_stocks_service import TopStocksService
import inspect
from datetime import datetime

logger = get_logger(__name__, group="shared", service="patterns_app")

# Force app to always use validated TopStocksService
def initialize_app():
    """Initialize app with TopStocksService for ChartInk data"""
    logger.info("===== APP INITIALIZATION START =====")
    
    try:
        # Always create fresh TopStocksService
        logger.info("Creating new TopStocksService")
        service = TopStocksService()
        
        # Validate ChartInk connectivity
        result = service.test_chartink_connection()
        if result["success"]:
            logger.info(f"✅ ChartInk connection VERIFIED with {result['result_count']} results")
        else:
            logger.error(f"❌ ChartInk connection FAILED: {result.get('error')}")
            
        # Store in session state
        st.session_state.db = service
        
        return service
    except Exception as e:
        logger.error(f"Error initializing: {e}")
        return None

# Initialize app
db = initialize_app()
    
# Make debugging info available for troubleshooting
st.session_state.debug_info = {
    "service_type": type(db).__name__,
    "has_get_hot_swing_stocks": hasattr(db, 'get_hot_swing_stocks'),
    "has_last_data_source": hasattr(db, 'last_data_source')
}

# Log initialization completion
logger.info(f"App initialization complete. Using service type: {type(db).__name__}")

# The rest of your app code... 