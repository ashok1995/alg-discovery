"""
Cache Configuration
==================

Configuration for caching mechanisms and data storage.
"""

import os

class CacheConfig:
    """Cache configuration settings."""
    
    def __init__(self):
        # Cache TTL settings (seconds)
        self.cache_ttl = {
            "stock_data": int(os.getenv("STOCK_DATA_CACHE_TTL", "60")),
            "technical_indicators": int(os.getenv("TECHNICAL_CACHE_TTL", "300")),
            "historical_data": int(os.getenv("HISTORICAL_CACHE_TTL", "3600")),
            "signals": int(os.getenv("SIGNALS_CACHE_TTL", "30")),
            "market_status": int(os.getenv("MARKET_STATUS_CACHE_TTL", "60")),
            "screener_results": int(os.getenv("SCREENER_CACHE_TTL", "120"))
        }
        
        # Cache size limits
        self.cache_limits = {
            "max_total_size": int(os.getenv("MAX_TOTAL_CACHE_SIZE", "1000")),
            "max_stock_entries": int(os.getenv("MAX_STOCK_CACHE_ENTRIES", "500")),
            "max_historical_entries": int(os.getenv("MAX_HISTORICAL_CACHE_ENTRIES", "100")),
            "max_signal_entries": int(os.getenv("MAX_SIGNAL_CACHE_ENTRIES", "200"))
        }
        
        # Cache backend configuration
        self.cache_backend = os.getenv("CACHE_BACKEND", "memory")  # memory, redis, memcached
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.memcached_servers = os.getenv("MEMCACHED_SERVERS", "localhost:11211").split(",")
        
        # Cache behavior settings
        self.cache_enabled = os.getenv("CACHE_ENABLED", "true").lower() == "true"
        self.cache_compression = os.getenv("CACHE_COMPRESSION", "false").lower() == "true"
        self.cache_serialization = os.getenv("CACHE_SERIALIZATION", "json")  # json, pickle
        
        # Cache warming settings
        self.cache_warming_enabled = os.getenv("CACHE_WARMING_ENABLED", "true").lower() == "true"
        self.cache_warming_symbols = os.getenv("CACHE_WARMING_SYMBOLS", "AAPL,GOOGL,MSFT,TSLA").split(",")
        self.cache_warming_interval = int(os.getenv("CACHE_WARMING_INTERVAL", "300"))  # 5 minutes
        
        # Cache cleanup settings
        self.cleanup_interval = int(os.getenv("CACHE_CLEANUP_INTERVAL", "1800"))  # 30 minutes
        self.cleanup_threshold = float(os.getenv("CACHE_CLEANUP_THRESHOLD", "0.8"))  # 80% full
    
    def get_cache_ttl(self, data_type: str) -> int:
        """Get cache TTL for a specific data type."""
        return self.cache_ttl.get(data_type, 300)  # Default 5 minutes
    
    def get_cache_limit(self, limit_type: str) -> int:
        """Get cache limit for a specific type."""
        return self.cache_limits.get(limit_type, 100)
    
    def is_cache_enabled(self) -> bool:
        """Check if caching is enabled."""
        return self.cache_enabled
    
    def get_cache_config_summary(self) -> dict:
        """Get cache configuration summary."""
        return {
            "enabled": self.cache_enabled,
            "backend": self.cache_backend,
            "compression": self.cache_compression,
            "serialization": self.cache_serialization,
            "warming_enabled": self.cache_warming_enabled,
            "total_ttl_policies": len(self.cache_ttl),
            "cleanup_interval": self.cleanup_interval,
            "max_total_size": self.cache_limits["max_total_size"]
        } 