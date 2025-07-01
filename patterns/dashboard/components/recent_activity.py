"""
Recent activity component
"""

import streamlit as st
import pandas as pd

def render_recent_activity(closed_trades):
    """
    Render recent activity component
    
    Args:
        closed_trades: Closed trades data
    """
    st.subheader("Recent Activity")
    
    if closed_trades:
        # Create DataFrame from closed trades
        df = pd.DataFrame(closed_trades)
        
        # Format timestamps
        df["entry_timestamp"] = pd.to_datetime(df["entry_timestamp"]).dt.strftime("%Y-%m-%d")
        df["exit_timestamp"] = pd.to_datetime(df["exit_timestamp"]).dt.strftime("%Y-%m-%d")
        
        # Format P&L
        df["pnl"] = df.apply(
            lambda x: f"+₹{x['pnl_amount']:.2f} (+{x['pnl_percent']:.2f}%)" if x["pnl_amount"] > 0 else f"-₹{abs(x['pnl_amount']):.2f} ({x['pnl_percent']:.2f}%)",
            axis=1
        )
        
        # Format prices
        df["entry_price"] = df["entry_price"].apply(lambda x: f"₹{x:.2f}")
        df["exit_price"] = df["exit_price"].apply(lambda x: f"₹{x:.2f}")
        
        # Select columns to display
        display_df = df[["symbol", "trade_type", "entry_timestamp", "exit_timestamp", "entry_price", "exit_price", "pnl", "exit_reason"]]
        
        # Rename columns
        display_df.columns = ["Symbol", "Type", "Entry Date", "Exit Date", "Entry Price", "Exit Price", "P&L", "Exit Reason"]
        
        # Display closed trades
        st.dataframe(display_df, use_container_width=True, hide_index=True)
    else:
        st.info("No recent activity") 