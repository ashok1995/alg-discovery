import streamlit as st
import yfinance as yf
import pandas as pd
import datetime
import pytz

# Set page config
st.set_page_config(
    page_title="Indian Stock Market Scanner",
    page_icon="📈",
    layout="wide"
)

# Title and description
st.title("📊 Indian Stock Market Scanner")
st.markdown("Track top gainers and losers in NSE and BSE")

# Sidebar for configuration
st.sidebar.header("Scanner Settings")

# Get list of popular NSE tickers
@st.cache_data(ttl=86400)  # Cache for 24 hours
def get_nse_tickers():
    # This is a manually curated list of popular NSE stocks
    # In a production app, you might want to fetch this from an API or database
    popular_nse = [
        "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
        "HINDUNILVR.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
        "ITC.NS", "LT.NS", "AXISBANK.NS", "BAJFINANCE.NS", "ASIANPAINT.NS",
        "MARUTI.NS", "SUNPHARMA.NS", "TITAN.NS", "ULTRACEMCO.NS", "TATAMOTORS.NS",
        "INDUSINDBK.NS", "BAJAJFINSV.NS", "POWERGRID.NS", "WIPRO.NS", "NTPC.NS",
        "HCLTECH.NS", "ADANIPORTS.NS", "GRASIM.NS", "TATASTEEL.NS", "M&M.NS"
    ]
    return popular_nse

# Get list of popular BSE tickers
@st.cache_data(ttl=86400)  # Cache for 24 hours
def get_bse_tickers():
    # Similar stocks but with BSE suffix
    popular_bse = [
        "RELIANCE.BO", "TCS.BO", "HDFCBANK.BO", "INFY.BO", "ICICIBANK.BO",
        "HINDUNILVR.BO", "SBIN.BO", "BHARTIARTL.BO", "KOTAKBANK.BO",
        "ITC.BO", "LT.BO", "AXISBANK.BO", "BAJFINANCE.BO", "ASIANPAINT.BO",
        "MARUTI.BO", "SUNPHARMA.BO", "TITAN.BO", "ULTRACEMCO.BO", "TATAMOTORS.BO",
        "INDUSINDBK.BO", "BAJAJFINSV.BO", "POWERGRID.BO", "WIPRO.BO", "NTPC.BO",
        "HCLTECH.BO", "ADANIPORTS.BO", "GRASIM.BO", "TATASTEEL.BO", "M&M.BO"
    ]
    return popular_bse

# Let user choose market to scan
market_choice = st.sidebar.selectbox(
    "Choose Market to Scan",
    ["NSE (National Stock Exchange)", "BSE (Bombay Stock Exchange)", "Custom Tickers"]
)

if market_choice == "NSE (National Stock Exchange)":
    tickers = get_nse_tickers()
elif market_choice == "BSE (Bombay Stock Exchange)":
    tickers = get_bse_tickers()
else:
    custom_tickers = st.sidebar.text_area(
        "Enter ticker symbols with appropriate suffix (.NS for NSE, .BO for BSE)",
        value="RELIANCE.NS, TCS.NS, HDFCBANK.NS, INFY.NS, ICICIBANK.NS"
    )
    tickers = [ticker.strip() for ticker in custom_tickers.split(',')]

# Number of top/bottom stocks to display
num_stocks = st.sidebar.slider("Number of stocks to display", 5, 30, 10)

# Fetch data function
@st.cache_data(ttl=300)  # Cache for 5 minutes
def fetch_stock_data(tickers, period="1d"):
    data = {}
    for ticker in tickers:
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period=period)
            if not hist.empty:
                # Calculate daily change
                if 'Close' in hist.columns and len(hist) >= 2:
                    data[ticker] = {
                        'price': hist['Close'].iloc[-1],
                        'change': hist['Close'].iloc[-1] - hist['Close'].iloc[-2],
                        'percent_change': ((hist['Close'].iloc[-1] / hist['Close'].iloc[-2]) - 1) * 100,
                        'volume': hist['Volume'].iloc[-1] if 'Volume' in hist.columns else 0
                    }
        except Exception as e:
            st.sidebar.warning(f"Error fetching data for {ticker}: {e}")
    
    return pd.DataFrame.from_dict(data, orient='index')

# Main function
def main():
    # Add refresh button
    col1, col2 = st.columns([4,1])
    with col2:
        refresh = st.button("🔄 Refresh Data")
    
    # Display current time in Indian time zone
    india_tz = pytz.timezone('Asia/Kolkata')
    current_time = datetime.datetime.now(india_tz).strftime("%Y-%m-%d %H:%M:%S %Z")
    st.write(f"Last updated: {current_time}")
    
    # Progress bar for data loading
    with st.spinner("Fetching market data..."):
        progress = st.progress(0)
        
        # Fetch data
        df = fetch_stock_data(tickers)
        progress.progress(100)
    
    if df.empty:
        st.error("Failed to fetch stock data. Please check your internet connection or try again later.")
        return
    
    # Format ticker display names (remove .NS or .BO suffix for display)
    df.index = df.index.map(lambda x: x.split('.')[0])
    
    # Sort data for gainers and losers
    gainers = df.sort_values('percent_change', ascending=False).head(num_stocks)
    losers = df.sort_values('percent_change', ascending=True).head(num_stocks)
    
    # Create tabs for gainers and losers
    tab1, tab2 = st.tabs(["📈 Top Gainers", "📉 Top Losers"])
    
    # Display top gainers
    with tab1:
        st.subheader("Top Gainers")
        
        # Format gainers dataframe for display
        gainers_display = gainers.copy()
        gainers_display['price'] = gainers_display['price'].map('₹{:,.2f}'.format)
        gainers_display['change'] = gainers_display['change'].map('₹{:+,.2f}'.format)
        gainers_display['percent_change'] = gainers_display['percent_change'].map('{:+,.2f}%'.format)
        gainers_display['volume'] = gainers_display['volume'].map('{:,.0f}'.format)
        
        # Rename columns
        gainers_display.columns = ['Price', 'Change', 'Change %', 'Volume']
        gainers_display.index.name = 'Symbol'
        
        # Display table
        st.dataframe(
            gainers_display,
            use_container_width=True,
            column_config={
                "Change %": st.column_config.TextColumn(
                    help="Percentage change since previous close"
                )
            }
        )
    
    # Display top losers
    with tab2:
        st.subheader("Top Losers")
        
        # Format losers dataframe for display
        losers_display = losers.copy()
        losers_display['price'] = losers_display['price'].map('₹{:,.2f}'.format)
        losers_display['change'] = losers_display['change'].map('₹{:+,.2f}'.format)
        losers_display['percent_change'] = losers_display['percent_change'].map('{:+,.2f}%'.format)
        losers_display['volume'] = losers_display['volume'].map('{:,.0f}'.format)
        
        # Rename columns
        losers_display.columns = ['Price', 'Change', 'Change %', 'Volume']
        losers_display.index.name = 'Symbol'
        
        # Display table
        st.dataframe(
            losers_display,
            use_container_width=True,
            column_config={
                "Change %": st.column_config.TextColumn(
                    help="Percentage change since previous close"
                )
            }
        )
    
    # Display market status
    st.markdown("### Market Trading Hours")
    st.info("NSE & BSE: Monday to Friday, 9:15 AM to 3:30 PM IST (except market holidays)")
    
    # Additional information
    st.info("Data source: Yahoo Finance via yfinance API. Refreshed every 5 minutes.")

if __name__ == "__main__":
    main() 