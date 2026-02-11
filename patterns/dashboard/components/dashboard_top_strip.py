"""
Market dashboard top strip component - shows 5 columns of vertical market data
"""

import streamlit as st
import pandas as pd
import streamlit.components.v1 as components

def render_market_dashboard(market_condition=None):
    """
    Render a market dashboard with 5 vertically scrollable columns of cards
    
    Args:
        market_condition: Market condition data dictionary (optional)
    """
    # Use provided market data or fallback to sample data
    if market_condition and isinstance(market_condition, dict) and len(market_condition) > 0:
        # Extract real market data if available
        try:
            # These values would come from your market_condition dictionary
            # Format them appropriately for display
            indices_cards = []
            if 'NIFTY' in market_condition:
                indices_cards.append({
                    "title": "NIFTY",
                    "value": f"{market_condition['NIFTY'].get('price', 0):,.2f}",
                    "change": market_condition['NIFTY'].get('change_percent', 0)
                })
            
            if 'SENSEX' in market_condition:
                indices_cards.append({
                    "title": "SENSEX",
                    "value": f"{market_condition['SENSEX'].get('price', 0):,.2f}",
                    "change": market_condition['SENSEX'].get('change_percent', 0)
                })
            
            if 'BANKNIFTY' in market_condition:
                indices_cards.append({
                    "title": "BANKNIFTY",
                    "value": f"{market_condition['BANKNIFTY'].get('price', 0):,.2f}",
                    "change": market_condition['BANKNIFTY'].get('change_percent', 0)
                })
            
            if 'NIFTY_NEXT50' in market_condition:
                indices_cards.append({
                    "title": "NIFTY_NEXT50",
                    "value": f"{market_condition['NIFTY_NEXT50'].get('price', 0):,.2f}",
                    "change": market_condition['NIFTY_NEXT50'].get('change_percent', 0)
                })
                
            # Similarly extract sector data, gainers, losers from your market_condition
            # This would depend on your actual data structure
            
            # If we don't have enough data, fall back to sample data
            if len(indices_cards) < 2:
                raise ValueError("Insufficient market data")
                
        except Exception as e:
            # Fall back to sample data if extraction fails
            st.warning(f"Using sample data due to: {e}")
            use_sample_data = True
    else:
        use_sample_data = True
    
    # Sample data for demonstration or fallback
    if 'use_sample_data' in locals() and use_sample_data:
        indices_cards = [
            {"title": "NIFTY", "value": "22,456.80", "change": 0.72},
            {"title": "SENSEX", "value": "74,221.20", "change": 0.65},
            {"title": "BANKNIFTY", "value": "48,124.60", "change": 0.43},
            {"title": "NIFTY_NEXT50", "value": "65,872.90", "change": 0.81}
        ]
        
        top_sector_cards = [
            {"title": "IT", "value": "35,124.90", "change": 2.8},
            {"title": "Banking", "value": "45,221.50", "change": 1.2},
            {"title": "Pharma", "value": "18,345.20", "change": 0.5}
        ]
        
        more_sector_cards = [
            {"title": "Metal", "value": "8,234.60", "change": 3.2},
            {"title": "Power", "value": "22,431.10", "change": 1.8},
            {"title": "Oil & Gas", "value": "17,523.40", "change": 0.7}
        ]
        
        gainers_cards = [
            {"title": "Metal", "value": "8,234.60", "change": 3.2},
            {"title": "IT", "value": "35,124.90", "change": 2.8},
            {"title": "Power", "value": "22,431.10", "change": 1.8},
            {"title": "Banking", "value": "45,221.50", "change": 1.2}
        ]
        
        losers_cards = [
            {"title": "Realty", "value": "12,345.70", "change": -2.1},
            {"title": "FMCG", "value": "42,678.30", "change": -1.5},
            {"title": "Telecom", "value": "18,765.30", "change": -0.8},
            {"title": "Auto", "value": "15,789.20", "change": -0.3}
        ]
    
    # Generate HTML for each card
    def generate_card_html(card):
        change_class = "positive" if card["change"] >= 0 else "negative"
        change_sign = "+" if card["change"] >= 0 else ""
        
        return f"""
        <div class="card">
            <div class="card-title">{card["title"]}</div>
            <div class="card-value">{card["value"]}</div>
            <div class="change {change_class}">{change_sign}{card["change"]}%</div>
        </div>
        """
    
    # Generate HTML for each column
    def generate_column_html(title, cards):
        cards_html = ""
        for card in cards:
            cards_html += generate_card_html(card)
        
        return f"""
        <div class="scroll-column">
            <div class="column-title">{title}</div>
            {cards_html}
        </div>
        """
    
    # Complete HTML with all columns
    html = f"""
    <html>
    <head>
    <style>
    /* Column container */
    .column-container {{
        display: flex;
        justify-content: space-between;
        width: 100%;
        height: 300px;
        gap: 10px;
        background-color: #0f172a;
        margin-bottom: 20px;
    }}
    
    /* Column styling */
    .scroll-column {{
        flex: 1;
        background-color: rgba(17, 24, 39, 0.5);
        border-radius: 8px;
        padding: 8px;
        overflow-y: auto;
    }}
    
    /* Column title */
    .column-title {{
        color: white;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 8px;
        padding-bottom: 5px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        position: sticky;
        top: 0;
        background-color: rgba(17, 24, 39, 0.5);
        z-index: 10;
    }}
    
    /* Card styling */
    .card {{
        background-color: rgba(30, 41, 59, 0.8);
        border-radius: 5px;
        padding: 8px 10px;
        margin-bottom: 8px;
    }}
    
    /* Card title */
    .card-title {{
        color: #e2e8f0;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 3px;
    }}
    
    /* Card value */
    .card-value {{
        color: white;
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 2px;
    }}
    
    /* Change value */
    .change {{
        font-size: 12px;
        font-weight: 500;
    }}
    
    /* Positive change */
    .positive {{
        color: #10b981;
    }}
    
    /* Negative change */
    .negative {{
        color: #ef4444;
    }}
    
    /* Scrollbar styling */
    .scroll-column::-webkit-scrollbar {{
        width: 4px;
    }}
    
    .scroll-column::-webkit-scrollbar-track {{
        background: transparent;
    }}
    
    .scroll-column::-webkit-scrollbar-thumb {{
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
    }}
    
    /* For Firefox */
    .scroll-column {{
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    }}
    </style>
    </head>
    <body>
    <div class="column-container">
        {generate_column_html("Market Indices", indices_cards)}
        {generate_column_html("Top Sectors", top_sector_cards)}
        {generate_column_html("More Sectors", more_sector_cards)}
        {generate_column_html("Top Gainers", gainers_cards)}
        {generate_column_html("Top Losers", losers_cards)}
    </div>
    </body>
    </html>
    """
    
    # Use components.html() instead of st.markdown()
    components.html(html, height=320, scrolling=False)