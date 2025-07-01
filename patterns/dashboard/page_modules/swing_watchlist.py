"""
Watchlist component for the Swing Trading page
"""

import streamlit as st
import pandas as pd
from datetime import datetime
from utils.logger import get_logger
from utils.data_wrapper import ensure_data_service

logger = get_logger(__name__)

def show_swing_watchlist(data_service):
    """
    Display the watchlist component for the Swing Trading page
    
    Args:
        data_service: Data service instance (either MongoDB or Test)
    """
    # Ensure data_service has required methods
    data_service = ensure_data_service(data_service)
    
    st.subheader("📋 Watchlist")
    
    # Initialize session state for watchlist if not exists
    if "watchlist" not in st.session_state:
        st.session_state.watchlist = None
    
    if "watchlist_last_refresh" not in st.session_state:
        st.session_state.watchlist_last_refresh = datetime.now()
    
    # Check if we need to refresh data
    refresh_data = False
    
    # Initial load
    if st.session_state.watchlist is None:
        refresh_data = True
        logger.info("Initial load of watchlist data")
    
    # Manual refresh button
    if st.button("🔄 Refresh Watchlist", key="refresh_watchlist"):
        refresh_data = True
        logger.info("Manual refresh of watchlist requested")
    
    # Fetch data if needed
    if refresh_data:
        try:
            # Get watchlist from data service
            logger.info("Fetching watchlist from data service")
            watchlist_items = data_service.get_watchlist(watch_type="swing")
            
            # Store in session state
            st.session_state.watchlist = watchlist_items
            st.session_state.watchlist_last_refresh = datetime.now()
            
            logger.info(f"Found {len(watchlist_items)} watchlist items")
        except Exception as e:
            logger.error(f"Error fetching watchlist: {e}")
            # Create empty list if first load failed
            if st.session_state.watchlist is None:
                st.session_state.watchlist = []
    
    # Display the watchlist
    watchlist = st.session_state.watchlist
    
    if not watchlist or len(watchlist) == 0:
        st.info("Your watchlist is empty. Add stocks from the Hot Stocks section.")
        return
    
    # Create a DataFrame for display
    df = pd.DataFrame(watchlist)
    
    # Format date column 
    if "added_at" in df.columns:
        df["added_at"] = pd.to_datetime(df["added_at"]).dt.strftime("%Y-%m-%d %H:%M")
    
    # Select and rename columns for display
    display_columns = []
    rename_map = {}
    
    for col, display_name in [
        ("symbol", "Symbol"),
        ("pattern", "Pattern"),
        ("entry_price", "Entry"),
        ("current_price", "Current"),
        ("added_at", "Added")
    ]:
        if col in df.columns:
            display_columns.append(col)
            rename_map[col] = display_name
    
    if display_columns:
        display_df = df[display_columns].rename(columns=rename_map)
        
        # Add remove button column for interactive display
        display_df["Action"] = "Remove"
        
        # Display the dataframe
        st.dataframe(
            display_df,
            use_container_width=True,
            height=300
        )
    else:
        st.warning("Watchlist data format is unexpected") 