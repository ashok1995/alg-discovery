"""Component for the dashboard header and market status banner"""

import streamlit as st
from datetime import datetime
import pytz

def render_dashboard_header(is_market_open_fn, time_info_fn):
    """
    Render the dashboard header with title and market status
    
    Args:
        is_market_open_fn: Function to check if market is open
        time_info_fn: Function to get formatted time info
    """
    # Updated CSS for a more compact header
    st.markdown("""
    <style>
    .compact-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
    }
    
    .compact-header h1 {
        font-size: 1.8rem;
        font-weight: 700;
        margin: 0;
        color: white;
    }
    
    .compact-subtitle {
        color: #a0a9b8;
        margin: 0;
        font-size: 0.9rem;
    }
    
    .compact-market-status {
        background-color: rgba(30, 41, 59, 0.8);
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        display: flex;
        align-items: center;
    }
    
    .status-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 6px;
    }
    
    .status-open {
        background-color: #10b981;
    }
    
    .status-closed {
        background-color: #ef4444;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Market status display
    market_status = is_market_open_fn()
    time_info = time_info_fn()
    
    status_class = "status-open" if market_status else "status-closed"
    status_text = "Open" if market_status else "Closed"
    
    st.markdown(f"""
    <div class="compact-header">
        <div>
            <h1>Market Dashboard</h1>
            <p class="compact-subtitle">Real-time market insights and trading opportunities</p>
        </div>
        <div class="compact-market-status">
            <span class="status-indicator {status_class}"></span>
            <span>Market {status_text} • {time_info}</span>
        </div>
    </div>
    """, unsafe_allow_html=True) 