"""
Active trades component
"""

import streamlit as st
import pandas as pd

def render_active_trades(active_trades):
    """
    Render active trades component
    
    Args:
        active_trades: Active trades data
    """
    st.subheader("Active Trades")
    
    if active_trades:
        # Create DataFrame from active trades
        df = pd.DataFrame(active_trades)
        
        # Format timestamps
        df["entry_timestamp"] = pd.to_datetime(df["entry_timestamp"]).dt.strftime("%Y-%m-%d")
        
        # Calculate current P&L
        df["current_pnl_percent"] = df.apply(
            lambda x: f"+{x['current_pnl_percent']:.2f}%" if x["current_pnl_percent"] > 0 else f"{x['current_pnl_percent']:.2f}%",
            axis=1
        )
        
        df["current_pnl_amount"] = df.apply(
            lambda x: f"+₹{x['current_pnl_amount']:.2f}" if x["current_pnl_amount"] > 0 else f"-₹{abs(x['current_pnl_amount']):.2f}",
            axis=1
        )
        
        # Format prices
        df["entry_price"] = df["entry_price"].apply(lambda x: f"₹{x:.2f}")
        df["current_price"] = df["current_price"].apply(lambda x: f"₹{x:.2f}")
        df["stop_loss"] = df["stop_loss"].apply(lambda x: f"₹{x:.2f}")
        df["target"] = df["target"].apply(lambda x: f"₹{x:.2f}")
        
        # Select columns to display
        display_df = df[["symbol", "trade_type", "entry_timestamp", "entry_price", "current_price", "stop_loss", "target", "current_pnl_percent", "current_pnl_amount"]]
        
        # Rename columns
        display_df.columns = ["Symbol", "Type", "Entry Date", "Entry Price", "Current Price", "Stop Loss", "Target", "P&L %", "P&L ₹"]
        
        # Display active trades
        st.dataframe(display_df, use_container_width=True, hide_index=True)
    else:
        st.info("No active trades") 