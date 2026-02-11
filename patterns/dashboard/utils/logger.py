"""
Logger utility for the Market Analyzer application
"""

import logging
import os
from datetime import datetime

def get_logger(name):
    """
    Create and return a logger with the given name
    
    Args:
        name: The name of the logger
        
    Returns:
        A configured logger instance
    """
    # Create logs directory if it doesn't exist
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # Create a logger
    logger = logging.getLogger(name)
    
    # Only configure the logger if it hasn't been configured yet
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        
        # Create a file handler
        today = datetime.now().strftime("%Y-%m-%d")
        log_file = os.path.join(log_dir, f"app_{today}.log")
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.INFO)
        
        # Create a console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        
        # Create a formatter and add it to the handlers
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        # Add the handlers to the logger
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
    
    return logger