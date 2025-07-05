"""
Configuration utilities for AlgoDiscovery microservices.
"""

import os
import json
from fastapi import HTTPException
from utils.api_logger import APILogger

logger = APILogger(__name__, service="config")

def load_config(config_name: str = "long_term_config.json") -> dict:
    """Load a configuration file."""
    config_path = os.path.join(os.path.dirname(__file__), '..', '..', 'shared', 'config', config_name)
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load {config_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load {config_name} configuration")

def load_intraday_config(is_buy: bool = True) -> dict:
    """Load intraday configuration file."""
    config_name = "intraday_buy_config.json" if is_buy else "intraday_sell_config.json"
    return load_config(config_name) 