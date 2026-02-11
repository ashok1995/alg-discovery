"""
Paper Trading UI Service
Reusable component for paper trading functionality
"""

import streamlit as st
import random
from datetime import datetime
from utils.logger import get_logger

logger = get_logger(__name__, group="ui_services", service="trading_paper_trade")

def show_paper_trade_popup(symbol, db, on_close_callback=None):
    """
    Show a popup for paper trading that can be reused across different pages
    
    Args:
        symbol: Stock symbol to trade
        db: MongoDB connection
        on_close_callback: Function to call when popup is closed (optional)
    
    Returns:
        Boolean indicating if a trade was executed
    """
    # Create a container with styling for a more focused, modal-like popup
    popup_container = st.container()
    trade_executed = False
    
    # Enhanced CSS for a more modal-like popup
    st.markdown("""
        <style>
        .trade-popup {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            border: 2px solid #4CAF50;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        }
        .popup-header {
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .popup-field {
            margin-bottom: 12px;
        }
        .popup-submit {
            margin-top: 20px;
        }
        </style>
    """, unsafe_allow_html=True)
    
    with popup_container:
        # Wrap the content in a div with the trade-popup class
        st.markdown(f'<div class="trade-popup">', unsafe_allow_html=True)
        
        # Header with title and close button
        col1, col2 = st.columns([5, 1])
        with col1:
            st.markdown(f'<div class="popup-header"><h3>Paper Trade: {symbol}</h3></div>', unsafe_allow_html=True)
        with col2:
            if st.button("❌ Close"):
                if on_close_callback:
                    on_close_callback()
                return False
        
        # Get current price (simulated or from API in real implementation)
        current_price = get_current_price(symbol)
        
        # Display stock info
        st.markdown(f"**Current Price:** ₹{current_price}")
        
        # Trade form
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown('<div class="popup-field">', unsafe_allow_html=True)
            trade_type = st.radio("Action", options=["Buy", "Sell"])
            st.markdown('</div>', unsafe_allow_html=True)
            
            st.markdown('<div class="popup-field">', unsafe_allow_html=True)
            order_type = st.selectbox("Order Type", options=["Market", "Limit"])
            st.markdown('</div>', unsafe_allow_html=True)
            
            if order_type == "Limit":
                st.markdown('<div class="popup-field">', unsafe_allow_html=True)
                price = st.number_input("Limit Price (₹)", value=current_price, step=0.1)
                st.markdown('</div>', unsafe_allow_html=True)
            else:
                price = current_price
        
        with col2:
            st.markdown('<div class="popup-field">', unsafe_allow_html=True)
            quantity = st.number_input("Quantity", min_value=1, value=10, step=1)
            st.markdown('</div>', unsafe_allow_html=True)
            
            total_value = price * quantity
            st.info(f"Total Value: ₹{total_value:.2f}")
            
            # Risk metrics
            account_size = get_account_size(db)
            exposure = (total_value / account_size) * 100
            st.caption(f"Position Size: {exposure:.1f}% of account")
        
        # Submit button
        st.markdown('<div class="popup-submit">', unsafe_allow_html=True)
        if st.button("Execute Paper Trade", use_container_width=True):
            try:
                # Prepare trade data
                trade_data = {
                    "symbol": symbol,
                    "type": trade_type.lower(),
                    "quantity": quantity,
                    "price": price,
                    "order_type": order_type.lower(),
                    "value": total_value,
                    "status": "executed",
                    "timestamp": datetime.now()
                }
                
                # Save to MongoDB if the method exists
                if hasattr(db, "save_paper_trade"):
                    trade_id = db.save_paper_trade(trade_data)
                    st.success(f"Paper trade executed successfully! Trade ID: {trade_id}")
                    trade_executed = True
                    
                    # Close popup after successful trade
                    if on_close_callback:
                        on_close_callback()
                    return True
                else:
                    st.warning("Paper trading database functions not implemented yet")
                    
            except Exception as e:
                st.error(f"Error executing trade: {e}")
                logger.error(f"Error executing trade for {symbol}: {e}")
        st.markdown('</div>', unsafe_allow_html=True)
        
        # Close the popup div
        st.markdown('</div>', unsafe_allow_html=True)
    
    return trade_executed

def get_current_price(symbol):
    """
    Get current price for a symbol (placeholder implementation)
    
    Args:
        symbol: Stock symbol
        
    Returns:
        Current price as float
    """
    # TODO: Replace with actual API call in production
    # For now, generate a random price between 500 and 3000
    return round(random.uniform(500, 3000), 2)

def get_account_size(db):
    """
    Get paper trading account size
    
    Args:
        db: MongoDB connection
        
    Returns:
        Account size as float
    """
    # Try to get from database if function exists
    if hasattr(db, "get_paper_account_size"):
        try:
            account_size = db.get_paper_account_size()
            if account_size:
                return account_size
        except Exception as e:
            logger.warning(f"Error getting account size: {e}")
    
    # Default value if not available from database
    return 100000.0  # Default ₹1,00,000 