"""
Application Settings
==================

Core application configuration settings.
"""

import os
from typing import List
from pathlib import Path

class AppSettings:
    """Main application settings and configuration."""
    
    def __init__(self):
        # Application Identity
        self.app_name = os.getenv("APP_NAME", "AlgoDiscovery Trading System")
        self.version = os.getenv("VERSION", "2.0.0")
        self.description = "Advanced Trading System with AI-powered Stock Market Discovery"
        self.contact = {
            "name": "AlgoDiscovery Team",
            "email": "support@algodiscovery.com",
            "url": "https://algodiscovery.com"
        }
        
        # Environment Configuration
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.debug = os.getenv("DEBUG", "true").lower() == "true"
        self.testing = os.getenv("TESTING", "false").lower() == "true"
        
        # Directories
        self.base_dir = Path(__file__).parent.parent.parent.parent
        self.data_directory = os.getenv("DATA_DIRECTORY", "data")
        self.logs_directory = os.getenv("LOGS_DIRECTORY", "logs")
        self.models_directory = os.getenv("MODELS_DIRECTORY", "models")
        self.cache_directory = os.getenv("CACHE_DIRECTORY", "cache")
        
        # Logging Configuration
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        self.log_file = os.getenv("LOG_FILE", "logs/app.log")
        self.log_rotation = os.getenv("LOG_ROTATION", "daily")
        self.log_retention_days = int(os.getenv("LOG_RETENTION_DAYS", "30"))
        self.log_format = os.getenv("LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        
        # Feature Flags
        self.features = {
            "real_time_data": os.getenv("ENABLE_REAL_TIME_DATA", "true").lower() == "true",
            "live_trading": os.getenv("ENABLE_LIVE_TRADING", "false").lower() == "true",
            "paper_trading": os.getenv("ENABLE_PAPER_TRADING", "true").lower() == "true",
            "websocket_streaming": os.getenv("ENABLE_WEBSOCKET", "true").lower() == "true",
            "ai_predictions": os.getenv("ENABLE_AI_PREDICTIONS", "true").lower() == "true",
            "news_sentiment": os.getenv("ENABLE_NEWS_SENTIMENT", "false").lower() == "true",
            "portfolio_optimization": os.getenv("ENABLE_PORTFOLIO_OPT", "true").lower() == "true",
            "backtesting": os.getenv("ENABLE_BACKTESTING", "true").lower() == "true",
            "alerts_notifications": os.getenv("ENABLE_ALERTS", "true").lower() == "true"
        }
        
        # Performance Settings
        self.max_concurrent_requests = int(os.getenv("MAX_CONCURRENT_REQUESTS", "100"))
        self.request_timeout = int(os.getenv("REQUEST_TIMEOUT", "30"))
        self.response_cache_timeout = int(os.getenv("RESPONSE_CACHE_TIMEOUT", "60"))
        
        # Data Processing
        self.max_symbols_per_request = int(os.getenv("MAX_SYMBOLS_PER_REQUEST", "50"))
        self.default_data_period = os.getenv("DEFAULT_DATA_PERIOD", "1y")
        self.default_data_interval = os.getenv("DEFAULT_DATA_INTERVAL", "1d")
        
        # Rate Limiting
        self.api_rate_limit = int(os.getenv("API_RATE_LIMIT", "1000"))
        self.rate_limit_window = int(os.getenv("RATE_LIMIT_WINDOW", "3600"))  # 1 hour
        
        # Default Symbols
        symbols_str = os.getenv("DEFAULT_SYMBOLS", 
                               "AAPL,GOOGL,MSFT,TSLA,AMZN,NVDA,META,NFLX,RELIANCE.NS,TCS.NS")
        self.default_symbols = [symbol.strip().upper() for symbol in symbols_str.split(",")]
        
        # Market Configuration
        self.market_timezone = os.getenv("MARKET_TIMEZONE", "Asia/Kolkata")
        self.market_open_time = os.getenv("MARKET_OPEN_TIME", "09:15")
        self.market_close_time = os.getenv("MARKET_CLOSE_TIME", "15:30")
        
        # Database Settings (if using a database)
        self.database_url = os.getenv("DATABASE_URL")
        self.database_pool_size = int(os.getenv("DATABASE_POOL_SIZE", "10"))
        self.database_max_overflow = int(os.getenv("DATABASE_MAX_OVERFLOW", "20"))
        
        # External Services
        self.enable_external_apis = os.getenv("ENABLE_EXTERNAL_APIS", "true").lower() == "true"
        self.api_timeout = int(os.getenv("API_TIMEOUT", "30"))
        self.api_retry_attempts = int(os.getenv("API_RETRY_ATTEMPTS", "3"))
        
        # Setup
        self.setup_directories()
    
    def setup_directories(self):
        """Create necessary directories."""
        directories = [
            self.base_dir / self.data_directory,
            self.base_dir / self.logs_directory,
            self.base_dir / self.models_directory,
            self.base_dir / self.cache_directory,
            Path(self.log_file).parent
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
    
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment.lower() == "production"
    
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.environment.lower() == "development"
    
    def is_testing(self) -> bool:
        """Check if running in testing environment."""
        return self.environment.lower() == "testing" or self.testing
    
    def feature_enabled(self, feature: str) -> bool:
        """Check if a feature is enabled."""
        return self.features.get(feature, False)
    
    def get_directory(self, directory_type: str) -> Path:
        """Get path for a specific directory type."""
        directories = {
            "data": self.base_dir / self.data_directory,
            "logs": self.base_dir / self.logs_directory,
            "models": self.base_dir / self.models_directory,
            "cache": self.base_dir / self.cache_directory,
            "base": self.base_dir
        }
        return directories.get(directory_type, self.base_dir)
    
    def get_app_metadata(self) -> dict:
        """Get application metadata for OpenAPI documentation."""
        return {
            "title": self.app_name,
            "description": self.description,
            "version": self.version,
            "contact": self.contact,
            "license_info": {
                "name": "MIT",
                "url": "https://opensource.org/licenses/MIT"
            },
            "terms_of_service": "https://algodiscovery.com/terms",
            "tags_metadata": [
                {
                    "name": "market",
                    "description": "Market data and analysis operations"
                },
                {
                    "name": "trading",
                    "description": "Trading strategies and signals"
                },
                {
                    "name": "portfolio",
                    "description": "Portfolio management operations"
                },
                {
                    "name": "screener",
                    "description": "Stock screening and filtering"
                },
                {
                    "name": "analysis",
                    "description": "Technical and fundamental analysis"
                }
            ]
        }
    
    def get_summary(self) -> dict:
        """Get configuration summary."""
        return {
            "app_name": self.app_name,
            "version": self.version,
            "environment": self.environment,
            "debug": self.debug,
            "features_enabled": [k for k, v in self.features.items() if v],
            "directories": {
                "data": str(self.get_directory("data")),
                "logs": str(self.get_directory("logs")),
                "models": str(self.get_directory("models")),
                "cache": str(self.get_directory("cache"))
            },
            "default_symbols_count": len(self.default_symbols),
            "external_apis_enabled": self.enable_external_apis
        } 