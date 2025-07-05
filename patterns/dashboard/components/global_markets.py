"""Component for displaying global markets overview"""

import streamlit as st
import pandas as pd
from utils.logger import get_logger

# Initialize logger
logger = get_logger(__name__, group="dashboard", service="global_markets")

def get_global_markets_data():
    """
    Get global markets data
    
    Returns:
        DataFrame with global market data
    """
    # This would be replaced with actual API calls or database queries
    # Mock data for demonstration
    global_indices = {
        "Index": ["S&P 500", "Nasdaq", "Dow Jones", "FTSE 100", "Nikkei 225", "Hang Seng", "DAX"],
        "Value": ["5,123.45", "16,789.32", "38,456.78", "7,845.21", "36,789.56", "18,234.67", "16,543.21"],
        "Change%": [0.85, 1.25, 0.45, -0.32, 1.75, -0.65, 0.55]
    }
    
    return pd.DataFrame(global_indices)

def render_global_markets(global_data=None):
    """
    Render global markets overview
    
    Args:
        global_data: DataFrame with global market data
    """
    st.markdown('<div class="section-title">Global Markets</div>', unsafe_allow_html=True)
    
    # Use provided data or fetch default data
    if global_data is None:
        global_data = get_global_markets_data()
    
    try:
        # Render global indices
        for i, row in global_data.iterrows():
            change_class = "positive" if row["Change%"] > 0 else "negative"
            change_sign = "+" if row["Change%"] > 0 else ""
            
            st.markdown(f"""
            <div class="global-index-card">
                <div class="index-name">{row['Index']}</div>
                <div class="index-value">{row['Value']}</div>
                <div class="index-change {change_class}">{change_sign}{row['Change%']}%</div>
            </div>
            """, unsafe_allow_html=True)
    except Exception as e:
        logger.error(f"Error rendering global markets: {e}")
        st.warning("Unable to render global markets") 