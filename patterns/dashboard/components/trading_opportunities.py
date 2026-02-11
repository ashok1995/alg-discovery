"""
Trading opportunities component
"""

import streamlit as st
import pandas as pd

def render_trading_opportunities(db):
    """
    Render trading opportunities component
    
    Args:
        db: MongoDB instance
    """
    st.subheader("Trading Opportunities")
    
    # Create tabs for different timeframes
    op_tab1, op_tab2, op_tab3, op_tab4 = st.tabs(["Intraday", "Swing", "Long-Term", "Short Sell"])
    
    # Intraday Opportunities
    with op_tab1:
        render_opportunity_table(db, "intraday")
    
    # Swing Opportunities
    with op_tab2:
        render_opportunity_table(db, "swing")
    
    # Long-Term Opportunities
    with op_tab3:
        render_opportunity_table(db, "long_term")
    
    # Short Sell Opportunities
    with op_tab4:
        render_opportunity_table(db, "short_sell")

def render_opportunity_table(db, scan_type):
    """
    Render opportunity table
    
    Args:
        db: MongoDB instance
        scan_type: Scan type (intraday, swing, long_term, short_sell)
    """
    # Get scan results from MongoDB
    scan_results = db.get_scan_results(scan_type=scan_type, limit=5)
    
    if scan_results:
        # Create DataFrame from scan results
        df = pd.DataFrame(scan_results)
        
        # Format timestamp
        df["timestamp"] = pd.to_datetime(df["timestamp"]).dt.strftime("%Y-%m-%d %H:%M:%S")
        
        # Format prices
        if "entry_price" in df.columns:
            df["entry_price"] = df["entry_price"].apply(lambda x: f"₹{x:.2f}" if x else "")
        
        if "stop_loss" in df.columns:
            df["stop_loss"] = df["stop_loss"].apply(lambda x: f"₹{x:.2f}" if x else "")
        
        if "target" in df.columns:
            df["target"] = df["target"].apply(lambda x: f"₹{x:.2f}" if x else "")
        
        # Select columns to display based on scan type
        if scan_type == "long_term":
            display_cols = ["timestamp", "symbol", "signal", "strategy", "entry_price"]
        else:
            display_cols = ["timestamp", "symbol", "signal", "strategy", "entry_price", "stop_loss", "target"]
        
        # Filter columns that exist in the dataframe
        display_cols = [col for col in display_cols if col in df.columns]
        
        display_df = df[display_cols]
        
        # Rename columns
        column_map = {
            "timestamp": "Timestamp",
            "symbol": "Symbol",
            "signal": "Signal",
            "strategy": "Strategy",
            "entry_price": "Entry Price",
            "stop_loss": "Stop Loss",
            "target": "Target"
        }
        
        display_df.columns = [column_map.get(col, col) for col in display_df.columns]
        
        # Display scan results
        st.dataframe(display_df, use_container_width=True, hide_index=True)
    else:
        st.info(f"No {scan_type.replace('_', ' ')} opportunities")

def render_trading_opportunities_cards():
    """Render trading opportunities cards in a grid"""
    
    # Sample opportunities data (replace with actual data)
    opportunities = [
        {"symbol": "RELIANCE", "signal": "Buy", "price": "₹2,856.45", "target": "₹3,050", "stop_loss": "₹2,750"},
        {"symbol": "HDFCBANK", "signal": "Sell", "price": "₹1,678.30", "target": "₹1,580", "stop_loss": "₹1,720"},
        {"symbol": "INFY", "signal": "Buy", "price": "₹1,423.65", "target": "₹1,500", "stop_loss": "₹1,380"},
        {"symbol": "TATASTEEL", "signal": "Buy", "price": "₹145.80", "target": "₹158", "stop_loss": "₹140"}
    ]
    
    # Create a 4-column layout
    cols = st.columns(4)
    
    for i, opportunity in enumerate(opportunities):
        with cols[i % 4]:
            signal_class = "positive" if opportunity["signal"] == "Buy" else "negative"
            
            st.markdown(f"""
            <div class="opportunity-card">
                <div class="opportunity-header">
                    <div class="opportunity-symbol">{opportunity['symbol']}</div>
                    <div class="opportunity-signal {signal_class}">{opportunity['signal']}</div>
                </div>
                <div class="opportunity-row">
                    <div class="opportunity-label">Price</div>
                    <div>{opportunity['price']}</div>
                </div>
                <div class="opportunity-row">
                    <div class="opportunity-label">Target</div>
                    <div class="opportunity-target">{opportunity['target']}</div>
                </div>
                <div class="opportunity-row">
                    <div class="opportunity-label">Stop Loss</div>
                    <div class="opportunity-stoploss">{opportunity['stop_loss']}</div>
                </div>
            </div>
            """, unsafe_allow_html=True) 