"""
Simple Configuration
===================

Simplified configuration for development and testing.
This provides a single configuration class with all necessary settings.
"""

import os
from typing import List
from pathlib import Path

class SimpleConfig:
    """Simple unified configuration for AlgoDiscovery Trading System."""
    
    def __init__(self):
        # Application Settings
        self.app_name = os.getenv("APP_NAME", "AlgoDiscovery Trading API")
        self.version = os.getenv("VERSION", "2.0.0")
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.debug = os.getenv("DEBUG", "true").lower() == "true"
        
        # Server Settings
        self.host = os.getenv("HOST", "0.0.0.0")
        self.port = int(os.getenv("PORT", "8888"))
        self.reload = os.getenv("RELOAD", "true").lower() == "true"
        self.workers = int(os.getenv("WORKERS", "1"))
        
        # CORS Settings
        origins_str = os.getenv("ALLOWED_ORIGINS", 
                               "http://localhost:3000,http://localhost:8501,http://127.0.0.1:3000,http://127.0.0.1:8501")
        self.allowed_origins = [origin.strip() for origin in origins_str.split(",")]
        self.allowed_methods = ["*"]
        self.allowed_headers = ["*"]
        
        # Trading Settings
        symbols_str = os.getenv("DEFAULT_SYMBOLS", "AAPL,GOOGL,MSFT,TSLA,AMZN")
        self.default_symbols = [symbol.strip().upper() for symbol in symbols_str.split(",")]
        
        # Risk Management
        self.max_position_size = float(os.getenv("MAX_POSITION_SIZE", "10000"))
        self.max_daily_loss = float(os.getenv("MAX_DAILY_LOSS", "5000"))
        self.max_portfolio_risk = float(os.getenv("MAX_PORTFOLIO_RISK", "0.02"))
        
        # Cache Settings
        self.cache_ttl_seconds = int(os.getenv("CACHE_TTL_SECONDS", "60"))
        self.max_cache_size = int(os.getenv("MAX_CACHE_SIZE", "1000"))
        
        # Background Job Intervals
        self.data_fetch_interval = int(os.getenv("DATA_FETCH_INTERVAL", "10"))
        self.signal_generation_interval = int(os.getenv("SIGNAL_GENERATION_INTERVAL", "30"))
        self.health_check_interval = int(os.getenv("HEALTH_CHECK_INTERVAL", "60"))
        
        # Rate Limiting
        self.api_rate_limit = int(os.getenv("API_RATE_LIMIT", "100"))
        self.data_source_rate_limit = int(os.getenv("DATA_SOURCE_RATE_LIMIT", "10"))
        
        # WebSocket Settings
        self.websocket_ping_interval = int(os.getenv("WEBSOCKET_PING_INTERVAL", "20"))
        self.websocket_ping_timeout = int(os.getenv("WEBSOCKET_PING_TIMEOUT", "10"))
        self.max_websocket_connections = int(os.getenv("MAX_WEBSOCKET_CONNECTIONS", "100"))
        
        # Logging
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        self.log_file = os.getenv("LOG_FILE", "logs/app.log")
        
        # Directories
        self.base_dir = Path(__file__).parent.parent.parent
        self.data_directory = os.getenv("DATA_DIRECTORY", "data")
        self.logs_directory = os.getenv("LOGS_DIRECTORY", "logs")
        
        # API Keys
        self.alpha_vantage_api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
        self.chartink_api_key = os.getenv("CHARTINK_API_KEY")
        self.zerodha_api_key = os.getenv("ZERODHA_API_KEY")
        self.zerodha_api_secret = os.getenv("ZERODHA_API_SECRET")
        
        # SSL Configuration
        self.ssl_keyfile = os.getenv("SSL_KEYFILE")
        self.ssl_certfile = os.getenv("SSL_CERTFILE")
        
        # Create directories
        self.setup_directories()
        
        # Market hours (IST)
        self.market_hours = {
            "start_time": "09:15",
            "end_time": "15:30",
            "timezone": "Asia/Kolkata",
            "trading_days": [0, 1, 2, 3, 4]  # Monday to Friday
        }
        
        # Trading strategies
        self.default_strategies = {
            "rsi_momentum": {
                "rsi_period": 14,
                "rsi_oversold": 30,
                "rsi_overbought": 70,
                "enabled": True
            },
            "macd": {
                "fast_period": 12,
                "slow_period": 26,
                "signal_period": 9,
                "enabled": True
            },
            "bollinger_bands": {
                "period": 20,
                "std_dev": 2,
                "enabled": True
            }
        }
        
        # Data sources
        self.data_sources = {
            "yahoo": {"priority": 1, "enabled": True},
            "alpha_vantage": {"priority": 2, "enabled": bool(self.alpha_vantage_api_key)},
            "chartink": {"priority": 3, "enabled": bool(self.chartink_api_key)}
        }
        
        # WebSocket channels
        self.websocket_channels = [
            "price_updates",
            "trading_signals",
            "portfolio_updates",
            "market_news"
        ]
    
    def setup_directories(self):
        """Create necessary directories."""
        dirs_to_create = [
            self.base_dir / self.data_directory,
            self.base_dir / self.logs_directory,
            Path(self.log_file).parent
        ]
        
        for directory in dirs_to_create:
            directory.mkdir(parents=True, exist_ok=True)
    
    def is_market_open(self) -> bool:
        """Check if market is currently open."""
        from datetime import datetime
        import pytz
        
        try:
            tz = pytz.timezone(self.market_hours["timezone"])
            now = datetime.now(tz)
            
            # Check if it's a trading day
            if now.weekday() not in self.market_hours["trading_days"]:
                return False
            
            # Check time range
            start_time = datetime.strptime(self.market_hours["start_time"], "%H:%M").time()
            end_time = datetime.strptime(self.market_hours["end_time"], "%H:%M").time()
            current_time = now.time()
            
            return start_time <= current_time <= end_time
        except Exception:
            return False
    
    def get_api_key(self, service: str) -> str:
        """Get API key for a service."""
        key_map = {
            "alpha_vantage": self.alpha_vantage_api_key or "",
            "chartink": self.chartink_api_key or "",
            "zerodha": self.zerodha_api_key or ""
        }
        return key_map.get(service, "")
    
    def has_ssl(self) -> bool:
        """Check if SSL is configured."""
        return bool(self.ssl_keyfile and self.ssl_certfile)
    
    def get_server_config(self) -> dict:
        """Get server configuration for uvicorn."""
        config = {
            "host": self.host,
            "port": self.port,
            "reload": self.reload,
            "workers": self.workers,
            "log_level": "info",
            "access_log": True,
            "use_colors": True,
        }
        
        if self.has_ssl():
            config.update({
                "ssl_keyfile": self.ssl_keyfile,
                "ssl_certfile": self.ssl_certfile
            })
        
        return config 