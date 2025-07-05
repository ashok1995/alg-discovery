"""
Trading Day Summary component for the Market Analyzer dashboard
"""

import streamlit as st
from utils.logger import get_logger

# Initialize logger
logger = get_logger(__name__, group="dashboard", service="trading_day_summary")

def render_trading_day_summary(market_data=None):
    """
    Render the trading day summary section with advance/decline metrics
    
    Args:
        market_data: Dictionary containing market summary data
    """
    try:
        # Use default values if no data provided
        if market_data is None:
            market_data = {
                "advancing": 1238,
                "declining": 762,
                "unchanged": 127,
                "volume": "95,432",
                "volume_change": 21.6,
                "market_breadth": 0.62,
                "advance_percent": 58.2,
                "decline_percent": 35.8,
                "new_highs": 45,
                "new_lows": 12
            }
        
        # CSS for styling - simpler version
        st.markdown("""
        <style>
        .trading-summary-title {
            color: white;
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 15px;
        }
        .metric-card {
            background-color: rgba(30, 41, 59, 0.7);
            border-radius: 8px;
            padding: 10px;
            text-align: center;
            height: 100%;
        }
        .metric-name {
            color: #94a3b8;
            font-size: 0.8rem;
            margin-bottom: 5px;
        }
        .metric-value {
            color: white;
            font-size: 1.1rem;
            font-weight: 600;
        }
        .bar-container {
            margin-top: 15px;
            height: 8px;
            background-color: #ef4444;
            border-radius: 4px;
            width: 100%;
            position: relative;
        }
        .advance-bar {
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            background-color: #10b981;
            border-radius: 4px 0 0 4px;
        }
        </style>
        """, unsafe_allow_html=True)
        
        # Section title
        st.markdown('<div class="trading-summary-title">Trading Day Summary</div>', unsafe_allow_html=True)
        
        # Create a container with a background color
        with st.container():
            # Apply card styling
            st.markdown('<div style="background-color: rgba(51, 65, 85, 0.8); border-radius: 10px; padding: 20px; margin-bottom: 20px;">', unsafe_allow_html=True)
            
            # Create a 6-column grid for metrics
            cols = st.columns(6)
            
            # Advancing
            with cols[0]:
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-name">Advancing</div>
                    <div class="metric-value">{market_data["advancing"]}</div>
                </div>
                """, unsafe_allow_html=True)
            
            # Declining
            with cols[1]:
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-name">Declining</div>
                    <div class="metric-value">{market_data["declining"]}</div>
                </div>
                """, unsafe_allow_html=True)
            
            # Unchanged
            with cols[2]:
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-name">Unchanged</div>
                    <div class="metric-value">{market_data["unchanged"]}</div>
                </div>
                """, unsafe_allow_html=True)
            
            # Volume
            with cols[3]:
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-name">Volume (₹ Cr)</div>
                    <div class="metric-value">{market_data["volume"]}</div>
                </div>
                """, unsafe_allow_html=True)
            
            # Volume Change
            with cols[4]:
                volume_color = "#10b981" if market_data["volume_change"] > 0 else "#ef4444"
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-name">Vol vs Avg</div>
                    <div class="metric-value" style="color: {volume_color}">{market_data["volume_change"]}%</div>
                </div>
                """, unsafe_allow_html=True)
            
            # Market Breadth
            with cols[5]:
                breadth_color = "#10b981" if market_data["market_breadth"] > 0.5 else "#ef4444"
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-name">Market Breadth</div>
                    <div class="metric-value" style="color: {breadth_color}">{market_data["market_breadth"]}</div>
                </div>
                """, unsafe_allow_html=True)
            
            # Add spacing
            st.markdown('<div style="height: 20px;"></div>', unsafe_allow_html=True)
            
            # Advance/Decline Bar
            col1, col2, col3 = st.columns([2, 8, 2])
            with col1:
                st.markdown(f'<div style="text-align: right; color: #10b981; font-size: 0.9rem;">{market_data["advance_percent"]}%</div>', unsafe_allow_html=True)
            
            with col2:
                st.markdown(f"""
                <div class="bar-container">
                    <div class="advance-bar" style="width: {market_data["advance_percent"]}%;"></div>
                </div>
                """, unsafe_allow_html=True)
            
            with col3:
                st.markdown(f'<div style="color: #ef4444; font-size: 0.9rem;">{market_data["decline_percent"]}%</div>', unsafe_allow_html=True)
            
            # Add spacing
            st.markdown('<div style="height: 15px;"></div>', unsafe_allow_html=True)
            
            # 52-week stats
            col1, col2 = st.columns(2)
            with col1:
                st.markdown(f'<div style="color: #10b981; font-size: 0.9rem;">New 52-wk Highs: {market_data["new_highs"]}</div>', unsafe_allow_html=True)
            
            with col2:
                st.markdown(f'<div style="color: #ef4444; font-size: 0.9rem; text-align: right;">New 52-wk Lows: {market_data["new_lows"]}</div>', unsafe_allow_html=True)
            
            # Close the container div
            st.markdown('</div>', unsafe_allow_html=True)
    
    except Exception as e:
        logger.error(f"Error rendering trading day summary: {e}")
        st.error("Unable to display trading day summary") 