"""Component for displaying market indices"""

import streamlit as st

def render_main_indices(market_data=None):
    """
    Render the main market indices display
    
    Args:
        market_data: Dictionary containing market data
    """
    # Use default values if no data is provided
    nifty_value = market_data.get('NIFTY', {}).get('value', '19,425.35')
    nifty_change = market_data.get('NIFTY', {}).get('change', '+0.75%')
    
    st.markdown(f"""
    <div class="primary-index">
        <h3>NIFTY 50</h3>
        <div class="value">{nifty_value}</div>
        <div class="change">{nifty_change}</div>
    </div>
    """, unsafe_allow_html=True)
    
    # Create ticker items for other indices
    indices = [
        {"symbol": "SENSEX", "price": "65,214.50", "change": "+0.62%", "direction": "up"},
        {"symbol": "BANKNIFTY", "price": "44,123.70", "change": "-0.18%", "direction": "down"},
        {"symbol": "MIDCAP", "price": "13,456.87", "change": "+0.92%", "direction": "up"},
        {"symbol": "USDINR", "price": "83.25", "change": "+0.12%", "direction": "up"}
    ]
    
    # Override with actual data if available
    if market_data:
        # Code to replace default values with actual data
        pass
    
    # Render ticker container
    ticker_html = '<div class="ticker-container">'
    
    for index in indices:
        ticker_html += f"""
        <div class="ticker-item">
            <div class="ticker-symbol">{index['symbol']}</div>
            <div class="ticker-price">{index['price']}</div>
            <div class="change-{index['direction']}">{index['change']}</div>
        </div>
        """
    
    ticker_html += '</div>'
    st.markdown(ticker_html, unsafe_allow_html=True) 