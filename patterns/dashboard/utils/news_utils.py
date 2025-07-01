"""
Market news utilities
"""

import streamlit as st
from datetime import datetime, timedelta
import pytz
from utils.logger import get_logger

# Initialize logger
logger = get_logger(__name__)

# Set timezone to IST
IST = pytz.timezone('Asia/Kolkata')

def get_market_news(limit=5):
    """
    Get the latest market news
    
    Args:
        limit: Number of news items to return
        
    Returns:
        List of news dictionaries
    """
    try:
        # This would be replaced with actual API call or database query
        # Mock data for demonstration
        news = [
            {
                "title": "RBI Keeps Repo Rate Unchanged at 6.5%",
                "source": "Economic Times",
                "timestamp": datetime.now(IST) - timedelta(hours=2),
                "summary": "The Reserve Bank of India's Monetary Policy Committee has decided to keep the repo rate unchanged at 6.5% for the seventh consecutive time.",
                "url": "#"
            },
            {
                "title": "Infosys Reports 7.1% Rise in Q2 Net Profit",
                "source": "CNBC-TV18",
                "timestamp": datetime.now(IST) - timedelta(hours=5),
                "summary": "IT major Infosys reported a 7.1% year-on-year increase in net profit for the second quarter, beating market expectations.",
                "url": "#"
            },
            {
                "title": "Adani Group Announces $5 Billion Green Energy Investment",
                "source": "Bloomberg",
                "timestamp": datetime.now(IST) - timedelta(hours=6),
                "summary": "Adani Group has announced plans to invest $5 billion in renewable energy projects across India over the next three years.",
                "url": "#"
            },
            {
                "title": "GST Collections Hit ₹1.72 Lakh Crore in September",
                "source": "Financial Express",
                "timestamp": datetime.now(IST) - timedelta(days=1),
                "summary": "GST collections for September 2023 reached ₹1.72 lakh crore, marking a 10% increase year-on-year.",
                "url": "#"
            },
            {
                "title": "US Fed Signals Potential Rate Cut in December",
                "source": "Reuters",
                "timestamp": datetime.now(IST) - timedelta(days=1, hours=5),
                "summary": "Federal Reserve officials have indicated that they may consider reducing interest rates in their December meeting if inflation continues to moderate.",
                "url": "#"
            }
        ]
        
        # Return limited number of news items
        return news[:limit]
        
    except Exception as e:
        logger.error(f"Error getting market news: {e}")
        return []

def render_news_feed(news_items=None):
    """
    Render news feed
    
    Args:
        news_items: List of news dictionaries
    """
    st.markdown('<div class="section-title">Market News</div>', unsafe_allow_html=True)
    
    if not news_items:
        news_items = get_market_news()
    
    try:
        for item in news_items:
            time_str = item["timestamp"].strftime("%H:%M, %d %b %Y")
            
            st.markdown(f"""
            <div class="news-card">
                <div class="news-title">{item['title']}</div>
                <div class="news-meta">
                    <span class="news-source">{item['source']}</span>
                    <span class="news-time">{time_str}</span>
                </div>
                <div class="news-summary">{item['summary']}</div>
            </div>
            """, unsafe_allow_html=True)
    except Exception as e:
        logger.error(f"Error rendering news feed: {e}")
        st.warning("Unable to render news feed") 