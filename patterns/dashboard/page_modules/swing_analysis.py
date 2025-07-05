"""
Analysis tab for the Swing Trading page
"""

import streamlit as st
import pandas as pd
from datetime import datetime
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from data.yahoo import get_stock_data
from utils.logger import get_logger
from config import DEFAULT_RISK_PERCENT, DEFAULT_REWARD_RISK_RATIO

logger = get_logger(__name__, group="dashboard", service="page_swing_analysis")

def show_analysis_tab(db):
    """
    Display the Analysis tab content
    
    Args:
        db: MongoDB connection
    """
    st.header("Swing Trading Analysis")
    
    # Get symbol from session state if available
    default_symbol = st.session_state.get("selected_symbol", "")
    
    # Symbol input
    symbol = st.text_input("Enter Stock Symbol (e.g., RELIANCE)", value=default_symbol)
    
    if symbol:
        # Analysis code remains the same
        with st.spinner(f"Analyzing {symbol}..."):
            try:
                # Get daily data for the last 6 months
                df = get_stock_data(symbol, period="6mo", interval="1d")
                
                if df is None or df.empty:
                    st.error(f"No data found for {symbol}")
                else:
                    # Display a chart
                    fig = make_subplots(specs=[[{"secondary_y": True}]])
                    
                    # Add price candlestick chart
                    fig.add_trace(
                        go.Candlestick(
                            x=df.index,
                            open=df['Open'],
                            high=df['High'],
                            low=df['Low'],
                            close=df['Close'],
                            name="Price"
                        )
                    )
                    
                    # Update layout
                    fig.update_layout(
                        title=f"{symbol} - Daily Chart",
                        xaxis_title="Date",
                        yaxis_title="Price (₹)",
                        xaxis_rangeslider_visible=False,
                        hovermode="x unified"
                    )
                    
                    # Display chart
                    st.plotly_chart(fig, use_container_width=True)
                    
                    # Sample analysis results
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        st.subheader("Trading Setup")
                        st.markdown(f"**Signal:** 🟢 Buy")
                        st.markdown(f"**Strategy:** Pullback")
                        st.markdown(f"**Entry Price:** ₹{df['Close'].iloc[-1]:.2f}")
                        st.markdown(f"**Stop Loss:** ₹{df['Close'].iloc[-1] * 0.95:.2f}")
                        st.markdown(f"**Target:** ₹{df['Close'].iloc[-1] * 1.1:.2f}")
                        st.markdown(f"**Reward/Risk Ratio:** 2.0")
                    
                    with col2:
                        st.subheader("Position Sizing")
                        
                        # Get risk percentage from user
                        risk_percent = st.slider("Risk (%)", 0.5, 3.0, DEFAULT_RISK_PERCENT, 0.1)
                        
                        # Get account size from user
                        account_size = st.number_input("Account Size (₹)", value=100000, step=10000)
                        
                        # Calculate position size
                        risk_amount = account_size * (risk_percent / 100)
                        entry = df['Close'].iloc[-1]
                        stop_loss = entry * 0.95
                        risk_per_share = entry - stop_loss
                        shares = int(risk_amount / risk_per_share)
                        position_value = shares * entry
                        
                        # Display position sizing
                        st.markdown(f"**Risk Amount:** ₹{risk_amount:.2f}")
                        st.markdown(f"**Shares:** {shares}")
                        st.markdown(f"**Position Value:** ₹{position_value:.2f}")
                        st.markdown(f"**Exposure (%):** {position_value/account_size*100:.2f}%")
                        
                        # Add to watchlist button
                        if st.button("Add to Watchlist"):
                            watchlist_item = {
                                "symbol": symbol,
                                "type": "swing",
                                "added_at": datetime.now(),
                                "entry_price": entry,
                                "stop_loss": stop_loss,
                                "target": entry * 1.1
                            }
                            
                            db.add_to_watchlist(watchlist_item)
                            st.success(f"Added {symbol} to watchlist")
            
            except Exception as e:
                st.error(f"Error analyzing {symbol}: {e}")
                logger.error(f"Analysis error: {e}") 