"""
Logger utilities
"""

import logging
import os
from datetime import datetime

# Try to import from config, use defaults if not available
try:
    from config.settings import LOG_LEVEL, LOG_FILE
except ImportError:
    # Default settings if config module is not available
    LOG_LEVEL = "INFO"
    LOG_FILE = "app.log"

# Setup log directory
log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
os.makedirs(log_dir, exist_ok=True)

# Create a timestamped log file name
def get_log_file_path():
    timestamp = datetime.now().strftime("%Y%m%d")
    return os.path.join(log_dir, f"{timestamp}_{LOG_FILE}")

def get_logger(name):
    """
    Get logger

    Args:
        name: Logger name
    
    Returns:
        Logger instance
    """
    logger = logging.getLogger(name)
    
    # Convert string log level to logging constant
    numeric_level = getattr(logging, LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(numeric_level)
    
    # Add handlers if not already added
    if not logger.handlers:
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(numeric_level)
        console_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(console_format)
        logger.addHandler(console_handler)
        
        # File handler
        file_handler = logging.FileHandler(get_log_file_path())
        file_handler.setLevel(numeric_level)
        file_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(file_format)
        logger.addHandler(file_handler)
    
    return logger 