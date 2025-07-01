"""
Simple launcher for Market Analyzer
"""
import os
import streamlit.web.cli as stcli
import sys

if __name__ == "__main__":
    # Get the path to the dashboard/app.py file
    root_dir = os.path.dirname(os.path.abspath(__file__))
    app_path = os.path.join(root_dir, "dashboard", "app.py")
    
    # Launch the Streamlit app
    sys.argv = ["streamlit", "run", app_path, "--server.headless", "true"]
    sys.exit(stcli.main()) 