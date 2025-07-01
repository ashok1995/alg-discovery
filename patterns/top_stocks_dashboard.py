import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import time
import altair as alt
from stock_tracker import get_top_stocks, scan_all_stocks, start_scheduler
from stock_analyzer import get_stock_data, identify_patterns, plot_stock

# Set page config
st.set_page_config(
    page_title="Top 100 Stocks",
    page_icon="📈",
    layout="wide"
)

# Custom CSS
st.markdown(
    """
    <style>
    .main {
        background-color: #f5f5f5;
    }
    .stock-card {
        background-color: white;
        border-radius: 5px;
        padding: 15px;
        margin: 10px 0;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .buy-signal {
        color: green;
        font-weight: bold;
    }
    .sell-signal {
        color: red;
        font-weight: bold;
    }
    .score-high {
        color: green;
        font-weight: bold;
    }
    .score-medium {
        color: orange;
        font-weight: bold;
    }
    .score-low {
        color: red;
    }
    .last-update {
        font-size: 0.8em;
        color: #666;
    }
    </style>
    """,
    unsafe_allow_html=True
)

# Start the scheduler in the background
start_scheduler()

# Title
st.title("Top 100 Stocks by Signal Score")

# Sidebar
st.sidebar.title("Controls")

# Manual refresh button
if st.sidebar.button("Refresh Data Now"):
    with st.sidebar:
        with st.spinner("Scanning stocks..."):
            scan_all_stocks()
    st.sidebar.success("Scan completed!")

# Auto-refresh toggle
auto_refresh = st.sidebar.checkbox("Auto-refresh every 5 minutes", value=True)

# Filter options
min_score = st.sidebar.slider("Minimum Score", 0.0, 1.0, 0.3, 0.05)
min_reward_risk = st.sidebar.slider("Minimum Reward/Risk", 0.0, 5.0, 1.5, 0.1)

# Display options
display_mode = st.sidebar.radio("Display Mode", ["Cards", "Table"])

# Get top stocks
top_stocks = get_top_stocks(100)

# Filter based on sidebar options
if not top_stocks.empty:
    top_stocks = top_stocks[
        (top_stocks["score"] >= min_score) & 
        (top_stocks["avg_reward_risk"] >= min_reward_risk)
    ]

# Display last update time
last_update = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
st.markdown(f"<p class='last-update'>Last updated: {last_update}</p>", unsafe_allow_html=True)

# Display stocks count
st.subheader(f"Showing {len(top_stocks)} stocks matching criteria")

# Display stocks
if top_stocks.empty:
    st.info("No stocks match the current criteria. Try lowering the minimum score or reward/risk ratio.")
else:
    if display_mode == "Cards":
        # Display as cards in a grid
        cols = st.columns(3)
        
        for i, (_, stock) in enumerate(top_stocks.iterrows()):
            col_idx = i % 3
            
            # Determine score class
            score_class = "score-high" if stock["score"] >= 0.7 else "score-medium" if stock["score"] >= 0.4 else "score-low"
            
            with cols[col_idx]:
                st.markdown(f"""
                <div class="stock-card">
                    <h3>{stock["symbol"]}</h3>
                    <p>Score: <span class="{score_class}">{stock["score"]:.2f}</span></p>
                    <p>Price: ₹{stock["last_price"]:.2f}</p>
                    <p>Buy Signals: {stock["buy_signals"]} | Sell Signals: {stock["sell_signals"]}</p>
                    <p>Avg R/R: {stock["avg_reward_risk"]:.2f}</p>
                    <p>Avg Volume: {stock["avg_volume"]:,.0f}</p>
                    <p class="last-update">Last updated: {stock["last_update"]}</p>
                </div>
                """, unsafe_allow_html=True)
                
                # Add a button to view detailed analysis
                if st.button(f"Analyze {stock['symbol']}", key=f"analyze_{stock['symbol']}"):
                    st.session_state.selected_stock = stock["symbol"]
    else:
        # Display as table
        display_cols = ["symbol", "score", "last_price", "buy_signals", "sell_signals", 
                       "avg_reward_risk", "avg_volume", "last_update"]
        
        # Rename columns for display
        display_df = top_stocks[display_cols].copy()
        display_df.columns = ["Symbol", "Score", "Price", "Buy Signals", "Sell Signals", 
                             "Avg R/R", "Avg Volume", "Last Update"]
        
        # Format numeric columns
        display_df["Score"] = display_df["Score"].map("{:.2f}".format)
        display_df["Price"] = display_df["Price"].map("₹{:.2f}".format)
        display_df["Avg R/R"] = display_df["Avg R/R"].map("{:.2f}".format)
        display_df["Avg Volume"] = display_df["Avg Volume"].map("{:,.0f}".format)
        
        # Display table
        st.dataframe(display_df, use_container_width=True)

# Stock detail view
if "selected_stock" in st.session_state:
    symbol = st.session_state.selected_stock
    
    st.markdown("---")
    st.subheader(f"Detailed Analysis: {symbol}")
    
    # Get stock data
    with st.spinner(f"Analyzing {symbol}..."):
        df = get_stock_data(symbol, period="1mo", interval="1d")
        
        if df is None or df.empty:
            st.error(f"Could not fetch data for {symbol}. Please check the symbol and try again.")
        else:
            df = identify_patterns(df)
            
            # Display chart
            fig = plot_stock(symbol)
            st.pyplot(fig)
            
            # Display latest analysis
            latest = df.iloc[-1]
            
            # Signal indicators
            buy_signal = latest['Buy_Signal']
            sell_signal = latest['Sell_Signal']
            
            signal_text = ""
            if buy_signal:
                signal_text = f"<span class='buy-signal'>BUY</span>"
            elif sell_signal:
                signal_text = f"<span class='sell-signal'>SELL</span>"
            else:
                signal_text = "HOLD"
            
            st.markdown(f"<h3>Current Signal: {signal_text}</h3>", unsafe_allow_html=True)
            
            # Technical indicators
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.subheader("Price Action")
                st.write(f"Current Price: ₹{latest['Close']:.2f}")
                st.write(f"Previous Close: ₹{df['Close'].iloc[-2]:.2f}")
                st.write(f"Change: {latest['Close'] - df['Close'].iloc[-2]:.2f} ({(latest['Close'] - df['Close'].iloc[-2]) / df['Close'].iloc[-2] * 100:.2f}%)")
                st.write(f"Support: ₹{latest['Support']:.2f}")
                st.write(f"Resistance: ₹{latest['Resistance']:.2f}")
            
            with col2:
                st.subheader("Technical Indicators")
                st.write(f"RSI (14): {latest['RSI']:.2f}")
                st.write(f"MACD: {latest['MACD']:.2f}")
                st.write(f"MACD Signal: {latest['MACD_Signal']:.2f}")
                st.write(f"EMA 8: {latest['EMA_8']:.2f}")
                st.write(f"EMA 21: {latest['EMA_21']:.2f}")
            
            with col3:
                st.subheader("Patterns & Signals")
                st.write(f"Doji: {'Yes' if latest['Doji'] else 'No'}")
                st.write(f"Hammer: {'Yes' if latest['Hammer'] else 'No'}")
                st.write(f"Bullish Engulfing: {'Yes' if latest['Bullish_Engulfing'] else 'No'}")
                st.write(f"Bearish Engulfing: {'Yes' if latest['Bearish_Engulfing'] else 'No'}")
                st.write(f"Morning Star: {'Yes' if latest['Morning_Star'] else 'No'}")
            
            # Risk/Reward analysis
            st.subheader("Risk/Reward Analysis")
            reward_risk = latest['Reward_Risk_Ratio']
            
            st.write(f"Reward/Risk Ratio: {reward_risk:.2f}")
            st.progress(min(reward_risk/3, 1.0))  # Scale to max of 3
            
            if reward_risk >= 2:
                st.success("Favorable reward/risk ratio (>= 2)")
            elif reward_risk >= 1:
                st.info("Acceptable reward/risk ratio (>= 1)")
            else:
                st.warning("Poor reward/risk ratio (< 1)")
    
    # Clear selection button
    if st.button("Back to Top Stocks"):
        del st.session_state.selected_stock
        st.experimental_rerun()

# Auto-refresh logic
if auto_refresh:
    time_placeholder = st.empty()
    
    # Count down to next refresh
    for seconds in range(300, 0, -1):
        minutes, secs = divmod(seconds, 60)
        time_placeholder.markdown(f"Next refresh in: {minutes:02d}:{secs:02d}")
        time.sleep(1)
    
    # Refresh the page
    st.experimental_rerun() 