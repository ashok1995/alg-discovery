"""
Global Markets Overview component for the Market Analyzer dashboard
"""

import streamlit as st
from utils.logger import get_logger

# Initialize logger
logger = get_logger(__name__, group="dashboard", service="global_market_overview")

def render_global_market_overview(market_data=None, position="main"):
    """
    Render the global markets overview section
    
    Args:
        market_data: Dictionary containing global market data
        position: Where the component is positioned ("main" or "sidebar")
    """
    try:
        # Use default values if no data provided
        if market_data is None:
            market_data = {
                "us_markets": [
                    {"name": "S&P 500", "value": "5,123.45", "change": 0.85, "status": "positive"},
                    {"name": "Nasdaq", "value": "16,789.32", "change": 1.25, "status": "positive"},
                    {"name": "Dow Jones", "value": "38,456.78", "change": 0.45, "status": "positive"}
                ],
                "european_markets": [
                    {"name": "FTSE 100", "value": "7,845.21", "change": -0.32, "status": "negative"},
                    {"name": "DAX", "value": "18,321.43", "change": 0.22, "status": "positive"},
                    {"name": "CAC 40", "value": "8,012.35", "change": -0.15, "status": "negative"}
                ],
                "asian_markets": [
                    {"name": "Nikkei 225", "value": "36,789.56", "change": 1.75, "status": "positive"},
                    {"name": "Hang Seng", "value": "19,321.67", "change": -0.92, "status": "negative"},
                    {"name": "Shanghai", "value": "3,150.12", "change": 0.37, "status": "positive"}
                ]
            }
        
        # CSS for styling
        st.markdown("""
        <style>
        .global-markets-title {
            color: white;
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 15px;
        }
        .region-title {
            color: #94a3b8;
            font-size: 0.9rem;
            font-weight: 600;
            margin: 10px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .market-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }
        .market-name {
            color: white;
            font-weight: 500;
        }
        .market-value {
            color: #e2e8f0;
        }
        .market-change {
            width: 60px;
            text-align: right;
            font-weight: 600;
        }
        .sidebar-market-row {
            padding: 8px 0;
            border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }
        .sidebar-market-name {
            color: white;
            font-weight: 500;
            font-size: 0.9rem;
            display: flex;
            justify-content: space-between;
        }
        .sidebar-market-details {
            display: flex;
            justify-content: space-between;
            margin-top: 3px;
        }
        .sidebar-market-value {
            color: #e2e8f0;
            font-size: 0.85rem;
        }
        .positive {
            color: #10b981;
        }
        .negative {
            color: #ef4444;
        }
        </style>
        """, unsafe_allow_html=True)
        
        # Different layouts for sidebar vs main content
        if position == "sidebar":
            # Section title for sidebar
            st.markdown('<div class="global-markets-title">Global Markets</div>', unsafe_allow_html=True)
            
            # Create a container with background
            st.markdown('<div style="background-color: rgba(30, 41, 59, 0.7); border-radius: 10px; padding: 15px; margin-bottom: 20px;">', unsafe_allow_html=True)
            
            # Region titles and markets - vertical layout for sidebar
            # US Markets
            st.markdown('<div class="region-title">US Markets</div>', unsafe_allow_html=True)
            
            for market in market_data["us_markets"]:
                change_class = "positive" if market["status"] == "positive" else "negative"
                change_sign = "+" if market["status"] == "positive" else ""
                
                st.markdown(f"""
                <div class="sidebar-market-row">
                    <div class="sidebar-market-name">
                        {market["name"]}
                    </div>
                    <div class="sidebar-market-details">
                        <div class="sidebar-market-value">{market["value"]}</div>
                        <div class="market-change {change_class}">{change_sign}{market["change"]}%</div>
                    </div>
                </div>
                """, unsafe_allow_html=True)
            
            # European Markets
            st.markdown('<div class="region-title">European Markets</div>', unsafe_allow_html=True)
            
            for market in market_data["european_markets"]:
                change_class = "positive" if market["status"] == "positive" else "negative"
                change_sign = "+" if market["status"] == "positive" else ""
                
                st.markdown(f"""
                <div class="sidebar-market-row">
                    <div class="sidebar-market-name">
                        {market["name"]}
                    </div>
                    <div class="sidebar-market-details">
                        <div class="sidebar-market-value">{market["value"]}</div>
                        <div class="market-change {change_class}">{change_sign}{market["change"]}%</div>
                    </div>
                </div>
                """, unsafe_allow_html=True)
            
            # Asian Markets
            st.markdown('<div class="region-title">Asian Markets</div>', unsafe_allow_html=True)
            
            for market in market_data["asian_markets"]:
                change_class = "positive" if market["status"] == "positive" else "negative"
                change_sign = "+" if market["status"] == "positive" else ""
                
                st.markdown(f"""
                <div class="sidebar-market-row">
                    <div class="sidebar-market-name">
                        {market["name"]}
                    </div>
                    <div class="sidebar-market-details">
                        <div class="sidebar-market-value">{market["value"]}</div>
                        <div class="market-change {change_class}">{change_sign}{market["change"]}%</div>
                    </div>
                </div>
                """, unsafe_allow_html=True)
            
            # Close the container div
            st.markdown('</div>', unsafe_allow_html=True)
        
        else:
            # Standard layout for main content area
            # Section title
            st.markdown('<div class="global-markets-title">Global Markets Overview</div>', unsafe_allow_html=True)
            
            # Create a container with background
            with st.container():
                st.markdown('<div style="background-color: rgba(51, 65, 85, 0.8); border-radius: 10px; padding: 20px; margin-bottom: 20px;">', unsafe_allow_html=True)
                
                # Create 3 columns for different regions
                col1, col2, col3 = st.columns(3)
                
                # US Markets
                with col1:
                    st.markdown('<div class="region-title">US Markets</div>', unsafe_allow_html=True)
                    
                    for market in market_data["us_markets"]:
                        change_class = "positive" if market["status"] == "positive" else "negative"
                        change_sign = "+" if market["status"] == "positive" else ""
                        
                        st.markdown(f"""
                        <div class="market-row">
                            <div class="market-name">{market["name"]}</div>
                            <div class="market-value">{market["value"]}</div>
                            <div class="market-change {change_class}">{change_sign}{market["change"]}%</div>
                        </div>
                        """, unsafe_allow_html=True)
                
                # European Markets
                with col2:
                    st.markdown('<div class="region-title">European Markets</div>', unsafe_allow_html=True)
                    
                    for market in market_data["european_markets"]:
                        change_class = "positive" if market["status"] == "positive" else "negative"
                        change_sign = "+" if market["status"] == "positive" else ""
                        
                        st.markdown(f"""
                        <div class="market-row">
                            <div class="market-name">{market["name"]}</div>
                            <div class="market-value">{market["value"]}</div>
                            <div class="market-change {change_class}">{change_sign}{market["change"]}%</div>
                        </div>
                        """, unsafe_allow_html=True)
                
                # Asian Markets
                with col3:
                    st.markdown('<div class="region-title">Asian Markets</div>', unsafe_allow_html=True)
                    
                    for market in market_data["asian_markets"]:
                        change_class = "positive" if market["status"] == "positive" else "negative"
                        change_sign = "+" if market["status"] == "positive" else ""
                        
                        st.markdown(f"""
                        <div class="market-row">
                            <div class="market-name">{market["name"]}</div>
                            <div class="market-value">{market["value"]}</div>
                            <div class="market-change {change_class}">{change_sign}{market["change"]}%</div>
                        </div>
                        """, unsafe_allow_html=True)
                
                # Close the container div
                st.markdown('</div>', unsafe_allow_html=True)
    
    except Exception as e:
        logger.error(f"Error rendering global markets overview: {e}")
        st.error("Unable to display global markets overview") 