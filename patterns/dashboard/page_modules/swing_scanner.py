"""
Scanner component for the Swing Trading page
"""

import streamlit as st
import pandas as pd
from datetime import datetime
from utils.logger import get_logger

logger = get_logger(__name__, group="dashboard", service="page_swing_scanner")

def show_swing_scanner(data_service):
    """
    Display the scanner component for Swing Trading page
    
    Args:
        data_service: Data service instance (either MongoDB or Test)
    """
    st.subheader("🔍 Pattern Scanner")
    
    # Create filter controls in a form for better UX
    with st.form(key="scanner_filters"):
        # Scanner type selection
        scan_types = ["Breakout", "Support/Resistance", "Trend Following", "Momentum", "Reversal"]
        selected_type = st.selectbox("Pattern Type", scan_types)
        
        # Date range filter
        col1, col2 = st.columns(2)
        with col1:
            from_date = st.date_input("From Date", 
                                    value=datetime.now().date() - pd.Timedelta(days=7),
                                    max_value=datetime.now().date())
        with col2:
            to_date = st.date_input("To Date", 
                                value=datetime.now().date(),
                                max_value=datetime.now().date())
        
        # Submit button
        submit_button = st.form_submit_button(label="Scan Patterns")
    
    # Display mock scan results
    if submit_button or "last_scan_results" in st.session_state:
        # Store default results in session state if not already there
        if "last_scan_results" not in st.session_state:
            st.session_state.last_scan_results = get_mock_scan_results()
        
        # Display results
        results = st.session_state.last_scan_results
        
        # Show results count
        st.caption(f"Found {len(results)} matching patterns")
        
        if results:
            # Convert to DataFrame for display
            df = pd.DataFrame(results)
            
            # Format columns
            if 'timestamp' in df.columns:
                df['date'] = pd.to_datetime(df['timestamp']).dt.strftime("%Y-%m-%d")
            
            # Select columns to display
            display_columns = ['symbol', 'pattern', 'price', 'signal', 'date']
            display_df = df[display_columns].rename(columns={
                'symbol': 'Symbol',
                'pattern': 'Pattern',
                'price': 'Price',
                'signal': 'Signal',
                'date': 'Date'
            })
            
            # Display results
            st.dataframe(display_df, use_container_width=True, height=300)
        else:
            st.info("No matching patterns found for the selected criteria.")
    
def get_mock_scan_results():
    """Generate mock scan results for testing"""
    return [
        {"symbol": "RELIANCE", "pattern": "Cup and Handle", "price": 2580.5, "signal": "Buy", "timestamp": datetime.now()},
        {"symbol": "HDFCBANK", "pattern": "Double Bottom", "price": 1650.25, "signal": "Buy", "timestamp": datetime.now()},
        {"symbol": "INFY", "pattern": "Ascending Triangle", "price": 1495.75, "signal": "Watch", "timestamp": datetime.now()},
        {"symbol": "TCS", "pattern": "Support Bounce", "price": 3450.0, "signal": "Buy", "timestamp": datetime.now()},
        {"symbol": "MARUTI", "pattern": "Breakout", "price": 10250.5, "signal": "Strong Buy", "timestamp": datetime.now()},
        {"symbol": "SBIN", "pattern": "Channel Breakout", "price": 630.25, "signal": "Buy", "timestamp": datetime.now()},
        {"symbol": "HINDUNILVR", "pattern": "Golden Cross", "price": 2680.0, "signal": "Watch", "timestamp": datetime.now()},
        {"symbol": "AXISBANK", "pattern": "Bullish Flag", "price": 950.5, "signal": "Buy", "timestamp": datetime.now()},
    ] 