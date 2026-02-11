"""
Hot Stocks component for the Swing Trading page
"""

import streamlit as st
from ui_services.stocks.hot_stocks import display_hot_stocks
from utils.data_wrapper import ensure_data_service

def show_hot_stocks(data_service):
    """
    Display the hot stocks component for the Swing Trading page
    
    Args:
        data_service: Data service instance (MongoDB or Test data)
    """
    # Ensure data_service has required methods
    data_service = ensure_data_service(data_service)
    
    # Use the reusable hot stocks component from UI services
    display_hot_stocks(data_service, title="🔥 Hot Swing Trade Stocks") 