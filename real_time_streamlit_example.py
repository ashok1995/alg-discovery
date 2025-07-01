"""
AlgoDiscovery Real-Time Integration Example
==========================================

This example demonstrates how to use the enhanced AlgoDiscovery client 
with real-time POST endpoints, frequency-based ranking, and live market data.

Features:
- Real-time intraday buy/sell recommendations with ranking
- Live market sentiment analysis
- Advanced filtering controls
- Auto-refresh functionality
- Enhanced CSV export with ranking data
- Performance metrics dashboard

Prerequisites:
1. AlgoDiscovery backend running on http://localhost:8888
2. Required packages: streamlit, pandas, requests, plotly
3. Copy algodiscovery_client.py to your project directory

Run with: streamlit run real_time_streamlit_example.py
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import time
import sys
import os

# Import the AlgoDiscovery client
try:
    from algodiscovery_client import AlgoDiscoveryClient, display_realtime_recommendations_table, display_market_status
except ImportError:
    st.error("❌ Please ensure 'algodiscovery_client.py' is in the same directory as this script")
    st.stop()

# Page configuration
st.set_page_config(
    page_title="AlgoDiscovery Real-Time Pro",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for enhanced styling
st.markdown("""
<style>
    .metric-card {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #1f77b4;
        margin: 0.5rem 0;
    }
    .success-card {
        background-color: #d4edda;
        border-left-color: #28a745;
    }
    .warning-card {
        background-color: #fff3cd;
        border-left-color: #ffc107;
    }
    .danger-card {
        background-color: #f8d7da;
        border-left-color: #dc3545;
    }
    .sidebar .sidebar-content {
        background-color: #fafafa;
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 2px;
    }
    .stTabs [data-baseweb="tab"] {
        height: 50px;
        padding-left: 20px;
        padding-right: 20px;
    }
</style>
""", unsafe_allow_html=True)

def main():
    """Enhanced Real-Time AlgoDiscovery Trading Dashboard"""
    
    # Header
    st.title("🚀 AlgoDiscovery Real-Time Pro Dashboard")
    st.markdown("*Advanced trading recommendations with AI-powered ranking and real-time market analysis*")
    
    # Initialize client
    client = AlgoDiscoveryClient()
    
    # Sidebar configuration
    with st.sidebar:
        st.markdown("### ⚙️ Dashboard Configuration")
        
        # Backend connection
        st.markdown("#### 🔌 Backend Connection")
        backend_url = st.text_input("Backend URL:", value="http://localhost:8888", key="backend_url")
        if backend_url != client.base_url:
            client = AlgoDiscoveryClient(base_url=backend_url)
        
        # Test connection
        if st.button("🔍 Test Connection", key="test_connection"):
            health = client.health_check()
            if health.get("status") == "healthy":
                st.success("✅ Connected successfully")
            else:
                st.error(f"❌ Connection failed: {health.get('message', 'Unknown error')}")
        
        st.markdown("---")
        
        # Real-time settings
        st.markdown("#### ⚡ Real-Time Settings")
        use_realtime = st.checkbox("Enable Real-Time Mode", value=True, key="enable_realtime")
        auto_refresh = st.checkbox("Auto-Refresh", value=False, key="auto_refresh_global")
        
        if auto_refresh:
            refresh_interval = st.slider("Refresh Interval (seconds):", 30, 300, 60, key="refresh_interval")
        
        st.markdown("---")
        
        # Advanced filters
        st.markdown("#### 🎯 Advanced Filters")
        enable_ranking = st.checkbox("Enable AI Ranking", value=True, 
                                   help="Prioritize stocks appearing frequently across multiple scans")
        
        confidence_threshold = st.slider("Min Confidence:", 0, 100, 60, 
                                        help="Minimum confidence level for recommendations")
        
        strength_threshold = st.slider("Min Technical Strength:", 0, 100, 65,
                                     help="Minimum technical strength for filtering")
        
        ranking_window = st.selectbox("Ranking Window:", [3, 5, 7, 10], index=1,
                                    help="Number of recent scans to consider for ranking")
        
        max_recommendations = st.selectbox("Max Recommendations:", [5, 10, 15, 20, 25], index=1)
        
        st.markdown("---")
        
        # Performance metrics toggle
        st.markdown("#### 📊 Display Options")
        show_performance = st.checkbox("Performance Analytics", value=True)
        show_market_overview = st.checkbox("Market Overview", value=True)
        export_enhanced_data = st.checkbox("Enhanced CSV Export", value=True)
    
    # Main dashboard tabs
    tab1, tab2, tab3, tab4 = st.tabs(["🎯 Live Trading", "📊 Analytics", "📈 Market Overview", "⚙️ Settings"])
    
    with tab1:
        # Live trading recommendations
        if use_realtime:
            # Display market status first
            if show_market_overview:
                display_market_status(client)
                st.markdown("---")
            
            # Performance metrics section
            if show_performance:
                st.markdown("### 📊 Real-Time Performance Metrics")
                
                # Fetch current data for metrics
                try:
                    current_data = client.get_realtime_combined_recommendations(
                        limit=max_recommendations,
                        enable_ranking=enable_ranking,
                        confidence_threshold=confidence_threshold,
                        strength_threshold=strength_threshold,
                        ranking_window=ranking_window
                    )
                    
                    if current_data:
                        col1, col2, col3, col4, col5, col6 = st.columns(6)
                        
                        combined_stats = current_data.get('combined_stats', {})
                        buy_stats = current_data.get('buy_recommendations', {}).get('market_conditions', {})
                        sell_stats = current_data.get('sell_recommendations', {}).get('market_conditions', {})
                        
                        with col1:
                            st.metric("🎯 Total Opportunities", combined_stats.get('total_opportunities', 0))
                        
                        with col2:
                            buy_count = current_data.get('buy_recommendations', {}).get('count', 0)
                            st.metric("🟢 Buy Signals", buy_count)
                        
                        with col3:
                            sell_count = current_data.get('sell_recommendations', {}).get('count', 0)
                            st.metric("🔴 Sell Signals", sell_count)
                        
                        with col4:
                            avg_buy_conf = buy_stats.get('avg_confidence', 0)
                            st.metric("📈 Avg Buy Confidence", f"{avg_buy_conf:.1f}%")
                        
                        with col5:
                            avg_sell_conf = sell_stats.get('avg_confidence', 0)
                            st.metric("📉 Avg Sell Confidence", f"{avg_sell_conf:.1f}%")
                        
                        with col6:
                            sentiment = combined_stats.get('market_sentiment', 'Neutral')
                            sentiment_emoji = {"Bullish": "📈", "Bearish": "📉", "Neutral": "➡️"}.get(sentiment, "➡️")
                            st.metric("🌐 Market Sentiment", f"{sentiment_emoji} {sentiment}")
                        
                        # Ranking information
                        if enable_ranking:
                            st.markdown(f"""
                            <div class="metric-card success-card">
                                <strong>🎯 AI Ranking Active:</strong> Analyzing {ranking_window} recent scans across 
                                {len(combined_stats.get('scan_sources', []))} data sources for optimal stock selection.
                            </div>
                            """, unsafe_allow_html=True)
                
                except Exception as e:
                    st.warning(f"⚠️ Could not fetch performance metrics: {str(e)}")
                
                st.markdown("---")
            
            # Main recommendations display
            st.markdown("### 🚀 Real-Time Trading Recommendations")
            display_realtime_recommendations_table(
                client=client,
                limit=max_recommendations,
                auto_refresh=auto_refresh,
                enable_ranking=enable_ranking,
                confidence_threshold=confidence_threshold,
                strength_threshold=strength_threshold
            )
        
        else:
            st.info("📡 Real-time mode is disabled. Enable it in the sidebar to see live recommendations.")
    
    with tab2:
        # Analytics dashboard
        st.markdown("### 📊 Trading Analytics Dashboard")
        
        if use_realtime:
            try:
                # Fetch data for analytics
                analytics_data = client.get_realtime_combined_recommendations(
                    limit=20,
                    enable_ranking=enable_ranking,
                    confidence_threshold=confidence_threshold,
                    strength_threshold=strength_threshold,
                    ranking_window=ranking_window
                )
                
                if analytics_data and analytics_data.get('buy_recommendations', {}).get('data'):
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        st.markdown("#### 🟢 Buy Recommendations Analysis")
                        
                        buy_data = analytics_data.get('buy_recommendations', {}).get('data', [])
                        if buy_data:
                            # Confidence distribution
                            confidences = [rec.get('confidence', 0) for rec in buy_data]
                            fig_conf = px.histogram(x=confidences, nbins=10, title="Buy Confidence Distribution")
                            fig_conf.update_xaxis(title="Confidence Level")
                            fig_conf.update_yaxis(title="Count")
                            st.plotly_chart(fig_conf, use_container_width=True)
                            
                            # Risk-Reward analysis
                            rr_ratios = [rec.get('risk_reward_ratio', 1.5) for rec in buy_data]
                            fig_rr = px.box(y=rr_ratios, title="Risk-Reward Ratio Distribution")
                            fig_rr.update_yaxis(title="Risk-Reward Ratio")
                            st.plotly_chart(fig_rr, use_container_width=True)
                    
                    with col2:
                        st.markdown("#### 🔴 Sell Recommendations Analysis")
                        
                        sell_data = analytics_data.get('sell_recommendations', {}).get('data', [])
                        if sell_data:
                            # Confidence distribution
                            sell_confidences = [rec.get('confidence', 0) for rec in sell_data]
                            fig_sell_conf = px.histogram(x=sell_confidences, nbins=10, title="Sell Confidence Distribution")
                            fig_sell_conf.update_xaxis(title="Confidence Level")
                            fig_sell_conf.update_yaxis(title="Count")
                            st.plotly_chart(fig_sell_conf, use_container_width=True)
                            
                            # Volume analysis
                            volumes = [rec.get('volume_ratio', 1) for rec in sell_data]
                            fig_vol = px.scatter(x=sell_confidences, y=volumes, title="Confidence vs Volume Ratio")
                            fig_vol.update_xaxis(title="Confidence")
                            fig_vol.update_yaxis(title="Volume Ratio")
                            st.plotly_chart(fig_vol, use_container_width=True)
                        else:
                            st.info("No sell recommendations available for analysis")
                    
                    # Combined analysis
                    st.markdown("#### 📈 Market Trend Analysis")
                    
                    combined_stats = analytics_data.get('combined_stats', {})
                    
                    # Create a gauge chart for market sentiment
                    if combined_stats:
                        sentiment_score = 50  # Neutral baseline
                        sentiment = combined_stats.get('market_sentiment', 'Neutral')
                        
                        if sentiment == 'Bullish':
                            sentiment_score = 75
                        elif sentiment == 'Bearish':
                            sentiment_score = 25
                        
                        fig_gauge = go.Figure(go.Indicator(
                            mode = "gauge+number+delta",
                            value = sentiment_score,
                            domain = {'x': [0, 1], 'y': [0, 1]},
                            title = {'text': "Market Sentiment Score"},
                            delta = {'reference': 50},
                            gauge = {
                                'axis': {'range': [None, 100]},
                                'bar': {'color': "darkblue"},
                                'steps': [
                                    {'range': [0, 30], 'color': "lightcoral"},
                                    {'range': [30, 70], 'color': "lightyellow"},
                                    {'range': [70, 100], 'color': "lightgreen"}
                                ],
                                'threshold': {
                                    'line': {'color': "red", 'width': 4},
                                    'thickness': 0.75,
                                    'value': 90
                                }
                            }
                        ))
                        
                        st.plotly_chart(fig_gauge, use_container_width=True)
                
                else:
                    st.info("📊 No data available for analytics. Try adjusting filter settings or check market hours.")
            
            except Exception as e:
                st.error(f"❌ Analytics error: {str(e)}")
        else:
            st.info("📡 Enable real-time mode to view analytics")
    
    with tab3:
        # Market overview
        st.markdown("### 📈 Comprehensive Market Overview")
        
        if show_market_overview:
            # Display detailed market status
            display_market_status(client)
            
            # Additional market metrics
            st.markdown("#### 🌐 Market Scan Summary")
            
            if use_realtime:
                try:
                    overview_data = client.get_realtime_combined_recommendations(
                        limit=50,  # Higher limit for overview
                        enable_ranking=enable_ranking,
                        confidence_threshold=0,  # Lower threshold for overview
                        strength_threshold=0,
                        ranking_window=ranking_window
                    )
                    
                    if overview_data:
                        combined_stats = overview_data.get('combined_stats', {})
                        
                        # Market summary cards
                        col1, col2, col3 = st.columns(3)
                        
                        with col1:
                            st.markdown("""
                            <div class="metric-card">
                                <h4>🎯 Scan Coverage</h4>
                                <p><strong>Data Sources:</strong> {}</p>
                                <p><strong>Ranking Window:</strong> {} scans</p>
                                <p><strong>Last Update:</strong> {}</p>
                            </div>
                            """.format(
                                len(combined_stats.get('scan_sources', [])),
                                ranking_window,
                                datetime.now().strftime('%H:%M:%S')
                            ), unsafe_allow_html=True)
                        
                        with col2:
                            st.markdown("""
                            <div class="metric-card success-card">
                                <h4>📊 Signal Quality</h4>
                                <p><strong>Total Opportunities:</strong> {}</p>
                                <p><strong>Ranking Status:</strong> {}</p>
                                <p><strong>Filters Applied:</strong> Yes</p>
                            </div>
                            """.format(
                                combined_stats.get('total_opportunities', 0),
                                "Active" if enable_ranking else "Disabled"
                            ), unsafe_allow_html=True)
                        
                        with col3:
                            ratio = combined_stats.get('buy_vs_sell_ratio', 0)
                            ratio_text = str(ratio) if isinstance(ratio, str) else f"{ratio:.2f}"
                            
                            st.markdown("""
                            <div class="metric-card warning-card">
                                <h4>⚖️ Market Balance</h4>
                                <p><strong>Buy/Sell Ratio:</strong> {}</p>
                                <p><strong>Sentiment:</strong> {}</p>
                                <p><strong>Confidence:</strong> High</p>
                            </div>
                            """.format(
                                ratio_text,
                                combined_stats.get('market_sentiment', 'Neutral')
                            ), unsafe_allow_html=True)
                
                except Exception as e:
                    st.error(f"❌ Market overview error: {str(e)}")
            else:
                st.info("📡 Enable real-time mode to view market overview")
        else:
            st.info("📊 Market overview is disabled in settings")
    
    with tab4:
        # Settings and configuration
        st.markdown("### ⚙️ Advanced Settings & Configuration")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("#### 🔧 System Configuration")
            
            # API settings
            st.text_input("API Timeout (seconds):", value="30", key="api_timeout")
            st.text_input("Max Retries:", value="3", key="max_retries")
            
            st.markdown("#### 📊 Data Settings")
            st.checkbox("Enable Debug Mode", key="debug_mode")
            st.checkbox("Cache Responses", value=True, key="cache_responses")
            st.selectbox("Log Level:", ["INFO", "DEBUG", "WARNING", "ERROR"], key="log_level")
        
        with col2:
            st.markdown("#### 🎯 Algorithm Settings")
            
            # Advanced algorithm parameters
            st.slider("Volume Threshold:", 1.0, 5.0, 1.5, 0.1, key="volume_threshold")
            st.slider("Momentum Factor:", 0.5, 2.0, 1.0, 0.1, key="momentum_factor")
            st.slider("Volatility Filter:", 0.0, 1.0, 0.3, 0.05, key="volatility_filter")
            
            st.markdown("#### 💾 Export Settings")
            st.checkbox("Include Ranking Data", value=True, key="export_ranking")
            st.checkbox("Include Technical Indicators", value=True, key="export_technical")
            st.selectbox("Export Format:", ["CSV", "Excel", "JSON"], key="export_format")
        
        # System status
        st.markdown("---")
        st.markdown("### 🔍 System Status")
        
        health = client.health_check()
        if health.get("status") == "healthy":
            st.success("✅ All systems operational")
            st.json(health)
        else:
            st.error("❌ System issues detected")
            st.json(health)
    
    # Footer
    st.markdown("---")
    st.markdown("""
    <div style='text-align: center; color: #666; padding: 20px;'>
        <small>
        🚀 <strong>AlgoDiscovery Real-Time Pro</strong> | 
        Enhanced with AI-powered ranking and real-time market analysis | 
        Last updated: {} 
        </small>
    </div>
    """.format(datetime.now().strftime('%Y-%m-%d %H:%M:%S')), unsafe_allow_html=True)

if __name__ == "__main__":
    main() 