#!/usr/bin/env python3
"""
Environment Loader for AlgoDiscovery Cron Jobs
=============================================

This module provides utilities to load environment variables from cron-specific
environment files. Each cron job can have its own environment configuration file.
"""

import os
import sys
import logging
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

class CronEnvironmentLoader:
    """Loads environment variables from cron-specific environment files."""
    
    def __init__(self, cron_type: str):
        """
        Initialize the environment loader for a specific cron type.
        
        Args:
            cron_type: The type of cron job ('swing_buy', 'short_buy', 'long_buy', 'intraday_buy', 'intraday_sell')
        """
        self.cron_type = cron_type.lower()
        self.cron_dir = Path(__file__).parent
        # Look for environment files in the cron/env/ folder structure
        self.env_file = self.cron_dir / "env" / f"{self.cron_type}.env"
        
    def load_environment(self) -> bool:
        """
        Load environment variables from the cron-specific environment file.
        
        Returns:
            bool: True if environment loaded successfully, False otherwise
        """
        try:
            if self.env_file.exists():
                logger.info(f"📁 Loading environment from {self.env_file}")
                load_dotenv(self.env_file)
                
                # Set cron type in environment
                os.environ['CRON_TYPE'] = self.cron_type
                
                # Log key configuration
                cron_name = os.getenv('CRON_NAME', 'unknown')
                cron_schedule = os.getenv('CRON_SCHEDULE', 'unknown')
                log_level = os.getenv('LOG_LEVEL', 'INFO')
                
                logger.info(f"✅ Environment loaded for {self.cron_type} cron job")
                logger.info(f"   Name: {cron_name}")
                logger.info(f"   Schedule: {cron_schedule}")
                logger.info(f"   Log Level: {log_level}")
                
                return True
            else:
                logger.warning(f"⚠️ Environment file {self.env_file} not found")
                logger.info("📁 Falling back to default env.cron")
                
                # Fallback to default env.cron in the new location
                default_env = self.cron_dir / "env" / "env.cron"
                if default_env.exists():
                    load_dotenv(default_env)
                    os.environ['CRON_TYPE'] = self.cron_type
                    logger.info("✅ Loaded default environment configuration")
                    return True
                else:
                    logger.error("❌ No environment file found")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Failed to load environment: {e}")
            return False
    
    def get_cron_config(self) -> dict:
        """
        Get cron-specific configuration as a dictionary.
        
        Returns:
            dict: Cron configuration
        """
        config = {
            'cron_type': self.cron_type,
            'cron_name': os.getenv('CRON_NAME', self.cron_type),
            'cron_schedule': os.getenv('CRON_SCHEDULE', '0 9 * * 1-5'),
            'cron_enabled': os.getenv('CRON_ENABLED', 'true').lower() == 'true',
            'api_base_url': os.getenv('API_BASE_URL', 'http://localhost:8001'),
            'api_endpoint': os.getenv('API_ENDPOINT', '/api/recommendations'),
            'api_timeout': int(os.getenv('API_TIMEOUT', 30)),
            'api_retries': int(os.getenv('API_RETRIES', 3)),
            'strategy_type': os.getenv('STRATEGY_TYPE', 'default'),
            'holding_period_days': os.getenv('HOLDING_PERIOD_DAYS', '1-30'),
            'min_score': float(os.getenv('MIN_SCORE', 25.0)),
            'top_recommendations': int(os.getenv('TOP_RECOMMENDATIONS', 20)),
            'limit_per_query': int(os.getenv('LIMIT_PER_QUERY', 50)),
            'log_level': os.getenv('LOG_LEVEL', 'INFO'),
            'log_file': os.getenv('LOG_FILE', f'./logs/{self.cron_type}_cron.log'),
            'environment': os.getenv('ENVIRONMENT', 'development'),
            'debug': os.getenv('DEBUG', 'true').lower() == 'true',
            'enable_notifications': os.getenv('ENABLE_NOTIFICATIONS', 'true').lower() == 'true',
            'notification_email': os.getenv('NOTIFICATION_EMAIL', ''),
            'slack_webhook_url': os.getenv('SLACK_WEBHOOK_URL', ''),
            'execution_timeout': int(os.getenv('EXECUTION_TIMEOUT', 300)),
            'max_memory_mb': int(os.getenv('MAX_MEMORY_MB', 512)),
            'enable_cache': os.getenv('ENABLE_CACHE', 'true').lower() == 'true',
            'cache_ttl_minutes': int(os.getenv('CACHE_TTL_MINUTES', 15)),
            'market_open_hour': int(os.getenv('MARKET_OPEN_HOUR', 9)),
            'market_close_hour': int(os.getenv('MARKET_CLOSE_HOUR', 15)),
            'market_timezone': os.getenv('MARKET_TIMEZONE', 'Asia/Kolkata'),
        }
        
        # Add database configuration
        config.update({
            'db_host': os.getenv('DB_HOST', 'localhost'),
            'db_port': int(os.getenv('DB_PORT', 5432)),
            'db_name': os.getenv('DB_NAME', 'algorithm_discovery'),
            'db_user': os.getenv('DB_USER', 'cron_user'),
            'db_password': os.getenv('DB_PASSWORD', ''),
        })
        
        return config

def load_cron_environment(cron_type: str) -> Optional[dict]:
    """
    Convenience function to load environment for a specific cron type.
    
    Args:
        cron_type: The type of cron job ('swing_buy', 'short_buy', 'long_buy', 'intraday_buy', 'intraday_sell')
        
    Returns:
        dict: Cron configuration if successful, None otherwise
    """
    loader = CronEnvironmentLoader(cron_type)
    if loader.load_environment():
        return loader.get_cron_config()
    return None

def setup_cron_logging(cron_type: str):
    """
    Setup logging configuration for a specific cron job.
    
    Args:
        cron_type: The type of cron job ('swing_buy', 'short_buy', 'long_buy', 'intraday_buy', 'intraday_sell')
    """
    config = load_cron_environment(cron_type)
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
    
    logger.info(f"🚀 {cron_type.replace('_', ' ').title()} cron logging configured")
    logger.info(f"📁 Log file: {config['log_file']}")
    logger.info(f"📊 Log level: {config['log_level']}") 