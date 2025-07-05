import json
import logging
from datetime import datetime
import os
from pathlib import Path

class APILogger:
    def __init__(self, api_name):
        self.api_name = api_name
        
        # Create logs directory if it doesn't exist
        log_dir = Path("logs/api_logs")
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # Setup logger
        self.logger = logging.getLogger(f"{api_name}_api")
        self.logger.setLevel(logging.INFO)
        
        # Create a file handler
        log_file = log_dir / f"{api_name}_api.log"
        handler = logging.FileHandler(str(log_file))
        handler.setLevel(logging.INFO)
        
        # Create a formatter
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        
        # Add handler to logger
        if not self.logger.handlers:
            self.logger.addHandler(handler)

    def log_request(self, request_data, endpoint):
        """Log the incoming request with proper JSON formatting"""
        try:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "type": "REQUEST",
                "endpoint": endpoint,
                "data": request_data
            }
            
            self.logger.info("\n" + json.dumps(log_entry, indent=2))
        except Exception as e:
            self.logger.error(f"Error logging request: {str(e)}")

    def log_response(self, response_data, endpoint):
        """Log the outgoing response with proper JSON formatting"""
        try:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "type": "RESPONSE",
                "endpoint": endpoint,
                "data": response_data
            }
            
            self.logger.info("\n" + json.dumps(log_entry, indent=2))
        except Exception as e:
            self.logger.error(f"Error logging response: {str(e)}")

    def log_error(self, error_msg, endpoint, error_details=None):
        """Log errors with proper JSON formatting"""
        try:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "type": "ERROR",
                "endpoint": endpoint,
                "error_message": error_msg,
                "error_details": error_details
            }
            
            self.logger.error("\n" + json.dumps(log_entry, indent=2))
        except Exception as e:
            self.logger.error(f"Error logging error: {str(e)}") 