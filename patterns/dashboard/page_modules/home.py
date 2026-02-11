"""
Home page for the Market Analyzer dashboard with broader market outlook, stocks, and news
"""

import sys
import os
from pathlib import Path

# Add the project root directory to the Python path
root_dir = Path(__file__).parent.parent.parent.absolute()
sys.path.append(str(root_dir))

import streamlit as st
from data.mongodb import MongoDB
from utils.logger import get_logger
from dashboard.components.page_script import load_js

# Import utilities
from dashboard.utils.market_utils import is_market_open, format_time_until_market_open
from dashboard.utils.news_utils import render_news_feed

# Import components with error handling
try:
    from dashboard.components.dashboard_header import render_dashboard_header
    from dashboard.components.market_indices import render_main_indices
    from dashboard.components.market_movers import render_market_movers
    from dashboard.components.global_markets import render_global_markets
    from dashboard.components.sector_performance import render_sector_performance
    from dashboard.components.active_trades import render_active_trades
    from dashboard.components.equity_curve import render_equity_curve
    from dashboard.components.trading_opportunities import render_trading_opportunities_cards
    from dashboard.components.quick_metrics_bar import render_quick_metrics_bar
    from dashboard.components.trading_day_summary import render_trading_day_summary
    from dashboard.components.global_market_overview import render_global_market_overview
    from dashboard.components.sectorial_performance import render_sectorial_performance
    from dashboard.components.dashboard_top_strip import render_market_dashboard
except ImportError as e:
    logger = get_logger(__name__, group="dashboard", service="page_home")
    logger.error(f"Error importing components: {e}")

# Initialize logger
logger = get_logger(__name__, group="dashboard", service="page_home")

# Initialize MongoDB
db = MongoDB()

def show_home_page(market_condition=None):
    """
    Show modernized home page with broader market outlook, stocks, and news
    
    Args:
        market_condition: Market condition dictionary
    """
    try:
        # Add the "Market Overview" header centered at the very top
        st.markdown("<h3 style='text-align: center; margin-bottom: 0.5rem; margin-top: 0.1rem;'>Market Overview</h3>", unsafe_allow_html=True)
        
        # Combined dashboard top strip
        try:
            render_market_dashboard(market_condition)
        except Exception as e:
            logger.error(f"Error rendering dashboard top strip: {e}")
            st.error("Unable to display market overview")
            try:
                render_quick_metrics_bar(market_condition)
                render_dashboard_header(is_market_open, format_time_until_market_open)
            except Exception as inner_e:
                logger.error(f"Error rendering fallback components: {inner_e}")
        
        # Main dashboard layout - 3-column layout
        col1, col2, col3 = st.columns([3, 2, 2])
        
        with col1:
            # Market overview - Use market_condition if provided
            try:
                market_data = None
                if market_condition and isinstance(market_condition, dict) and 'NIFTY' in market_condition:
                    market_data = market_condition
                else:
                    market_data = {
                        "NIFTY": {"close": 19425.35, "change": 0.75},
                        "SENSEX": {"close": 64718.56, "change": 0.68},
                        "BANKNIFTY": {"close": 44851.20, "change": 0.92}
                    }
                render_main_indices(market_data)
            except Exception as e:
                logger.error(f"Error rendering market indices: {e}")
                st.warning("Market indices unavailable")
            
            # Equity curve
            try:
                equity_data = db.get_equity_curve() if hasattr(db, 'get_equity_curve') else []
                render_equity_curve(equity_data)
            except Exception as e:
                logger.error(f"Error rendering equity curve: {e}")
                st.warning("Equity curve unavailable")
            
            # Sector performance heat map
            try:
                render_sector_performance()
            except Exception as e:
                logger.error(f"Error rendering sector performance: {e}")
                st.warning("Sector performance unavailable")
        
        with col2:
            # Market movers
            try:
                render_market_movers()
            except Exception as e:
                logger.error(f"Error rendering market movers: {e}")
                st.warning("Market movers unavailable")
            
            # Global markets
            try:
                render_global_markets()
            except Exception as e:
                logger.error(f"Error rendering global markets: {e}")
                st.warning("Global markets data unavailable")
        
        with col3:
            # News feed
            try:
                render_news_feed()
            except Exception as e:
                logger.error(f"Error rendering news feed: {e}")
                st.warning("Market news unavailable")
            
            # Active trades
            try:
                active_trades = db.get_active_trades() if hasattr(db, 'get_active_trades') else []
                st.markdown('<div class="section-title">Active Trades</div>', unsafe_allow_html=True)
                
                if active_trades:
                    render_active_trades(active_trades)
                else:
                    st.markdown("""
                    <div class="card">
                        <p style="text-align: center; color: #64748B;">No active trades</p>
                    </div>
                    """, unsafe_allow_html=True)
            except Exception as e:
                logger.error(f"Error rendering active trades: {e}")
                st.warning("Active trades unavailable")
        
        # Bottom section - Trading opportunities
        st.markdown('<div class="section-title">Market Opportunities & Watchlist</div>', unsafe_allow_html=True)
        try:
            render_trading_opportunities_cards()
        except Exception as e:
            logger.error(f"Error rendering trading opportunities: {e}")
            st.warning("Trading opportunities unavailable")
            
    except Exception as e:
        st.error(f"An error occurred while rendering the dashboard: {e}")
        logger.error(f"Dashboard error: {e}")