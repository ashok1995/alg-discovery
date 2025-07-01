"""Component for displaying top gainers and losers"""

import streamlit as st
import pandas as pd

def render_market_movers(gainers_df=None, losers_df=None):
    """
    Render market movers (gainers and losers)
    
    Args:
        gainers_df: DataFrame with top gainers
        losers_df: DataFrame with top losers
    """
    col1, col2 = st.columns(2)
    
    # Default data if none provided
    if gainers_df is None or gainers_df.empty:
        gainers_data = {
            "Symbol": ["TATAMOTORS", "ICICIBANK", "SUNPHARMA", "HDFCBANK", "TCS"],
            "Price": [825.50, 1095.60, 1248.75, 1678.30, 3745.20],
            "Change%": [3.8, 2.9, 2.7, 2.5, 2.2]
        }
        gainers_df = pd.DataFrame(gainers_data)
    
    if losers_df is None or losers_df.empty:
        losers_data = {
            "Symbol": ["HINDALCO", "TECHM", "ITC", "HCLTECH", "ASIANPAINT"],
            "Price": [512.25, 1345.60, 445.75, 1278.30, 3125.20],
            "Change%": [-2.8, -2.1, -1.9, -1.7, -1.5]
        }
        losers_df = pd.DataFrame(losers_data)
    
    with col1:
        st.markdown('<div class="section-title">Top Gainers</div>', unsafe_allow_html=True)
        
        for i, row in gainers_df.iterrows():
            st.markdown(f"""
            <div class="movers-card gainer">
                <div class="symbol">{row['Symbol']}</div>
                <div class="price">₹{row['Price']}</div>
                <div class="change positive">+{row['Change%']}%</div>
            </div>
            """, unsafe_allow_html=True)
    
    with col2:
        st.markdown('<div class="section-title">Top Losers</div>', unsafe_allow_html=True)
        
        for i, row in losers_df.iterrows():
            st.markdown(f"""
            <div class="movers-card loser">
                <div class="symbol">{row['Symbol']}</div>
                <div class="price">₹{row['Price']}</div>
                <div class="change negative">{row['Change%']}%</div>
            </div>
            """, unsafe_allow_html=True) 