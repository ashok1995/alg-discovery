"""
Template pages for the Market Analyzer application
These templates can be used to create placeholder pages for the various trading strategies
"""

import streamlit as st
from utils.logger import get_logger

# Initialize logger
logger = get_logger(__name__, group="dashboard", service="page_templates")

def show_intraday_page():
    """
    Show the Intraday Trading page
    """
    st.title("⚡ Intraday Trading")
    
    # Market condition summary
    st.markdown("### Market Condition")
    condition_col1, condition_col2, condition_col3 = st.columns(3)
    
    with condition_col1:
        st.metric("Market Status", "Volatile", delta="High Volume")
    
    with condition_col2:
        st.metric("Intraday Trend", "Bullish", delta="Strong")
    
    with condition_col3:
        st.metric("Recommended Exposure", "70%", delta="10%")
    
    # Intraday Opportunities
    st.markdown("### Today's Trading Opportunities")
    
    opportunities = [
        {"symbol": "HDFC", "signal": "Buy", "entry": "1450-1455", "target": "1475", "stop_loss": "1440", "strategy": "Breakout"},
        {"symbol": "INFY", "signal": "Sell", "entry": "1780-1785", "target": "1750", "stop_loss": "1795", "strategy": "Gap Down"},
        {"symbol": "RELIANCE", "signal": "Buy", "entry": "2650-2655", "target": "2680", "stop_loss": "2640", "strategy": "Support Bounce"}
    ]
    
    # Create three columns for the opportunities
    cols = st.columns(3)
    
    # Display each opportunity in a separate column
    for i, opportunity in enumerate(opportunities):
        with cols[i % 3]:
            st.markdown(f"""
            <div style="border: 1px solid #e0e0e0; border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                <h4 style="margin-top: 0;">{opportunity['symbol']} - {opportunity['signal']}</h4>
                <p><strong>Entry:</strong> {opportunity['entry']}</p>
                <p><strong>Target:</strong> {opportunity['target']}</p>
                <p><strong>Stop Loss:</strong> {opportunity['stop_loss']}</p>
                <p><strong>Strategy:</strong> {opportunity['strategy']}</p>
            </div>
            """, unsafe_allow_html=True)
    
    # Intraday Strategies Section
    st.markdown("### Intraday Strategies")
    
    strategy_tabs = st.tabs(["Momentum", "Breakout", "Reversal", "Scalping"])
    
    with strategy_tabs[0]:
        st.markdown("""
        ### Momentum Trading
        
        Momentum trading involves identifying stocks with strong price movements and trading in the direction of the trend.
        
        **Current Momentum Stocks:**
        - HDFCBANK (+2.4%)
        - TCS (+1.8%)
        - BHARTIARTL (+1.5%)
        """)
    
    with strategy_tabs[1]:
        st.markdown("""
        ### Breakout Trading
        
        Breakout trading involves identifying stocks that are breaking out of established support/resistance levels.
        
        **Current Breakout Candidates:**
        - SUNPHARMA (Breaking R: 980)
        - ULTRACEMCO (Breaking R: 8450)
        - TITAN (Breaking R: 3250)
        """)
    
    with strategy_tabs[2]:
        st.markdown("""
        ### Reversal Trading
        
        Reversal trading involves identifying stocks that are likely to reverse their current trend.
        
        **Current Reversal Candidates:**
        - TATASTEEL (Oversold)
        - HINDUNILVR (Double Bottom)
        - AXISBANK (Bullish Divergence)
        """)
    
    with strategy_tabs[3]:
        st.markdown("""
        ### Scalping
        
        Scalping involves making multiple trades within a day to capture small price movements.
        
        **Current Scalping Candidates:**
        - SBIN (High Volatility)
        - ICICIBANK (Tight Range)
        - ITC (High Volume)
        """)

def show_swing_page(market_condition=None):
    """
    Show the Swing Trading page
    
    Args:
        market_condition: Market condition dictionary
    """
    st.title("🔄 Swing Trading")
    
    # Market condition summary
    st.markdown("### Market Condition")
    
    if market_condition and "trend" in market_condition:
        trend = market_condition.get("trend", "neutral").capitalize()
        volatility = market_condition.get("volatility", "medium").capitalize()
        
        condition_col1, condition_col2, condition_col3 = st.columns(3)
        
        with condition_col1:
            st.metric("Market Trend", trend)
        
        with condition_col2:
            st.metric("Volatility", volatility)
        
        with condition_col3:
            recommended_strategies = market_condition.get("recommended_strategies", {}).get("swing", [])
            if recommended_strategies:
                strategies_text = ", ".join(s.replace("_", " ").title() for s in recommended_strategies)
                st.metric("Recommended Strategies", strategies_text)
            else:
                st.metric("Recommended Strategies", "None specified")
    else:
        st.warning("Market condition data not available")
    
    # Swing Trading Opportunities
    st.markdown("### Current Swing Trading Opportunities")
    
    opportunities = [
        {"symbol": "TATAMOTORS", "signal": "Buy", "entry": "850-855", "target": "900", "stop_loss": "830", "timeframe": "1-2 weeks", "strategy": "Trend Following"},
        {"symbol": "ASIANPAINT", "signal": "Sell", "entry": "3150-3160", "target": "3050", "stop_loss": "3200", "timeframe": "1-2 weeks", "strategy": "Resistance Breakdown"},
        {"symbol": "HDFCBANK", "signal": "Buy", "entry": "1560-1565", "target": "1620", "stop_loss": "1540", "timeframe": "2-3 weeks", "strategy": "Support Bounce"}
    ]
    
    # Create three columns for the opportunities
    cols = st.columns(3)
    
    # Display each opportunity in a separate column
    for i, opportunity in enumerate(opportunities):
        with cols[i % 3]:
            st.markdown(f"""
            <div style="border: 1px solid #e0e0e0; border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                <h4 style="margin-top: 0;">{opportunity['symbol']} - {opportunity['signal']}</h4>
                <p><strong>Entry:</strong> {opportunity['entry']}</p>
                <p><strong>Target:</strong> {opportunity['target']}</p>
                <p><strong>Stop Loss:</strong> {opportunity['stop_loss']}</p>
                <p><strong>Timeframe:</strong> {opportunity['timeframe']}</p>
                <p><strong>Strategy:</strong> {opportunity['strategy']}</p>
            </div>
            """, unsafe_allow_html=True)
    
    # Swing Trading Strategies Section
    st.markdown("### Swing Trading Strategies")
    
    strategy_tabs = st.tabs(["Trend Following", "Range Bound", "Breakout", "Reversal"])
    
    with strategy_tabs[0]:
        st.markdown("""
        ### Trend Following
        
        Trend following involves identifying stocks that are in a strong uptrend or downtrend and trading in the direction of that trend.
        
        **Current Trend Following Opportunities:**
        - RELIANCE (Strong Uptrend)
        - INFY (Strong Uptrend)
        - TATACONSUM (Strong Uptrend)
        """)
    
    with strategy_tabs[1]:
        st.markdown("""
        ### Range Bound Trading
        
        Range bound trading involves identifying stocks that are trading within a defined range and taking trades at the support and resistance levels.
        
        **Current Range Bound Opportunities:**
        - HDFCBANK (Range: 1540-1580)
        - ITC (Range: 420-450)
        - MARUTI (Range: 9800-10200)
        """)
    
    with strategy_tabs[2]:
        st.markdown("""
        ### Breakout Trading
        
        Breakout trading involves identifying stocks that are breaking out of established patterns or consolidation zones.
        
        **Current Breakout Opportunities:**
        - TATASTEEL (Breaking out of consolidation)
        - SUNPHARMA (Cup and Handle pattern)
        - BAJAJFINSV (Breaking out of descending triangle)
        """)
    
    with strategy_tabs[3]:
        st.markdown("""
        ### Reversal Trading
        
        Reversal trading involves identifying stocks that are likely to reverse their current trend based on technical patterns.
        
        **Current Reversal Opportunities:**
        - KOTAKBANK (Double Bottom)
        - AXISBANK (Head and Shoulders)
        - HINDUNILVR (Bullish Divergence)
        """)

def show_longterm_page():
    """
    Show the Long-Term Investment page
    """
    st.title("📈 Long-Term Investment")
    
    # Market outlook
    st.markdown("### Market Outlook")
    
    outlook_col1, outlook_col2, outlook_col3 = st.columns(3)
    
    with outlook_col1:
        st.metric("Long-Term Trend", "Bullish", delta="Strong")
    
    with outlook_col2:
        st.metric("Suggested Allocation", "80% Equity", delta="5%")
    
    with outlook_col3:
        st.metric("Risk Assessment", "Moderate", delta=None)
    
    # Long-Term Investment Opportunities
    st.markdown("### Long-Term Investment Opportunities")
    
    opportunities = [
        {"symbol": "RELIANCE", "sector": "Energy", "current_price": "2650", "target_price": "3200", "time_horizon": "2-3 years", "expected_cagr": "12%", "strategy": "Growth"},
        {"symbol": "HDFCBANK", "sector": "Banking", "current_price": "1560", "target_price": "1900", "time_horizon": "2-3 years", "expected_cagr": "10%", "strategy": "Value"},
        {"symbol": "TCS", "sector": "IT", "current_price": "3450", "target_price": "4200", "time_horizon": "3-5 years", "expected_cagr": "8%", "strategy": "Dividend"}
    ]
    
    # Create three columns for the opportunities
    cols = st.columns(3)
    
    # Display each opportunity in a separate column
    for i, opportunity in enumerate(opportunities):
        with cols[i % 3]:
            st.markdown(f"""
            <div style="border: 1px solid #e0e0e0; border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                <h4 style="margin-top: 0;">{opportunity['symbol']} - {opportunity['sector']}</h4>
                <p><strong>Current Price:</strong> ₹{opportunity['current_price']}</p>
                <p><strong>Target Price:</strong> ₹{opportunity['target_price']}</p>
                <p><strong>Time Horizon:</strong> {opportunity['time_horizon']}</p>
                <p><strong>Expected CAGR:</strong> {opportunity['expected_cagr']}</p>
                <p><strong>Strategy:</strong> {opportunity['strategy']}</p>
            </div>
            """, unsafe_allow_html=True)
    
    # Investment Strategies Section
    st.markdown("### Investment Strategies")
    
    strategy_tabs = st.tabs(["Growth", "Value", "Dividend", "SIP"])
    
    with strategy_tabs[0]:
        st.markdown("""
        ### Growth Investing
        
        Growth investing focuses on companies that are expected to grow their earnings at an above-average rate compared to other companies.
        
        **Current Growth Opportunities:**
        - BAJFINANCE (Finance)
        - ASIANPAINT (Consumer)
        - TATAELXSI (Technology)
        """)
    
    with strategy_tabs[1]:
        st.markdown("""
        ### Value Investing
        
        Value investing focuses on stocks that appear to be trading for less than their intrinsic value.
        
        **Current Value Opportunities:**
        - COALINDIA (Energy)
        - IOC (Energy)
        - NTPC (Utilities)
        """)
    
    with strategy_tabs[2]:
        st.markdown("""
        ### Dividend Investing
        
        Dividend investing focuses on stocks that pay high dividends relative to their price.
        
        **Current Dividend Opportunities:**
        - ITC (Consumer)
        - POWERGRID (Utilities)
        - ONGC (Energy)
        """)
    
    with strategy_tabs[3]:
        st.markdown("""
        ### Systematic Investment Plan (SIP)
        
        SIP involves investing a fixed amount regularly in mutual funds or stocks.
        
        **Recommended SIPs:**
        - NIFTY 50 Index Fund
        - NIFTY Next 50 Index Fund
        - Multi-Cap Mutual Funds
        """)

def show_shortselling_page():
    """
    Show the Short Selling page
    """
    st.title("📉 Short Selling")
    
    # Market condition summary
    st.markdown("### Market Condition")
    
    condition_col1, condition_col2, condition_col3 = st.columns(3)
    
    with condition_col1:
        st.metric("Short Term Trend", "Bearish", delta="-2.5%", delta_color="inverse")
    
    with condition_col2:
        st.metric("Volatility", "High", delta="10%")
    
    with condition_col3:
        st.metric("Recommended Exposure", "30%", delta=None)
    
    # Short Selling Opportunities
    st.markdown("### Short Selling Opportunities")
    
    opportunities = [
        {"symbol": "TATAMOTORS", "signal": "Sell", "entry": "850-855", "target": "820", "stop_loss": "870", "timeframe": "1-2 days", "strategy": "Breakdown"},
        {"symbol": "ASIANPAINT", "signal": "Sell", "entry": "3150-3160", "target": "3100", "stop_loss": "3180", "timeframe": "1-2 days", "strategy": "Head and Shoulders"},
        {"symbol": "HDFCBANK", "signal": "Sell", "entry": "1560-1565", "target": "1530", "stop_loss": "1575", "timeframe": "2-3 days", "strategy": "Double Top"}
    ]
    
    # Create three columns for the opportunities
    cols = st.columns(3)
    
    # Display each opportunity in a separate column
    for i, opportunity in enumerate(opportunities):
        with cols[i % 3]:
            st.markdown(f"""
            <div style="border: 1px solid #e0e0e0; border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                <h4 style="margin-top: 0;">{opportunity['symbol']} - {opportunity['signal']}</h4>
                <p><strong>Entry:</strong> {opportunity['entry']}</p>
                <p><strong>Target:</strong> {opportunity['target']}</p>
                <p><strong>Stop Loss:</strong> {opportunity['stop_loss']}</p>
                <p><strong>Timeframe:</strong> {opportunity['timeframe']}</p>
                <p><strong>Strategy:</strong> {opportunity['strategy']}</p>
            </div>
            """, unsafe_allow_html=True)
    
    # Short Selling Strategies Section
    st.markdown("### Short Selling Strategies")
    
    strategy_tabs = st.tabs(["Trend Following", "Pattern Breakdown", "News-Based", "Pair Trading"])
    
    with strategy_tabs[0]:
        st.markdown("""
        ### Trend Following
        
        Short selling stocks that are in a strong downtrend.
        
        **Current Opportunities:**
        - BHARTIARTL (Downtrend)
        - TATASTEEL (Downtrend)
        - TECHM (Downtrend)
        """)
    
    with strategy_tabs[1]:
        st.markdown("""
        ### Pattern Breakdown
        
        Short selling stocks that are breaking down from chart patterns.
        
        **Current Opportunities:**
        - MARUTI (Head and Shoulders)
        - WIPRO (Double Top)
        - ADANIPORTS (Descending Triangle)
        """)
    
    with strategy_tabs[2]:
        st.markdown("""
        ### News-Based
        
        Short selling stocks that have negative news or events.
        
        **Current Opportunities:**
        - SUNPHARMA (Regulatory Issues)
        - ZOMATO (Earnings Miss)
        - TATAMOTORS (Recall Announcement)
        """)
    
    with strategy_tabs[3]:
        st.markdown("""
        ### Pair Trading
        
        Short selling one stock while going long on a correlated stock.
        
        **Current Opportunities:**
        - Short INFY, Long TCS
        - Short AXISBANK, Long ICICIBANK
        - Short RELIANCE, Long ONGC
        """)

def show_backtest_page():
    """
    Show the Backtest page
    """
    st.title("🧪 Backtest")
    
    # Strategy selection
    st.markdown("### Strategy Selection")
    
    strategy_type = st.selectbox(
        "Select Strategy Type",
        ["Intraday", "Swing", "Long-Term", "Short Selling"]
    )
    
    specific_strategy = None
    
    if strategy_type == "Intraday":
        specific_strategy = st.selectbox(
            "Select Intraday Strategy",
            ["Momentum", "Breakout", "Reversal", "Scalping"]
        )
    elif strategy_type == "Swing":
        specific_strategy = st.selectbox(
            "Select Swing Strategy",
            ["Trend Following", "Range Bound", "Breakout", "Reversal"]
        )
    elif strategy_type == "Long-Term":
        specific_strategy = st.selectbox(
            "Select Long-Term Strategy",
            ["Growth", "Value", "Dividend", "SIP"]
        )
    elif strategy_type == "Short Selling":
        specific_strategy = st.selectbox(
            "Select Short Selling Strategy",
            ["Trend Following", "Pattern Breakdown", "News-Based", "Pair Trading"]
        )
    
    # Backtest parameters
    st.markdown("### Backtest Parameters")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        symbol = st.text_input("Symbol", "NIFTY")
    
    with col2:
        start_date = st.date_input("Start Date")
    
    with col3:
        end_date = st.date_input("End Date")
    
    col4, col5, col6 = st.columns(3)
    
    with col4:
        initial_capital = st.number_input("Initial Capital", min_value=10000, value=100000, step=10000)
    
    with col5:
        risk_per_trade = st.slider("Risk Per Trade (%)", min_value=0.5, max_value=5.0, value=1.0, step=0.5)
    
    with col6:
        st.number_input("Stop Loss (%)", min_value=0.5, max_value=10.0, value=2.0, step=0.5)
    
    # Run backtest button
    if st.button("Run Backtest", type="primary", use_container_width=True):
        with st.spinner("Running backtest..."):
            # Simulate a delay
            import time
            time.sleep(2)
            
            # Show backtest results
            st.markdown("### Backtest Results")
            
            # Performance metrics
            st.markdown("#### Performance Metrics")
            
            metrics_col1, metrics_col2, metrics_col3, metrics_col4 = st.columns(4)
            
            with metrics_col1:
                st.metric("Total Return", "32.5%", delta="Positive")
            
            with metrics_col2:
                st.metric("Annualized Return", "15.8%", delta="Positive")
            
            with metrics_col3:
                st.metric("Sharpe Ratio", "1.45", delta="Good")
            
            with metrics_col4:
                st.metric("Max Drawdown", "-12.3%", delta="-12.3%", delta_color="inverse")
            
            # Results chart
            st.markdown("#### Equity Curve")
            
            # Placeholder for the equity curve chart
            st.line_chart({"Equity Curve": [100, 105, 103, 110, 115, 112, 120, 125, 130, 132]})
            
            # Trade statistics
            st.markdown("#### Trade Statistics")
            
            stats_col1, stats_col2, stats_col3, stats_col4 = st.columns(4)
            
            with stats_col1:
                st.metric("Total Trades", "45")
            
            with stats_col2:
                st.metric("Win Rate", "62.2%")
            
            with stats_col3:
                st.metric("Profit Factor", "1.85")
            
            with stats_col4:
                st.metric("Avg. Trade", "0.72%")
            
            # Trade list
            st.markdown("#### Trade List")
            
            trade_data = {
                "Date": ["2023-01-05", "2023-01-12", "2023-01-20", "2023-01-28", "2023-02-05"],
                "Symbol": ["NIFTY", "NIFTY", "NIFTY", "NIFTY", "NIFTY"],
                "Type": ["Buy", "Sell", "Buy", "Sell", "Buy"],
                "Entry": [17500, 17800, 17400, 17650, 17550],
                "Exit": [17800, 17450, 17650, 17400, 17900],
                "P/L (Rs)": [3000, -3500, 2500, -2500, 3500],
                "P/L (%)": ["1.71%", "-1.97%", "1.44%", "-1.42%", "1.99%"]
            }
            
            st.dataframe(trade_data)
            
            # Monte Carlo simulation
            st.markdown("#### Monte Carlo Simulation")
            
            # Placeholder for the Monte Carlo simulation chart
            st.line_chart({"Simulation 1": [100, 105, 110, 115, 120, 125, 130],
                          "Simulation 2": [100, 103, 107, 112, 118, 122, 128],
                          "Simulation 3": [100, 102, 105, 109, 114, 118, 125],
                          "Simulation 4": [100, 106, 112, 118, 124, 130, 135],
                          "Simulation 5": [100, 104, 109, 115, 121, 126, 132]})