"""Unified Logger Utility
========================
Centralised logging for API servers, cron jobs and shared libraries.

Features
--------
1. Daily or size-based rotation (env-configurable)
2. Retention purge (backupCount)
3. Auto-creates log directory hierarchy::

    logs/
      api/      YYYY-MM-DD_api.log
      cron/     YYYY-MM-DD_cron.log
      <group>/  YYYY-MM-DD_<group>.log  (custom group)
      shared/   YYYY-MM-DD_shared.log  (fallback)

4. Colour console output in non-production for easier debugging.
5. Reads LOG_LEVEL, LOG_ROTATION and LOG_RETENTION_DAYS from env
   (already set via shared/config/settings.load_env_files())
6. Thread-safe singleton handlers (avoid duplicates).

Usage
-----
from utils import get_logger
logger = get_logger(__name__, group="api")
logger.info("Hello world")

If *group* is omitted we auto-guess:
- script name contains "cron"   → group "cron"
- script name contains "api"     → group "api"
- else                           → group "shared"
"""

from __future__ import annotations

import sys
import logging
from logging.handlers import TimedRotatingFileHandler, RotatingFileHandler
from pathlib import Path
from datetime import datetime
from typing import Optional
import os

from shared.config.settings import (
    ENV_CONFIG, API_CONFIG  # loaded via load_env_files()
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_DEF_ROTATION = os.getenv("LOG_ROTATION", "daily").lower()
_RETENTION = int(os.getenv("LOG_RETENTION_DAYS", "30"))
_LEVEL = getattr(logging, str(ENV_CONFIG["log_level"]).upper(), logging.INFO)


def _default_group() -> str:
    """Infer log group from executing script name."""
    script = Path(sys.argv[0]).stem.lower()
    if "cron" in script:
        return "cron"
    if "api" in script or "server" in script:
        return "api"
    return "shared"


def _log_dir_for(group: str) -> Path:
    base = Path(__file__).resolve().parent.parent  # project root (utils/..)
    return base / "logs" / group


# ---------------------------------------------------------------------------
# Public: get_logger
# ---------------------------------------------------------------------------

def get_logger(
    name: str = "shared",
    *,
    group: Optional[str] = None,
    service: Optional[str] = None,
    json_format: Optional[bool] = None,
) -> logging.Logger:  # noqa: D401
    """Return a configured logger instance.

    Parameters
    ----------
    name: str
        Logger name (module usually).
    group: str | None
        High-level bucket (api, cron, backtest, etc.). If omitted we auto-guess.
    service: str | None
        Optional sub-folder (e.g. intraday_buy, order_manager). Useful when
        you run multiple servers/cron workers under the same group and want
        isolated log files.
    """
    group = group or _default_group()
    log_dir = _log_dir_for(group)
    if service:
        log_dir = log_dir / service
    log_dir.mkdir(parents=True, exist_ok=True)

    date_str = datetime.now().strftime("%Y-%m-%d")
    filename_bits = [date_str]
    if group:
        filename_bits.append(group)
    if service:
        filename_bits.append(service)
    log_file = log_dir / ("_".join(filename_bits) + ".log")

    logger = logging.getLogger(name)

    # Avoid duplicate handler setup
    if getattr(logger, "_ab_configured", False):
        return logger

    logger.setLevel(_LEVEL)

    # ------------------------------------------------------------------
    # Formatter helpers
    # ------------------------------------------------------------------
    _plain_fmt = "%(_asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    _json_fmt_keys = [
        'asctime', 'levelname', 'name', 'message', 'pathname', 'lineno']

    _json_requested = json_format if json_format is not None else os.getenv("LOG_JSON", "false").lower() == "true"

    if _json_requested:
        try:
            from pythonjsonlogger import jsonlogger  # type: ignore

            console_formatter = jsonlogger.JsonFormatter(_json_fmt_keys)
            file_formatter = jsonlogger.JsonFormatter(_json_fmt_keys)
        except ImportError:  # graceful fallback
            console_formatter = logging.Formatter(_plain_fmt.replace("_", ""), "%H:%M:%S")
            file_formatter = logging.Formatter(_plain_fmt.replace("_", ""), "%Y-%m-%d %H:%M:%S")
    else:
        console_formatter = logging.Formatter(_plain_fmt.replace("_", ""), "%H:%M:%S")
        file_formatter = logging.Formatter(_plain_fmt.replace("_", ""), "%Y-%m-%d %H:%M:%S")

    # Console handler --------------------------------------------------------
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(_LEVEL)
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    # File handler -----------------------------------------------------------
    # file_formatter already defined above based on json/plain

    if _DEF_ROTATION == "daily":
        file_handler = TimedRotatingFileHandler(
            filename=log_file,
            when="midnight",
            backupCount=_RETENTION,
            encoding="utf-8",
        )
    else:  # size based (10 MB parts)
        file_handler = RotatingFileHandler(
            filename=log_file,
            maxBytes=10 * 1024 * 1024,
            backupCount=_RETENTION,
            encoding="utf-8",
        )

    file_handler.setLevel(_LEVEL)
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)

    logger.propagate = False
    logger._ab_configured = True  # type: ignore[attr-defined]
    return logger 