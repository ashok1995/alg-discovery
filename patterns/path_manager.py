"""
Path management for Market Analyzer application.
Centralizes all path-related functionality.
"""
import os
import sys

# Get the project root directory
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

def setup_paths():
    """
    Add project root to Python path to enable imports from any module
    """
    # Add root to path for direct imports
    if PROJECT_ROOT not in sys.path:
        sys.path.insert(0, PROJECT_ROOT)
    
    # Add any other specific paths if needed
    config_dir = os.path.join(PROJECT_ROOT, 'config')
    if os.path.exists(config_dir) and config_dir not in sys.path:
        sys.path.insert(0, config_dir)

def get_path(relative_path):
    """
    Convert a relative path to an absolute path based on project root
    
    Args:
        relative_path (str): Path relative to the project root
        
    Returns:
        str: Absolute path
    """
    return os.path.join(PROJECT_ROOT, relative_path)

# Dictionary of common paths used in the application
PATHS = {
    "app": get_path("dashboard/app.py"),
    "dashboard": get_path("dashboard"),
    "styles": get_path("dashboard/styles"),
    "data": get_path("data"),
    "config": get_path("config"),  # Directory, not file
    "config_module": get_path("config/__init__.py"),  # Module file
} 