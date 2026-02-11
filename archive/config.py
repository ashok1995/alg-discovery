"""
Simple Configuration for Main Orchestrator
==========================================

Provides basic configuration settings for the main orchestrator service.
This is a simplified version to ensure the main API can start without complex dependencies.
"""

import os
from typing import List

class AppSettings:
    """Application settings for the main orchestrator."""
    
    def __init__(self):
        self.app_name = "AlgoDiscovery Trading API"
        self.version = "2.0.0"
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.debug = os.getenv("DEBUG", "true").lower() == "true"
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        
        # Default symbols for trading
        symbols_str = os.getenv("DEFAULT_SYMBOLS", "AAPL,GOOGL,MSFT,TSLA,AMZN,NVDA,META")
        self.default_symbols = [symbol.strip().upper() for symbol in symbols_str.split(",")]
        
        # Feature flags
        self.features = {
            "real_time_data": True,
            "paper_trading": True,
            "websocket_streaming": True,
            "ai_predictions": True,
            "backtesting": True
        }
        
        # Performance settings
        self.max_concurrent_requests = 100
        self.request_timeout = 30
        
    def setup_directories(self):
        """Create necessary directories."""
        import os
        os.makedirs("data", exist_ok=True)
        os.makedirs("logs", exist_ok=True)
        os.makedirs("cache", exist_ok=True)
    
    def feature_enabled(self, feature: str) -> bool:
        """Check if a feature is enabled."""
        return self.features.get(feature, False)

class ServerConfig:
    """Server configuration for the main orchestrator."""
    
    def __init__(self):
        self.host = os.getenv("HOST", "0.0.0.0")
        self.port = int(os.getenv("PORT", "8000"))
        self.reload = os.getenv("RELOAD", "true").lower() == "true"
        self.workers = int(os.getenv("WORKERS", "1"))
        
        # CORS settings
        origins_str = os.getenv("ALLOWED_ORIGINS", 
                               "http://localhost:3000,http://localhost:8501,http://127.0.0.1:3000,http://127.0.0.1:8501,http://localhost:8000,http://127.0.0.1:8000")
        self.allowed_origins = [origin.strip() for origin in origins_str.split(",") if origin.strip()]
        
        # SSL configuration (optional)
        self.ssl_keyfile = os.getenv("SSL_KEYFILE")
        self.ssl_certfile = os.getenv("SSL_CERTFILE")
    
    def has_ssl(self) -> bool:
        """Check if SSL is configured."""
        return bool(self.ssl_keyfile and self.ssl_certfile)

# Create global instances
app_settings = AppSettings()
server_config = ServerConfig()

# Setup directories
app_settings.setup_directories() 