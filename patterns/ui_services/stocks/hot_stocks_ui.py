"""
UI components for hot stocks display
"""

import streamlit as st
from datetime import datetime
from ui_services.stocks.hot_stocks_utils import add_to_watchlist

def apply_styles():
    """Apply CSS styling for tables and forms"""
    st.markdown("""
    <style>
        /* Enhanced stock table styling */
        .stock-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 14px;
        }
        
        .stock-table th {
            background-color: #262730;
            color: white;
            padding: 8px 12px;
            text-align: left;
            font-weight: 500;
            border-bottom: 1px solid #444;
        }
        
        .stock-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #333;
        }
        
        .stock-table tr:hover {
            background-color: rgba(70, 70, 70, 0.1);
        }
        
        .row-active {
            background-color: rgba(30, 58, 138, 0.1);
        }
        
        /* Buy form styling - compact and square */
        .buy-form-container {
            width: 450px !important;
            max-width: 450px !important;
            padding: 15px !important;
            background-color: #1E1E1E !important;
            border: 1px solid #444 !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            border-left: 4px solid #FF4B4B !important;
            margin: 10px 0 20px auto !important;
            float: right !important;
        }
        
        /* Form title */
        .form-title {
            font-size: 16px !important;
            font-weight: bold !important;
            margin-top: 0 !important;
            margin-bottom: 8px !important;
            color: white !important;
        }
        
        /* Compact form elements */
        div.row-widget.stForm {
            max-width: 450px !important;
            margin-left: auto !important;
            margin-right: 30px !important;
            background-color: #1E1E1E !important;
            border: 1px solid #444 !important;
            border-radius: 8px !important;
            padding: 15px !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            border-left: 4px solid #FF4B4B !important;
        }
        
        /* Performance metrics styling */
        .performance-metrics {
            background-color: #262730;
            border-radius: 5px;
            padding: 10px;
            margin-bottom: 10px;
        }
        
        .metric-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        
        .metric-label {
            color: #ccc;
            font-size: 12px;
        }
        
        .metric-value {
            font-weight: bold;
            font-size: 12px;
        }
        
        .positive {
            color: #4CAF50;
        }
        
        .negative {
            color: #F44336;
        }
        
        /* Stock popup styling */
        .stock-popup {
            background-color: #1E1E1E;
            border: 1px solid #444;
            border-radius: 5px;
            padding: 20px;
            margin-top: 20px;
            position: relative;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        .close-btn {
            position: absolute;
            top: 10px;
            right: 10px;
        }
    </style>
    """, unsafe_allow_html=True)

def show_buy_form(symbol, hot_stocks):
    """
    Display the buy form for a selected stock
    
    Args:
        symbol: Stock symbol
        hot_stocks: List of stock dictionaries
    """
    # Find the stock data
    stock_data = next((s for s in hot_stocks if s.get('symbol') == symbol), None)
    
    if stock_data:
        # Get stock price
        price = stock_data.get('close', 0) or stock_data.get('price', 0)
        company = stock_data.get('name', '') or stock_data.get('company', '')
        
        # Create the compact form with Streamlit components
        with st.form(key=f"buy_form_{symbol}", clear_on_submit=False):
            st.markdown(f"<h4>Buy Order: {symbol}</h4>", unsafe_allow_html=True)
            
            # Stock performance fundamentals section
            st.markdown("<div class='performance-metrics'>", unsafe_allow_html=True)
            
            # Get performance metrics from stock data or use defaults
            pe_ratio = stock_data.get('pe_ratio', '18.5')
            eps = stock_data.get('eps', '12.75')
            market_cap = stock_data.get('market_cap', '₹2,450 Cr')
            volume = stock_data.get('volume', '1.2M')
            
            # 52-week range
            week_low = stock_data.get('52w_low', price * 0.8 if isinstance(price, (int, float)) else '0')
            week_high = stock_data.get('52w_high', price * 1.2 if isinstance(price, (int, float)) else '0')
            
            # Create metrics display
            col1, col2 = st.columns(2)
            with col1:
                st.markdown(f"""
                <div class='metric-item'>
                    <span class='metric-label'>P/E Ratio:</span>
                    <span class='metric-value'>{pe_ratio}</span>
                </div>
                <div class='metric-item'>
                    <span class='metric-label'>EPS:</span>
                    <span class='metric-value'>{eps}</span>
                </div>
                <div class='metric-item'>
                    <span class='metric-label'>Market Cap:</span>
                    <span class='metric-value'>{market_cap}</span>
                </div>
                """, unsafe_allow_html=True)
            
            with col2:
                st.markdown(f"""
                <div class='metric-item'>
                    <span class='metric-label'>Volume:</span>
                    <span class='metric-value'>{volume}</span>
                </div>
                <div class='metric-item'>
                    <span class='metric-label'>52W Range:</span>
                    <span class='metric-value'>{week_low} - {week_high}</span>
                </div>
                <div class='metric-item'>
                    <span class='metric-label'>Strength:</span>
                    <span class='metric-value {"positive" if stock_data.get("strength", 0) >= 75 else "negative"}'>{stock_data.get("strength", 0)}</span>
                </div>
                """, unsafe_allow_html=True)
            
            st.markdown("</div>", unsafe_allow_html=True)
            
            # Order details section
            col1, col2 = st.columns(2)
            
            with col1:
                st.write(f"**Price:** ₹{price:.2f}" if isinstance(price, (int, float)) else f"**Price:** ₹{price}")
                quantity = st.number_input("Quantity", min_value=1, value=10, step=1, key=f"qty_{symbol}")
            
            with col2:
                order_type = st.radio("Order Type", ["Market", "Limit"], horizontal=True, key=f"type_{symbol}")
                if order_type == "Limit":
                    limit_price = st.number_input("Limit Price", 
                                                min_value=0.01, 
                                                value=float(price) if isinstance(price, (int, float)) else 0, 
                                                step=0.05,
                                                key=f"limit_{symbol}")
                else:
                    limit_price = price
            
            # Validity options
            validity = st.selectbox("Validity", ["Day", "IOC", "Week"], key=f"validity_{symbol}")
            
            # Calculate total
            p = float(price) if isinstance(price, (int, float)) else 0
            total = p * quantity
            st.write(f"**Total Amount:** ₹{total:.2f}")
            
            # Form buttons
            col1, col2 = st.columns(2)
            with col1:
                submit = st.form_submit_button("Buy Now")
            with col2:
                cancel = st.form_submit_button("Cancel")
            
            # Handle form submission
            if submit:
                # Create order details
                order_details = {
                    "symbol": symbol,
                    "company": company,
                    "quantity": quantity,
                    "price": price,
                    "order_type": order_type,
                    "limit_price": limit_price if order_type == "Limit" else None,
                    "validity": validity,
                    "total": total,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                
                # Store in session state for history
                if "order_history" not in st.session_state:
                    st.session_state.order_history = []
                
                st.session_state.order_history.append(order_details)
                
                # Show success notification
                st.session_state.order_success = True
                st.session_state.order_symbol = symbol
                st.session_state.order_quantity = quantity
                
                # Close the form
                st.session_state.buy_form_active = False
                st.session_state.selected_stock = None
                
                # Force a rerun to update the UI
                st.experimental_rerun()
                
            if cancel:
                # Close the form without submitting
                st.session_state.buy_form_active = False
                st.session_state.selected_stock = None
                
                # Force a rerun to update the UI
                st.experimental_rerun()

def show_stock_popup(symbol, hot_stocks, data_service):
    """
    Display a popup with stock details
    
    Args:
        symbol: Stock symbol
        hot_stocks: List of stock dictionaries
        data_service: Data service instance
    """
    # Find the stock data
    stock_data = next((s for s in hot_stocks if s.get('symbol') == symbol), None)
    
    if stock_data and not st.session_state.get('buy_form_active', False):
        # Show popup with stock details
        st.markdown('<div class="stock-popup">', unsafe_allow_html=True)
        
        col1, col2 = st.columns([5, 1])
        with col1:
            st.subheader(f"{symbol} - {stock_data.get('name', '')}")
        with col2:
            if st.button("❌", key="close_popup"):
                st.session_state.show_stock_popup = False
                st.session_state.selected_stock = None
                st.experimental_rerun()
        
        # Display stock details
        st.markdown(f"**Pattern:** {stock_data.get('pattern', 'N/A')}")
        st.markdown(f"**Change:** {stock_data.get('change', 'N/A')}")
        
        # Additional details if available
        if 'sector' in stock_data:
            st.markdown(f"**Sector:** {stock_data['sector']}")
        
        if 'volume' in stock_data:
            vol = stock_data['volume']
            if isinstance(vol, (int, float)):
                vol_str = f"{vol:,}"
            else:
                vol_str = str(vol)
            st.markdown(f"**Volume:** {vol_str}")
        
        # Action buttons
        col1, col2 = st.columns(2)
        
        with col1:
            if st.button("⚡ Buy Now", key="buy_now", use_container_width=True):
                from ui_services.stocks.hot_stocks_utils import buy_stock_popup
                buy_stock_popup(symbol, stock_data)
                st.session_state.show_stock_popup = False
                st.experimental_rerun()
        
        with col2:
            if st.button("👁 Add to Watchlist", key="add_to_watch", use_container_width=True):
                add_to_watchlist(symbol, stock_data, data_service)
        
        st.markdown('</div>', unsafe_allow_html=True)
    else:
        st.error(f"Stock {symbol} not found in data")
        st.session_state.show_stock_popup = False 