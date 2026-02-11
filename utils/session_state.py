import streamlit as st
from datetime import datetime

def initialize_chart_state():
    """Initialize session state variables for the chart"""
    if 'chart_data' not in st.session_state:
        st.session_state.chart_data = None
    if 'last_update' not in st.session_state:
        st.session_state.last_update = None
    if 'indicators' not in st.session_state:
        st.session_state.indicators = []
    if 'chart_height' not in st.session_state:
        st.session_state.chart_height = 700
    if 'chart_theme' not in st.session_state:
        st.session_state.chart_theme = 'dark'
    if 'data_pages_loaded' not in st.session_state:
        st.session_state.data_pages_loaded = 1
    if 'last_symbol' not in st.session_state:
        st.session_state.last_symbol = None
    if 'last_interval' not in st.session_state:
        st.session_state.last_interval = None

def update_chart_state(symbol, interval):
    """Update session state based on changes in symbol or interval"""
    # Reset data if symbol or interval changed
    if st.session_state.last_symbol != symbol or st.session_state.last_interval != interval:
        st.session_state.chart_data = None
        st.session_state.data_pages_loaded = 1
        st.session_state.last_symbol = symbol
        st.session_state.last_interval = interval
        
        # Clear indicators when changing symbols
        if st.session_state.last_symbol != symbol:
            st.session_state.indicators = [] 