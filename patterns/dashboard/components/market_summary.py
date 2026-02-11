"""
Market summary component with modern UI
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from datetime import datetime, timedelta
import random
from dashboard.custom_style import load_css

def render_market_summary(market_condition):
    """Render a modern market summary"""
    # Load custom CSS
    st.markdown(load_css(), unsafe_allow_html=True)
    
    # Dashboard header
    st.markdown("""
    <div class="dashboard-header">
        <h1>Market Dashboard</h1>
        <p>Real-time market insights and trading opportunities</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Create a market ticker tape
    render_ticker_tape()
    
    # Market overview card
    render_market_overview_card(market_condition)
    
    # Index movement card
    render_index_card()
    
    # Sector performance card
    render_sector_performance()
    
    # Watchlist card
    render_watchlist()

def render_ticker_tape():
    """Render a modern ticker tape"""
    # Simulate some market data
    tickers = [
        {"symbol": "NIFTY 50", "price": "19,425.35", "change": "+0.75%", "status": "up"},
        {"symbol": "SENSEX", "price": "65,214.50", "change": "+0.62%", "status": "up"},
        {"symbol": "BANKNIFTY", "price": "44,123.70", "change": "-0.18%", "status": "down"},
        {"symbol": "USDINR", "price": "83.25", "change": "+0.12%", "status": "up"},
        {"symbol": "GOLD", "price": "2,154.80", "change": "-0.35%", "status": "down"},
        {"symbol": "CRUDE OIL", "price": "82.45", "change": "+1.20%", "status": "up"}
    ]
    
    ticker_html = '<div class="ticker-container">'
    
    for ticker in tickers:
        status_class = "status-up" if ticker["status"] == "up" else "status-down"
        ticker_html += f"""
        <div class="ticker-item">
            <div class="ticker-symbol">{ticker["symbol"]}</div>
            <div class="ticker-price">
                <span>{ticker["price"]}</span>
                <span class="change-{ticker['status']}">{ticker["change"]}</span>
            </div>
        </div>
        """
    
    ticker_html += '</div>'
    
    st.markdown(ticker_html, unsafe_allow_html=True)

def render_market_overview_card(market_condition):
    """Render a modern market overview card"""
    
    # Get market condition values with default fallbacks
    overall = market_condition.get('overall', 'neutral')
    trend = market_condition.get('trend', 'neutral')
    strength = market_condition.get('strength', 'neutral')
    volatility = market_condition.get('volatility', 'neutral')
    momentum = market_condition.get('momentum', 'neutral')
    
    # Determine status colors
    overall_status = get_status_class(overall)
    trend_status = get_status_class(trend)
    strength_status = get_status_class(strength)
    volatility_status = get_status_class(volatility)
    momentum_status = get_status_class(momentum)
    
    # Format values for display
    format_text = lambda text: str(text).replace('_', ' ').title() if text != "In Error" else "N/A"
    
    st.markdown(f"""
    <div class="dashboard-card">
        <div class="card-header">
            <h3 class="card-title">Market Conditions</h3>
            <span id="market-time">{datetime.now().strftime('%d %b %Y, %H:%M:%S')}</span>
        </div>
        
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
            <div class="metric-container" style="flex: 1; min-width: 120px;">
                <div class="metric-label">Overall</div>
                <div class="metric-value">
                    <span class="status-indicator {overall_status}"></span>
                    {format_text(overall)}
                </div>
            </div>
            
            <div class="metric-container" style="flex: 1; min-width: 120px;">
                <div class="metric-label">Trend</div>
                <div class="metric-value">
                    <span class="status-indicator {trend_status}"></span>
                    {format_text(trend)}
                </div>
            </div>
            
            <div class="metric-container" style="flex: 1; min-width: 120px;">
                <div class="metric-label">Strength</div>
                <div class="metric-value">
                    <span class="status-indicator {strength_status}"></span>
                    {format_text(strength)}
                </div>
            </div>
        </div>
        
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            <div class="metric-container" style="flex: 1; min-width: 120px;">
                <div class="metric-label">Volatility</div>
                <div class="metric-value">
                    <span class="status-indicator {volatility_status}"></span>
                    {format_text(volatility)}
                </div>
            </div>
            
            <div class="metric-container" style="flex: 1; min-width: 120px;">
                <div class="metric-label">Momentum</div>
                <div class="metric-value">
                    <span class="status-indicator {momentum_status}"></span>
                    {format_text(momentum)}
                </div>
            </div>
        </div>
        
        <div style="margin-top: 20px;">
            <div style="font-weight: 500; margin-bottom: 5px;">Market Signal</div>
            <div class="animated-progress">
                <div class="animated-progress-bar" style="width: 65%; background-color: #10b981;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #64748b; margin-top: 5px;">
                <span>Bearish</span>
                <span>Neutral</span>
                <span>Bullish</span>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

def render_index_card():
    """Render a modern index performance card"""
    
    # Create tabs with custom styling
    st.markdown("""
    <div class="dashboard-card">
        <div class="card-header">
            <h3 class="card-title">Market Indices</h3>
        </div>
        
        <div class="custom-tabs">
            <div class="custom-tab active" onclick="activateTab(this, 'tab-daily')">Daily</div>
            <div class="custom-tab" onclick="activateTab(this, 'tab-weekly')">Weekly</div>
            <div class="custom-tab" onclick="activateTab(this, 'tab-monthly')">Monthly</div>
        </div>
        
        <div id="tab-daily" class="tab-content active-tab">
    """, unsafe_allow_html=True)
    
    # Generate sample index data
    dates = pd.date_range(end=datetime.now(), periods=30).strftime('%Y-%m-%d').tolist()
    nifty_data = [random.uniform(17500, 19500) for _ in range(30)]
    
    # Create a Plotly figure for the index chart
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=dates,
        y=nifty_data,
        mode='lines',
        line=dict(width=2, color='#0d6efd'),
        fill='tozeroy',
        fillcolor='rgba(13, 110, 253, 0.1)'
    ))
    
    fig.update_layout(
        margin=dict(l=0, r=0, t=0, b=0),
        height=250,
        plot_bgcolor='white',
        hovermode='x unified'
    )
    
    fig.update_xaxes(
        showgrid=True,
        gridcolor='rgba(204, 204, 204, 0.2)'
    )
    
    fig.update_yaxes(
        showgrid=True,
        gridcolor='rgba(204, 204, 204, 0.2)'
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Index stats
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("""
        <div class="metric-container">
            <div class="metric-label">Nifty 50</div>
            <div class="metric-value">19,425.35</div>
            <div class="metric-change change-positive">+0.75%</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
        <div class="metric-container">
            <div class="metric-label">Sensex</div>
            <div class="metric-value">65,214.50</div>
            <div class="metric-change change-positive">+0.62%</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown("""
        <div class="metric-container">
            <div class="metric-label">Bank Nifty</div>
            <div class="metric-value">44,123.70</div>
            <div class="metric-change change-negative">-0.18%</div>
        </div>
        """, unsafe_allow_html=True)
    
    # Close the card
    st.markdown("</div>", unsafe_allow_html=True)

def render_sector_performance():
    """Render a modern sector performance card"""
    
    st.markdown("""
    <div class="dashboard-card">
        <div class="card-header">
            <h3 class="card-title">Sector Performance</h3>
        </div>
    """, unsafe_allow_html=True)
    
    # Generate sample sector data
    sectors = {
        "IT": 1.24,
        "Banking": -0.35,
        "Pharma": 0.87,
        "Auto": 2.15,
        "FMCG": 0.45,
        "Metal": -1.20,
        "Energy": 0.68,
        "Realty": -0.56
    }
    
    # Sort sectors by performance
    sorted_sectors = sorted(sectors.items(), key=lambda x: x[1], reverse=True)
    
    # Create animated progress bars for each sector
    sector_html = ""
    for sector, value in sorted_sectors:
        color = "#10b981" if value > 0 else "#ef4444"
        width = abs(value) * 10  # Scale for visualization
        
        sector_html += f"""
        <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-weight: 500;">{sector}</span>
                <span class="change-{'positive' if value > 0 else 'negative'}">{value:+.2f}%</span>
            </div>
            <div class="animated-progress">
                <div class="animated-progress-bar" style="width: {width}%; background-color: {color};"></div>
            </div>
        </div>
        """
    
    st.markdown(sector_html, unsafe_allow_html=True)
    
    # Close the card
    st.markdown("</div>", unsafe_allow_html=True)

def render_watchlist():
    """Render a modern watchlist card"""
    
    st.markdown("""
    <div class="dashboard-card">
        <div class="card-header">
            <h3 class="card-title">Watchlist</h3>
            <a href="#" class="action-button">+ Add Stock</a>
        </div>
    """, unsafe_allow_html=True)
    
    # Sample watchlist data
    watchlist = [
        {"symbol": "TCS", "price": 3521.45, "change": 1.25, "signal": "Buy"},
        {"symbol": "RELIANCE", "price": 2467.80, "change": -0.34, "signal": "Hold"},
        {"symbol": "HDFC", "price": 1543.65, "change": 0.87, "signal": "Buy"},
        {"symbol": "INFY", "price": 1489.30, "change": 2.14, "signal": "Strong Buy"},
        {"symbol": "BHARTIARTL", "price": 865.45, "change": -1.20, "signal": "Sell"}
    ]
    
    # Create a modern table
    table_html = """
    <table class="stock-table">
        <thead>
            <tr>
                <th>Symbol</th>
                <th>Price</th>
                <th>Change</th>
                <th>Signal</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
    """
    
    for stock in watchlist:
        change_class = "change-positive" if stock["change"] > 0 else "change-negative"
        signal_class = "success" if "buy" in stock["signal"].lower() else "danger" if "sell" in stock["signal"].lower() else "secondary"
        
        table_html += f"""
        <tr>
            <td><strong>{stock["symbol"]}</strong></td>
            <td>₹{stock["price"]:.2f}</td>
            <td class="{change_class}">{stock["change"]:+.2f}%</td>
            <td><span class="action-button {signal_class}" style="font-size: 12px; padding: 3px 8px;">{stock["signal"]}</span></td>
            <td><a href="#" style="color: #0d6efd;">View</a></td>
        </tr>
        """
    
    table_html += """
        </tbody>
    </table>
    """
    
    st.markdown(table_html, unsafe_allow_html=True)
    
    # Close the card
    st.markdown("</div>", unsafe_allow_html=True)

def get_status_class(value):
    """Get the appropriate status class based on the value"""
    if isinstance(value, str):
        lower_value = value.lower()
        if any(term in lower_value for term in ['bullish', 'uptrend', 'strong', 'high']):
            return 'status-up'
        elif any(term in lower_value for term in ['bearish', 'downtrend', 'weak', 'low']):
            return 'status-down'
    return 'status-neutral' 