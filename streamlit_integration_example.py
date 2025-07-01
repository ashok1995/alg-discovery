"""
Example Streamlit Application integrating with AlgoDiscovery Backend
===================================================================

This is an example showing how to integrate the AlgoDiscovery backend
into your external Streamlit application.

To use this in your external Streamlit app:
1. Copy algodiscovery_client.py to your Streamlit project directory
2. Import and use the client as shown below
3. Make sure the AlgoDiscovery backend is running on localhost:8888

Usage:
    streamlit run streamlit_integration_example.py
"""

import streamlit as st
import sys
import os

# Add the current directory to Python path so we can import the client
# (You would adjust this path to point to where algodiscovery_client.py is located)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from algodiscovery_client import (
    AlgoDiscoveryClient, 
    display_recommendations_table, 
    display_market_status, 
    display_api_info,
    format_recommendations_dataframe
)

# Configure the Streamlit page
st.set_page_config(
    page_title="My Trading App - AlgoDiscovery Integration",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better styling
st.markdown("""
<style>
    .main {padding-top: 1rem;}
    footer {visibility: hidden;}
    .metric-container {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 0.5rem 0;
    }
</style>
""", unsafe_allow_html=True)

def main():
    """Main Streamlit application with AlgoDiscovery integration."""
    
    st.title("🎯 My Trading Dashboard")
    st.markdown("*Powered by AlgoDiscovery Backend*")
    
    # Initialize the AlgoDiscovery client
    # You can change the base_url if your backend is running elsewhere
    client = AlgoDiscoveryClient(base_url="http://localhost:8888")
    
    # Display API connection info in the sidebar
    display_api_info(client)
    
    # Add settings in sidebar
    st.sidebar.markdown("### ⚙️ Settings")
    refresh_interval = st.sidebar.selectbox(
        "Auto-refresh interval:", 
        ["30 seconds", "1 minute", "2 minutes", "5 minutes", "Disabled"],
        index=1
    )
    
    show_detailed_view = st.sidebar.checkbox("Show detailed view", value=True)
    
    # Add some info about your app
    st.sidebar.markdown("### ℹ️ About")
    st.sidebar.info(
        "This dashboard integrates with the AlgoDiscovery backend "
        "to provide real-time trading recommendations and market analysis."
    )
    
    # Create tabs for different sections
    tab1, tab2, tab3, tab4 = st.tabs([
        "📊 Dashboard", 
        "📈 Recommendations", 
        "💰 My Stocks", 
        "⚙️ Settings"
    ])
    
    with tab1:
        st.markdown("## 📊 Market Overview")
        
        # Display market status
        display_market_status(client)
        
        st.markdown("---")
        
        # You can add your own custom widgets here
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.markdown("### 🔥 Quick Stats")
            # Example of fetching individual data
            health = client.health_check()
            if health.get("status") == "healthy":
                st.success("Backend: Online")
            else:
                st.error("Backend: Offline")
        
        with col2:
            st.markdown("### 📈 Your Portfolio")
            # You can integrate your own portfolio data here
            st.info("Portfolio integration coming soon...")
        
        with col3:
            st.markdown("### 🚨 Alerts")
            # You can add your own alert system here
            st.info("No new alerts")
    
    with tab2:
        st.markdown("## 📈 Live Trading Recommendations")
        
        # Use the pre-built recommendations table component
        auto_refresh = refresh_interval != "Disabled"
        display_recommendations_table(
            client, 
            limit=15, 
            auto_refresh=auto_refresh
        )
    
    with tab3:
        st.markdown("## 💰 My Stock Watchlist")
        
        # Example of how to fetch data for specific stocks
        watchlist_symbols = st.text_input(
            "Enter symbols (comma-separated):", 
            value="AAPL,MSFT,GOOGL,TCS.NS,RELIANCE.NS",
            help="Enter stock symbols separated by commas"
        )
        
        if watchlist_symbols:
            symbols = [s.strip().upper() for s in watchlist_symbols.split(",")]
            
            if st.button("🔄 Refresh Watchlist"):
                with st.spinner("Fetching watchlist data..."):
                    # Fetch data for multiple stocks
                    watchlist_data = client.get_multiple_stocks(symbols)
                    
                    if watchlist_data:
                        st.success(f"✅ Loaded data for {len(symbols)} stocks")
                        
                        # Display in a nice format
                        for symbol in symbols:
                            if symbol in watchlist_data.get("data", {}):
                                stock_data = watchlist_data["data"][symbol]
                                
                                with st.expander(f"📊 {symbol}", expanded=False):
                                    col1, col2, col3, col4 = st.columns(4)
                                    
                                    with col1:
                                        st.metric("Price", f"${stock_data.get('current_price', 'N/A')}")
                                    with col2:
                                        change = stock_data.get('change', 0)
                                        st.metric("Change", f"${change:.2f}", delta=change)
                                    with col3:
                                        volume = stock_data.get('volume', 0)
                                        st.metric("Volume", f"{volume:,}")
                                    with col4:
                                        # You can add a buy/sell recommendation button here
                                        if st.button(f"📈 Get Analysis", key=f"analyze_{symbol}"):
                                            # Fetch detailed analysis for this stock
                                            analysis = client.get_stock_data(symbol)
                                            if analysis:
                                                st.json(analysis)
                            else:
                                st.warning(f"⚠️ No data available for {symbol}")
                    else:
                        st.error("❌ Failed to fetch watchlist data")
    
    with tab4:
        st.markdown("## ⚙️ Configuration")
        
        st.markdown("### 🔌 Backend Connection")
        
        # Allow users to configure the backend URL
        current_url = st.text_input("Backend URL:", value=client.base_url)
        
        if st.button("🔍 Test Connection"):
            test_client = AlgoDiscoveryClient(base_url=current_url)
            health = test_client.health_check()
            
            if health.get("status") == "healthy":
                st.success("✅ Connection successful!")
                st.json(health)
            else:
                st.error(f"❌ Connection failed: {health.get('message', 'Unknown error')}")
        
        st.markdown("### 📊 Data Preferences")
        
        # Add some user preferences
        default_limit = st.number_input("Default recommendations limit:", min_value=5, max_value=50, value=10)
        show_confidence_threshold = st.slider("Minimum confidence level:", 0, 100, 50)
        
        if st.button("💾 Save Preferences"):
            # You can save these preferences to a file or database
            st.success("✅ Preferences saved!")
        
        st.markdown("### 🚀 Available Endpoints")
        
        # Show available API endpoints
        with st.expander("📋 API Endpoints Reference"):
            endpoints = {
                "Health Check": "/health",
                "Buy Recommendations": "/api/intraday/buy-recommendations",
                "Sell Recommendations": "/api/intraday/sell-recommendations", 
                "Recommendations Table": "/api/intraday/recommendations-table",
                "Stock Data": "/api/stock/{symbol}",
                "Yahoo Finance": "/api/yahoo/{symbol}/price",
                "Market Status": "/api/market-status",
                "Multiple Stocks": "/api/stocks/multiple"
            }
            
            for name, endpoint in endpoints.items():
                st.code(f"{name}: {client.base_url}{endpoint}")


def quick_recommendations_sidebar():
    """Add a quick recommendations sidebar widget."""
    st.sidebar.markdown("### 🚀 Quick Recommendations")
    
    client = AlgoDiscoveryClient()
    
    # Get a few buy recommendations
    buy_recs = client.get_buy_recommendations(limit=3)
    
    if buy_recs:
        st.sidebar.markdown("**🟢 Top Buy Signals:**")
        for i, rec in enumerate(buy_recs[:3], 1):
            confidence = rec.get('confidence', 0)
            symbol = rec.get('symbol', 'N/A')
            price = rec.get('current_price', 0)
            
            # Color code by confidence
            if confidence >= 70:
                color = "🟢"
            elif confidence >= 50:
                color = "🟡" 
            else:
                color = "🔴"
                
            st.sidebar.markdown(
                f"{color} **{symbol}** - ${price:.2f} ({confidence:.0f}% conf.)"
            )
    else:
        st.sidebar.info("No buy recommendations available")


if __name__ == "__main__":
    # Run the main app
    main()
    
    # Add the quick recommendations sidebar
    quick_recommendations_sidebar() 