"""
Shared Configuration Package
==========================

This package contains shared configuration used by both API and cron jobs.
"""

from pathlib import Path
import json

# Base paths
CONFIG_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CONFIG_DIR.parent.parent

# Configuration file paths
CONFIG_FILES = {
    "intraday_buy": CONFIG_DIR / "intraday_buy_config.json",
    "intraday_sell": CONFIG_DIR / "intraday_sell_config.json",
    "long_term": CONFIG_DIR / "long_term_config.json",
    "short_term": CONFIG_DIR / "short_term_config.json",
    "swing_buy": CONFIG_DIR / "swing_buy_config.json",
    "seed_algorithms": CONFIG_DIR / "seed_algorithms_v2.json",
    "unified_trading": CONFIG_DIR / "unified_trading_config.json"
}

def load_config(config_name: str) -> dict:
    """Load a configuration file by name."""
    if config_name not in CONFIG_FILES:
        raise ValueError(f"Unknown config: {config_name}")
    
    with open(CONFIG_FILES[config_name], 'r') as f:
        return json.load(f)

# Import configuration classes
from .settings import CHARTINK_CONFIG, INTRADAY_CONFIG, API_CONFIG, ENV_CONFIG, FEATURE_FLAGS
from .simple import SimpleConfig

__all__ = [
    'CONFIG_DIR',
    'PROJECT_ROOT',
    'CONFIG_FILES',
    'load_config',
    'SimpleConfig',
    'CHARTINK_CONFIG',
    'INTRADAY_CONFIG',
    'API_CONFIG',
    'ENV_CONFIG',
    'FEATURE_FLAGS'
] 