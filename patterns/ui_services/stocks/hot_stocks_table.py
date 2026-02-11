# ui_services/stocks/hot_stocks_table.py
"""
Table creation and rendering for hot stocks component
"""
    
import streamlit as st
from utils.logger import get_logger
import pandas as pd
from ui_services.stocks.hot_stocks_utils import buy_stock_popup

logger = get_logger(__name__, group="ui_services", service="hot_stocks_table")

def display_stock_table(hot_stocks, selected_stock=None):
    """
    Display a stock table with action buttons in each row
    
    Args:
        hot_stocks: List of stock dictionaries
        selected_stock: Currently selected stock symbol
    """
    try:
        # Add the custom CSS for styling
        st.markdown("""
        <style>
            /* Main form container with exact dimensions */
            div.row-widget.stForm {
                width: 350px !important;
                max-width: 350px !important;
                margin-left: 0 !important;
                padding: 15px !important;
                background-color: #1E1E1E !important;
                border: 1px solid #444 !important;
                border-radius: 8px !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
                border-left: 4px solid #FF4B4B !important;
                float: left !important;
            }
            
            /* Limit text area height strictly */
            div.row-widget.stForm textarea {
                min-height: 50px !important;
                height: 50px !important;
                max-height: 50px !important;
                resize: none !important;
            }
            
            /* Reduce input field height */
            div.row-widget.stForm input[type="text"],
            div.row-widget.stForm input[type="number"] {
                height: 30px !important;
                min-height: 30px !important;
                padding: 0 10px !important;
            }
            
            /* Decrease space between form elements */
            div.row-widget.stForm [data-testid="stVerticalBlock"] > div {
                padding-top: 0 !important;
                padding-bottom: 5px !important;
                margin-bottom: 0 !important;
            }
            
            /* Adjust button height */
            div.row-widget.stForm button {
                height: 30px !important;
                min-height: 30px !important;
                padding: 0 10px !important;
                line-height: 1 !important;
            }
            
            /* Custom title for the form */
            .form-title {
                font-size: 16px !important;
                font-weight: bold !important;
                margin-top: 0 !important;
                margin-bottom: 8px !important;
                color: white !important;
            }
            
            /* Style the form buttons */
            div.row-widget.stForm [data-testid="baseButton-secondary"] {
                background-color: #4CAF50 !important;
                color: white !important;
                border: none !important;
            }
            
            div.row-widget.stForm [data-testid="baseButton-secondary"]:nth-of-type(2) {
                background-color: #f44336 !important;
            }
            
            /* Clear float after form */
            .form-clear {
                clear: both !important;
            }
            
            /* Custom form layout that forces square dimensions */
            .square-form-wrapper {
                width: 350px;
                float: left;
                margin-left: 10px;
            }
        </style>
        """, unsafe_allow_html=True)
        
        # Initialize session state if not already set
        if 'selected_stock_row' not in st.session_state:
            st.session_state.selected_stock_row = None
        
        # Table header
        header_cols = st.columns([2, 4, 2, 2, 2, 1])
        with header_cols[0]:
            st.write("Symbol")
        with header_cols[1]:
            st.write("Company")
        with header_cols[2]:
            st.write("Price")
        with header_cols[3]:
            st.write("Change")
        with header_cols[4]:
            st.write("Volume")
        with header_cols[5]:
            st.write("Action")
        
        st.markdown("<hr>", unsafe_allow_html=True)
        
        # Display each row of the table
        for stock in hot_stocks:
            # Get data for this stock
            symbol = stock.get('symbol', '')
            company = stock.get('name', '') or stock.get('company', '')
            
            # Get price and format
            price = stock.get('close', 0) or stock.get('price', 0)
            if isinstance(price, (int, float)):
                price_val = f"₹{price:.2f}"
            else:
                price_val = str(price)
                
            # Get change and format
            change = stock.get('change', '') or stock.get('per_chg', '')
            if isinstance(change, (int, float)):
                change_val = f"{change:.2f}%"
                change_color = "green" if change > 0 else "red"
            else:
                change_val = change
                if change and not change.endswith("%"):
                    change_val = f"{change}%"
                try:
                    change_num = float(change.replace('%', ''))
                    change_color = "green" if change_num > 0 else "red"
                except:
                    change_color = "white"
            
            # Get volume and format
            volume = stock.get('volume', 'N/A')
            if isinstance(volume, (int, float)) and volume > 0:
                if volume >= 1000000:
                    volume_val = f"{volume/1000000:.2f}M"
                elif volume >= 1000:
                    volume_val = f"{volume/1000:.2f}K"
                else:
                    volume_val = f"{volume}"
            else:
                volume_val = "N/A"
            
            # Create a container for this row
            row_container = st.container()
            
            with row_container:
                # Create columns for the row
                row_cols = st.columns([2, 4, 2, 2, 2, 1])
                
                # Display data in columns
                with row_cols[0]:
                    st.write(f"**{symbol}**")
                with row_cols[1]:
                    st.write(company)
                with row_cols[2]:
                    st.write(price_val)
                with row_cols[3]:
                    st.markdown(f"<span style='color:{change_color}'>{change_val}</span>", unsafe_allow_html=True)
                with row_cols[4]:
                    st.write(volume_val)
                with row_cols[5]:
                    # Button to show/hide form for this row
                    btn_label = "Close" if st.session_state.selected_stock_row == symbol else "Buy"
                    st.button(btn_label, key=f"buy_btn_{symbol}", on_click=_handle_buy_click, args=(symbol, stock))
            
            # Show form if this is the selected row
            if st.session_state.selected_stock_row == symbol:
                # Display the buy form for this stock
                _show_buy_form_inline(symbol, stock)
            
            # Add separator between rows
            st.markdown("---")
        
        logger.info("Successfully displayed stock table with action buttons")
    except Exception as e:
        logger.error(f"Error displaying stock table: {e}")
        st.error(f"Error displaying table: {e}")
        import traceback
        logger.error(traceback.format_exc())

def _handle_buy_click(symbol, stock_data):
    """
    Handle click on buy button
    
    Args:
        symbol: Stock symbol
        stock_data: Stock data dictionary
    """
    # Toggle the row's expanded state
    if st.session_state.selected_stock_row == symbol:
        st.session_state.selected_stock_row = None
    else:
        st.session_state.selected_stock_row = symbol
        # Also set these for compatibility with existing code
        st.session_state.selected_stock = symbol
        st.session_state.buy_form_active = True

def _show_buy_form_inline(symbol, stock_data):
    """
    Show an inline buy form for a stock
    
    Args:
        symbol: Stock symbol
        stock_data: Stock data dictionary
    """
    try:
        # Get current price
        current_price = float(stock_data.get('close', 0)) or float(stock_data.get('price', 0))
        
        # Form wrapper to control positioning
        st.markdown('<div class="square-form-wrapper">', unsafe_allow_html=True)
        
        # Create the buy form
        with st.form(key=f"buy_form_{symbol}_{id(stock_data)}"):
            st.markdown(f"<h4>Buy Order: {symbol}</h4>", unsafe_allow_html=True)
            
            # Create a two-column layout for the form
            col1, col2 = st.columns(2)
            
            with col1:
                st.write(f"**Price:** ₹{current_price:.2f}")
                quantity = st.number_input("Quantity", min_value=1, value=10, step=1)
            
            with col2:
                order_type = st.radio("Order Type", ["Market", "Limit"], horizontal=True)
                if order_type == "Limit":
                    limit_price = st.number_input("Limit Price", 
                                                min_value=0.01, 
                                                value=current_price, 
                                                step=0.05)
                else:
                    limit_price = current_price
            
            # Additional fields
            validity = st.selectbox("Validity", ["Day", "IOC", "Week"])
            
            # Calculate total
            total = current_price * quantity
            st.write(f"**Total Amount:** ₹{total:.2f}")
            
            # Form buttons
            btn_col1, btn_col2 = st.columns(2)
            with btn_col1:
                submit = st.form_submit_button("Buy Now")
            with btn_col2:
                cancel = st.form_submit_button("Cancel")
            
            # Handle form submission
            if submit:
                # Create order details
                order_details = {
                    "symbol": symbol,
                    "company": stock_data.get('name', '') or stock_data.get('company', ''),
                    "quantity": quantity,
                    "price": current_price,
                    "order_type": order_type,
                    "limit_price": limit_price if order_type == "Limit" else None,
                    "validity": validity,
                    "total": total
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
                st.session_state.selected_stock_row = None
                st.session_state.buy_form_active = False
                
            if cancel:
                # Close the form
                st.session_state.selected_stock_row = None
                st.session_state.buy_form_active = False
        
        # Close the form wrapper div
        st.markdown('</div><div class="form-clear"></div>', unsafe_allow_html=True)
    except Exception as e:
        logger.error(f"Error showing buy form: {e}")
        st.error(f"Error showing buy form: {e}")

def create_hidden_buttons(hot_stocks):
    """Legacy function for backward compatibility"""
    logger.info("create_hidden_buttons is deprecated, not needed with new implementation")
    pass

def show_buy_form(symbol, stock_data):
    """
    Legacy function to show a buy form for a stock
    
    Args:
        symbol: Stock symbol
        stock_data: Stock data dictionary
    """
    # Set the selected row to trigger the inline form
    st.session_state.selected_stock_row = symbol
    # Also set these for compatibility
    st.session_state.selected_stock = symbol
    st.session_state.buy_form_active = True