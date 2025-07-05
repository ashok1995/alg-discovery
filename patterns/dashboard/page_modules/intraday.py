"""
Intraday trading page
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from data.mongodb import MongoDB
from data.chartink import get_stocks_with_fallback
from data.yahoo import get_stock_data
from config.queries import INTRADAY_QUERIES
from strategies.intraday import analyze_stock_intraday
from utils.logger import get_logger

logger = get_logger(__name__, group="dashboard", service="page_intraday")

# Initialize MongoDB
db = MongoDB()

def show_intraday_page(market_condition):
    """
    Show intraday trading page
    
    Args:
        market_condition: Market condition dictionary
    """
    st.title("Intraday Trading")
    
    # Create tabs
    tab1, tab2, tab3 = st.tabs(["Scanner", "Analysis", "Watchlist"])
    
    # Scanner tab
    with tab1:
        st.header("Intraday Scanner")
        
        # Scan button
        if st.button("Scan for Intraday Opportunities"):
            with st.spinner("Scanning for intraday opportunities..."):
                # Get stocks from ChartInk
                df, query_name = get_stocks_with_fallback(INTRADAY_QUERIES)
                
                if df.empty:
                    st.error("No stocks found")
                else:
                    # Save to MongoDB
                    for _, row in df.iterrows():
                        stock_data = {
                            "symbol": row["nsecode"],
                            "name": row.get("name", ""),
                            "close": float(row["close"]),
                            "change": float(row.get("per_chg", 0)),
                            "volume": float(row.get("volume", 0)),
                            "scan_type": "intraday",
                            "query_name": query_name,
                            "timestamp": datetime.now()
                        }
                        
                        db.save_scan_result(stock_data)
                    
                    st.success(f"Found {len(df)} stocks using {query_name}")
        
        # Get recent scan results from MongoDB
        scan_results = db.get_scan_results(scan_type="intraday", limit=50)
        
        if scan_results:
            # Create DataFrame from scan results
            df = pd.DataFrame(scan_results)
            
            # Format timestamp
            df["timestamp"] = pd.to_datetime(df["timestamp"]).dt.strftime("%Y-%m-%d %H:%M:%S")
            
            # Format change
            df["change"] = df["change"].apply(lambda x: f"{x:.2f}%")
            
            # Format volume
            df["volume"] = df["volume"].apply(lambda x: f"{x:,.0f}")
            
            # Select columns to display
            display_df = df[["timestamp", "symbol", "name", "close", "change", "volume", "query_name"]]
            
            # Rename columns
            display_df.columns = ["Timestamp", "Symbol", "Name", "Close", "Change", "Volume", "Query"]
            
            # Display scan results
            st.dataframe(display_df, use_container_width=True)
            
            # Add selected stocks to watchlist
            selected_symbols = st.multiselect("Add to Watchlist", df["symbol"].unique())
            
            if selected_symbols and st.button("Add Selected to Watchlist"):
                for symbol in selected_symbols:
                    watchlist_item = {
                        "symbol": symbol,
                        "type": "intraday",
                        "added_at": datetime.now()
                    }
                    
                    db.add_to_watchlist(watchlist_item)
                
                st.success(f"Added {len(selected_symbols)} stocks to watchlist")
        else:
            st.info("No scan results found. Run a scan to find intraday opportunities.")
    
    # Analysis tab
    with tab2:
        st.header("Intraday Analysis")
        
        # Symbol input
        symbol = st.text_input("Enter Stock Symbol (e.g., RELIANCE)")
        
        if symbol:
            # Get stock data
            with st.spinner(f"Analyzing {symbol}..."):
                # Get intraday data (5-minute intervals for the last 5 days)
                df = get_stock_data(symbol, period="5d", interval="5m")
                
                if df is None or df.empty:
                    st.error(f"No data found for {symbol}")
                else:
                    # Get recommended strategies based on market condition
                    strategies = market_condition.get("recommended_strategies", {}).get("intraday", [])
                    
                    if not strategies:
                        strategies = ["momentum_long", "breakout_long", "momentum_short", "breakdown_short"]
                    
                    # Analyze stock
                    analysis = analyze_stock_intraday(symbol, df, strategies)
                    
                    # Display analysis results
                    if analysis.get("signal") != "no_signal":
                        signal_type = analysis.get("signal", "")
                        strategy = analysis.get("strategy", "")
                        entry_price = analysis.get("entry_price", 0)
                        stop_loss = analysis.get("stop_loss", 0)
                        target = analysis.get("target", 0)
                        reward_risk_ratio = analysis.get("reward_risk_ratio", 0)
                        shares = analysis.get("shares", 0)
                        position_value = analysis.get("position_value", 0)
                        risk_amount = analysis.get("risk_amount", 0)
                        
                        # Create columns for signal details
                        col1, col2 = st.columns(2)
                        
                        with col1:
                            st.subheader("Signal Details")
                            st.markdown(f"**Signal:** {'🟢 Buy' if signal_type == 'buy' else '🔴 Sell'}")
                            st.markdown(f"**Strategy:** {strategy.replace('_', ' ').title()}")
                            st.markdown(f"**Entry Price:** ₹{entry_price:.2f}")
                            st.markdown(f"**Stop Loss:** ₹{stop_loss:.2f}")
                            st.markdown(f"**Target:** ₹{target:.2f}")
                            st.markdown(f"**Reward/Risk Ratio:** {reward_risk_ratio:.2f}")
                        
                        with col2:
                            st.subheader("Position Sizing")
                            st.markdown(f"**Shares:** {shares}")
                            st.markdown(f"**Position Value:** ₹{position_value:.2f}")
                            st.markdown(f"**Risk Amount:** ₹{risk_amount:.2f}")
                            
                            # Add to watchlist button
                            if st.button("Add to Watchlist"):
                                watchlist_item = {
                                    "symbol": symbol,
                                    "type": "intraday",
                                    "signal": signal_type,
                                    "strategy": strategy,
                                    "entry_price": entry_price,
                                    "stop_loss": stop_loss,
                                    "target": target,
                                    "added_at": datetime.now()
                                }
                                
                                db.add_to_watchlist(watchlist_item)
                                
                                st.success(f"Added {symbol} to watchlist")
                            
                            # Execute trade button
                            if st.button("Execute Trade"):
                                trade = {
                                    "symbol": symbol,
                                    "trade_type": "long" if signal_type == "buy" else "short",
                                    "strategy": strategy,
                                    "entry_price": entry_price,
                                    "current_price": entry_price,
                                    "stop_loss": stop_loss,
                                    "target": target,
                                    "shares": shares,
                                    "position_value": position_value,
                                    "risk_amount": risk_amount,
                                    "status": "active",
                                    "entry_timestamp": datetime.now()
                                }
                                
                                db.save_trade(trade)
                                
                                st.success(f"Executed {signal_type} trade for {symbol}")
                    else:
                        st.warning(f"No trading signal for {symbol}")
                    
                    # Display chart
                    st.subheader("Price Chart")
                    
                    # Create figure with secondary y-axis
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
                    
                    # Add volume bar chart
                    fig.add_trace(
                        go.Bar(
                            x=df.index,
                            y=df['Volume'],
                            name="Volume",
                            marker_color='rgba(0, 0, 255, 0.3)'
                        ),
                        secondary_y=True
                    )
                    
                    # Add moving averages
                    if 'EMA_8' in df.columns:
                        fig.add_trace(
                            go.Scatter(
                                x=df.index,
                                y=df['EMA_8'],
                                name="EMA 8",
                                line=dict(color='blue', width=1)
                            )
                        )
                    
                    if 'EMA_21' in df.columns:
                        fig.add_trace(
                            go.Scatter(
                                x=df.index,
                                y=df['EMA_21'],
                                name="EMA 21",
                                line=dict(color='orange', width=1)
                            )
                        )
                    
                    # Update layout
                    fig.update_layout(
                        title=f"{symbol} - 5-Minute Chart",
                        xaxis_title="Time",
                        yaxis_title="Price (₹)",
                        yaxis2_title="Volume",
                        xaxis_rangeslider_visible=False,
                        hovermode="x unified"
                    )
                    
                    # Display chart
                    st.plotly_chart(fig, use_container_width=True)
                    
                    # Display technical indicators
                    st.subheader("Technical Indicators")
                    
                    # Create columns for technical indicators
                    col1, col2, col3 = st.columns(3)
                    
                    with col1:
                        st.markdown("**Moving Averages**")
                        if 'EMA_8' in df.columns:
                            st.markdown(f"EMA 8: ₹{df['EMA_8'].iloc[-1]:.2f}")
                        if 'EMA_21' in df.columns:
                            st.markdown(f"EMA 21: ₹{df['EMA_21'].iloc[-1]:.2f}")
                        if 'SMA_50' in df.columns:
                            st.markdown(f"SMA 50: ₹{df['SMA_50'].iloc[-1]:.2f}")
                        if 'SMA_200' in df.columns:
                            st.markdown(f"SMA 200: ₹{df['SMA_200'].iloc[-1]:.2f}")
                    
                    with col2:
                        st.markdown("**Momentum Indicators**")
                        if 'RSI' in df.columns:
                            st.markdown(f"RSI: {df['RSI'].iloc[-1]:.2f}")
                        if 'MACD' in df.columns:
                            st.markdown(f"MACD: {df['MACD'].iloc[-1]:.2f}")
                        if 'MACD_Signal' in df.columns:
                            st.markdown(f"MACD Signal: {df['MACD_Signal'].iloc[-1]:.2f}")
                    
                    with col3:
                        st.markdown("**Volatility Indicators**")
                        if 'ATR' in df.columns:
                            st.markdown(f"ATR: {df['ATR'].iloc[-1]:.2f}")
                        if 'BB_Upper' in df.columns:
                            st.markdown(f"BB Upper: ₹{df['BB_Upper'].iloc[-1]:.2f}")
                        if 'BB_Middle' in df.columns:
                            st.markdown(f"BB Middle: ₹{df['BB_Middle'].iloc[-1]:.2f}")
                        if 'BB_Lower' in df.columns:
                            st.markdown(f"BB Lower: ₹{df['BB_Lower'].iloc[-1]:.2f}")
    
    # Watchlist tab
    with tab3:
        st.header("Intraday Watchlist")
        
        # Get watchlist from MongoDB
        watchlist = db.get_watchlist(watchlist_type="intraday")
        
        if watchlist:
            # Create DataFrame from watchlist
            df = pd.DataFrame(watchlist)
            
            # Format timestamp
            df["added_at"] = pd.to_datetime(df["added_at"]).dt.strftime("%Y-%m-%d %H:%M:%S")
            
            # Select columns to display
            display_df = df[["added_at", "symbol", "signal", "strategy", "entry_price", "stop_loss", "target"]]
            
            # Rename columns
            display_df.columns = ["Added At", "Symbol", "Signal", "Strategy", "Entry Price", "Stop Loss", "Target"]
            
            # Display watchlist
            st.dataframe(display_df, use_container_width=True)
            
            # Remove from watchlist
            selected_symbols = st.multiselect("Remove from Watchlist", df["symbol"].unique())
            
            if selected_symbols and st.button("Remove Selected"):
                for symbol in selected_symbols:
                    db.remove_from_watchlist(symbol, watchlist_type="intraday")
                
                st.success(f"Removed {len(selected_symbols)} stocks from watchlist")
        else:
            st.info("No stocks in intraday watchlist") 