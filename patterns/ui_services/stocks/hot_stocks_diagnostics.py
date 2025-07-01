"""
Diagnostic tools for hot stocks component
"""

import streamlit as st
import pandas as pd
from utils.logger import get_logger

logger = get_logger(__name__)

def show_diagnostics(data_service):
    """
    Display diagnostic tools for the hot stocks component
    
    Args:
        data_service: Data service instance
    """
    st.subheader("🔧 ChartInk Diagnostics")
    
    # Display data service info
    st.write(f"**Data Service Type:** `{type(data_service).__name__}`")
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Get CHARTINK_QUERIES - first try from data_service, then try import
        if hasattr(data_service, 'get_available_queries'):
            available_queries = data_service.get_available_queries()
            st.write(f"**Available Queries:** {len(available_queries)}")
        else:
            try:
                from data.top_stocks_service import CHARTINK_QUERIES
                available_queries = CHARTINK_QUERIES
                st.write(f"**Imported Queries:** {len(available_queries)}")
            except ImportError:
                st.error("Could not import CHARTINK_QUERIES")
                available_queries = {}
        
        if available_queries:
            if st.button("Test All Queries"):
                if hasattr(data_service, 'test_chartink_query'):
                    with st.spinner("Testing all queries..."):
                        for query_key in available_queries:
                            st.write(f"Testing query: **{query_key}**")
                            result = data_service.test_chartink_query(query_key)
                            status = "✅ Success" if result.get('success') else "❌ Failed"
                            st.write(f"Status: {status}")
                            st.write(f"Results: {result.get('row_count', 0)} rows")
                            if result.get('sample_rows'):
                                st.write("Sample:")
                                st.dataframe(pd.DataFrame(result.get('sample_rows')))
                            st.divider()
                else:
                    st.error("Data service doesn't have test_chartink_query method")
    
    with col2:
        if available_queries:
            test_query = st.selectbox("Select Query to Test", options=list(available_queries.keys()))
            
            if st.button("Test Single Query"):
                if hasattr(data_service, 'test_chartink_query'):
                    with st.spinner(f"Testing query: {test_query}"):
                        result = data_service.test_chartink_query(test_query)
                        st.json(result)
                else:
                    st.error("Data service doesn't have test_chartink_query method")
        else:
            st.warning("No queries available for testing")

    with st.expander("Advanced Options"):
        if st.button("🔄 Force Complete Refresh"):
            # Clear all caches
            if hasattr(data_service, 'clear'):
                data_service.clear()
                st.success("Cleared data service cache")
            else:
                st.warning("data_service.clear not available")
            
            # Reset session state
            if "hot_stocks_data" in st.session_state:
                del st.session_state.hot_stocks_data
                st.success("Reset hot_stocks_data in session state")
                
            if "hot_stocks_data_source" in st.session_state:
                del st.session_state.hot_stocks_data_source
                st.success("Reset hot_stocks_data_source in session state")
            
            # Set flag for manual refresh
            st.session_state.clear_top_stocks_cache = True
            
            # Force service to re-fetch
            try:
                data_service.last_data_source = "Refreshing..."
                stocks = data_service.get_hot_swing_stocks(limit=10)
                st.success(f"Refreshed data, new source: {data_service.last_data_source}")
            except Exception as e:
                st.error(f"Refresh error: {e}")
            
            st.experimental_rerun() 