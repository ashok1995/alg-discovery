"""
Strategy selection functionality for hot stocks component
"""

import streamlit as st
from utils.logger import get_logger

logger = get_logger(__name__)

def setup_strategy_selection(data_service):
    """
    Set up strategy selection UI and return the selected strategy
    
    Args:
        data_service: Data service instance
        
    Returns:
        Tuple of (selected_strategy, strategy_changed)
    """
    # Initialize session state for strategy tracking
    if "previous_strategy" not in st.session_state:
        st.session_state.previous_strategy = None
    
    # Default return values
    selected_strategy = None
    strategy_changed = False
    
    # Check if data service supports strategy queries
    has_strategy_selection = hasattr(data_service, 'get_available_queries')
    
    # Create UI for strategy selection if available
    if has_strategy_selection:
        try:
            available_queries = data_service.get_available_queries()
            
            # Display strategy selector in the header area
            col1, col2, col3 = st.columns([2, 3, 1])
            
            with col1:
                # Only show if we have strategies
                if available_queries:
                    # Add special options at the beginning
                    strategy_options = [
                        "🌊 Smart Waterfall",
                        "All Strategies"
                    ] + [q["name"] for q in available_queries.values()]
                    
                    selected_strategy_name = st.selectbox(
                        "Trading Strategy",
                        options=strategy_options,
                        index=0  # Default to Waterfall 
                    )
                    
                    # Find the strategy key based on selection
                    if selected_strategy_name == "🌊 Smart Waterfall":
                        selected_strategy = "waterfall"
                    elif selected_strategy_name != "All Strategies":
                        for key, data in available_queries.items():
                            if data["name"] == selected_strategy_name:
                                selected_strategy = key
                                break
            
            with col3:
                # Refresh button
                if st.button("🔄 Refresh", key="refresh_hot_stocks"):
                    st.session_state.clear_top_stocks_cache = True
                    st.experimental_rerun()
            
            # Show description of selected strategy
            if selected_strategy and selected_strategy in available_queries:
                desc = available_queries[selected_strategy].get("description", "")
                if desc:
                    st.caption(desc)
            
            # Check if strategy changed
            if st.session_state.previous_strategy != selected_strategy:
                strategy_changed = True
                st.session_state.previous_strategy = selected_strategy
                logger.info(f"Strategy changed to: {selected_strategy}")
                
        except Exception as e:
            logger.error(f"Error setting up strategy selection: {e}")
    
    # Show minimal ChartInk connectivity status
    if hasattr(data_service, 'chartink_available'):
        conn_status = data_service.chartink_available
        # Add a small status indicator in the corner 
        status_color = "green" if conn_status else "red"
        status_tooltip = "ChartInk Connected" if conn_status else "ChartInk Unavailable"
        
        st.markdown(
            f"""
            <div style="display: flex; justify-content: flex-end;">
                <div title="{status_tooltip}" style="
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background-color: {status_color};
                    margin-right: 5px;
                    cursor: help;
                "></div>
            </div>
            """, 
            unsafe_allow_html=True
        )
        
        # Only show retry button if disconnected
        if not conn_status:
            if st.button("🔄 Retry Connection"):
                try:
                    result = data_service.test_chartink_connection()
                    if result["success"]:
                        data_service.chartink_available = True
                        st.success("✅ Connection restored!")
                        st.experimental_rerun()
                    else:
                        st.error(f"Still can't connect to ChartInk")
                except Exception as e:
                    st.error(f"Error: {e}")
    
    return selected_strategy, strategy_changed 