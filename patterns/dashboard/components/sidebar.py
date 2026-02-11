""" Sidebar component for the Market Analyzer application """

import streamlit as st
from utils.logger import get_logger
from utils.market_utils import is_market_open, format_time_until_market_open

# Initialize logger
logger = get_logger(__name__, group="dashboard", service="sidebar")

def render_sidebar(active_page="home"):
    """
    Render the sidebar with navigation links
    
    Args:
        active_page: Currently active page
    """
    try:
        with st.sidebar:
            # Logo and title
            st.image("assets/logo.png", width=100)
            st.title("Market Analyzer")
            
            # Market status indicator
            market_open = is_market_open()
            if market_open:
                st.success("Market is OPEN")
            else:
                time_until_open = format_time_until_market_open()
                st.info(f"Market is CLOSED • {time_until_open}")
            
            st.divider()
            
            # Navigation
            st.subheader("Navigation")
            
            # Create navigation buttons with consistent styling
            nav_buttons = [
                {"id": "home", "label": "📊 Dashboard", "help": "Go to Dashboard"},
                {"id": "intraday", "label": "⚡ Intraday Trading", "help": "Go to Intraday Trading"},
                {"id": "swing", "label": "🔄 Swing Trading", "help": "Go to Swing Trading"},
                {"id": "longterm", "label": "📈 Long-Term Investment", "help": "Go to Long-Term Investment"},
                {"id": "shortselling", "label": "📉 Short Selling", "help": "Go to Short Selling"},
                {"id": "backtest", "label": "🧪 Backtest", "help": "Go to Backtest"}
            ]
            
            # Render each navigation button
            for button in nav_buttons:
                button_type = "primary" if active_page == button["id"] else "secondary"
                if st.button(
                    button["label"], 
                    help=button["help"],
                    use_container_width=True,
                    type=button_type
                ):
                    # Update session state and trigger page refresh
                    st.session_state["current_page"] = button["id"]
                    st.rerun()
            
            st.divider()
            
            # Settings
            with st.expander("⚙️ Settings", expanded=False):
                # Theme
                theme = st.selectbox(
                    "Theme", 
                    ["Light", "Dark"], 
                    index=1 if st.session_state.get("theme", "Dark") == "Dark" else 0
                )
                
                # Risk level
                risk_level = st.select_slider(
                    "Risk Level", 
                    options=["Low", "Medium", "High"], 
                    value=st.session_state.get("risk_level", "Medium")
                )
                
                # Save settings
                if st.button("Save Settings", use_container_width=True):
                    st.session_state["theme"] = theme
                    st.session_state["risk_level"] = risk_level
                    st.success("Settings saved!")
            
            # Footer
            st.markdown("---")
            st.caption("© 2023 Market Analyzer")
    
    except Exception as e:
        logger.error(f"Error rendering sidebar: {e}")
        st.sidebar.error("There was an error displaying the sidebar")