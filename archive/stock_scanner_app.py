import streamlit as st
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# Configure page settings
st.set_page_config(
    page_title="NSE Stock Scanner",
    page_icon="📈",
    layout="wide"
)

# NSE Stocks list (same as before)
NSE_STOCKS = [
    # NIFTY 50 stocks
    'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
    # ... (rest of the stocks)
]

@st.cache_data(ttl=120)  # Cache data for 2 minutes
def detect_abnormal_movement(hist_data):
    """Detect abnormal price and volume movements."""
    try:
        rolling_mean_price = hist_data['Close'].rolling(window=10).mean()
        rolling_std_price = hist_data['Close'].rolling(window=10).std()
        rolling_mean_volume = hist_data['Volume'].rolling(window=10).mean()
        rolling_std_volume = hist_data['Volume'].rolling(window=10).std()

        current_price = hist_data['Close'].iloc[-1]
        current_volume = hist_data['Volume'].iloc[-1]
        
        price_zscore = (current_price - rolling_mean_price.iloc[-1]) / rolling_std_price.iloc[-1] if rolling_std_price.iloc[-1] != 0 else 0
        volume_zscore = (current_volume - rolling_mean_volume.iloc[-1]) / rolling_std_volume.iloc[-1] if rolling_std_volume.iloc[-1] != 0 else 0
        price_velocity = hist_data['Close'].pct_change(3).iloc[-1] * 100 if len(hist_data) > 3 else 0
        volume_surge_ratio = current_volume / rolling_mean_volume.iloc[-1] if rolling_mean_volume.iloc[-1] > 0 else 1

        return {
            'price_zscore': price_zscore,
            'volume_zscore': volume_zscore,
            'price_velocity': price_velocity,
            'volume_surge_ratio': volume_surge_ratio,
            'is_price_abnormal': abs(price_zscore) > 2,
            'is_volume_abnormal': abs(volume_zscore) > 3,
            'is_rapid_movement': abs(price_velocity) > 1,
            'is_volume_surge': volume_surge_ratio > 3
        }
    except Exception as e:
        st.error(f"Error in abnormal detection: {str(e)}")
        return None

@st.cache_data(ttl=120)
def get_stock_data(symbol, interval='2m', period='1d'):
    """Get stock data for a single symbol."""
    try:
        ticker = yf.Ticker(f"{symbol}.NS")
        hist = ticker.history(period=period, interval=interval)
        
        if hist.empty:
            return None
            
        current_price = hist['Close'].iloc[-1]
        prev_close = hist['Close'].iloc[0]
        price_change = ((current_price - prev_close) / prev_close) * 100
        volume = hist['Volume'].sum()
        vwap = (hist['Close'] * hist['Volume']).sum() / volume if volume > 0 else current_price
        
        abnormal_data = detect_abnormal_movement(hist)
        
        return {
            'symbol': symbol,
            'current_price': current_price,
            'price_change': price_change,
            'volume': volume,
            'vwap': vwap,
            'high': hist['High'].max(),
            'low': hist['Low'].min(),
            'data': hist,
            'abnormal_data': abnormal_data
        }
    except Exception as e:
        st.error(f"Error fetching data for {symbol}: {str(e)}")
        return None

def plot_stock_chart(stock_data):
    """Create an interactive stock chart using Plotly."""
    fig = make_subplots(rows=2, cols=1, shared_xaxes=True, 
                        vertical_spacing=0.03, 
                        row_heights=[0.7, 0.3])

    # Price candlestick
    fig.add_trace(
        go.Candlestick(
            x=stock_data['data'].index,
            open=stock_data['data']['Open'],
            high=stock_data['data']['High'],
            low=stock_data['data']['Low'],
            close=stock_data['data']['Close'],
            name='Price'
        ),
        row=1, col=1
    )

    # Volume bar
    fig.add_trace(
        go.Bar(
            x=stock_data['data'].index,
            y=stock_data['data']['Volume'],
            name='Volume'
        ),
        row=2, col=1
    )

    fig.update_layout(
        title=f"{stock_data['symbol']} Stock Price",
        yaxis_title='Price',
        yaxis2_title='Volume',
        xaxis_rangeslider_visible=False,
        height=600
    )

    return fig

def main():
    st.title("📈 NSE Stock Scanner")
    
    # Sidebar controls
    st.sidebar.header("Scanner Settings")
    
    interval = st.sidebar.selectbox(
        "Time Interval",
        ['1m', '2m', '5m', '15m', '30m', '60m'],
        index=1
    )
    
    period = st.sidebar.selectbox(
        "Time Period",
        ['1d', '5d', '1mo', '3mo'],
        index=0
    )
    
    scan_type = st.sidebar.radio(
        "Scan Type",
        ['Top Gainers/Losers', 'Abnormal Movements', 'Custom Scan']
    )
    
    num_stocks = st.sidebar.slider(
        "Number of stocks to display",
        min_value=5,
        max_value=50,
        value=10
    )

    if st.sidebar.button("Start Scan"):
        with st.spinner("Fetching stock data..."):
            # Create progress bar
            progress_bar = st.progress(0)
            stocks_data = {}
            
            # Fetch data with progress updates
            total_stocks = len(NSE_STOCKS)
            for i, symbol in enumerate(NSE_STOCKS):
                data = get_stock_data(symbol, interval, period)
                if data:
                    stocks_data[symbol] = data
                progress_bar.progress((i + 1) / total_stocks)

            # Process and display results based on scan type
            if scan_type == 'Top Gainers/Losers':
                sorted_stocks = sorted(
                    stocks_data.values(),
                    key=lambda x: x['price_change'],
                    reverse=True
                )
                
                col1, col2 = st.columns(2)
                
                with col1:
                    st.subheader("Top Gainers")
                    for stock in sorted_stocks[:num_stocks]:
                        with st.expander(f"{stock['symbol']} ({stock['price_change']:+.2f}%)"):
                            st.write(f"Price: ₹{stock['current_price']:.2f}")
                            st.write(f"Volume: {stock['volume']:,}")
                            st.write(f"VWAP: ₹{stock['vwap']:.2f}")
                            st.plotly_chart(plot_stock_chart(stock), use_container_width=True)
                
                with col2:
                    st.subheader("Top Losers")
                    for stock in sorted_stocks[-num_stocks:]:
                        with st.expander(f"{stock['symbol']} ({stock['price_change']:+.2f}%)"):
                            st.write(f"Price: ₹{stock['current_price']:.2f}")
                            st.write(f"Volume: {stock['volume']:,}")
                            st.write(f"VWAP: ₹{stock['vwap']:.2f}")
                            st.plotly_chart(plot_stock_chart(stock), use_container_width=True)
            
            elif scan_type == 'Abnormal Movements':
                abnormal_stocks = []
                for stock in stocks_data.values():
                    if stock['abnormal_data'] and (
                        stock['abnormal_data']['is_price_abnormal'] or 
                        stock['abnormal_data']['is_volume_abnormal'] or
                        stock['abnormal_data']['is_rapid_movement'] or
                        stock['abnormal_data']['is_volume_surge']
                    ):
                        abnormal_stocks.append(stock)
                
                st.subheader("Stocks with Abnormal Movements")
                for stock in abnormal_stocks[:num_stocks]:
                    with st.expander(f"{stock['symbol']} ({stock['price_change']:+.2f}%)"):
                        abnormal = stock['abnormal_data']
                        st.write("⚠️ Alerts:")
                        if abnormal['is_price_abnormal']:
                            st.write(f"• Price Z-score: {abnormal['price_zscore']:.2f}")
                        if abnormal['is_volume_abnormal']:
                            st.write(f"• Volume Z-score: {abnormal['volume_zscore']:.2f}")
                        if abnormal['is_rapid_movement']:
                            st.write(f"• Price velocity: {abnormal['price_velocity']:.2f}%")
                        if abnormal['is_volume_surge']:
                            st.write(f"• Volume surge: {abnormal['volume_surge_ratio']:.1f}x")
                        st.plotly_chart(plot_stock_chart(stock), use_container_width=True)

if __name__ == "__main__":
    main() 