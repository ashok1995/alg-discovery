"""
Custom styling for dashboard
"""

from dashboard.styles import load_all_styles, load_theme
import streamlit as st
import os
from pathlib import Path

def load_css():
    """Load CSS styles - legacy function"""
    # We'll still keep the inline CSS for compatibility, but in future
    # we could remove this and use only the file-based approach
    
    # Load modular CSS
    load_all_styles()
    
    # Load theme
    load_theme("light")
    
    # Return legacy CSS (for backward compatibility)
    return """
    <style>
    /* This is kept for backward compatibility, migrate styles to files */
    </style>
    """ 

def inject_custom_css():
    """
    Inject all custom CSS files into the Streamlit app
    """
    # Base directory for styles
    styles_dir = Path(__file__).parent / "styles"
    
    # Main dashboard CSS
    dashboard_css_path = styles_dir / "dashboard.css"
    if dashboard_css_path.exists():
        with open(dashboard_css_path) as f:
            st.markdown(f'<style>{f.read()}</style>', unsafe_allow_html=True)
    
    # Additional theme CSS if needed
    theme_css_path = styles_dir / "themes" / "dark.css"
    if theme_css_path.exists():
        with open(theme_css_path) as f:
            st.markdown(f'<style>{f.read()}</style>', unsafe_allow_html=True)
    
    # Layout specific CSS
    header_css_path = styles_dir / "layout" / "header.css"
    if header_css_path.exists():
        with open(header_css_path) as f:
            st.markdown(f'<style>{f.read()}</style>', unsafe_allow_html=True) 