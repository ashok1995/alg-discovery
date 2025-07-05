"""
Legacy compatibility layer for database configuration.

This file now *re-exports* all public symbols from ``common.db.manager`` so
that any remaining imports such as ``from core.database.config import
db_manager`` continue to work while the codebase migrates to the new project
layout.

The heavy-weight implementation previously contained here has been moved to
``src/common/db/manager.py``.
"""

# Forward everything from the new canonical location
from common.db.manager import (
    DatabaseConfig,
    MarketHours,
    DatabaseManager,
    db_manager,
    get_db,
    get_db_async,
    get_redis,
    get_mongo,
    get_mongo_async,
)

# Expose commonly patched symbols for tests
from sqlalchemy import create_engine  # noqa: F401  (re-export)
import redis  # noqa: F401
from pymongo import MongoClient  # noqa: F401

__all__ = [
    "DatabaseConfig",
    "MarketHours",
    "DatabaseManager",
    "db_manager",
    "get_db",
    "get_db_async",
    "get_redis",
    "get_mongo",
    "get_mongo_async",
    # plus the re-exported helper modules
    "create_engine",
    "redis",
    "MongoClient",
] 