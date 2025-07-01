#ui_services/stocks/hot_stocks.py
"""
Enhanced hot stocks component with ChartInk integration and improved UI
"""

import streamlit as st
from datetime import datetime, timedelta
from utils.logger import get_logger
from ui_services.stocks.hot_stocks_ui import apply_styles, show_stock_popup, show_buy_form
from ui_services.stocks.hot_stocks_table import display_stock_table, create_hidden_buttons
from ui_services.stocks.hot_stocks_utils import add_to_watchlist
from ui_services.stocks.hot_stocks_data import fetch_stocks_data, normalize_stock_data
from ui_services.stocks.hot_stocks_strategy import setup_strategy_selection
from ui_services.stocks.hot_stocks_diagnostics import show_diagnostics

logger = get_logger(__name__)

def show_hot_stocks(data_service, title="🔥 Hot Swing Trade Stocks"):
    """
    Display the hot stocks component with auto-refresh and strategy filtering
    
    Args:
        data_service: Data service instance
        title: Optional custom title for the component
    """
    logger.info(f"HOT STOCKS received data_service of type: {type(data_service).__name__}")
    
    st.subheader(title)
    apply_styles()
    
    # Initialize session state
    if "hot_stocks_data" not in st.session_state:
        st.session_state.hot_stocks_data = None
    if "hot_stocks_last_updated" not in st.session_state:
        st.session_state.hot_stocks_last_updated = datetime.now().strftime("%H:%M:%S")
    if "hot_stocks_data_source" not in st.session_state:
        st.session_state.hot_stocks_data_source = "Unknown"
    if "selected_stock" not in st.session_state:
        st.session_state.selected_stock = None
    if "buy_form_active" not in st.session_state:
        st.session_state.buy_form_active = False
    
    # Setup strategy selection and get selected strategy
    selected_strategy, strategy_changed = setup_strategy_selection(data_service)
    
    # Only fetch new data if we don't have data, strategy changed, or refresh requested
    should_fetch_new_data = (
        st.session_state.hot_stocks_data is None or 
        strategy_changed or 
        st.session_state.get('clear_top_stocks_cache', False)
    )
    
    if should_fetch_new_data:
        # Fetch and process stocks data
        hot_stocks, data_source = fetch_stocks_data(data_service, selected_strategy)
        if not hot_stocks:
            return
        
        # Update session state with data
        st.session_state.hot_stocks_data = hot_stocks
        st.session_state.hot_stocks_data_source = data_source
        st.session_state.hot_stocks_last_updated = datetime.now().strftime("%H:%M:%S")
        st.session_state.clear_top_stocks_cache = False
    else:
        # Use cached data
        hot_stocks = st.session_state.hot_stocks_data
        data_source = st.session_state.hot_stocks_data_source
    
    # Show data source and refresh info
    show_data_source_info(data_source)
    
    # Normalize stock data to ensure all required fields are present
    normalize_stock_data(hot_stocks)
    
    # Display the stock table
    selected_stock = st.session_state.get('selected_stock', None)
    display_stock_table(hot_stocks, selected_stock)
    
    # Create hidden buttons for JavaScript interaction
    create_hidden_buttons(hot_stocks)
    
    # Show buy form if active
    if st.session_state.buy_form_active and st.session_state.selected_stock:
        show_buy_form(st.session_state.selected_stock, hot_stocks)
    
    # Show stock popup if requested
    if st.session_state.get('show_stock_popup', False) and st.session_state.get('selected_stock'):
        show_stock_popup(st.session_state.selected_stock, hot_stocks, data_service)
    
    # Show trading popup if requested
    if st.session_state.get('show_trade_popup', False) and st.session_state.get('trading_symbol'):
        from ui_services.trading.paper_trade import show_paper_trade_popup
        show_paper_trade_popup(st.session_state.trading_symbol, data_service)
    
    # Display success notification if order was just placed
    if st.session_state.get('order_success', False):
        symbol = st.session_state.order_symbol
        quantity = st.session_state.order_quantity
        st.success(f"✅ Successfully bought {quantity} shares of {symbol}!")
        st.session_state.order_success = False
        st.session_state.order_symbol = None
        st.session_state.order_quantity = None

    # Diagnostic tools (hidden by default)
    if st.checkbox("Show Diagnostic Tools", value=False):
        show_diagnostics(data_service)

def show_data_source_info(data_source):
    """Display data source information and refresh options"""
    # Calculate next refresh time
    next_refresh = (datetime.now() + timedelta(minutes=5)).strftime("%H:%M:%S")

    # Show last updated time and source
    col_info1, col_info2, col_info3 = st.columns([1, 1, 2])
    with col_info1:
        st.caption(f"Last updated: {st.session_state.hot_stocks_last_updated}")
    with col_info2:
        st.caption(f"Next refresh: {next_refresh}")
    with col_info3:
        source_icon = "❓" if "Unknown" in data_source or "No Source" in data_source else ""
        st.caption(f"Source: {source_icon} {data_source}")
    
    # Data source information with refresh button
    col1, col2 = st.columns([3, 1])
    with col1:
        source_name = st.session_state.hot_stocks_data_source
        source_icon = "🔥" if "ChartInk" in source_name else "📊" if "Test" in source_name else "❓"
        st.info(f"{source_icon} **Data Source:** {source_name}")
    with col2:
        if st.button("🔄 Force Refresh", key="force_source_refresh"):
            if hasattr(data_service, 'clear'):
                data_service.clear()
            st.session_state.clear_top_stocks_cache = True
            st.experimental_rerun()

# Wrapper function for backward compatibility
def display_hot_stocks(data_service, title="🔥 Hot Swing Trade Stocks"):
    """Wrapper function to maintain compatibility with existing code"""
    show_hot_stocks(data_service, title)