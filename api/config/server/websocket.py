"""
WebSocket Configuration
=====================

WebSocket server configuration for real-time data streaming.
"""

import os
from typing import List, Dict

class WebSocketConfig:
    """WebSocket server configuration settings."""
    
    def __init__(self):
        # Basic WebSocket Settings
        self.enabled = os.getenv("WEBSOCKET_ENABLED", "true").lower() == "true"
        self.path = os.getenv("WEBSOCKET_PATH", "/ws")
        self.max_connections = int(os.getenv("MAX_WEBSOCKET_CONNECTIONS", "100"))
        self.max_message_size = int(os.getenv("WEBSOCKET_MAX_MESSAGE_SIZE", "1048576"))  # 1MB
        
        # Connection Settings
        self.ping_interval = int(os.getenv("WEBSOCKET_PING_INTERVAL", "20"))
        self.ping_timeout = int(os.getenv("WEBSOCKET_PING_TIMEOUT", "10"))
        self.close_timeout = int(os.getenv("WEBSOCKET_CLOSE_TIMEOUT", "10"))
        self.heartbeat_interval = int(os.getenv("WEBSOCKET_HEARTBEAT_INTERVAL", "30"))
        
        # Message Configuration
        self.compression = os.getenv("WEBSOCKET_COMPRESSION", "deflate")
        self.per_message_deflate = os.getenv("WEBSOCKET_PER_MESSAGE_DEFLATE", "true").lower() == "true"
        self.max_queue_size = int(os.getenv("WEBSOCKET_MAX_QUEUE_SIZE", "1000"))
        
        # Authentication
        self.require_auth = os.getenv("WEBSOCKET_REQUIRE_AUTH", "false").lower() == "true"
        self.auth_timeout = int(os.getenv("WEBSOCKET_AUTH_TIMEOUT", "10"))
        
        # Rate Limiting
        self.rate_limit_enabled = os.getenv("WEBSOCKET_RATE_LIMIT", "true").lower() == "true"
        self.messages_per_minute = int(os.getenv("WEBSOCKET_MESSAGES_PER_MINUTE", "60"))
        self.burst_limit = int(os.getenv("WEBSOCKET_BURST_LIMIT", "10"))
        
        # Channels Configuration
        self.channels = {
            "price_updates": {
                "enabled": os.getenv("WS_PRICE_UPDATES", "true").lower() == "true",
                "max_subscribers": int(os.getenv("WS_PRICE_MAX_SUBS", "50")),
                "update_interval": int(os.getenv("WS_PRICE_INTERVAL", "1"))  # seconds
            },
            "trading_signals": {
                "enabled": os.getenv("WS_SIGNALS", "true").lower() == "true",
                "max_subscribers": int(os.getenv("WS_SIGNALS_MAX_SUBS", "30")),
                "update_interval": int(os.getenv("WS_SIGNALS_INTERVAL", "5"))
            },
            "portfolio_updates": {
                "enabled": os.getenv("WS_PORTFOLIO", "true").lower() == "true",
                "max_subscribers": int(os.getenv("WS_PORTFOLIO_MAX_SUBS", "20")),
                "update_interval": int(os.getenv("WS_PORTFOLIO_INTERVAL", "10"))
            },
            "market_news": {
                "enabled": os.getenv("WS_NEWS", "false").lower() == "true",
                "max_subscribers": int(os.getenv("WS_NEWS_MAX_SUBS", "100")),
                "update_interval": int(os.getenv("WS_NEWS_INTERVAL", "60"))
            },
            "screener_results": {
                "enabled": os.getenv("WS_SCREENER", "true").lower() == "true",
                "max_subscribers": int(os.getenv("WS_SCREENER_MAX_SUBS", "25")),
                "update_interval": int(os.getenv("WS_SCREENER_INTERVAL", "30"))
            },
            "system_status": {
                "enabled": os.getenv("WS_SYSTEM_STATUS", "true").lower() == "true",
                "max_subscribers": int(os.getenv("WS_STATUS_MAX_SUBS", "10")),
                "update_interval": int(os.getenv("WS_STATUS_INTERVAL", "30"))
            }
        }
        
        # Broadcasting Settings
        self.broadcast_queue_size = int(os.getenv("WS_BROADCAST_QUEUE_SIZE", "10000"))
        self.broadcast_timeout = int(os.getenv("WS_BROADCAST_TIMEOUT", "5"))
        self.fan_out_delay = float(os.getenv("WS_FAN_OUT_DELAY", "0.001"))  # milliseconds
        
        # Error Handling
        self.auto_reconnect = os.getenv("WS_AUTO_RECONNECT", "true").lower() == "true"
        self.max_reconnect_attempts = int(os.getenv("WS_MAX_RECONNECT_ATTEMPTS", "5"))
        self.reconnect_delay = int(os.getenv("WS_RECONNECT_DELAY", "5"))
        
        # Monitoring
        self.metrics_enabled = os.getenv("WS_METRICS_ENABLED", "true").lower() == "true"
        self.log_connections = os.getenv("WS_LOG_CONNECTIONS", "true").lower() == "true"
        self.log_messages = os.getenv("WS_LOG_MESSAGES", "false").lower() == "true"
        
        # Performance
        self.worker_threads = int(os.getenv("WS_WORKER_THREADS", "4"))
        self.buffer_size = int(os.getenv("WS_BUFFER_SIZE", "65536"))  # 64KB
        self.send_timeout = int(os.getenv("WS_SEND_TIMEOUT", "10"))
        
        # CORS for WebSocket
        origins_str = os.getenv("WS_ALLOWED_ORIGINS", 
                               "http://localhost:3000,http://localhost:8501,http://127.0.0.1:3000,http://127.0.0.1:8501")
        self.allowed_origins = [origin.strip() for origin in origins_str.split(",") if origin.strip()]
    
    def is_enabled(self) -> bool:
        """Check if WebSocket is enabled."""
        return self.enabled
    
    def get_channel_config(self, channel: str) -> Dict:
        """Get configuration for a specific channel."""
        return self.channels.get(channel, {})
    
    def is_channel_enabled(self, channel: str) -> bool:
        """Check if a specific channel is enabled."""
        return self.channels.get(channel, {}).get("enabled", False)
    
    def get_enabled_channels(self) -> List[str]:
        """Get list of enabled channels."""
        return [channel for channel, config in self.channels.items() if config.get("enabled", False)]
    
    def get_channel_max_subscribers(self, channel: str) -> int:
        """Get maximum subscribers for a channel."""
        return self.channels.get(channel, {}).get("max_subscribers", 10)
    
    def get_channel_update_interval(self, channel: str) -> int:
        """Get update interval for a channel."""
        return self.channels.get(channel, {}).get("update_interval", 30)
    
    def get_connection_config(self) -> Dict:
        """Get connection configuration."""
        return {
            "ping_interval": self.ping_interval,
            "ping_timeout": self.ping_timeout,
            "close_timeout": self.close_timeout,
            "heartbeat_interval": self.heartbeat_interval,
            "max_message_size": self.max_message_size,
            "compression": self.compression,
            "per_message_deflate": self.per_message_deflate
        }
    
    def get_rate_limit_config(self) -> Dict:
        """Get rate limiting configuration."""
        return {
            "enabled": self.rate_limit_enabled,
            "messages_per_minute": self.messages_per_minute,
            "burst_limit": self.burst_limit
        }
    
    def get_auth_config(self) -> Dict:
        """Get authentication configuration."""
        return {
            "require_auth": self.require_auth,
            "auth_timeout": self.auth_timeout
        }
    
    def get_performance_config(self) -> Dict:
        """Get performance configuration."""
        return {
            "max_connections": self.max_connections,
            "max_queue_size": self.max_queue_size,
            "broadcast_queue_size": self.broadcast_queue_size,
            "broadcast_timeout": self.broadcast_timeout,
            "fan_out_delay": self.fan_out_delay,
            "worker_threads": self.worker_threads,
            "buffer_size": self.buffer_size,
            "send_timeout": self.send_timeout
        }
    
    def get_monitoring_config(self) -> Dict:
        """Get monitoring configuration."""
        return {
            "metrics_enabled": self.metrics_enabled,
            "log_connections": self.log_connections,
            "log_messages": self.log_messages
        }
    
    def get_websocket_summary(self) -> Dict:
        """Get WebSocket configuration summary."""
        return {
            "enabled": self.enabled,
            "path": self.path,
            "max_connections": self.max_connections,
            "enabled_channels": self.get_enabled_channels(),
            "total_channels": len(self.channels),
            "rate_limiting": self.rate_limit_enabled,
            "authentication_required": self.require_auth,
            "compression_enabled": self.per_message_deflate,
            "metrics_enabled": self.metrics_enabled
        } 