"""
Long-term investment page
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from data.mongodb import MongoDB
from data.chartink import get_stocks_with_fallback
from data.yahoo import get_stock_data, get_stock_fundamentals
from config.queries import LONG_TERM_QUERIES
from strategies.long_term import analyze_stock_long_term
from utils.logger import get_logger

logger = get_logger(__name__)

# Initialize MongoDB
db = MongoDB()

def show_long_term_page(market_condition):
    """
    Show long-term investment page
    
    Args:
        market_condition: Market condition dictionary
    """
    st.title("Long-Term Investment")
    
    # Create tabs
    tab1, tab2, tab3 = st.tabs(["Scanner", "Analysis", "Watchlist"])
    
    # Scanner tab
    with tab1:
        st.header("Long-Term Investment Scanner")
        
        # Scan button
        if st.button("Scan for Long-Term Investment Opportunities"):
            with st.spinner("Scanning for long-term investment opportunities..."):
                # Get stocks from ChartInk
                df, query_name = get_stocks_with_fallback(LONG_TERM_QUERIES)
                
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
                            "scan_type": "long_term",
                            "query_name": query_name,
                            "timestamp": datetime.now()
                        }
                        
                        db.save_scan_result(stock_data)
                    
                    st.success(f"Found {len(df)} stocks using {query_name}")
        
        # Get recent scan results from MongoDB
        scan_results = db.get_scan_results(scan_type="long_term", limit=50)
        
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
                        "type": "long_term",
                        "added_at": datetime.now()
                    }
                    
                    db.add_to_watchlist(watchlist_item)
                
                st.success(f"Added {len(selected_symbols)} stocks to watchlist")
        else:
            st.info("No scan results found. Run a scan to find long-term investment opportunities.")
    
    # Analysis tab
    with tab2:
        st.header("Long-Term Investment Analysis")
        
        # Symbol input
        symbol = st.text_input("Enter Stock Symbol (e.g., RELIANCE)")
        
        if symbol:
            # Analyze button
            if st.button("Analyze"):
                with st.spinner(f"Analyzing {symbol}..."):
                    # Get stock data from Yahoo Finance
                    df = get_stock_data(symbol, period="5y", interval="1d")
                    
                    if df is None or df.empty:
                        st.error(f"No data found for {symbol}")
                    else:
                        # Get fundamentals
                        fundamentals = get_stock_fundamentals(symbol)
                        
                        # Get recommended strategies from market condition
                        strategies = ["value_investing", "growth_investing", "momentum_investing"]
                        
                        # Analyze stock
                        analysis = analyze_stock_long_term(symbol, df, strategies, fundamentals)
                        
                        # Display analysis results
                        st.subheader("Analysis Results")
                        
                        if analysis["signal"] == "buy":
                            st.success(f"Buy Signal: {', '.join(analysis['strategies'])}")
                            
                            # Display entry price
                            st.markdown(f"**Entry Price:** ₹{analysis['entry_price']:.2f}")
                            
                            # Add to watchlist button
                            if st.button("Add to Watchlist"):
                                watchlist_item = {
                                    "symbol": symbol,
                                    "type": "long_term",
                                    "signal": "buy",
                                    "strategy": ", ".join(analysis["strategies"]),
                                    "entry_price": analysis["entry_price"],
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
                        if 'SMA_50' in df.columns:
                            fig.add_trace(
                                go.Scatter(
                                    x=df.index,
                                    y=df['SMA_50'],
                                    name="SMA 50",
                                    line=dict(color='orange', width=1)
                                )
                            )
                        
                        if 'SMA_200' in df.columns:
                            fig.add_trace(
                                go.Scatter(
                                    x=df.index,
                                    y=df['SMA_200'],
                                    name="SMA 200",
                                    line=dict(color='red', width=1)
                                )
                            )
                        
                        # Update layout
                        fig.update_layout(
                            title=f"{symbol} - Weekly Chart",
                            xaxis_title="Date",
                            yaxis_title="Price (₹)",
                            yaxis2_title="Volume",
                            xaxis_rangeslider_visible=False,
                            hovermode="x unified"
                        )
                        
                        # Display chart
                        st.plotly_chart(fig, use_container_width=True)
                        
                        # Display fundamentals
                        if fundamentals:
                            st.subheader("Fundamental Data")
                            
                            # Create columns for fundamental data
                            col1, col2, col3 = st.columns(3)
                            
                            with col1:
                                st.markdown("**Valuation Metrics**")
                                st.markdown(f"P/E Ratio: {fundamentals.get('pe_ratio', 'N/A')}")
                                st.markdown(f"P/B Ratio: {fundamentals.get('pb_ratio', 'N/A')}")
                                st.markdown(f"EV/EBITDA: {fundamentals.get('ev_ebitda', 'N/A')}")
                            
                            with col2:
                                st.markdown("**Growth Metrics**")
                                st.markdown(f"Revenue Growth (YoY): {fundamentals.get('revenue_growth', 'N/A')}")
                                st.markdown(f"EPS Growth (YoY): {fundamentals.get('eps_growth', 'N/A')}")
                                st.markdown(f"ROE: {fundamentals.get('roe', 'N/A')}")
                            
                            with col3:
                                st.markdown("**Dividend Metrics**")
                                st.markdown(f"Dividend Yield: {fundamentals.get('dividend_yield', 'N/A')}")
                                st.markdown(f"Payout Ratio: {fundamentals.get('payout_ratio', 'N/A')}")
                                st.markdown(f"Dividend Growth (5Y): {fundamentals.get('dividend_growth', 'N/A')}")
                        
                        # Display technical indicators
                        st.subheader("Technical Indicators")
                        
                        # Create columns for technical indicators
                        col1, col2, col3 = st.columns(3)
                        
                        with col1:
                            st.markdown("**Moving Averages**")
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
                        
                        with col3:
                            st.markdown("**Volatility Indicators**")
                            if 'ATR' in df.columns:
                                st.markdown(f"ATR: {df['ATR'].iloc[-1]:.2f}")
                            if 'BB_Width' in df.columns:
                                st.markdown(f"BB Width: {df['BB_Width'].iloc[-1]:.2f}")
    
    # Watchlist tab
    with tab3:
        st.header("Long-Term Investment Watchlist")
        
        # Get watchlist from MongoDB
        watchlist = db.get_watchlist(watchlist_type="long_term")
        
        if watchlist:
            # Create DataFrame from watchlist
            df = pd.DataFrame(watchlist)
            
            # Format timestamp
            df["added_at"] = pd.to_datetime(df["added_at"]).dt.strftime("%Y-%m-%d %H:%M:%S")
            
            # Select columns to display
            display_df = df[["added_at", "symbol", "signal", "strategy", "entry_price"]]
            
            # Rename columns
            display_df.columns = ["Added At", "Symbol", "Signal", "Strategy", "Entry Price"]
            
            # Display watchlist
            st.dataframe(display_df, use_container_width=True)
            
            # Remove from watchlist
            selected_symbols = st.multiselect("Remove from Watchlist", df["symbol"].unique())
            
            if selected_symbols and st.button("Remove Selected"):
                for symbol in selected_symbols:
                    db.remove_from_watchlist(symbol, watchlist_type="long_term")
                
                st.success(f"Removed {len(selected_symbols)} stocks from watchlist")
        else:
            st.info("No stocks in long-term investment watchlist") 