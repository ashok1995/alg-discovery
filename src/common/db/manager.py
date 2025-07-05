"""
Unified Database Manager for alg_discovery project.

This module centralises configuration and access for PostgreSQL, Redis and MongoDB
and exposes helpers for both synchronous and asynchronous use cases.

All previous consumers should import from `common.db`:

    from common.db import db_manager, DatabaseConfig, get_db

The old path `core.database.config` still re-exports these symbols for
backwards compatibility, but will be removed in a future release.
"""

from __future__ import annotations

import os
import logging
from dataclasses import dataclass
from datetime import datetime, time
from typing import Optional, Dict, Any, Iterator, AsyncIterator

import pytz
import motor.motor_asyncio
import redis
from dotenv import load_dotenv
from pymongo import MongoClient
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

# Local import placed after third-party imports to avoid circular references
from common.db import Base  # type: ignore  # noqa: E402

load_dotenv()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Environment-driven configuration dataclass
# ---------------------------------------------------------------------------
@dataclass
class DatabaseConfig:
    # PostgreSQL (Primary)
    postgres_host: str = os.getenv("POSTGRES_HOST", "localhost")
    postgres_port: int = int(os.getenv("POSTGRES_PORT", "5432"))
    postgres_user: str = os.getenv("POSTGRES_USER", "algodiscovery")
    postgres_password: str = os.getenv("POSTGRES_PASSWORD", "algodiscovery")
    postgres_db: str = os.getenv("POSTGRES_DB", "algodiscovery")

    # Redis
    redis_host: str = os.getenv("REDIS_HOST", "localhost")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    redis_db: int = int(os.getenv("REDIS_DB", "0"))
    redis_password: Optional[str] = os.getenv("REDIS_PASSWORD")

    # Mongo
    mongo_host: str = os.getenv("MONGO_HOST", "localhost")
    mongo_port: int = int(os.getenv("MONGO_PORT", "27017"))
    mongo_user: Optional[str] = os.getenv("MONGO_USER")
    mongo_password: Optional[str] = os.getenv("MONGO_PASSWORD")
    mongo_db: str = os.getenv("MONGO_DB", "algodiscovery_fallback")

    # Cache settings
    cache_ttl_default: int = int(os.getenv("CACHE_TTL_DEFAULT", "300"))
    cache_ttl_market_hours: int = int(os.getenv("CACHE_TTL_MARKET_HOURS", "30"))
    cache_ttl_after_hours: int = int(os.getenv("CACHE_TTL_AFTER_HOURS", "3600"))


# ---------------------------------------------------------------------------
# Helper class for determining trading market hours
# ---------------------------------------------------------------------------
class MarketHours:
    ist_timezone = pytz.timezone("Asia/Kolkata")
    market_open = time(9, 15)      # 9:15 AM IST
    market_close = time(15, 30)    # 3:30 PM IST

    def is_market_open(self) -> bool:
        now = datetime.now(self.ist_timezone)
        return (
            now.weekday() < 5
            and self.market_open <= now.time() <= self.market_close
        )

    def get_cache_ttl(self, config: DatabaseConfig) -> int:
        return (
            config.cache_ttl_market_hours
            if self.is_market_open()
            else config.cache_ttl_after_hours
        )


# ---------------------------------------------------------------------------
# Main manager object
# ---------------------------------------------------------------------------
class DatabaseManager:
    def __init__(self, config: DatabaseConfig | None = None):
        self.config = config or DatabaseConfig()
        self.market_hours = MarketHours()

        # Lazy-initialised connection handles
        self._postgres_engine = None
        self._postgres_session_factory = None
        self._redis_client = None
        self._mongo_client = None
        self._mongo_async_client = None

        # async engine/session helpers (shared, lazily set)
        self._async_engine = None
        self._async_session_factory = None

    # ---------------------------------------------------------------------
    # PostgreSQL (sync)
    # ---------------------------------------------------------------------
    @property
    def postgres_url(self) -> str:
        return (
            f"postgresql://{self.config.postgres_user}:{self.config.postgres_password}"
            f"@{self.config.postgres_host}:{self.config.postgres_port}/{self.config.postgres_db}"
        )

    def get_postgres_engine(self):
        if self._postgres_engine is None:
            self._postgres_engine = create_engine(
                self.postgres_url,
                poolclass=QueuePool,
                pool_size=10,
                max_overflow=20,
                pool_timeout=30,
                pool_recycle=1800,
                echo=False,
            )
        return self._postgres_engine

    def get_postgres_session(self) -> sessionmaker[Session]:
        if self._postgres_session_factory is None:
            self._postgres_session_factory = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.get_postgres_engine(),
            )
        return self._postgres_session_factory

    # ---------------------------------------------------------------------
    # PostgreSQL (async)
    # ---------------------------------------------------------------------
    @property
    def _async_database_url(self) -> str:
        return self.postgres_url.replace("postgresql://", "postgresql+asyncpg://")

    def get_async_engine(self):
        if self._async_engine is None:
            self._async_engine = create_async_engine(
                self._async_database_url, pool_pre_ping=True, echo=False
            )
        return self._async_engine

    def get_async_session_factory(self) -> async_sessionmaker[AsyncSession]:
        if self._async_session_factory is None:
            self._async_session_factory = async_sessionmaker(
                bind=self.get_async_engine(), expire_on_commit=False
            )
        return self._async_session_factory

    async def get_async_session(self) -> AsyncIterator[AsyncSession]:
        async_session_factory = self.get_async_session_factory()
        async with async_session_factory() as session:
            yield session

    # ---------------------------------------------------------------------
    # Redis
    # ---------------------------------------------------------------------
    def get_redis_client(self) -> redis.Redis:
        if self._redis_client is None:
            self._redis_client = redis.Redis(
                host=self.config.redis_host,
                port=self.config.redis_port,
                db=self.config.redis_db,
                password=self.config.redis_password,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )
        return self._redis_client

    # ---------------------------------------------------------------------
    # Mongo
    # ---------------------------------------------------------------------
    @property
    def mongo_url(self) -> str:
        if self.config.mongo_user and self.config.mongo_password:
            return (
                f"mongodb://{self.config.mongo_user}:{self.config.mongo_password}"
                f"@{self.config.mongo_host}:{self.config.mongo_port}/{self.config.mongo_db}"
            )
        return f"mongodb://{self.config.mongo_host}:{self.config.mongo_port}/"

    def get_mongo_client(self) -> MongoClient:
        if self._mongo_client is None:
            self._mongo_client = MongoClient(
                self.mongo_url,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=5000,
            )
        return self._mongo_client

    def get_mongo_async_client(self):
        if self._mongo_async_client is None:
            self._mongo_async_client = motor.motor_asyncio.AsyncIOMotorClient(
                self.mongo_url,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=5000,
            )
        return self._mongo_async_client

    # ---------------------------------------------------------------------
    # Health / Close
    # ---------------------------------------------------------------------
    def health_check(self) -> Dict[str, bool]:
        health: Dict[str, bool] = {}

        # Postgres
        try:
            with self.get_postgres_engine().connect() as conn:
                conn.execute("SELECT 1")
            health["postgresql"] = True
        except Exception as exc:  # pylint: disable=broad-except
            logger.error("PostgreSQL health check failed: %s", exc)
            health["postgresql"] = False

        # Redis
        try:
            self.get_redis_client().ping()
            health["redis"] = True
        except Exception as exc:  # pylint: disable=broad-except
            logger.error("Redis health check failed: %s", exc)
            health["redis"] = False

        # Mongo
        try:
            self.get_mongo_client().admin.command("ping")
            health["mongodb"] = True
        except Exception as exc:  # pylint: disable=broad-except
            logger.error("MongoDB health check failed: %s", exc)
            health["mongodb"] = False

        return health

    def close_connections(self):
        if self._postgres_engine:
            self._postgres_engine.dispose()

        if self._redis_client:
            try:
                self._redis_client.close()
            except Exception:  # pragma: no cover
                pass

        if self._mongo_client:
            self._mongo_client.close()

        if self._mongo_async_client:
            self._mongo_async_client.close()

    # ---------------------------------------------------------------------
    # Convenience wrappers for DI frameworks such as FastAPI
    # ---------------------------------------------------------------------
    def get_db(self) -> Iterator[Session]:
        SessionLocal = self.get_postgres_session()
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    async def get_db_async(self) -> AsyncIterator[AsyncSession]:
        async for sess in self.get_async_session():
            yield sess

    def get_redis(self) -> redis.Redis:
        return self.get_redis_client()

    def get_mongo(self) -> MongoClient:
        return self.get_mongo_client()

    async def get_mongo_async(self):
        return self.get_mongo_async_client()


# Global singleton instance exposed for convenience 

db_manager = DatabaseManager()

# Convenience wrappers mirroring the legacy interface

def get_db():
    """Yield a synchronous SQLAlchemy session."""
    yield from db_manager.get_db()


async def get_db_async():
    """Yield an asynchronous SQLAlchemy session."""
    async for sess in db_manager.get_db_async():
        yield sess


def get_redis():
    return db_manager.get_redis()


def get_mongo():
    return db_manager.get_mongo()


async def get_mongo_async():
    return await db_manager.get_mongo_async()


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
] 