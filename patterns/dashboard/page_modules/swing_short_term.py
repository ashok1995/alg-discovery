"""
Short Term Trading tab for the Swing Trading page
"""

import streamlit as st
import pandas as pd
from datetime import datetime
from utils.logger import get_logger

logger = get_logger(__name__)

def show_short_term_trading_tab(db, market_condition):
    """
    Display the Short Term Trading tab content
    
    Args:
        db: MongoDB connection
        market_condition: Market condition dictionary
    """
    st.header("Short Term Trading Scanner")
    
    # Scan configuration
    with st.expander("Scan Configuration", expanded=True):
        col1, col2 = st.columns([2, 1])
        
        with col1:
            # Pre-defined scans from ChartInk
            st.subheader("Select Pre-defined Scan")
            
            # Get available scans from config
            # Add error handling for SWING_QUERIES format
            try:
                from config.queries import SWING_QUERIES
                # Check if SWING_QUERIES is a dictionary
                if isinstance(SWING_QUERIES, dict):
                    available_scans = list(SWING_QUERIES.keys())
                else:
                    # Handle case where SWING_QUERIES might be a list
                    available_scans = [query['name'] for query in SWING_QUERIES] if SWING_QUERIES else []
                    # Convert to dict format if it's a list
                    queries_dict = {query['name']: {'query': query['query'], 'description': query.get('description', '')} 
                                   for query in SWING_QUERIES} if SWING_QUERIES else {}
                
                # Add "Custom" option
                available_scans.append("Custom")
            except Exception as e:
                logger.error(f"Error processing SWING_QUERIES: {e}")
                available_scans = ["Custom"]  # Fallback to just custom
            
            # Select scan
            selected_scan = st.selectbox(
                "Select Scan Pattern",
                options=available_scans,
                index=0
            )
            
            # If custom scan selected, show query input
            if selected_scan == "Custom":
                custom_query = st.text_area(
                    "Enter Custom ChartInk Query",
                    height=150,
                    help="Enter ChartInk query formula. Example: close > sma(close,20) and volume > sma(volume,20)*1.5"
                )
            else:
                # Show description of selected scan
                st.info(f"**{selected_scan}**: {SWING_QUERIES[selected_scan].get('description', 'No description available')}")
        
        with col2:
            # Additional filters
            st.subheader("Additional Filters")
            
            # Market cap filter
            market_cap = st.selectbox(
                "Market Cap",
                options=["All", "Large Cap", "Mid Cap", "Small Cap"],
                index=0
            )
            
            # Sector filter
            sector = st.selectbox(
                "Sector",
                options=["All", "IT", "Banking", "Pharma", "Auto", "FMCG", "Metal", "Oil & Gas"],
                index=0
            )
            
            # Min volume filter
            min_volume = st.number_input(
                "Minimum Volume (in lacs)",
                min_value=1,
                value=5,
                step=1
            )
    
    # Scan execution area
    st.subheader("Run Scan")
    
    col1, col2 = st.columns([3, 1])
    
    with col1:
        # Information about current market condition
        market_status = market_condition.get("market_status", "Unknown")
        trend = market_condition.get("trend", "Unknown")
        
        # Display market condition with color coding
        status_color = "green" if market_status == "Bullish" else "red" if market_status == "Bearish" else "orange"
        trend_color = "green" if trend == "Uptrend" else "red" if trend == "Downtrend" else "orange"
        
        st.markdown(f"""
        **Current Market Condition:** <span style="color:{status_color}">{market_status}</span>  
        **Trend:** <span style="color:{trend_color}">{trend}</span>
        """, unsafe_allow_html=True)
        
        # Recommended scan based on market condition
        if market_status == "Bullish" and trend == "Uptrend":
            st.markdown("**Recommended:** Breakout, Momentum, Flag patterns")
        elif market_status == "Bullish" and trend == "Downtrend":
            st.markdown("**Recommended:** Reversal, Double Bottom patterns")
        elif market_status == "Bearish" and trend == "Uptrend":
            st.markdown("**Recommended:** Pullback, Consolidation patterns")
        elif market_status == "Bearish" and trend == "Downtrend":
            st.markdown("**Recommended:** Short setups, Breakdown patterns")
    
    with col2:
        # Scan button
        scan_button = st.button("Run Scan", use_container_width=True)
    
    # Execute scan
    if scan_button:
        with st.spinner("Scanning for swing trading opportunities..."):
            try:
                from config.queries import SWING_QUERIES
                from data.chartink import get_chartink_scans, get_stocks_with_fallback
                from datetime import datetime, timedelta
                
                # Get query based on selection
                if selected_scan == "Custom":
                    query = custom_query
                    query_name = "Custom"
                else:
                    query = SWING_QUERIES[selected_scan]["query"]
                    query_name = selected_scan
                
                # Add scan to session state to navigate to results tab
                st.session_state["latest_scan"] = {
                    "query_name": query_name,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                
                # Try the new function if available, fall back to old function if not
                try:
                    # First try to use get_chartink_scans for direct query
                    df = get_chartink_scans(query)
                except (AttributeError, ImportError):
                    # Fall back to get_stocks_with_fallback if get_chartink_scans not available
                    # Create a temporary dictionary with just this query
                    temp_queries = {query_name: {"query": query, "description": "Custom query"}}
                    df, used_query_name = get_stocks_with_fallback(temp_queries)
                
                if df is None or df.empty:
                    st.error("No stocks found matching the criteria")
                else:
                    # Apply additional filters
                    if market_cap != "All":
                        # Implement market cap filtering (this is placeholder)
                        st.info(f"Filter by {market_cap} applied")
                    
                    if sector != "All":
                        # Implement sector filtering (this is placeholder)
                        st.info(f"Filter by {sector} applied")
                    
                    # Apply min volume filter
                    if "volume" in df.columns:
                        df = df[df["volume"] >= min_volume * 100000]
                    
                    # Save to MongoDB with timestamp and query info
                    for _, row in df.iterrows():
                        stock_data = {
                            "symbol": row["nsecode"],
                            "name": row.get("name", ""),
                            "close": float(row["close"]),
                            "change": float(row.get("per_chg", 0)) if "per_chg" in row else 0,
                            "volume": float(row.get("volume", 0)) if "volume" in row else 0,
                            "scan_type": "swing",
                            "query_name": query_name,
                            "timestamp": datetime.now()
                        }
                        
                        db.save_scan_result(stock_data)
                    
                    # Show success message and link to results tab
                    st.success(f"Found {len(df)} stocks matching criteria")
                    st.markdown("Click on the **Results** tab to view scan results")
            
            except Exception as e:
                st.error(f"Error running scan: {e}")
                logger.error(f"Scan error: {e}") 