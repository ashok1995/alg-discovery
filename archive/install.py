#!/usr/bin/env python3
"""
AlgoDiscovery Installation Script
=================================

This script sets up the AlgoDiscovery project with all necessary dependencies
and configurations.

Usage:
    python install.py
    
Features:
    - Installs all dependencies from requirements.txt
    - Sets up directory structure
    - Validates installation
    - Provides usage instructions
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors."""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"Error: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print(f"❌ Python 3.8+ is required. You have {version.major}.{version.minor}")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} is compatible")
    return True

def install_dependencies():
    """Install project dependencies."""
    requirements_file = Path("requirements.txt")
    
    if not requirements_file.exists():
        print("❌ requirements.txt not found")
        return False
    
    print("📦 Installing dependencies...")
    print("This may take a few minutes...")
    
    # Upgrade pip first
    if not run_command(f"{sys.executable} -m pip install --upgrade pip", "Upgrading pip"):
        return False
    
    # Install requirements
    if not run_command(f"{sys.executable} -m pip install -r requirements.txt", "Installing dependencies"):
        return False
    
    return True

def validate_installation():
    """Validate that key packages are installed."""
    print("🔍 Validating installation...")
    
    required_packages = [
        "streamlit",
        "pandas", 
        "numpy",
        "plotly",
        "requests",
        "yfinance"
    ]
    
    failed_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package}")
            failed_packages.append(package)
    
    if failed_packages:
        print(f"\n❌ Failed to import: {', '.join(failed_packages)}")
        return False
    
    print("✅ All core packages validated successfully")
    return True

def setup_directories():
    """Ensure all necessary directories exist."""
    directories = [
        "recommendation_engine/config",
        "streamlit_app/components",
        "streamlit_app/utils",
        "logs",
        "data"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"✅ Directory: {directory}")

def display_usage_instructions():
    """Display usage instructions after successful installation."""
    print("\n" + "="*60)
    print("🎉 INSTALLATION COMPLETED SUCCESSFULLY!")
    print("="*60)
    print("\n📋 Getting Started:")
    print("\n1. Run the Streamlit app:")
    print("   cd streamlit_app")
    print("   python run_app.py")
    print("   # Or directly: streamlit run main.py")
    
    print("\n2. Run a demo of the recommendation engine:")
    print("   python mock_chartink_demo.py")
    
    print("\n3. Test filter management:")
    print("   python -c \"from recommendation_engine.utils.chartink_integration import ChartinkStockFetcher; fetcher = ChartinkStockFetcher(); print('Filters loaded:', len(fetcher.get_available_themes()))\"")
    
    print("\n🌐 Web Interface:")
    print("   The Streamlit app will be available at: http://localhost:8501")
    
    print("\n📚 Key Features:")
    print("   • Real-time stock recommendations")
    print("   • Intraday trading analysis")
    print("   • Filter management")
    print("   • Performance tracking")
    print("   • Interactive visualizations")
    
    print("\n🔧 Configuration:")
    print("   • Filter configurations: recommendation_engine/config/chartink_filters.json")
    print("   • Streamlit settings: streamlit_app/main.py")
    
    print("\n" + "="*60)

def main():
    """Main installation function."""
    print("🚀 AlgoDiscovery Installation")
    print("="*30)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Setup directories
    print("\n📁 Setting up directories...")
    setup_directories()
    
    # Install dependencies
    print("\n📦 Installing dependencies...")
    if not install_dependencies():
        print("\n❌ Installation failed at dependency installation step")
        sys.exit(1)
    
    # Validate installation
    print("\n🔍 Validating installation...")
    if not validate_installation():
        print("\n❌ Installation validation failed")
        print("Some packages may not be installed correctly.")
        print("Try running: pip install -r requirements.txt")
        sys.exit(1)
    
    # Display success message and instructions
    display_usage_instructions()

if __name__ == "__main__":
    main() 