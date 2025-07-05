"""
AlgoDiscovery Streamlit Integration Client
========================================

A Python client module for integrating with the AlgoDiscovery Trading API
from external Streamlit applications.

Usage:
    from algodiscovery_client import AlgoDiscoveryClient
    
    client = AlgoDiscoveryClient("http://localhost:8888")
    recommendations = client.get_intraday_recommendations_table(limit=10)
"""

import requests
import pandas as pd
import streamlit as st
from datetime import datetime
import json
from typing import Dict, List, Optional, Any
import time


class AlgoDiscoveryClient:
    """Client for connecting to AlgoDiscovery Trading API from Streamlit apps."""
    
    def __init__(self, base_url: str = "http://localhost:8888", timeout: int = 10):
        """
        Initialize the AlgoDiscovery client.
        
        Args:
            base_url: Base URL of the AlgoDiscovery API server
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'AlgoDiscovery-Streamlit-Client/1.0'
        })
    
    def health_check(self) -> Dict[str, Any]:
        """Check if the AlgoDiscovery API is healthy."""
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def get_intraday_recommendations_table(self, limit: int = 10) -> Optional[Dict[str, Any]]:
        """
        Get intraday buy and sell recommendations in table format using POST request.
        
        Args:
            limit: Maximum number of recommendations per side
            
        Returns:
            Dictionary containing formatted recommendations data or None if error
        """
        try:
            payload = {"limit": limit}
            response = self.session.post(
                f"{self.base_url}/api/intraday/recommendations-table",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"Failed to fetch recommendations: {str(e)}")
            return None
    
    def get_buy_recommendations(self, limit: int = 10) -> Optional[List[Dict]]:
        """Get only buy recommendations."""
        try:
            response = self.session.get(
                f"{self.base_url}/api/intraday/buy-recommendations",
                params={"limit": limit},
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"Failed to fetch buy recommendations: {str(e)}")
            return None
    
    def get_sell_recommendations(self, limit: int = 10) -> Optional[List[Dict]]:
        """Get only sell recommendations."""
        try:
            response = self.session.get(
                f"{self.base_url}/api/intraday/sell-recommendations",
                params={"limit": limit},
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"Failed to fetch sell recommendations: {str(e)}")
            return None
    
    def get_stock_data(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get current stock data for a symbol."""
        try:
            response = self.session.get(
                f"{self.base_url}/api/stock/{symbol}",
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"Failed to fetch stock data for {symbol}: {str(e)}")
            return None
    
    def get_yahoo_stock_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get current stock price from Yahoo Finance."""
        try:
            response = self.session.get(
                f"{self.base_url}/api/yahoo/{symbol}/price",
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"Failed to fetch Yahoo price for {symbol}: {str(e)}")
            return None
    
    def get_multiple_stocks(self, symbols: List[str], use_cache: bool = True) -> Optional[Dict[str, Any]]:
        """Get data for multiple stocks at once."""
        try:
            symbols_str = ",".join(symbols)
            response = self.session.get(
                f"{self.base_url}/api/stocks/multiple",
                params={"symbols": symbols_str, "use_cache": use_cache},
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"Failed to fetch multiple stocks: {str(e)}")
            return None
    
    def get_market_status(self) -> Optional[Dict[str, Any]]:
        """Get current market status."""
        try:
            response = self.session.get(
                f"{self.base_url}/api/market-status",
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"Failed to fetch market status: {str(e)}")
            return None

    def get_realtime_buy_recommendations(self, 
                                       limit: int = 10, 
                                       enable_ranking: bool = True,
                                       confidence_threshold: float = 50.0,
                                       strength_threshold: float = 60.0,
                                       ranking_window: int = 5) -> Optional[Dict[str, Any]]:
        """
        Get real-time intraday buy recommendations with re-ranking using POST request.
        
        Args:
            limit: Maximum number of recommendations
            enable_ranking: Enable frequency-based ranking
            confidence_threshold: Minimum confidence level
            strength_threshold: Minimum strength level
            ranking_window: Number of recent scans for ranking
            
        Returns:
            Dictionary containing real-time buy recommendations with ranking data
        """
        try:
            payload = {
                "limit": limit,
                "enable_ranking": enable_ranking,
                "confidence_threshold": confidence_threshold,
                "strength_threshold": strength_threshold,
                "ranking_window": ranking_window
            }
            response = self.session.post(
                f"{self.base_url}/api/intraday/realtime-buy-recommendations",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"Failed to fetch real-time buy recommendations: {str(e)}")
            return None

    def get_realtime_sell_recommendations(self, 
                                        limit: int = 10, 
                                        enable_ranking: bool = True,
                                        confidence_threshold: float = 50.0,
                                        strength_threshold: float = 60.0,
                                        ranking_window: int = 5) -> Optional[Dict[str, Any]]:
        """
        Get real-time intraday sell recommendations with re-ranking using POST request.
        
        Args:
            limit: Maximum number of recommendations
            enable_ranking: Enable frequency-based ranking
            confidence_threshold: Minimum confidence level
            strength_threshold: Minimum strength level
            ranking_window: Number of recent scans for ranking
            
        Returns:
            Dictionary containing real-time sell recommendations with ranking data
        """
        try:
            payload = {
                "limit": limit,
                "enable_ranking": enable_ranking,
                "confidence_threshold": confidence_threshold,
                "strength_threshold": strength_threshold,
                "ranking_window": ranking_window
            }
            response = self.session.post(
                f"{self.base_url}/api/intraday/realtime-sell-recommendations",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"Failed to fetch real-time sell recommendations: {str(e)}")
            return None

    def get_realtime_combined_recommendations(self, 
                                            limit: int = 10, 
                                            enable_ranking: bool = True,
                                            confidence_threshold: float = 50.0,
                                            strength_threshold: float = 60.0,
                                            ranking_window: int = 5) -> Optional[Dict[str, Any]]:
        """
        Get combined real-time intraday buy and sell recommendations with re-ranking.
        
        Args:
            limit: Maximum number of recommendations per side
            enable_ranking: Enable frequency-based ranking
            confidence_threshold: Minimum confidence level
            strength_threshold: Minimum strength level
            ranking_window: Number of recent scans for ranking
            
        Returns:
            Dictionary containing combined real-time recommendations with market analysis
        """
        try:
            payload = {
                "limit": limit,
                "enable_ranking": enable_ranking,
                "confidence_threshold": confidence_threshold,
                "strength_threshold": strength_threshold,
                "ranking_window": ranking_window
            }
            response = self.session.post(
                f"{self.base_url}/api/intraday/realtime-combined",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"Failed to fetch real-time combined recommendations: {str(e)}")
            return None

    def get_intraday_buy(self, 
                         limit: int = 10, 
                         enable_ranking: bool = True,
                         confidence_threshold: float = 60.0,
                         strength_threshold: float = 65.0,
                         ranking_window: int = 5,
                         chartink_theme: str = "intraday_buy") -> Optional[Dict[str, Any]]:
        """
        Get intraday buy recommendations with real-time ranking.
        
        Args:
            limit: Maximum number of recommendations to return
            enable_ranking: Whether to enable intelligent ranking
            confidence_threshold: Minimum confidence score (0-100)
            strength_threshold: Minimum strength score (0-100)
            ranking_window: Number of recent scans for ranking calculation
            chartink_theme: Chartink theme for dynamic stock discovery
        
        Returns:
            Dictionary containing buy recommendations with ranking data
        """
        try:
            payload = {
                "limit": limit,
                "enable_ranking": enable_ranking,
                "confidence_threshold": confidence_threshold,
                "strength_threshold": strength_threshold,
                "ranking_window": ranking_window,
                "chartink_theme": chartink_theme
            }
            
            response = requests.post(
                f"{self.base_url}/api/intraday/buy",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching intraday buy recommendations: {e}")
            return None

    def get_intraday_sell(self, 
                          limit: int = 10, 
                          enable_ranking: bool = True,
                          confidence_threshold: float = 50.0,
                          strength_threshold: float = 60.0,
                          ranking_window: int = 5,
                          chartink_theme: str = "intraday_sell") -> Optional[Dict[str, Any]]:
        """
        Get intraday sell recommendations with real-time ranking.
        
        Args:
            limit: Maximum number of recommendations to return
            enable_ranking: Whether to enable intelligent ranking
            confidence_threshold: Minimum confidence score (0-100)
            strength_threshold: Minimum strength score (0-100)
            ranking_window: Number of recent scans for ranking calculation
            chartink_theme: Chartink theme for dynamic stock discovery
        
        Returns:
            Dictionary containing sell recommendations with ranking data
        """
        try:
            payload = {
                "limit": limit,
                "enable_ranking": enable_ranking,
                "confidence_threshold": confidence_threshold,
                "strength_threshold": strength_threshold,
                "ranking_window": ranking_window,
                "chartink_theme": chartink_theme
            }
            
            response = requests.post(
                f"{self.base_url}/api/intraday/sell",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching intraday sell recommendations: {e}")
            return None


def format_recommendations_dataframe(recommendations: List[Dict], rec_type: str) -> pd.DataFrame:
    """
    Convert recommendations to a formatted pandas DataFrame for Streamlit display.
    
    Args:
        recommendations: List of recommendation dictionaries
        rec_type: Type of recommendations ('buy' or 'sell')
        
    Returns:
        Formatted pandas DataFrame
    """
    if not recommendations:
        return pd.DataFrame()
    
    df_data = []
    for rec in recommendations:
        df_data.append({
            'Symbol': rec.get('symbol', ''),
            'Signal': rec.get('signal_type', ''),
            'Strength': f"{rec.get('strength', 0):.1f}",
            'Confidence': f"{rec.get('confidence', 0):.1f}%",
            'Current Price': f"₹{rec.get('current_price', 0):.2f}",
            'Target Price': f"₹{rec.get('target_price', 0):.2f}",
            'Stop Loss': f"₹{rec.get('stop_loss', 0):.2f}",
            'Volume Ratio': f"{rec.get('volume_ratio', 0):.2f}",
            'Momentum': f"{rec.get('momentum_score', 0):.2f}",
            'Time': rec.get('timestamp', '').split('T')[1][:8] if 'T' in rec.get('timestamp', '') else '',
            'Reason': rec.get('reason', '')[:30] + '...' if len(rec.get('reason', '')) > 30 else rec.get('reason', '')
        })
    
    return pd.DataFrame(df_data)


def display_recommendations_table(client: AlgoDiscoveryClient, limit: int = 10, auto_refresh: bool = True):
    """
    Streamlit component to display intraday recommendations table.
    
    Args:
        client: AlgoDiscoveryClient instance
        limit: Number of recommendations to fetch per side
        auto_refresh: Whether to enable auto-refresh functionality
    """
    st.markdown("## 📈 Intraday Trading Recommendations")
    st.markdown("Real-time buy and sell recommendations based on technical analysis and market momentum")
    
    # Create controls
    col1, col2, col3, col4 = st.columns([1, 1, 1, 1])
    
    with col1:
        limit_select = st.selectbox("Number of recommendations:", [5, 10, 15, 20], 
                                   index=[5, 10, 15, 20].index(limit), key="rec_limit")
    
    with col2:
        auto_refresh_toggle = st.checkbox("Auto-refresh (1 min)", value=auto_refresh, key="auto_refresh")
    
    with col3:
        if st.button("🔄 Refresh Now", key="refresh_now"):
            st.cache_data.clear()
    
    with col4:
        st.caption(f"⏰ Last updated: {datetime.now().strftime('%H:%M:%S')}")
    
    # Fetch data
    with st.spinner("Fetching intraday recommendations..."):
        data = client.get_intraday_recommendations_table(limit_select)
    
    if data and 'raw_data' in data:
        buy_recs = data['raw_data'].get('buy_recommendations', [])
        sell_recs = data['raw_data'].get('sell_recommendations', [])
        
        # Display market summary stats
        stats = data.get('market_summary', {})
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("🟢 Buy Signals", len(buy_recs))
        with col2:
            st.metric("🔴 Sell Signals", len(sell_recs))
        with col3:
            avg_buy_conf = sum(r.get('confidence', 0) for r in buy_recs) / len(buy_recs) if buy_recs else 0
            st.metric("Avg Buy Confidence", f"{avg_buy_conf:.1f}%")
        with col4:
            avg_sell_conf = sum(r.get('confidence', 0) for r in sell_recs) / len(sell_recs) if sell_recs else 0
            st.metric("Avg Sell Confidence", f"{avg_sell_conf:.1f}%")
        
        # Market sentiment indicator
        sentiment = stats.get('market_sentiment', 'Neutral')
        sentiment_color = "#28a745" if sentiment == "Bullish" else "#dc3545" if sentiment == "Bearish" else "#6c757d"
        st.markdown(f"""
        <div style='text-align:center; padding:10px; background-color:{sentiment_color}; 
                    color:white; border-radius:5px; margin:10px 0;'>
            <h4>📊 Market Sentiment: {sentiment}</h4>
        </div>
        """, unsafe_allow_html=True)
        
        # Create side-by-side layout
        col_buy, col_sell = st.columns(2)
        
        with col_buy:
            st.markdown("### 🟢 BUY Recommendations")
            
            if buy_recs:
                buy_df = format_recommendations_dataframe(buy_recs, 'buy')
                st.dataframe(buy_df, use_container_width=True)
                
                # Download button
                csv = buy_df.to_csv(index=False).encode('utf-8')
                st.download_button(
                    label="📥 Download Buy CSV",
                    data=csv,
                    file_name=f"buy_recommendations_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
                    mime="text/csv",
                    key="download_buy"
                )
            else:
                st.info("No buy recommendations available at the moment")
        
        with col_sell:
            st.markdown("### 🔴 SELL Recommendations")
            
            if sell_recs:
                sell_df = format_recommendations_dataframe(sell_recs, 'sell')
                st.dataframe(sell_df, use_container_width=True)
                
                # Download button
                csv = sell_df.to_csv(index=False).encode('utf-8')
                st.download_button(
                    label="📥 Download Sell CSV",
                    data=csv,
                    file_name=f"sell_recommendations_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
                    mime="text/csv",
                    key="download_sell"
                )
            else:
                st.info("No sell recommendations available at the moment")
        
        # Auto-refresh logic
        if auto_refresh_toggle:
            # Display countdown
            placeholder = st.empty()
            progress_bar = st.progress(0)
            
            for i in range(60, 0, -1):
                progress_bar.progress((60 - i) / 60)
                placeholder.caption(f"⏱️ Auto-refresh in {i} seconds...")
                time.sleep(1)
            
            placeholder.empty()
            progress_bar.empty()
            st.cache_data.clear()
            st.rerun()
    
    else:
        st.error("⚠️ Unable to fetch recommendations. Please ensure the AlgoDiscovery API server is running.")
        
        # Health check
        health = client.health_check()
        if health.get("status") == "healthy":
            st.success("✅ API server is healthy")
        else:
            st.error(f"❌ API server issue: {health.get('message', 'Unknown error')}")
        
        st.markdown("**Troubleshooting:**")
        st.markdown("- Check if the API server is running on localhost:8888")
        st.markdown("- Verify the server with: http://localhost:8888/health")
        st.markdown("- Check the server logs for any errors")


def display_market_status(client: AlgoDiscoveryClient):
    """Display current market status."""
    market_status = client.get_market_status()
    
    if market_status:
        col1, col2, col3 = st.columns(3)
        
        with col1:
            status_color = "🟢" if market_status.get("is_open") else "🔴"
            st.metric("Market Status", f"{status_color} {'Open' if market_status.get('is_open') else 'Closed'}")
        
        with col2:
            st.metric("Current Time", market_status.get("current_time", "")[:19].replace("T", " "))
        
        with col3:
            st.metric("Timezone", market_status.get("timezone", ""))


def display_api_info(client: AlgoDiscoveryClient):
    """Display API connection information."""
    st.sidebar.markdown("### 🔌 API Connection")
    
    health = client.health_check()
    if health.get("status") == "healthy":
        st.sidebar.success("✅ Connected to AlgoDiscovery API")
        st.sidebar.caption(f"Server: {client.base_url}")
        
        # Show service status
        services = health.get("services", {})
        for service, status in services.items():
            if isinstance(status, dict):
                continue
            icon = "✅" if status == "healthy" else "❌"
            st.sidebar.caption(f"{icon} {service}: {status}")
    else:
        st.sidebar.error("❌ Cannot connect to API")
        st.sidebar.caption(health.get("message", "Unknown error"))


def display_realtime_recommendations_table(client: AlgoDiscoveryClient, 
                                         limit: int = 10, 
                                         auto_refresh: bool = True,
                                         enable_ranking: bool = True,
                                         confidence_threshold: float = 60.0,
                                         strength_threshold: float = 65.0):
    """
    Enhanced Streamlit component to display real-time intraday recommendations with ranking.
    
    Args:
        client: AlgoDiscoveryClient instance
        limit: Number of recommendations to fetch per side
        auto_refresh: Whether to enable auto-refresh functionality
        enable_ranking: Enable frequency-based ranking
        confidence_threshold: Minimum confidence level for filtering
        strength_threshold: Minimum strength level for filtering
    """
    st.markdown("## 🚀 Real-Time Intraday Trading Recommendations")
    st.markdown("*Enhanced with frequency-based ranking and real-time processing*")
    
    # Advanced controls
    col1, col2, col3, col4, col5 = st.columns([1, 1, 1, 1, 1])
    
    with col1:
        limit_select = st.selectbox("Recommendations:", [5, 10, 15, 20, 25], 
                                   index=[5, 10, 15, 20, 25].index(limit), key="realtime_limit")
    
    with col2:
        ranking_enabled = st.checkbox("Enable Ranking", value=enable_ranking, key="ranking_enabled")
    
    with col3:
        conf_threshold = st.slider("Min Confidence:", 0, 100, int(confidence_threshold), key="conf_threshold")
    
    with col4:
        strength_threshold_val = st.slider("Min Strength:", 0, 100, int(strength_threshold), key="strength_threshold")
    
    with col5:
        auto_refresh_toggle = st.checkbox("Auto-refresh", value=auto_refresh, key="realtime_auto_refresh")
    
    # Additional controls
    col1, col2, col3 = st.columns([1, 1, 2])
    
    with col1:
        if st.button("🔄 Refresh Now", key="realtime_refresh_now"):
            st.cache_data.clear()
    
    with col2:
        ranking_window = st.selectbox("Ranking Window:", [3, 5, 7, 10], index=1, key="ranking_window")
    
    with col3:
        st.caption(f"⏰ Last updated: {datetime.now().strftime('%H:%M:%S')} | 🎯 Ranking: {'ON' if ranking_enabled else 'OFF'}")
    
    # Fetch real-time data
    with st.spinner("🔍 Scanning markets and processing real-time recommendations..."):
        data = client.get_realtime_combined_recommendations(
            limit=limit_select,
            enable_ranking=ranking_enabled,
            confidence_threshold=conf_threshold,
            strength_threshold=strength_threshold_val,
            ranking_window=ranking_window
        )
    
    if data:
        buy_data = data.get('buy_recommendations', {})
        sell_data = data.get('sell_recommendations', {})
        combined_stats = data.get('combined_stats', {})
        
        # Display enhanced metrics
        col1, col2, col3, col4, col5 = st.columns(5)
        
        with col1:
            st.metric("🟢 Buy Signals", buy_data.get('count', 0))
        
        with col2:
            st.metric("🔴 Sell Signals", sell_data.get('count', 0))
        
        with col3:
            st.metric("📊 Total Opportunities", combined_stats.get('total_opportunities', 0))
        
        with col4:
            sentiment = combined_stats.get('market_sentiment', 'Neutral')
            sentiment_emoji = "📈" if sentiment == "Bullish" else "📉" if sentiment == "Bearish" else "➡️"
            st.metric("Market Sentiment", f"{sentiment_emoji} {sentiment}")
        
        with col5:
            ratio = combined_stats.get('buy_vs_sell_ratio', 1.0)
            if isinstance(ratio, str):
                ratio_display = ratio
            else:
                ratio_display = f"{ratio:.1f}:1"
            st.metric("Buy/Sell Ratio", ratio_display)
        
        # Ranking status
        if ranking_enabled:
            st.markdown(f"""
            <div style='background-color:#e8f5e8; padding:8px; border-radius:4px; margin:10px 0;'>
                <small>🎯 <strong>Ranking Active:</strong> Stocks appearing frequently across multiple scans are prioritized. 
                Window: {ranking_window} scans | Sources: {', '.join(combined_stats.get('scan_sources', []))}</small>
            </div>
            """, unsafe_allow_html=True)
        
        # Create side-by-side layout
        col_buy, col_sell = st.columns(2)
        
        with col_buy:
            st.markdown("### 🟢 REAL-TIME BUY RECOMMENDATIONS")
            
            buy_recommendations = buy_data.get('data', [])
            if buy_recommendations:
                # Enhanced buy dataframe with ranking info
                buy_df_data = []
                for i, rec in enumerate(buy_recommendations, 1):
                    rank_indicator = f"#{i}"
                    if ranking_enabled and rec.get('frequency_score', 1) > 1:
                        rank_indicator += f" 🔥{rec.get('frequency_score', 1)}x"
                    
                    buy_df_data.append({
                        'Rank': rank_indicator,
                        'Symbol': rec.get('symbol', ''),
                        'Entry': f"₹{rec.get('entry_price', 0):.2f}",
                        'Target': f"₹{rec.get('target_price', 0):.2f}",
                        'Stop Loss': f"₹{rec.get('stop_loss', 0):.2f}",
                        'Confidence': f"{rec.get('confidence', 0):.1f}%",
                        'Strength': f"{rec.get('strength', 0):.1f}",
                        'R:R': f"1:{rec.get('risk_reward_ratio', 1.5):.1f}",
                        'Volume': f"{rec.get('volume_ratio', 1):.1f}x",
                        'Reason': rec.get('reason', '')[:25] + '...' if len(rec.get('reason', '')) > 25 else rec.get('reason', '')
                    })
                
                buy_df = pd.DataFrame(buy_df_data)
                st.dataframe(buy_df, use_container_width=True)
                
                # Show market conditions
                buy_conditions = buy_data.get('market_conditions', {})
                st.caption(f"📊 Avg Confidence: {buy_conditions.get('avg_confidence', 0):.1f}% | "
                          f"High Confidence: {buy_conditions.get('high_confidence_count', 0)} signals")
                
                # Download with enhanced data
                enhanced_buy_df = pd.DataFrame([{
                    'Symbol': r.get('symbol'),
                    'Signal_Type': r.get('signal_type'),
                    'Entry_Price': r.get('entry_price'),
                    'Target_Price': r.get('target_price'),
                    'Stop_Loss': r.get('stop_loss'),
                    'Confidence': r.get('confidence'),
                    'Strength': r.get('strength'),
                    'Volume_Ratio': r.get('volume_ratio'),
                    'Momentum_Score': r.get('momentum_score'),
                    'Rank_Score': r.get('rank_score'),
                    'Frequency_Score': r.get('frequency_score'),
                    'Recency_Score': r.get('recency_score'),
                    'Risk_Reward_Ratio': r.get('risk_reward_ratio'),
                    'Timestamp': r.get('timestamp'),
                    'Reason': r.get('reason')
                } for r in buy_recommendations])
                
                csv = enhanced_buy_df.to_csv(index=False).encode('utf-8')
                st.download_button(
                    label="📥 Download Buy CSV (Enhanced)",
                    data=csv,
                    file_name=f"realtime_buy_recommendations_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
                    mime="text/csv",
                    key="download_realtime_buy"
                )
            else:
                st.info("🔍 No buy recommendations meeting current criteria")
        
        with col_sell:
            st.markdown("### 🔴 REAL-TIME SELL RECOMMENDATIONS")
            
            sell_recommendations = sell_data.get('data', [])
            if sell_recommendations:
                # Enhanced sell dataframe with ranking info
                sell_df_data = []
                for i, rec in enumerate(sell_recommendations, 1):
                    rank_indicator = f"#{i}"
                    if ranking_enabled and rec.get('frequency_score', 1) > 1:
                        rank_indicator += f" 🔥{rec.get('frequency_score', 1)}x"
                    
                    sell_df_data.append({
                        'Rank': rank_indicator,
                        'Symbol': rec.get('symbol', ''),
                        'Entry': f"₹{rec.get('entry_price', 0):.2f}",
                        'Target': f"₹{rec.get('target_price', 0):.2f}",
                        'Stop Loss': f"₹{rec.get('stop_loss', 0):.2f}",
                        'Confidence': f"{rec.get('confidence', 0):.1f}%",
                        'Strength': f"{rec.get('strength', 0):.1f}",
                        'R:R': f"1:{rec.get('risk_reward_ratio', 2.0):.1f}",
                        'Volume': f"{rec.get('volume_ratio', 1):.1f}x",
                        'Reason': rec.get('reason', '')[:25] + '...' if len(rec.get('reason', '')) > 25 else rec.get('reason', '')
                    })
                
                sell_df = pd.DataFrame(sell_df_data)
                st.dataframe(sell_df, use_container_width=True)
                
                # Show market conditions
                sell_conditions = sell_data.get('market_conditions', {})
                st.caption(f"📊 Avg Confidence: {sell_conditions.get('avg_confidence', 0):.1f}% | "
                          f"High Confidence: {sell_conditions.get('high_confidence_count', 0)} signals")
                
                # Download with enhanced data
                enhanced_sell_df = pd.DataFrame([{
                    'Symbol': r.get('symbol'),
                    'Signal_Type': r.get('signal_type'),
                    'Entry_Price': r.get('entry_price'),
                    'Target_Price': r.get('target_price'),
                    'Stop_Loss': r.get('stop_loss'),
                    'Confidence': r.get('confidence'),
                    'Strength': r.get('strength'),
                    'Volume_Ratio': r.get('volume_ratio'),
                    'Momentum_Score': r.get('momentum_score'),
                    'Rank_Score': r.get('rank_score'),
                    'Frequency_Score': r.get('frequency_score'),
                    'Recency_Score': r.get('recency_score'),
                    'Risk_Reward_Ratio': r.get('risk_reward_ratio'),
                    'Timestamp': r.get('timestamp'),
                    'Reason': r.get('reason')
                } for r in sell_recommendations])
                
                csv = enhanced_sell_df.to_csv(index=False).encode('utf-8')
                st.download_button(
                    label="📥 Download Sell CSV (Enhanced)",
                    data=csv,
                    file_name=f"realtime_sell_recommendations_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
                    mime="text/csv",
                    key="download_realtime_sell"
                )
            else:
                st.info("🔍 No sell recommendations meeting current criteria")
        
        # Auto-refresh logic
        if auto_refresh_toggle:
            placeholder = st.empty()
            progress_bar = st.progress(0)
            
            for i in range(60, 0, -1):
                progress_bar.progress((60 - i) / 60)
                placeholder.caption(f"⏱️ Next scan in {i} seconds... (Real-time mode)")
                time.sleep(1)
            
            placeholder.empty()
            progress_bar.empty()
            st.cache_data.clear()
            st.rerun()
    
    else:
        st.error("⚠️ Unable to fetch real-time recommendations. Please ensure the AlgoDiscovery API server is running.")
        
        # Health check
        health = client.health_check()
        if health.get("status") == "healthy":
            st.success("✅ API server is healthy")
            st.info("🔍 Try adjusting the confidence and strength thresholds, or check if markets are active.")
        else:
            st.error(f"❌ API server issue: {health.get('message', 'Unknown error')}")


# Example Streamlit app
def main():
    """Enhanced example Streamlit app using real-time AlgoDiscovery recommendations."""
    st.set_page_config(
        page_title="AlgoDiscovery Real-Time Integration",
        page_icon="🚀",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    st.title("🚀 AlgoDiscovery Real-Time Trading Dashboard")
    st.markdown("*Enhanced with frequency-based ranking and real-time processing*")
    
    # Initialize client
    client = AlgoDiscoveryClient()
    
    # Display API info in sidebar
    display_api_info(client)
    
    # Enhanced sidebar with real-time options
    st.sidebar.markdown("### ⚙️ Real-Time Settings")
    use_realtime = st.sidebar.checkbox("Use Real-Time Endpoints", value=True)
    ranking_enabled = st.sidebar.checkbox("Enable Ranking", value=True)
    
    if use_realtime:
        confidence_min = st.sidebar.slider("Min Confidence:", 0, 100, 60)
        strength_min = st.sidebar.slider("Min Strength:", 0, 100, 65)
        
        st.sidebar.markdown("### 📊 Real-Time Info")
        st.sidebar.info("Real-time endpoints scan multiple sources and apply frequency-based ranking for better signal validation.")
    
    # Display market status
    display_market_status(client)
    
    st.markdown("---")
    
    # Choose between regular and real-time recommendations
    if use_realtime:
        display_realtime_recommendations_table(
            client, 
            limit=10, 
            auto_refresh=True,
            enable_ranking=ranking_enabled,
            confidence_threshold=confidence_min,
            strength_threshold=strength_min
        )
    else:
        display_recommendations_table(client, limit=10, auto_refresh=True)


if __name__ == "__main__":
    main() 