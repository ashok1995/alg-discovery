""" Swing Trading Page """
import streamlit as st
from utils.logger import get_logger
from ui_services.stocks.hot_stocks import show_hot_stocks
from dashboard.page_modules.swing_watchlist import show_swing_watchlist
from utils.data_wrapper import ensure_data_service, get_data_service
from data.top_stocks_service import TopStocksService

logger = get_logger(__name__, group="dashboard", service="page_swing")

def show_swing_page(data_service=None):
    """
    Display the Swing Trading page
    
    Args:
        data_service: Optional data service instance
    """
    if data_service is None:
        # Create data service if not provided
        from data.top_stocks_service import TopStocksService
        data_service = TopStocksService()
    
    # Ensure data_service has required methods
    data_service = ensure_data_service(data_service)
    
    # Display page content
    st.title("🔄 Swing Trading")
    
    # Create a layout with two columns - main content and positions
    main_col, positions_col = st.columns([7, 3])
    
    with main_col:
        # Create tabs for different swing trading components
        tabs = st.tabs(["Hot Stocks", "Watchlist", "Screener", "Performance"])
        
        # Tab 1: Hot Stocks
        with tabs[0]:
            show_hot_stocks(data_service)
        
        # Tab 2: Watchlist
        with tabs[1]:
            show_swing_watchlist(data_service)
        
        # Tab 3: Screener
        with tabs[2]:
            show_screener(data_service)
        
        # Tab 4: Performance
        with tabs[3]:
            show_performance_stats(data_service)
    
    # Right column for current positions
    with positions_col:
        show_current_positions(data_service)

def show_performance_stats(data_service):
    """Show performance statistics"""
    st.subheader("📊 Performance")
    
    # Create metrics in columns
    col1, col2 = st.columns(2)
    
    with col1:
        st.metric(
            label="Win Rate", 
            value="68%",
            delta="4%"
        )
        
        st.metric(
            label="Avg. Hold", 
            value="4.2 days"
        )
    
    with col2:
        st.metric(
            label="Profit Factor", 
            value="1.8",
            delta="0.3"
        )
        
        st.metric(
            label="Avg. Win/Loss", 
            value="1.5"
        )

def show_screener(data_service):
    """Show stock screener component"""
    st.subheader("🔍 Stock Screener")
    
    # Example screener filters
    col1, col2 = st.columns(2)
    
    with col1:
        st.slider("Price Range ($)", 0, 500, (10, 100))
        st.slider("Volume (M)", 0, 100, (1, 50))
    
    with col2:
        st.selectbox("Sector", ["All", "Technology", "Healthcare", "Consumer", "Finance", "Energy"])
        st.multiselect("Technical Patterns", ["Breakout", "Cup & Handle", "MACD Cross", "Golden Cross"])
    
    # Run screener button
    if st.button("Run Screener"):
        st.info("Screener results would appear here")
        # In the actual implementation, you would call a method to run the screener
        # and display the results

def show_current_positions(data_service):
    """Show current trading positions"""
    st.subheader("💼 Current Positions")
    
    # Example positions data - in real implementation, you would fetch this from your data service
    positions = [
        {"symbol": "AAPL", "entry": 175.23, "current": 182.45, "gain": 4.12, "days": 3},
        {"symbol": "MSFT", "entry": 325.68, "current": 337.21, "gain": 3.54, "days": 2},
        {"symbol": "AMZN", "entry": 143.56, "current": 141.24, "gain": -1.62, "days": 4}
    ]
    
    # Display positions in a clean format
    for pos in positions:
        with st.container():
            col1, col2 = st.columns([1, 1])
            
            with col1:
                st.subheader(pos["symbol"])
                st.caption(f"{pos['days']} days")
            
            with col2:
                gain_color = "green" if pos["gain"] > 0 else "red"
                gain_sign = "+" if pos["gain"] > 0 else ""
                st.markdown(f"<h3 style='color:{gain_color};text-align:right'>{gain_sign}{pos['gain']}%</h3>", 
                            unsafe_allow_html=True)
            
            st.markdown(f"Entry: ${pos['entry']} | Current: ${pos['current']}")
            st.progress(min(max(pos["gain"] + 10, 0) / 20, 1.0))  # Scale for progress bar
            st.divider()
    
    # Total portfolio stats
    st.markdown("### Portfolio")
    col1, col2 = st.columns(2)
    
    with col1:
        st.metric(label="Total P/L", value="+2.43%", delta="+0.88% today")
    
    with col2:
        st.metric(label="Positions", value="3/10")

def show():
    """Show swing trading page content"""
    # Create a dedicated TopStocksService for this page
    data_service = TopStocksService()
    
    # Display the enhanced swing trading page
    show_swing_page(data_service)

# If you have an existing function with a different name, add this line:
show_swing_page = show_swing_page  # Create an alias