#!/usr/bin/env python3
"""
Environment Loader for AlgoDiscovery Trading Servers
===================================================

This module provides utilities to load environment variables from server-specific
environment files. Each server (swing, shortterm, longterm) can have its own
environment configuration file.
"""

import os
import sys
import logging
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

class EnvironmentLoader:
    """Loads environment variables from server-specific environment files."""
    
    def __init__(self, server_type: str):
        """
        Initialize the environment loader for a specific server type.
        
        Args:
            server_type: The type of server ('swing', 'shortterm', 'longterm')
        """
        self.server_type = server_type.lower()
        self.api_dir = Path(__file__).parent
        # Look for environment files in the new api/env/ folder structure
        self.env_file = self.api_dir / "env" / f"{self.server_type}.env"
        
    def load_environment(self) -> bool:
        """
        Load environment variables from the server-specific environment file.
        
        Returns:
            bool: True if environment loaded successfully, False otherwise
        """
        try:
            if self.env_file.exists():
                logger.info(f"📁 Loading environment from {self.env_file}")
                load_dotenv(self.env_file)
                
                # Set server type in environment
                os.environ['SERVER_TYPE'] = self.server_type
                
                # Log key configuration
                port = os.getenv('PORT', 'unknown')
                host = os.getenv('HOST', 'unknown')
                log_level = os.getenv('LOG_LEVEL', 'INFO')
                
                logger.info(f"✅ Environment loaded for {self.server_type} server")
                logger.info(f"   Port: {port}")
                logger.info(f"   Host: {host}")
                logger.info(f"   Log Level: {log_level}")
                
                return True
            else:
                logger.warning(f"⚠️ Environment file {self.env_file} not found")
                logger.info("📁 Falling back to default server.env")
                
                # Fallback to default server.env in the new location
                default_env = self.api_dir / "env" / "server.env"
                if default_env.exists():
                    load_dotenv(default_env)
                    os.environ['SERVER_TYPE'] = self.server_type
                    logger.info("✅ Loaded default environment configuration")
                    return True
                else:
                    logger.error("❌ No environment file found")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Failed to load environment: {e}")
            return False
    
    def get_server_config(self) -> dict:
        """
        Get server-specific configuration as a dictionary.
        
        Returns:
            dict: Server configuration
        """
        config = {
            'server_type': self.server_type,
            'port': int(os.getenv('PORT', 8000)),
            'host': os.getenv('HOST', 'localhost'),
            'log_level': os.getenv('LOG_LEVEL', 'INFO'),
            'log_file': os.getenv('LOG_FILE', f'./logs/{self.server_type}_server.log'),
            'environment': os.getenv('ENVIRONMENT', 'development'),
            'debug': os.getenv('DEBUG', 'true').lower() == 'true',
            'cors_origins': os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(','),
            'api_timeout': int(os.getenv('API_TIMEOUT', 30)),
            'max_retries': int(os.getenv('MAX_RETRIES', 3)),
            'cache_ttl_minutes': int(os.getenv('CACHE_TTL_MINUTES', 15)),
            'enable_cache': os.getenv('ENABLE_CACHE', 'true').lower() == 'true',
            'rate_limit_per_minute': int(os.getenv('RATE_LIMIT_PER_MINUTE', 60)),
            'chartink_delay_seconds': float(os.getenv('CHARTINK_DELAY_SECONDS', 0.5)),
        }
        
        # Add server-specific settings
        if self.server_type == 'swing':
            config.update({
                'holding_period_days': os.getenv('SWING_HOLDING_PERIOD_DAYS', '3-10'),
                'min_score': float(os.getenv('SWING_MIN_SCORE', 25.0)),
                'top_recommendations': int(os.getenv('SWING_TOP_RECOMMENDATIONS', 20)),
                'limit_per_query': int(os.getenv('SWING_LIMIT_PER_QUERY', 50)),
            })
        elif self.server_type == 'shortterm':
            config.update({
                'holding_period_days': os.getenv('SHORTTERM_HOLDING_PERIOD_DAYS', '1-28'),
                'min_score': float(os.getenv('SHORTTERM_MIN_SCORE', 35.0)),
                'top_recommendations': int(os.getenv('SHORTTERM_TOP_RECOMMENDATIONS', 20)),
                'limit_per_query': int(os.getenv('SHORTTERM_LIMIT_PER_QUERY', 50)),
            })
        elif self.server_type == 'longterm':
            config.update({
                'holding_period_days': os.getenv('LONGTERM_HOLDING_PERIOD_DAYS', '90-365'),
                'min_score': float(os.getenv('LONGTERM_MIN_SCORE', 25.0)),
                'top_recommendations': int(os.getenv('LONGTERM_TOP_RECOMMENDATIONS', 20)),
                'limit_per_query': int(os.getenv('LONGTERM_LIMIT_PER_QUERY', 50)),
            })
        
        return config

def load_server_environment(server_type: str) -> Optional[dict]:
    """
    Convenience function to load environment for a specific server type.
    
    Args:
        server_type: The type of server ('swing', 'shortterm', 'longterm')
        
    Returns:
        dict: Server configuration if successful, None otherwise
    """
    loader = EnvironmentLoader(server_type)
    if loader.load_environment():
        return loader.get_server_config()
    return None

def setup_logging(server_type: str):
    """
    Setup logging configuration for a specific server.
    
    Args:
        server_type: The type of server ('swing', 'shortterm', 'longterm')
    """
    config = load_server_environment(server_type)
    if not config:
        return
    
    # Create log directory if it doesn't exist
    log_dir = Path(config['log_file']).parent
    log_dir.mkdir(parents=True, exist_ok=True)
    
    # Configure logging
    logging.basicConfig(
        level=getattr(logging, config['log_level'].upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(config['log_file']),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    logger.info(f"🚀 {server_type.title()} server logging configured")
    logger.info(f"📁 Log file: {config['log_file']}")
    logger.info(f"📊 Log level: {config['log_level']}") 