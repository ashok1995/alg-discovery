"""
Configuration Package
====================

Centralized configuration management for the AlgoDiscovery Trading System.
This package organizes configuration into logical modules:

- app: Application-level settings
- trading: Trading strategies and parameters  
- data: Data source configurations
- server: Server and networking settings
- security: Security and authentication settings
"""

try:
    from .app.settings import AppSettings
    from .trading.strategies import TradingStrategies
    from .trading.risk import RiskManagement
    from .trading.market import MarketConfig
    from .data.sources import DataSources
    from .data.cache import CacheConfig
    from .server.config import ServerConfig
    from .server.websocket import WebSocketConfig
    from .security.auth import SecurityConfig

    # Create global configuration instances
    app_settings = AppSettings()
    trading_strategies = TradingStrategies()
    risk_management = RiskManagement()
    market_config = MarketConfig()
    data_sources = DataSources()
    cache_config = CacheConfig()
    server_config = ServerConfig()
    websocket_config = WebSocketConfig()
    security_config = SecurityConfig()

    # Legacy aliases for backward compatibility
    app_config = app_settings
    trading_config = trading_strategies
    risk_config = risk_management
    data_config = data_sources

    # Export commonly used settings
    __all__ = [
        'app_settings',
        'trading_strategies', 
        'risk_management',
        'market_config',
        'data_sources',
        'cache_config',
        'server_config',
        'websocket_config',
        'security_config',
        # Legacy aliases
        'app_config',
        'trading_config',
        'risk_config',
        'data_config',
        # Classes
        'AppSettings',
        'TradingStrategies',
        'RiskManagement',
        'MarketConfig',
        'DataSources',
        'CacheConfig',
        'ServerConfig',
        'WebSocketConfig',
        'SecurityConfig'
    ]

except ImportError as e:
    # Fallback to simple configuration if structured config fails
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Failed to load structured config: {e}. Using simple config fallback.")
    
    # Simple fallback configuration
    from .simple import SimpleConfig
    
    # Create simple global config instance
    simple_config = SimpleConfig()
    
    # Create aliases to match expected names
    app_settings = simple_config
    server_config = simple_config
    websocket_config = simple_config
    trading_strategies = simple_config
    risk_management = simple_config
    market_config = simple_config
    data_sources = simple_config
    cache_config = simple_config
    security_config = simple_config
    
    # Export simple config with all aliases
    __all__ = [
        'simple_config', 
        'SimpleConfig',
        'app_settings',
        'server_config',
        'websocket_config',
        'trading_strategies',
        'risk_management',
        'market_config',
        'data_sources',
        'cache_config',
        'security_config'
    ] 