"""Shared SQLAlchemy database utilities.

This package centralises engine/session creation so that *alg_discovery*,
*alg_orders*, *alg_backtesting* (and any future services) can all import the
same `SessionLocal` and `Base`.

Typical usage in a service module::

    from common.db import SessionLocal, Base

    class MyModel(Base):
        __tablename__ = "my_table"
        id = Column(Integer, primary_key=True)

    async def get_items():
        async with SessionLocal() as session:
            result = await session.execute(select(MyModel))
            return result.scalars().all()
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import AsyncIterator, Iterator

# Expose the unified DatabaseManager and related helpers
from .manager import (
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

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# ---------------------------------------------------------------------------
# Declarative Base
# ---------------------------------------------------------------------------
Base = declarative_base()

# ---------------------------------------------------------------------------
# Engine / session helpers (sync + async)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _get_database_url() -> str:
    # Prioritise env var else default to local Postgres
    return os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/trading")


@lru_cache(maxsize=1)
def get_async_engine():
    return create_async_engine(_get_database_url(), pool_pre_ping=True, echo=False)


@lru_cache(maxsize=1)
def get_async_session_factory() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(bind=get_async_engine(), expire_on_commit=False)


async def get_async_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency example::

        async def route(dep_session: AsyncSession = Depends(get_async_session)):
            ...
    """
    async_session = get_async_session_factory()
    async with async_session() as session:  # type: AsyncSession
        yield session


# Synchronous helpers (if some legacy code still relies on them)
@lru_cache(maxsize=1)
def get_sync_engine():
    from sqlalchemy import create_engine  # local import
    url = _get_database_url().replace("+asyncpg", "")  # strip async driver
    return create_engine(url, pool_pre_ping=True, echo=False)


@lru_cache(maxsize=1)
def get_sync_session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_sync_engine(), expire_on_commit=False)


def get_sync_session() -> Iterator[Session]:
    session_factory = get_sync_session_factory()
    with session_factory() as sess:
        yield sess


__all__ = [
    "Base",
    "get_async_engine",
    "get_async_session_factory",
    "get_async_session",
    "get_sync_engine",
    "get_sync_session_factory",
    "get_sync_session",
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