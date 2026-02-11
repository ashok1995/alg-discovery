"""Configuration settings for the API."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = BASE_DIR / "config"

# Paths
SHARED_ENV = Path(__file__).parent / "env" / "shared.env"


def load_env_files(personal_env_path=None):
    """
    Load environment variables from shared and personal env files.
    - Loads shared/config/env/shared.env first (if exists)
    - Then loads personal_env_path (if provided and exists), overriding shared
    Usage:
        from shared.config.settings import load_env_files
        load_env_files("/absolute/path/to/api/env/server.env")
        # or for cron:
        load_env_files("/absolute/path/to/cron/env/env.cron")
    """
    # 1. Load shared env first
    if SHARED_ENV.exists():
        load_dotenv(dotenv_path=SHARED_ENV, override=False)
    # 2. Load personal env (API or cron), override shared
    if personal_env_path and Path(personal_env_path).exists():
        load_dotenv(dotenv_path=personal_env_path, override=True)

# Example: load_env_files("/Users/ashokkumar/Desktop/alg-discovery/api/env/server.env")
# Now you can use os.getenv("VAR_NAME") as usual

# Chartink settings
CHARTINK_CONFIG = {
    "base_url": os.getenv("CHARTINK_BASE_URL", "https://chartink.com"),
    "auth_token": os.getenv("CHARTINK_AUTH_TOKEN", ""),
    "max_retries": int(os.getenv("CHARTINK_MAX_RETRIES", "3")),
    "retry_delay": int(os.getenv("CHARTINK_RETRY_DELAY", "2")),
    "timeout": int(os.getenv("CHARTINK_TIMEOUT", "30"))
}

# Chartink URL constants for backward compatibility
CHARTINK_URL = "https://chartink.com/screener/process"
CHARTINK_REFERER = "https://chartink.com/screener/"

# Intraday settings
INTRADAY_CONFIG = {
    "buy_config_path": str(CONFIG_DIR / "intraday_buy_config.json"),
    "sell_config_path": str(CONFIG_DIR / "intraday_sell_config.json"),
    "max_stocks_per_theme": 15,
    "min_stocks_per_theme": 5,
}

# API settings
API_CONFIG = {
    "max_requests_per_minute": 30,
    "request_timeout": 20,
    "retry_attempts": 2,
    "cache_duration": 180,
}

# Environment settings
ENV_CONFIG = {
    "log_level": os.getenv("LOG_LEVEL", "INFO"),
    "env_file": os.getenv("ENV_FILE", "server.env"),
}

# Feature flags
FEATURE_FLAGS = {
    "use_chartink": True,
    "use_realtime_data": True,
    "enable_caching": True,
} 