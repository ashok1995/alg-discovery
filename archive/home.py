import streamlit as st
from data.fetchers.nse_fetcher import NSEDataFetcher
import pandas as pd
import requests
from bs4 import BeautifulSoup as bs
import logging
import time
from datetime import datetime
import json

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set page config
st.set_page_config(
    page_title="NSE Market Dashboard",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Apply custom CSS
st.markdown("""
<style>
    .main {padding-top: 1rem;}
    footer {visibility: hidden;}
    .dataframe {width: 100%;}
    .stTabs [data-baseweb="tab-list"] {gap: 2px;}
    .stTabs [data-baseweb="tab"] {height: 50px; white-space: pre-wrap; border-radius: 4px 4px 0 0;}
    .stTabs [aria-selected="true"] {background-color: rgba(28, 131, 225, 0.1);}
</style>
""", unsafe_allow_html=True)

# Function to fetch data from ChartInk with a custom query
@st.cache_data(ttl=1800)
def get_stocks_data_from_chartink(query):
    try:
        data = {
            'scan_clause': query
        }

        with requests.Session() as s:
            r = s.get('https://chartink.com/screener/alg-test-1')
            soup = bs(r.content, 'html.parser')
            s.headers['X-CSRF-TOKEN'] = soup.select_one('[name=csrf-token]')['content']
            r = s.post('https://chartink.com/screener/process', data=data).json()
            
            df = pd.DataFrame(r['data'])
            
            # Clean up and rename columns
            if not df.empty:
                df = df.rename(columns={
                    'nsecode': 'Symbol',
                    'name': 'Name',
                    'close': 'Price',
                    'per_chg': 'Change %',
                    'volume': 'Volume'
                })
                
                # Create hyperlinks for symbols
                df['Symbol'] = df['Symbol'].apply(lambda x: f'<a href="https://chartink.com/stocks-new?symbol={x}" target="_blank">{x}</a>')
                
                # Format columns
                df['Price'] = df['Price'].apply(lambda x: f"₹{x:,.2f}" if pd.notnull(x) else "N/A")
                df['Change %'] = df['Change %'].apply(lambda x: f"{x:+.2f}%" if pd.notnull(x) else "N/A")
                df['Volume'] = df['Volume'].apply(lambda x: f"{int(x):,}" if pd.notnull(x) else "N/A")
                
                # Select columns to display
                display_cols = ['Symbol', 'Name', 'Price', 'Change %', 'Volume']
                return df[display_cols]
            
            return df
    except Exception as e:
        logger.error(f"Error fetching from ChartInk: {str(e)}")
        return pd.DataFrame()

@st.cache_data(ttl=60)  # Cache for 1 minute
def fetch_intraday_recommendations(limit=10):
    """Fetch intraday buy and sell recommendations using POST request"""
    try:
        # Using POST request as requested by user
        api_url = "http://localhost:8888/api/intraday/recommendations-table"
        
        # POST request with parameters in the body
        payload = {"limit": limit}
        headers = {"Content-Type": "application/json"}
        
        response = requests.post(api_url, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            return data
        else:
            st.error(f"API Error: {response.status_code}")
            return None
    except requests.exceptions.RequestException as e:
        st.error(f"Connection Error: {str(e)}")
        return None

def format_recommendation_dataframe(recommendations, rec_type):
    """Convert recommendations to DataFrame with proper formatting"""
    if not recommendations:
        return pd.DataFrame()
    
    df_data = []
    for rec in recommendations:
        # Create clickable symbols
        symbol_link = f'<a href="https://chartink.com/stocks-new?symbol={rec.get("symbol", "")}" target="_blank">{rec.get("symbol", "")}</a>'
        
        df_data.append({
            'Symbol': symbol_link,
            'Signal': rec.get('signal_type', ''),
            'Strength': f"{rec.get('strength', 0):.1f}",
            'Confidence': f"{rec.get('confidence', 0):.1f}%",
            'Current Price': f"₹{rec.get('current_price', 0):.2f}",
            'Target Price': f"₹{rec.get('target_price', 0):.2f}",
            'Stop Loss': f"₹{rec.get('stop_loss', 0):.2f}",
            'Volume Ratio': f"{rec.get('volume_ratio', 0):.2f}",
            'Momentum': f"{rec.get('momentum_score', 0):.2f}",
            'Time': rec.get('timestamp', '').split('T')[1][:8] if 'T' in rec.get('timestamp', '') else '',
            'Reason': rec.get('reason', '')[:30] + '...' if len(rec.get('reason', '')) > 30 else rec.get('reason', '')
        })
    
    return pd.DataFrame(df_data)

def display_intraday_recommendations():
    """Display the intraday recommendations section"""
    st.markdown("## 📈 Intraday Trading Recommendations")
    st.markdown("Real-time buy and sell recommendations based on technical analysis and market momentum")
    
    # Create columns for controls
    col1, col2, col3, col4 = st.columns([1, 1, 1, 1])
    
    with col1:
        limit = st.selectbox("Number of recommendations:", [5, 10, 15, 20], index=1, key="intraday_limit")
    
    with col2:
        auto_refresh = st.checkbox("Auto-refresh (1 min)", value=True, key="intraday_refresh")
    
    with col3:
        if st.button("🔄 Refresh Now", key="intraday_refresh_btn"):
            st.cache_data.clear()
    
    with col4:
        st.caption(f"⏰ Last updated: {datetime.now().strftime('%H:%M:%S')}")
    
    # Fetch data
    with st.spinner("Fetching intraday recommendations..."):
        data = fetch_intraday_recommendations(limit)
    
    if data:
        # Display stats in metrics
        if 'raw_data' in data:
            buy_recs = data['raw_data'].get('buy_recommendations', [])
            sell_recs = data['raw_data'].get('sell_recommendations', [])
            
            # Market summary stats
            stats = data.get('market_summary', {})
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric("🟢 Buy Signals", len(buy_recs))
            with col2:
                st.metric("🔴 Sell Signals", len(sell_recs))
            with col3:
                avg_buy_conf = sum(r.get('confidence', 0) for r in buy_recs) / len(buy_recs) if buy_recs else 0
                st.metric("Avg Buy Confidence", f"{avg_buy_conf:.1f}%")
            with col4:
                avg_sell_conf = sum(r.get('confidence', 0) for r in sell_recs) / len(sell_recs) if sell_recs else 0
                st.metric("Avg Sell Confidence", f"{avg_sell_conf:.1f}%")
            
            # Market sentiment indicator
            sentiment = stats.get('market_sentiment', 'Neutral')
            sentiment_color = "#28a745" if sentiment == "Bullish" else "#dc3545" if sentiment == "Bearish" else "#6c757d"
            st.markdown(f"<div style='text-align:center; padding:10px; background-color:{sentiment_color}; color:white; border-radius:5px; margin:10px 0;'><h4>📊 Market Sentiment: {sentiment}</h4></div>", unsafe_allow_html=True)
            
            # Create side-by-side layout for buy/sell recommendations
            col_buy, col_sell = st.columns(2)
            
            with col_buy:
                st.markdown("### 🟢 BUY Recommendations")
                
                if buy_recs:
                    buy_df = format_recommendation_dataframe(buy_recs, 'buy')
                    st.markdown(buy_df.to_html(escape=False, index=False), unsafe_allow_html=True)
                else:
                    st.info("No buy recommendations available at the moment")
            
            with col_sell:
                st.markdown("### 🔴 SELL Recommendations")
                
                if sell_recs:
                    sell_df = format_recommendation_dataframe(sell_recs, 'sell')
                    st.markdown(sell_df.to_html(escape=False, index=False), unsafe_allow_html=True)
                else:
                    st.info("No sell recommendations available at the moment")
            
            # Export functionality
            if buy_recs or sell_recs:
                col1, col2 = st.columns(2)
                
                with col1:
                    if buy_recs:
                        buy_csv = format_recommendation_dataframe(buy_recs, 'buy').to_csv(index=False).encode('utf-8')
                        st.download_button(
                            label="📥 Download Buy Recommendations",
                            data=buy_csv,
                            file_name=f"buy_recommendations_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
                            mime="text/csv",
                            key="download_buy"
                        )
                
                with col2:
                    if sell_recs:
                        sell_csv = format_recommendation_dataframe(sell_recs, 'sell').to_csv(index=False).encode('utf-8')
                        st.download_button(
                            label="📥 Download Sell Recommendations",
                            data=sell_csv,
                            file_name=f"sell_recommendations_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
                            mime="text/csv",
                            key="download_sell"
                        )
        
        # Auto-refresh logic
        if auto_refresh:
            # Display countdown with progress bar
            placeholder = st.empty()
            progress_bar = st.progress(0)
            
            for i in range(60, 0, -1):
                progress_bar.progress((60 - i) / 60)
                placeholder.caption(f"⏱️ Auto-refresh in {i} seconds...")
                time.sleep(1)
            
            placeholder.empty()
            progress_bar.empty()
            st.cache_data.clear()
            st.rerun()
    
    else:
        st.error("⚠️ Unable to fetch recommendations. Please ensure the AlgoDiscovery API server is running on localhost:8888")
        st.markdown("**Troubleshooting:**")
        st.markdown("- Check if the API server is running: `python start.py`")
        st.markdown("- Verify the API endpoint is accessible: http://localhost:8888/health")

def main():
    st.title("NSE Market Dashboard")
    
    # Initialize fetcher
    fetcher = NSEDataFetcher()
    
    # Bullish Swing Trade Query
    bullish_swing_query = """( {cash} ( latest close > 50 ) and ( latest volume > 100000 ) and 
    ( latest close > latest ema(20) ) and ( latest ema(20) > latest ema(50) ) and
    ( latest rsi(14) > 50 and latest rsi(14) < 70 ) and
    ( latest close > 1.03 * latest open ) and
    ( latest close > latest high 1 day ago ) and
    ( latest volume > 1.5 * latest volume 5 days ago ) and
    ( latest macd line(12,26,9) > latest macd signal(12,26,9) ) and
    ( latest close > latest upper bollinger(20,2) ) and
    ( latest close > latest high 1 week ago ) and
    ( latest close > latest close 1 month ago * 1.1 ) )"""
    
    # Create tabs for different market views
    tabs = st.tabs(["📊 Market Overview", "🚀 Intraday Recommendations", "🔥 Bullish Swing Trades", "📈 Technical Setups", "🧠 Advanced Strategies"])
    
    with tabs[0]:
        st.markdown("## Market Overview")
        
        # Market metrics in cards
        col1, col2, col3 = st.columns(3)
        
        with col1:
            with st.container():
                st.subheader("📈 Top Gainers")
                try:
                    gainers = fetcher.get_top_gainers()
                    gainers_df = pd.DataFrame(gainers)
                    if not gainers_df.empty:
                        gainers_df = gainers_df.rename(columns={
                            'symbol': 'Symbol',
                            'ltp': 'Price',
                            'change_pct': 'Change %'
                        })
                        # Create hyperlinks for symbols
                        gainers_df['Symbol'] = gainers_df['Symbol'].apply(lambda x: f'<a href="https://chartink.com/stocks-new?symbol={x}" target="_blank">{x}</a>')
                        gainers_df['Price'] = gainers_df['Price'].apply(lambda x: f"₹{x:,.2f}")
                        gainers_df['Change %'] = gainers_df['Change %'].apply(lambda x: f"+{x}%")
                        st.markdown(gainers_df[['Symbol', 'Price', 'Change %']].head(10).to_html(escape=False, index=False), unsafe_allow_html=True)
                    else:
                        st.write("No data available")
                except Exception as e:
                    st.write("Unable to fetch data")

        with col2:
            with st.container():
                st.subheader("📉 Top Losers")
                try:
                    losers = fetcher.get_top_losers()
                    losers_df = pd.DataFrame(losers)
                    if not losers_df.empty:
                        losers_df = losers_df.rename(columns={
                            'symbol': 'Symbol',
                            'ltp': 'Price',
                            'change_pct': 'Change %'
                        })
                        # Create hyperlinks for symbols
                        losers_df['Symbol'] = losers_df['Symbol'].apply(lambda x: f'<a href="https://chartink.com/stocks-new?symbol={x}" target="_blank">{x}</a>')
                        losers_df['Price'] = losers_df['Price'].apply(lambda x: f"₹{x:,.2f}")
                        losers_df['Change %'] = losers_df['Change %'].apply(lambda x: f"{x}%")
                        st.markdown(losers_df[['Symbol', 'Price', 'Change %']].head(10).to_html(escape=False, index=False), unsafe_allow_html=True)
                    else:
                        st.write("No data available")
                except Exception as e:
                    st.write("Unable to fetch data")

        with col3:
            with st.container():
                st.subheader("💫 Volume Shockers")
                try:
                    vol_shockers = fetcher.get_volume_shockers()
                    vol_df = pd.DataFrame(vol_shockers)
                    if not vol_df.empty:
                        vol_df = vol_df.rename(columns={
                            'symbol': 'Symbol',
                            'ltp': 'Price',
                            'volume_change': 'Volume Change %'
                        })
                        # Create hyperlinks for symbols
                        vol_df['Symbol'] = vol_df['Symbol'].apply(lambda x: f'<a href="https://chartink.com/stocks-new?symbol={x}" target="_blank">{x}</a>')
                        vol_df['Price'] = vol_df['Price'].apply(lambda x: f"₹{x:,.2f}")
                        vol_df['Volume Change %'] = vol_df['Volume Change %'].apply(lambda x: f"{x}%")
                        st.markdown(vol_df[['Symbol', 'Price', 'Volume Change %']].head(10).to_html(escape=False, index=False), unsafe_allow_html=True)
                    else:
                        st.write("No data available")
                except Exception as e:
                    st.write("Unable to fetch data")
    
    with tabs[1]:
        display_intraday_recommendations()
    
    with tabs[2]:
        st.markdown("## 🔥 Bullish Swing Trades")
        st.markdown("Stocks with strong bullish momentum and technical setups with high probability of upward movement")
        
        # Fetch bullish swing trade stocks
        with st.spinner("Fetching bullish swing trade setups..."):
            bullish_stocks = get_stocks_data_from_chartink(bullish_swing_query)
            
            if not bullish_stocks.empty:
                st.markdown(bullish_stocks.head(20).to_html(escape=False, index=False), unsafe_allow_html=True)
                
                # Download button
                csv = bullish_stocks.to_csv(index=False).encode('utf-8')
                st.download_button(
                    label="Download Bullish Swing Trades",
                    data=csv,
                    file_name="bullish_swing_trades.csv",
                    mime="text/csv",
                )
            else:
                st.warning("No bullish swing trade setups found today. Try again during market hours.")
    
    with tabs[3]:
        st.markdown("## 📈 Technical Setups")
        
        # Create columns for different technical setups
        setup_col1, setup_col2 = st.columns(2)
        
        with setup_col1:
            st.subheader("Breakout Stocks")
            breakout_query = """( {cash} ( latest close > 50 ) and ( latest volume > 100000 ) and 
            ( latest close > latest high 1 day ago * 1.02 ) and
            ( latest volume > 1.5 * latest volume 5 days ago ) )"""
            
            with st.spinner("Fetching breakout stocks..."):
                breakout_stocks = get_stocks_data_from_chartink(breakout_query)
                
                if not breakout_stocks.empty:
                    st.markdown(breakout_stocks.head(10).to_html(escape=False, index=False), unsafe_allow_html=True)
                else:
                    st.info("No breakout stocks found today.")
        
        with setup_col2:
            st.subheader("Golden Crossover")
            golden_cross_query = """( {cash} ( latest close > 50 ) and ( latest volume > 100000 ) and 
            ( latest ema(20) > latest ema(50) ) and
            ( 1 day ago ema(20) <= 1 day ago ema(50) ) )"""
            
            with st.spinner("Fetching golden crossover stocks..."):
                golden_cross_stocks = get_stocks_data_from_chartink(golden_cross_query)
                
                if not golden_cross_stocks.empty:
                    st.markdown(golden_cross_stocks.head(10).to_html(escape=False, index=False), unsafe_allow_html=True)
                else:
                    st.info("No golden crossover stocks found today.")
    
    with tabs[4]:
        st.markdown("## 🧠 Advanced Strategies")
        
        # Create columns for different advanced strategies
        adv_col1, adv_col2 = st.columns(2)
        
        with adv_col1:
            st.subheader("Bullish Engulfing Pattern")
            engulfing_query = """( {cash} ( latest close > 50 ) and ( latest volume > 100000 ) and 
            ( latest close > latest open ) and
            ( 1 day ago close < 1 day ago open ) and
            ( latest open < 1 day ago close ) and
            ( latest close > 1 day ago open ) )"""
            
            with st.spinner("Fetching bullish engulfing patterns..."):
                engulfing_stocks = get_stocks_data_from_chartink(engulfing_query)
                
                if not engulfing_stocks.empty:
                    st.markdown(engulfing_stocks.head(10).to_html(escape=False, index=False), unsafe_allow_html=True)
                else:
                    st.info("No bullish engulfing patterns found today.")
        
        with adv_col2:
            st.subheader("RSI Reversal")
            rsi_reversal_query = """( {cash} ( latest close > 50 ) and ( latest volume > 100000 ) and 
            ( latest rsi(14) > 40 ) and
            ( 1 day ago rsi(14) < 30 or 2 days ago rsi(14) < 30 ) and
            ( latest close > latest open ) )"""
            
            with st.spinner("Fetching RSI reversal stocks..."):
                rsi_reversal_stocks = get_stocks_data_from_chartink(rsi_reversal_query)
                
                if not rsi_reversal_stocks.empty:
                    st.markdown(rsi_reversal_stocks.head(10).to_html(escape=False, index=False), unsafe_allow_html=True)
                else:
                    st.info("No RSI reversal stocks found today.")
        
        # Second row of advanced strategies
        adv_col3, adv_col4 = st.columns(2)
        
        with adv_col3:
            st.subheader("Inside Bar Pattern")
            inside_bar_query = """( {cash} ( latest close > 50 ) and ( latest volume > 100000 ) and 
            ( latest high < 1 day ago high ) and
            ( latest low > 1 day ago low ) )"""
            
            with st.spinner("Fetching inside bar patterns..."):
                inside_bar_stocks = get_stocks_data_from_chartink(inside_bar_query)
                
                if not inside_bar_stocks.empty:
                    st.markdown(inside_bar_stocks.head(10).to_html(escape=False, index=False), unsafe_allow_html=True)
                else:
                    st.info("No inside bar patterns found today.")
        
        with adv_col4:
            st.subheader("Cup and Handle")
            cup_handle_query = """( {cash} ( latest close > 50 ) and ( latest volume > 100000 ) and 
            ( latest close > latest high 1 month ago * 0.98 ) and
            ( 1 month ago close < 2 months ago close ) and
            ( 2 weeks ago close < 1 month ago close ) and
            ( latest close > 2 weeks ago close * 1.05 ) )"""
            
            with st.spinner("Fetching cup and handle patterns..."):
                cup_handle_stocks = get_stocks_data_from_chartink(cup_handle_query)
                
                if not cup_handle_stocks.empty:
                    st.markdown(cup_handle_stocks.head(10).to_html(escape=False, index=False), unsafe_allow_html=True)
                else:
                    st.info("No cup and handle patterns found today.")

if __name__ == "__main__":
    main() 