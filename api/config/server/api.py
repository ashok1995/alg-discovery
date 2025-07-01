"""
Server API Configuration
=======================

Server settings, CORS, and API configurations.
"""

import os
from typing import List

class ServerConfig:
    """Server and API configuration settings."""
    
    def __init__(self):
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
        
        # Rate Limiting
        self.api_rate_limit = int(os.getenv("API_RATE_LIMIT", "100"))
        self.data_source_rate_limit = int(os.getenv("DATA_SOURCE_RATE_LIMIT", "10"))
        
        # Cache Settings
        self.cache_ttl_seconds = int(os.getenv("CACHE_TTL_SECONDS", "60"))
        self.max_cache_size = int(os.getenv("MAX_CACHE_SIZE", "1000"))
        
        # Background Job Intervals (seconds)
        self.data_fetch_interval = int(os.getenv("DATA_FETCH_INTERVAL", "10"))
        self.signal_generation_interval = int(os.getenv("SIGNAL_GENERATION_INTERVAL", "30"))
        self.health_check_interval = int(os.getenv("HEALTH_CHECK_INTERVAL", "60"))
        
        # SSL Configuration (optional)
        self.ssl_keyfile = os.getenv("SSL_KEYFILE")
        self.ssl_certfile = os.getenv("SSL_CERTFILE")
    
    def has_ssl(self) -> bool:
        """Check if SSL is configured."""
        return bool(self.ssl_keyfile and self.ssl_certfile)
    
    def get_server_url(self) -> str:
        """Get the server URL."""
        protocol = "https" if self.has_ssl() else "http"
        return f"{protocol}://{self.host}:{self.port}"
    
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