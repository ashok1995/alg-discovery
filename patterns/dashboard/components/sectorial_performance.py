"""
Sectorial Performance component for the Market Analyzer dashboard
"""

import streamlit as st
from utils.logger import get_logger

# Initialize logger
logger = get_logger(__name__, group="dashboard", service="sectorial_performance")

def render_sectorial_performance(market_data=None, position="main", compact=True):
    """
    Render the sectorial performance overview section
    
    Args:
        market_data: Dictionary containing sectorial performance data
        position: Where the component is positioned ("main" or "top")
        compact: Whether to use compact layout to save space
    """
    try:
        # Use default values if no data provided
        if market_data is None:
            market_data = {
                "sectors": [
                    {"name": "IT", "change": 2.8, "status": "positive", "strength": "strong"},
                    {"name": "Banking", "change": 1.2, "status": "positive", "strength": "medium"},
                    {"name": "Pharma", "change": 0.5, "status": "positive", "strength": "weak"},
                    {"name": "Auto", "change": -0.3, "status": "negative", "strength": "weak"},
                    {"name": "FMCG", "change": -1.5, "status": "negative", "strength": "medium"},
                    {"name": "Metal", "change": 3.2, "status": "positive", "strength": "strong"},
                    {"name": "Realty", "change": -2.1, "status": "negative", "strength": "strong"},
                    {"name": "Oil & Gas", "change": 0.7, "status": "positive", "strength": "weak"},
                    {"name": "Telecom", "change": -0.8, "status": "negative", "strength": "weak"},
                    {"name": "Power", "change": 1.8, "status": "positive", "strength": "medium"}
                ]
            }
            
            # Sort sectors by change value to find top gainers and losers
            sorted_sectors = sorted(market_data["sectors"], key=lambda x: x["change"], reverse=True)
            market_data["top_gainers"] = sorted_sectors[:5]
            market_data["top_losers"] = sorted_sectors[-5:]
        
        # CSS for styling - ultra compact version
        st.markdown(f"""
        <style>
        .sectorial-title {{
            color: white;
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .ultra-compact-container {{
            padding: 10px !important;
            margin-bottom: 10px !important;
        }}
        .sector-row {{
            display: flex;
            flex-wrap: nowrap;
            overflow-x: auto;
            margin-bottom: 10px;
            padding-bottom: 5px;
            -ms-overflow-style: none;
            scrollbar-width: none;
        }}
        .sector-row::-webkit-scrollbar {{
            display: none;
        }}
        .mini-sector-card {{
            background-color: rgba(30, 41, 59, 0.7);
            border-radius: 4px;
            padding: 6px 5px;
            text-align: center;
            min-width: 80px;
            margin-right: 5px;
            flex-shrink: 0;
        }}
        .mini-sector-name {{
            color: white;
            font-weight: 500;
            font-size: 0.7rem;
            margin-bottom: 2px;
            white-space: nowrap;
        }}
        .mini-sector-change {{
            font-weight: 600;
            font-size: 0.8rem;
        }}
        .top-position {{
            width: 100%; 
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }}
        .metrics-row {{
            display: flex;
            justify-content: space-around;
            margin: 10px 0 5px 0;
            padding-top: 5px;
            border-top: 1px solid rgba(148, 163, 184, 0.1);
        }}
        .metric-item {{
            text-align: center;
        }}
        .metric-label {{
            color: #94a3b8;
            font-size: 0.7rem;
        }}
        .metric-value {{
            font-weight: 600;
            font-size: 0.8rem;
            margin-top: 2px;
        }}
        .horizontal-movers {{
            display: flex;
            flex-direction: column;
            margin-top: 5px;
        }}
        .movers-header {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }}
        .movers-title {{
            color: #94a3b8;
            font-size: 0.75rem;
            font-weight: 600;
        }}
        .gainers-row, .losers-row {{
            display: flex;
            overflow-x: auto;
            -ms-overflow-style: none;
            scrollbar-width: none;
        }}
        .gainers-row::-webkit-scrollbar, .losers-row::-webkit-scrollbar {{
            display: none;
        }}
        .mover-card {{
            background-color: rgba(30, 41, 59, 0.6);
            border-radius: 4px;
            padding: 5px 8px;
            margin-right: 5px;
            min-width: 90px;
            flex-shrink: 0;
        }}
        .mover-name {{
            color: white;
            font-weight: 500;
            font-size: 0.7rem;
            white-space: nowrap;
        }}
        .mover-change {{
            font-weight: 600;
            font-size: 0.75rem;
            margin-top: 2px;
        }}
        .positive {{
            color: #10b981;
        }}
        .negative {{
            color: #ef4444;
        }}
        .weak {{
            opacity: 0.8;
        }}
        .medium {{
            opacity: 0.9;
        }}
        .strong {{
            opacity: 1;
        }}
        </style>
        """, unsafe_allow_html=True)
        
        # Apply positioning styles
        position_class = "top-position" if position == "top" else ""
        
        # Create container with positioning class
        st.markdown(f'<div class="{position_class}">', unsafe_allow_html=True)
        
        # Section title and time period filter in the same row
        col1, col2 = st.columns([3, 1])
        
        with col1:
            st.markdown('<div class="sectorial-title">Sectorial Performance</div>', unsafe_allow_html=True)
        
        with col2:
            periods = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"]
            selected_period = st.selectbox("Time Period", periods, label_visibility="collapsed")
        
        # Main container
        with st.container():
            st.markdown('<div class="ultra-compact-container" style="background-color: rgba(51, 65, 85, 0.8); border-radius: 10px; padding: 15px;">', unsafe_allow_html=True)
            
            # Horizontal scrollable row for all sectors
            st.markdown('<div class="sector-row">', unsafe_allow_html=True)
            
            # Display each sector card horizontally
            for sector in market_data["sectors"]:
                change_class = "positive" if sector["status"] == "positive" else "negative"
                strength_class = sector["strength"]
                change_sign = "+" if sector["status"] == "positive" else ""
                
                st.markdown(f"""
                <div class="mini-sector-card">
                    <div class="mini-sector-name">{sector["name"]}</div>
                    <div class="mini-sector-change {change_class} {strength_class}">{change_sign}{sector["change"]}%</div>
                </div>
                """, unsafe_allow_html=True)
            
            # Close the sector row
            st.markdown('</div>', unsafe_allow_html=True)
            
            # Metrics row (Advancing, Declining, Breadth)
            positive_count = sum(1 for sector in market_data["sectors"] if sector["status"] == "positive")
            negative_count = len(market_data["sectors"]) - positive_count
            breadth = positive_count / len(market_data["sectors"])
            breadth_color = "#10b981" if breadth >= 0.5 else "#ef4444"
            
            st.markdown(f"""
            <div class="metrics-row">
                <div class="metric-item">
                    <div class="metric-label">Advancing</div>
                    <div class="metric-value positive">{positive_count}</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Declining</div>
                    <div class="metric-value negative">{negative_count}</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Breadth</div>
                    <div class="metric-value" style="color: {breadth_color}">{breadth:.2f}</div>
                </div>
            </div>
            """, unsafe_allow_html=True)
            
            # HORIZONTAL GAINERS AND LOSERS SECTION
            st.markdown('<div class="horizontal-movers">', unsafe_allow_html=True)
            
            # Top Gainers section
            st.markdown('<div class="movers-header"><div class="movers-title">Top Gainers</div></div>', unsafe_allow_html=True)
            st.markdown('<div class="gainers-row">', unsafe_allow_html=True)
            
            # Sort sectors by change to get top gainers
            sorted_gainers = sorted([s for s in market_data["sectors"] if s["status"] == "positive"], 
                                    key=lambda x: x["change"], reverse=True)[:5]
            
            for sector in sorted_gainers:
                st.markdown(f"""
                <div class="mover-card">
                    <div class="mover-name">{sector["name"]}</div>
                    <div class="mover-change positive">+{sector["change"]}%</div>
                </div>
                """, unsafe_allow_html=True)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # Top Losers section
            st.markdown('<div class="movers-header" style="margin-top: 8px;"><div class="movers-title">Top Losers</div></div>', unsafe_allow_html=True)
            st.markdown('<div class="losers-row">', unsafe_allow_html=True)
            
            # Sort sectors by change to get top losers
            sorted_losers = sorted([s for s in market_data["sectors"] if s["status"] == "negative"], 
                                   key=lambda x: x["change"])[:5]
            
            for sector in sorted_losers:
                st.markdown(f"""
                <div class="mover-card">
                    <div class="mover-name">{sector["name"]}</div>
                    <div class="mover-change negative">{sector["change"]}%</div>
                </div>
                """, unsafe_allow_html=True)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # Close horizontal movers container
            st.markdown('</div>', unsafe_allow_html=True)
            
            # Close the main container
            st.markdown('</div>', unsafe_allow_html=True)
        
        # Close the positioning container
        st.markdown('</div>', unsafe_allow_html=True)
    
    except Exception as e:
        logger.error(f"Error rendering sectorial performance: {e}")
        st.error("Unable to display sectorial performance") 