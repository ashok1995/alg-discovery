"""Component for displaying key metrics in a compact horizontal bar"""

import streamlit as st
from datetime import datetime
import pytz

def render_quick_metrics_bar(market_condition=None):
    """
    Render a compact metrics bar at the top of the dashboard using native Streamlit components
    
    Args:
        market_condition: Market condition dictionary
    """
    # Fallback data if none provided
    if market_condition is None or not isinstance(market_condition, dict):
        market_condition = {
            "NIFTY": {"value": "19,425.35", "change": "+0.75%"},
            "SENSEX": {"value": "65,214.50", "change": "+0.62%"},
            "BANKNIFTY": {"value": "44,123.70", "change": "-0.18%"},
            "overall": "Neutral"
        }
    
    # Custom CSS to style the metrics
    st.markdown("""
    <style>
    /* Style the metrics container */
    div[data-testid="stMetricValue"] > div {
        font-size: 1.1rem !important;
        font-weight: 600 !important;
    }
    
    div[data-testid="stMetricDelta"] > div {
        font-size: 0.85rem !important;
    }
    
    div[data-testid="stMetricLabel"] {
        font-size: 0.8rem !important;
        color: #94a3b8 !important;
    }
    
    /* Style the metrics container */
    div.row-widget.stMetric {
        background-color: rgba(30, 41, 59, 0.5);
        border-radius: 8px;
        padding: 10px 5px 5px 5px;
        margin-bottom: 0px;
    }
    
    /* Custom market condition indicator */
    .market-indicator {
        background-color: rgba(30, 41, 59, 0.8);
        border-radius: 8px;
        padding: 12px 10px;
        text-align: center;
        color: white;
        margin-bottom: 15px;
    }
    
    .market-indicator-label {
        font-size: 0.8rem;
        color: #94a3b8;
        margin-bottom: 5px;
    }
    
    .indicator-bullish {
        color: #10b981;
    }
    
    .indicator-bearish {
        color: #ef4444;
    }
    
    .indicator-neutral {
        color: #e2e8f0;
    }
    
    /* Date/time display */
    .time-display {
        background-color: rgba(30, 41, 59, 0.8);
        border-radius: 8px;
        padding: 11px 10px;
        text-align: center;
        margin-bottom: 15px;
    }
    
    .date-time-text {
        font-size: 0.75rem;
        color: #94a3b8;
        text-align: center;
        line-height: 1.4;
    }
    
    /* Style the overall container */
    div.metric-row > div > div {
        padding: 0 2px;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Create a container with background for the metrics bar
    with st.container():
        st.markdown('<div style="background-color: rgba(30, 41, 59, 0.8); padding: 15px; border-radius: 10px; margin-bottom: 20px;">', unsafe_allow_html=True)
        
        # Create columns for the metrics
        cols = st.columns([1, 1, 1, 1, 1, 1])
        
        # Current date and time
        now = datetime.now(pytz.timezone('Asia/Kolkata'))
        date_str = now.strftime("%d %b %Y")
        time_str = now.strftime("%H:%M:%S")
        
        # NIFTY
        nifty_value = market_condition.get('NIFTY', {}).get('value', 'N/A')
        nifty_change = market_condition.get('NIFTY', {}).get('change', '0%')
        # Convert change to float for delta_color (if possible)
        try:
            nifty_delta = float(nifty_change.strip('%').replace('+', ''))
            delta_color = "normal" if nifty_delta == 0 else ("up" if "+" in nifty_change else "down")
        except:
            nifty_delta = nifty_change
            delta_color = "normal"
            
        cols[0].metric("NIFTY 50", nifty_value, nifty_change, delta_color=delta_color)
        
        # SENSEX
        sensex_value = market_condition.get('SENSEX', {}).get('value', 'N/A')
        sensex_change = market_condition.get('SENSEX', {}).get('change', '0%')
        try:
            sensex_delta = float(sensex_change.strip('%').replace('+', ''))
            delta_color = "normal" if sensex_delta == 0 else ("up" if "+" in sensex_change else "down")
        except:
            sensex_delta = sensex_change
            delta_color = "normal"
            
        cols[1].metric("SENSEX", sensex_value, sensex_change, delta_color=delta_color)
        
        # BANKNIFTY
        banknifty_value = market_condition.get('BANKNIFTY', {}).get('value', 'N/A')
        banknifty_change = market_condition.get('BANKNIFTY', {}).get('change', '0%')
        try:
            banknifty_delta = float(banknifty_change.strip('%').replace('+', ''))
            delta_color = "normal" if banknifty_delta == 0 else ("up" if "+" in banknifty_change else "down")
        except:
            banknifty_delta = banknifty_change
            delta_color = "normal"
            
        cols[2].metric("BANK NIFTY", banknifty_value, banknifty_change, delta_color=delta_color)
        
        # USD/INR
        cols[3].metric("USD/INR", "83.25", "+0.12%", delta_color="down")
        
        # Market condition indicator
        overall = market_condition.get('overall', 'Neutral').title()
        indicator_class = "indicator-neutral"
        if overall.lower() in ["bullish", "strongly_bullish"]:
            indicator_class = "indicator-bullish"
        elif overall.lower() in ["bearish", "strongly_bearish"]:
            indicator_class = "indicator-bearish"
            
        cols[4].markdown(f"""
        <div class="market-indicator">
            <div class="market-indicator-label">Market Status</div>
            <div class="{indicator_class}" style="font-weight: 600;">{overall}</div>
        </div>
        """, unsafe_allow_html=True)
        
        # Date and time
        cols[5].markdown(f"""
        <div class="time-display">
            <div class="date-time-text">{date_str}</div>
            <div class="date-time-text">{time_str} IST</div>
        </div>
        """, unsafe_allow_html=True)
        
        # Close the container div
        st.markdown('</div>', unsafe_allow_html=True) 