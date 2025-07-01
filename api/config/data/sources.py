"""
Data Sources Configuration
=========================

Configuration for external data providers and APIs.
"""

import os
from typing import Dict, Optional

class DataSources:
    """Data sources configuration."""
    
    def __init__(self):
        # API Keys
        self.alpha_vantage_api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
        self.chartink_api_key = os.getenv("CHARTINK_API_KEY")
        self.zerodha_api_key = os.getenv("ZERODHA_API_KEY")
        self.zerodha_api_secret = os.getenv("ZERODHA_API_SECRET")
        
        # Data source configurations
        self.data_sources = {
            "yahoo_finance": {
                "name": "Yahoo Finance",
                "priority": 1,
                "enabled": True,
                "rate_limit": int(os.getenv("YAHOO_RATE_LIMIT", "100")),
                "timeout": int(os.getenv("YAHOO_TIMEOUT", "10")),
                "base_url": "https://query1.finance.yahoo.com",
                "retry_attempts": int(os.getenv("YAHOO_RETRIES", "3"))
            },
            "alpha_vantage": {
                "name": "Alpha Vantage",
                "priority": 2,
                "enabled": bool(self.alpha_vantage_api_key),
                "rate_limit": int(os.getenv("AV_RATE_LIMIT", "5")),  # Free tier limit
                "timeout": int(os.getenv("AV_TIMEOUT", "10")),
                "base_url": "https://www.alphavantage.co/query",
                "retry_attempts": int(os.getenv("AV_RETRIES", "2"))
            },
            "chartink": {
                "name": "ChartInk",
                "priority": 3,
                "enabled": bool(self.chartink_api_key),
                "rate_limit": int(os.getenv("CHARTINK_RATE_LIMIT", "60")),
                "timeout": int(os.getenv("CHARTINK_TIMEOUT", "15")),
                "base_url": "https://chartink.com/api",
                "retry_attempts": int(os.getenv("CHARTINK_RETRIES", "2"))
            },
            "zerodha": {
                "name": "Zerodha Kite",
                "priority": 4,
                "enabled": bool(self.zerodha_api_key and self.zerodha_api_secret),
                "rate_limit": int(os.getenv("ZERODHA_RATE_LIMIT", "10")),
                "timeout": int(os.getenv("ZERODHA_TIMEOUT", "5")),
                "base_url": "https://api.kite.trade",
                "retry_attempts": int(os.getenv("ZERODHA_RETRIES", "2"))
            }
        }
        
        # Data fetch intervals (seconds)
        self.intervals = {
            "real_time": int(os.getenv("REALTIME_INTERVAL", "1")),
            "intraday": int(os.getenv("INTRADAY_INTERVAL", "60")),
            "daily": int(os.getenv("DAILY_INTERVAL", "3600")),
            "weekly": int(os.getenv("WEEKLY_INTERVAL", "86400"))
        }
        
        # Data quality settings
        self.quality_checks = {
            "min_volume": int(os.getenv("MIN_VOLUME", "1000")),
            "max_price_deviation": float(os.getenv("MAX_PRICE_DEVIATION", "0.10")),  # 10%
            "stale_data_threshold": int(os.getenv("STALE_DATA_THRESHOLD", "300"))  # 5 minutes
        }
        
        # Fallback configurations
        self.fallback_enabled = os.getenv("FALLBACK_ENABLED", "true").lower() == "true"
        self.fallback_order = ["yahoo_finance", "alpha_vantage", "chartink", "zerodha"]
    
    def get_api_key(self, service: str) -> Optional[str]:
        """Get API key for a specific service."""
        key_mapping = {
            "alpha_vantage": self.alpha_vantage_api_key,
            "chartink": self.chartink_api_key,
            "zerodha": self.zerodha_api_key
        }
        return key_mapping.get(service)
    
    def get_source_config(self, source: str) -> Dict:
        """Get configuration for a specific data source."""
        return self.data_sources.get(source, {})
    
    def get_enabled_sources(self) -> Dict[str, Dict]:
        """Get all enabled data sources."""
        return {
            name: config for name, config in self.data_sources.items()
            if config.get("enabled", False)
        }
    
    def get_primary_source(self) -> str:
        """Get the primary data source (highest priority enabled source)."""
        enabled_sources = self.get_enabled_sources()
        if not enabled_sources:
            return "yahoo_finance"  # fallback
        
        return min(enabled_sources.keys(), 
                  key=lambda x: enabled_sources[x].get("priority", 999))
    
    def is_source_available(self, source: str) -> bool:
        """Check if a data source is available."""
        config = self.data_sources.get(source, {})
        return config.get("enabled", False)
    
    def get_data_sources_summary(self) -> Dict:
        """Get summary of all data sources."""
        return {
            "total_sources": len(self.data_sources),
            "enabled_sources": len(self.get_enabled_sources()),
            "primary_source": self.get_primary_source(),
            "fallback_enabled": self.fallback_enabled,
            "sources": {
                name: {
                    "enabled": config.get("enabled", False),
                    "priority": config.get("priority", 999),
                    "rate_limit": config.get("rate_limit", 0)
                }
                for name, config in self.data_sources.items()
            }
        } 