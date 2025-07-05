#!/usr/bin/env python3
"""
AlgoDiscovery Quick Launcher
============================

A simple script to launch the enhanced Streamlit app with intraday recommendations.

Features:
- Enhanced intraday buy page with real-time data
- Filter management interface
- Stock analysis and performance tracking
- Interactive visualizations

Usage:
    python launch_app.py

Prerequisites:
    pip install streamlit plotly pandas numpy yfinance requests
"""

import subprocess
import sys
import os
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed."""
    required_packages = [
        'streamlit',
        'streamlit_option_menu',
        'streamlit_autorefresh', 
        'plotly', 
        'pandas',
        'numpy',
        'yfinance',
        'requests'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing packages: {', '.join(missing_packages)}")
        print("Please install them using:")
        print(f"  pip install {' '.join(missing_packages)}")
        return False
    
    return True

def launch_streamlit():
    """Launch the Streamlit app."""
    streamlit_dir = Path(__file__).parent / "streamlit_app"
    main_file = streamlit_dir / "main.py"
    
    if not main_file.exists():
        print(f"❌ Streamlit app not found at {main_file}")
        return False
    
    print("🚀 Launching Enhanced AlgoDiscovery Streamlit App...")
    print("=" * 60)
    print("📊 Features Available:")
    print("  • Enhanced Intraday Buy Recommendations")
    print("  • Real-time Stock Data Fetching")
    print("  • Filter Management Interface")
    print("  • Interactive Charts and Analysis")
    print("  • Performance Metrics Tracking")
    print("=" * 60)
    print("🌐 The app will open in your default browser")
    print("📱 Default URL: http://localhost:8501")
    print("⚠️  Press Ctrl+C to stop the app")
    print("=" * 60)
    
    # Change to streamlit directory and run
    try:
        os.chdir(streamlit_dir)
        subprocess.run([
            sys.executable, "-m", "streamlit", "run", "main.py",
            "--server.port=8501",
            "--server.address=localhost"
        ])
    except KeyboardInterrupt:
        print("\n👋 AlgoDiscovery app stopped by user")
    except Exception as e:
        print(f"❌ Error launching app: {e}")
        return False
    
    return True

def main():
    """Main launcher function."""
    print("🔍 AlgoDiscovery Enhanced Launcher")
    print("==================================")
    
    # Check dependencies
    if not check_dependencies():
        print("\n💡 Install missing dependencies and try again")
        sys.exit(1)
    
    print("✅ All dependencies are installed")
    
    # Launch Streamlit app
    success = launch_streamlit()
    
    if success:
        print("✅ App launched successfully!")
    else:
        print("❌ Failed to launch app")
        sys.exit(1)

if __name__ == "__main__":
    main() 