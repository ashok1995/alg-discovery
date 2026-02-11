"""
CSS styles loader
"""

import os
import streamlit as st

def load_all_styles():
    """Load all CSS styles from all style files"""
    css = ""
    
    # Base styles
    css += load_file("base/variables.css")
    css += load_file("base/reset.css")
    css += load_file("base/typography.css")
    
    # Layout styles
    css += load_file("layout/grid.css")
    css += load_file("layout/sidebar.css")
    css += load_file("layout/header.css")
    
    # Component styles
    css += load_file("components/cards.css")
    css += load_file("components/buttons.css")
    css += load_file("components/tables.css")
    css += load_file("components/charts.css")
    css += load_file("components/forms.css")
    
    # Utility styles
    css += load_file("utils/spacing.css")
    css += load_file("utils/display.css")
    
    # Animation styles
    css += load_file("animations/transitions.css")
    
    # Inject CSS into app
    st.markdown(f"<style>{css}</style>", unsafe_allow_html=True)

def load_theme(theme_name="light"):
    """Load specific theme CSS"""
    css = load_file(f"themes/{theme_name}.css")
    if css:
        st.markdown(f"<style>{css}</style>", unsafe_allow_html=True)

def load_file(path):
    """Load CSS from file"""
    try:
        dir_path = os.path.dirname(os.path.realpath(__file__))
        file_path = os.path.join(dir_path, path)
        
        if os.path.exists(file_path):
            with open(file_path, "r") as f:
                return f.read()
        return ""
    except Exception as e:
        print(f"Error loading CSS file {path}: {e}")
        return ""

def load_component_style(component_name):
    """Load CSS for specific component"""
    css = load_file(f"components/{component_name}.css")
    if css:
        st.markdown(f"<style>{css}</style>", unsafe_allow_html=True) 