"""
Short selling page
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
from config.queries import SHORT_SELL_QUERIES
from strategies.short_sell import analyze_stock_short_sell
from utils.logger import get_logger

logger = get_logger(__name__)

# Initialize MongoDB
db = MongoDB()

def show_short_sell_page(market_condition):
    """
    Show short selling page
    
    Args:
        market_condition: Market condition dictionary
    """
    st.title("Short Selling")
    
    # Create tabs
    tab1, tab2, tab3 = st.tabs(["Scanner", "Analysis", "Watchlist"])
    
    # Scanner tab
    with tab1:
        st.header("Short Selling Scanner")
        
        # Scan button
        if st.button("Scan for Short Selling Opportunities"):
            with st.spinner("Scanning for short selling opportunities..."):
                # Get stocks from ChartInk
                df, query_name = get_stocks_with_fallback(SHORT_SELL_QUERIES)
                
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
                            "scan_type": "short_sell",
                            "query_name": query_name,
                            "timestamp": datetime.now()
                        }
                        
                        db.save_scan_result(stock_data)
                    
                    st.success(f"Found {len(df)} stocks using {query_name}")
        
        # Get recent scan results from MongoDB
        scan_results = db.get_scan_results(scan_type="short_sell", limit=50)
        
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
                        "type": "short_sell",
                        "added_at": datetime.now()
                    }
                    
                    db.add_to_watchlist(watchlist_item)
                
                st.success(f"Added {len(selected_symbols)} stocks to watchlist")
        else:
            st.info("No scan results found. Run a scan to find short selling opportunities.")
    
    # Analysis tab
    with tab2:
        st.header("Short Selling Analysis")
        
        # Symbol input
        symbol = st.text_input("Enter Stock Symbol (e.g., RELIANCE)")
        
        if symbol:
            # Analyze button
            if st.button("Analyze"):
                with st.spinner(f"Analyzing {symbol}..."):
                    # Get stock data from Yahoo Finance
                    df = get_stock_data(symbol, period="1mo", interval="1d")
                    
                    if df is None or df.empty:
                        st.error(f"No data found for {symbol}")
                    else:
                        # Get recommended strategies from market condition
                        strategies = ["breakdown_short", "volatility_short"]
                        
                        # Analyze stock
                        analysis = analyze_stock_short_sell(symbol, df, strategies)
                        
                        # Display analysis results
                        st.subheader("Analysis Results")
                        
                        if analysis["signal"] == "sell":
                            st.success(f"Sell Signal: {analysis['strategy']}")
                            
                            # Display entry, stop loss, and target
                            st.markdown(f"**Entry Price:** ₹{analysis['entry_price']:.2f}")
                            st.markdown(f"**Stop Loss:** ₹{analysis['stop_loss']:.2f}")
                            st.markdown(f"**Target:** ₹{analysis['target']:.2f}")
                            st.markdown(f"**Reward/Risk Ratio:** {analysis['reward_risk_ratio']:.2f}")
                            
                            # Display position size
                            st.markdown(f"**Shares:** {analysis['shares']}")
                            st.markdown(f"**Position Value:** ₹{analysis['position_value']:.2f}")
                            st.markdown(f"**Risk Amount:** ₹{analysis['risk_amount']:.2f}")
                            st.markdown(f"**Risk Percent:** {analysis['risk_percent']:.2f}%")
                            
                            # Add to watchlist button
                            if st.button("Add to Watchlist"):
                                watchlist_item = {
                                    "symbol": symbol,
                                    "type": "short_sell",
                                    "signal": "sell",
                                    "strategy": analysis["strategy"],
                                    "entry_price": analysis["entry_price"],
                                    "stop_loss": analysis["stop_loss"],
                                    "target": analysis["target"],
                                    "added_at": datetime.now()
                                }
                                
                                db.add_to_watchlist(watchlist_item)
                                
                                st.success(f"Added {symbol} to watchlist")
                        else:
                            st.warning(f"No signal for {symbol}")
                        
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
                                marker=dict(color='rgba(0, 0, 255, 0.3)')
                            ),
                            secondary_y=True
                        )
                        
                        # Add moving averages
                        if 'SMA_20' in df.columns:
                            fig.add_trace(
                                go.Scatter(
                                    x=df.index,
                                    y=df['SMA_20'],
                                    name="SMA 20",
                                    line=dict(color='blue', width=1)
                                )
                            )
                        
                        if 'SMA_50' in df.columns:
                            fig.add_trace(
                                go.Scatter(
                                    x=df.index,
                                    y=df['SMA_50'],
                                    name="SMA 50",
                                    line=dict(color='orange', width=1)
                                )
                            )
                        
                        # Update layout
                        fig.update_layout(
                            title=f"{symbol} - Daily Chart",
                            xaxis_title="Date",
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
                            if 'SMA_20' in df.columns:
                                st.markdown(f"SMA 20: ₹{df['SMA_20'].iloc[-1]:.2f}")
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
                            if 'ADX' in df.columns:
                                st.markdown(f"ADX: {df['ADX'].iloc[-1]:.2f}")
    
    # Watchlist tab
    with tab3:
        st.header("Short Selling Watchlist")
        
        # Get watchlist from MongoDB
        watchlist = db.get_watchlist(watchlist_type="short_sell")
        
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
                    db.remove_from_watchlist(symbol, watchlist_type="short_sell")
                
                st.success(f"Removed {len(selected_symbols)} stocks from watchlist")
        else:
            st.info("No stocks in short selling watchlist") 