"""
Results tab for the Swing Trading page
"""

import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from utils.logger import get_logger

logger = get_logger(__name__, group="dashboard", service="page_swing_results")

def show_results_tab(db):
    """
    Display the Results tab content
    
    Args:
        db: MongoDB connection
    """
    st.header("Scan Results")
    
    # Display latest scan info if available
    if "latest_scan" in st.session_state:
        latest_scan = st.session_state["latest_scan"]
        st.markdown(f"""
        **Latest Scan:** {latest_scan["query_name"]}  
        **Time:** {latest_scan["timestamp"]}
        """)
    
    # Allow filtering results by date, scan type
    col1, col2, col3 = st.columns(3)
    
    with col1:
        # Get unique scan types from database
        scan_types = db.get_unique_scan_types() if hasattr(db, "get_unique_scan_types") else ["swing"]
        selected_scan_type = st.selectbox("Scan Type", options=scan_types, index=0)
    
    with col2:
        # Get unique query names for selected scan type
        query_names = db.get_unique_query_names(selected_scan_type) if hasattr(db, "get_unique_query_names") else []
        selected_query = st.selectbox("Pattern", options=["All"] + query_names, index=0)
    
    with col3:
        # Date filter
        days = st.selectbox("Time Period", options=["Today", "Last 3 days", "Last week", "Last month"], index=0)
        
        # Calculate date filter
        if days == "Today":
            date_filter = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        elif days == "Last 3 days":
            date_filter = datetime.now() - timedelta(days=3)
        elif days == "Last week":
            date_filter = datetime.now() - timedelta(days=7)
        else:
            date_filter = datetime.now() - timedelta(days=30)
    
    # Get filtered scan results
    filtered_query = selected_query if selected_query != "All" else None
    scan_results = db.get_filtered_scan_results(
        scan_type=selected_scan_type, 
        query_name=filtered_query,
        from_date=date_filter
    )
    
    if scan_results:
        # Create DataFrame from scan results
        df = pd.DataFrame(scan_results)
        
        # Format timestamp
        df["timestamp"] = pd.to_datetime(df["timestamp"]).dt.strftime("%Y-%m-%d %H:%M:%S")
        
        # Format change and volume
        df["change"] = df["change"].apply(lambda x: f"{x:.2f}%")
        df["volume"] = df["volume"].apply(lambda x: f"{x:,.0f}")
        
        # Add Action buttons column
        df["actions"] = "Analyze | Add to Watchlist"
        
        # Select columns to display
        display_df = df[["timestamp", "symbol", "name", "close", "change", "volume", "query_name"]]
        
        # Rename columns
        display_df.columns = ["Timestamp", "Symbol", "Name", "Close", "Change", "Volume", "Pattern"]
        
        # Display scan results with sorting
        st.dataframe(display_df, use_container_width=True)
        
        # Interactive selection for analysis
        symbol_to_analyze = st.selectbox("Select Stock to Analyze", df["symbol"].unique())
        
        col1, col2 = st.columns(2)
        
        with col1:
            if st.button("Analyze Stock", use_container_width=True):
                # Store selected symbol in session state
                st.session_state["selected_symbol"] = symbol_to_analyze
                # Navigate to Analysis tab
                st.session_state["active_tab"] = "Analysis"
                st.rerun()
        
        with col2:
            if st.button("Add to Watchlist", use_container_width=True):
                # Add selected stock to watchlist
                stock_data = df[df["symbol"] == symbol_to_analyze].iloc[0]
                
                watchlist_item = {
                    "symbol": symbol_to_analyze,
                    "type": "swing",
                    "added_at": datetime.now(),
                    "entry_price": float(stock_data["close"].replace(",", "")) if isinstance(stock_data["close"], str) else stock_data["close"],
                    "pattern": stock_data["query_name"]
                }
                
                db.add_to_watchlist(watchlist_item)
                
                st.success(f"Added {symbol_to_analyze} to watchlist")
    else:
        st.info("No scan results found. Run a scan to find swing trading opportunities.") 