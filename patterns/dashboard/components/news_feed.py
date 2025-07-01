"""Component for displaying market news"""

import streamlit as st
from datetime import datetime, timedelta
import pytz

def render_news_feed(news_items=None):
    """
    Render news feed
    
    Args:
        news_items: List of news dictionaries
    """
    st.markdown('<div class="section-title">Market News</div>', unsafe_allow_html=True)
    
    if not news_items:
        # Default news items
        IST = pytz.timezone('Asia/Kolkata')
        news_items = [
            {
                "title": "RBI Keeps Repo Rate Unchanged at 6.5%",
                "source": "Economic Times",
                "timestamp": datetime.now(IST) - timedelta(hours=2),
                "summary": "The Reserve Bank of India's Monetary Policy Committee has decided to keep the repo rate unchanged at 6.5% for the seventh consecutive time."
            },
            {
                "title": "Infosys Reports 7.1% Rise in Q2 Net Profit",
                "source": "CNBC-TV18",
                "timestamp": datetime.now(IST) - timedelta(hours=5),
                "summary": "IT major Infosys reported a 7.1% year-on-year increase in net profit for the second quarter, beating market expectations."
            },
            {
                "title": "US Fed Signals Potential Rate Cut in December",
                "source": "Reuters",
                "timestamp": datetime.now(IST) - timedelta(days=1, hours=5),
                "summary": "Federal Reserve officials have indicated that they may consider reducing interest rates in their December meeting if inflation continues to moderate."
            }
        ]
    
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