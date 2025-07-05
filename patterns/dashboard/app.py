"""
Main application for Market Analyzer with all pages integrated
"""
import streamlit as st
import os
import sys

# Import path_manager and set up paths first before any other imports
try:
    import path_manager
    path_manager.setup_paths()
except ImportError:
    # For standalone running, set up path
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    import path_manager
    path_manager.setup_paths()

# Initialize logger FIRST - before using it
from utils.logger import get_logger
logger = get_logger(__name__, group="dashboard", service="dashboard_app")

# Now import other modules after paths are set up
import pandas as pd
from config import DEFAULT_RISK_PERCENT, MARKET_CONDITION, APP_SETTINGS

# Import page modules
try:
    from dashboard.page_modules.home import show_home_page
    from dashboard.page_modules.swing import show_swing_page
except ImportError as e:
    logger.error(f"Error importing page modules: {e}")

# Page configuration
st.set_page_config(
    page_title="Market Analyzer",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Apply custom CSS
def load_css():
    css_file = os.path.join(path_manager.PATHS["styles"], "dashboard.css")
    if os.path.exists(css_file):
        with open(css_file) as f:
            return f.read()
    return """
    /* Modern UI styling */
    .sidebar .sidebar-content { 
        background: linear-gradient(180deg, #1F1F2C 0%, #171723 100%);
    }
    
    /* App title styling */
    .sidebar .block-container h1 {
        font-weight: 600;
        letter-spacing: 0.5px;
        color: #ffffff;
        padding-bottom: 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 1.5rem;
    }
    
    /* Navigation section title */
    .sidebar .block-container h3 {
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 1rem;
    }
    
    /* Force fixed width on button containers */
    .fixed-width-btn div[data-testid="stButton"] {
        width: 180px !important;
        margin-left: auto !important;
        margin-right: auto !important;
    }
    
    /* Button styling - ensuring equal dimensions */
    div[data-testid="stButton"] > button {
        height: 3.2rem;
        width: 180px !important; /* Force exact width */
        text-align: left;
        padding: 0.5rem 1rem;
        margin-bottom: 0.6rem;
        border: none;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
    }
    
    div[data-testid="stButton"] > button:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    
    div[data-testid="stButton"] > button:active {
        transform: translateY(0);
    }
    
    /* Button text styling */
    div[data-testid="stButton"] > button p {
        display: flex;
        align-items: center;
        font-weight: 500;
        font-size: 0.95rem;
        letter-spacing: 0.3px;
        width: 100%;
    }
    
    /* Space between emoji and text */
    div[data-testid="stButton"] > button p {
        display: flex;
        gap: 10px;
        align-items: center;
    }
    
    /* Settings container */
    .settings-container {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 1rem;
        margin-top: 0.6rem;
        box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.1);
        width: 180px !important;
        margin-left: auto;
        margin-right: auto;
    }
    
    /* Footer styling */
    .footer-text {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.5);
        padding-top: 1.5rem;
        text-align: center;
    }
    """

st.markdown(f"<style>{load_css()}</style>", unsafe_allow_html=True)

# Initialize global config
if "config" not in st.session_state:
    st.session_state["config"] = {
        "DEFAULT_RISK_PERCENT": DEFAULT_RISK_PERCENT,
        "market_status": MARKET_CONDITION["market_status"],
        "trend": MARKET_CONDITION["trend"],
        "volatility": MARKET_CONDITION["volatility"],
        "recommended_strategies": MARKET_CONDITION["recommended_strategies"]
    }

# Initialize current page if not set
if "current_page" not in st.session_state:
    st.session_state["current_page"] = "home"

# Page change function
def change_page(page_id):
    st.session_state["current_page"] = page_id
    # Force rerun to update the page
    st.experimental_rerun()

# Sidebar navigation
with st.sidebar:
    st.title("Market Analyzer")
    
    st.markdown("### Navigation")
    
    # Define navigation items
    nav_items = [
        {"id": "home", "icon": "🏠", "label": "Home"},
        {"id": "intraday_buy", "icon": "📈", "label": "Intraday Buy"},
        {"id": "short_sell", "icon": "📉", "label": "Short Sell"},
        {"id": "swing", "icon": "🔄", "label": "Swing"},
        {"id": "long_term", "icon": "📊", "label": "Long Buy"},
        {"id": "backtest", "icon": "🧪", "label": "Back Test"}
    ]
    
    # Create single-click navigation buttons with consistent styling
    for item in nav_items:
        # Determine if this is the active page
        is_active = st.session_state["current_page"] == item["id"]
        
        # Create a container for adding custom CSS class
        button_container = st.container()
        # Add active class to the container if this is the current page
        if is_active:
            button_container.markdown(
                f"""<style>
                    div[data-testid="stButton"][key="nav_{item['id']}"] > button {{
                        background: linear-gradient(90deg, #4B79A1 0%, #283E51 100%);
                        border-left: 4px solid #64B5F6;
                    }}
                </style>""", 
                unsafe_allow_html=True
            )
        
        # Create a button with fixed width and height
        with button_container:
            # Use simple text with emoji icon - no HTML
            if st.button(
                f"{item['icon']} {item['label']}", 
                key=f"nav_{item['id']}",
                use_container_width=True,
                help=f"Navigate to {item['label']} page"
            ):
                change_page(item["id"])
    
    # Add spacing before settings
    st.markdown("<div style='height: 1rem'></div>", unsafe_allow_html=True)
    
    # Settings button with consistent styling - no HTML in button text
    if st.button(
        "⚙️ Settings",
        key="nav_settings",
        use_container_width=True,
        help="Open settings"
    ):
        # Toggle settings visibility
        st.session_state["show_settings"] = not st.session_state.get("show_settings", False)
    
    # Show settings if toggled
    if st.session_state.get("show_settings", False):
        st.markdown('<div class="settings-container">', unsafe_allow_html=True)
        
        theme = st.selectbox(
            "Theme", ["Light", "Dark"], 
            index=1 if st.session_state.get("theme", APP_SETTINGS["theme"]) == "Dark" else 0
        )
        
        risk_level = st.select_slider(
            "Risk Level", 
            options=["Low", "Medium", "High"], 
            value=st.session_state.get("risk_level", APP_SETTINGS["risk_level"])
        )
        
        save_btn = st.button("Save Settings", use_container_width=True, key="save_settings_btn")
        if save_btn:
            st.session_state["theme"] = theme
            st.session_state["risk_level"] = risk_level
            st.success("Settings saved!")
            
        st.markdown('</div>', unsafe_allow_html=True)
    
    st.markdown("---")
    st.markdown('<div class="footer-text">© 2023 Market Analyzer</div>', unsafe_allow_html=True)

# Display the appropriate page based on the current_page value
current_page = st.session_state["current_page"]

# HOME PAGE
if current_page == "home":
    try:
        # Pass market condition from session state to home page
        show_home_page(st.session_state.get("config"))
    except Exception as e:
        st.error(f"Error loading home page: {e}")
        logger.error(f"Home page error: {e}")

# INTRADAY BUY PAGE
elif current_page == "intraday_buy":
    st.title("📈 Intraday Buy")
    
    st.markdown("### Intraday Buy Scanner")
    # Intraday buy implementation...
    
    with st.container():
        st.warning("🚧 Intraday Buy scanner module is under development")
        st.info("Coming soon! The Intraday Buy scanner will help you identify potential buying opportunities for day trading.")
    
    # Placeholder for scanner results
    st.subheader("Sample Preview")
    st.dataframe({
        "Symbol": ["RELIANCE", "HDFCBANK", "TCS"],
        "Entry": [2856.75, 1654.30, 3489.55],
        "Stop Loss": [2830.20, 1640.10, 3460.20],
        "Target": [2900.00, 1680.00, 3530.00]
    })

# INTRADAY SELL PAGE
elif current_page == "short_sell":
    st.title("📉 Short Sell")
    
    with st.container():
        st.warning("🚧 Short Sell module is under development")
        st.info("Coming soon! The Short Sell module will help you identify potential shorting opportunities.")
    
    # Placeholder content
    st.subheader("Sample Short Positions")
    st.dataframe({
        "Symbol": ["TATASTEEL", "SUNPHARMA", "WIPRO", "ONGC"],
        "Entry": [126.75, 1124.30, 408.60, 175.80],
        "Stop Loss": [129.50, 1145.30, 415.60, 179.80],
        "Target": [120.75, 1094.30, 398.60, 168.80],
        "Risk:Reward": ["1:2", "1:1.5", "1:1.7", "1:2.2"]
    })

# SWING PAGE
elif current_page == "swing":
    try:
        # Pass market condition from session state to swing page
        show_swing_page(st.session_state.get("config"))
    except Exception as e:
        st.error(f"Error loading swing page: {e}")
        logger.error(f"Swing page error: {e}")
        
        # Fallback content in case of error
        st.title("🔄 Swing Trading")
        st.warning("🚧 Error loading Swing Trading module")
        st.info("Please check logs for details.")

# LONG TERM PAGE
elif current_page == "long_term":
    st.title("📊 Long Term Investment")
    
    with st.container():
        st.warning("🚧 Long Term Investment module is under development")
        st.info("Coming soon! The Long Term Investment module will help you identify value and growth opportunities.")
    
    # Placeholder content
    st.subheader("Sample Watchlist")
    st.dataframe({
        "Symbol": ["HDFC", "TCS", "INFY", "RELIANCE"],
        "Sector": ["Finance", "IT", "IT", "Energy"],
        "PE Ratio": [22.5, 29.8, 28.3, 25.6],
        "Dividend Yield": ["1.2%", "0.9%", "1.4%", "0.8%"],
        "Potential": ["High", "Medium", "Medium", "High"]
    })

# BACKTEST PAGE
elif current_page == "backtest":
    st.title("🧪 Backtest")
    
    with st.container():
        st.warning("🚧 Backtest module is under development")
        st.info("Coming soon! The Backtest module will allow you to test trading strategies against historical data.")
    
    st.markdown("### Strategy Backtesting")
    
    strategy = st.selectbox(
        "Select Strategy",
        ["Moving Average Crossover", "RSI Strategy", "MACD Strategy"]
    )
    
    symbol = st.text_input("Enter Symbol", "NIFTY")
    
    col1, col2 = st.columns(2)
    with col1:
        start_date = st.date_input("Start Date")
    with col2:
        end_date = st.date_input("End Date")
    
    if st.button("Run Backtest"):
        st.info(f"Demo mode: Running backtest for {strategy} on {symbol}...")
        
        # Show demo results
        st.success("Backtest completed! Demo results:")
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Total Return", "+28.5%")
        with col2:
            st.metric("Win Rate", "65%")
        with col3:
            st.metric("Max Drawdown", "-12.3%")
        
        # Demo chart
        st.line_chart({
            "Portfolio Value": [100, 105, 103, 108, 112, 118, 115, 124, 128],
            "Benchmark": [100, 102, 105, 103, 106, 108, 110, 112, 115]
        })

# Validate configurations before using them
try:
    from config import DEFAULT_RISK_PERCENT, MARKET_CONDITION, APP_SETTINGS
    if not isinstance(MARKET_CONDITION, dict):
        logger.warning("MARKET_CONDITION is not a dictionary, using default values")
        MARKET_CONDITION = {
            "market_status": "Unknown",
            "trend": "Unknown",
            "volatility": "Medium",
            "recommended_strategies": ["Breakout", "Pullback", "Momentum"]
        }
except ImportError as e:
    logger.error(f"Error importing config values: {e}")
    # Set default values
    DEFAULT_RISK_PERCENT = 1.0
    MARKET_CONDITION = {
        "market_status": "Unknown",
        "trend": "Unknown",
        "volatility": "Medium",
        "recommended_strategies": ["Breakout", "Pullback", "Momentum"]
    }
    APP_SETTINGS = {
        "theme": "Dark",
        "risk_level": "Medium"
    }