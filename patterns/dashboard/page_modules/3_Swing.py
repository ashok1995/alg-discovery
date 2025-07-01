"""
Swing Trading Page
"""
import streamlit as st
import sys
import os

# Add the project root to the path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Now import your modules
from strategies.swing import analyze_stock_swing
# Other imports...

# Use your existing page implementation (from app.py)
def main():
    st.title("🔄 Swing Trading")
    
    # Risk percent from configuration
    risk_percent = st.session_state.get("config", {}).get("DEFAULT_RISK_PERCENT", 1.0)
    
    # Market condition summary
    st.markdown("### Market Condition")
    # Rest of your swing page implementation...

if __name__ == "__main__":
    main() 