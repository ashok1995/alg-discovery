"""common.db.repository

A thin, opinionated CRUD layer that standardises database interactions across
services.  The goal is to minimise direct coupling to raw drivers (Motor/
PyMongo, SQLAlchemy, etc.) from business-logic modules.

Usage example – MongoDB::

    from common.db import db_manager
    from common.db.repository import MongoRepository

    repo = MongoRepository("market_data")
    repo.insert_many([...])

Usage example – SQLAlchemy::

    from common.db.repository import SQLAlchemyRepository
    repo = SQLAlchemyRepository(SessionLocal, MyModel)
    repo.insert(obj)
"""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional, Sequence, Type, TypeVar, Union, Generic, Iterator

from pymongo.collection import Collection  # type: ignore
from sqlalchemy.orm import Session
from sqlalchemy import insert as sa_insert, update as sa_update, delete as sa_delete, select as sa_select

from common.db import db_manager

T = TypeVar("T")  # SQLAlchemy model generic


# ---------------------------------------------------------------------------
# Base interface
# ---------------------------------------------------------------------------
class BaseRepository:
    """Very small CRUD surface; extend as needed."""

    def insert(self, obj: Any) -> Any:  # noqa: D401
        """Insert a single record and return driver-specific result."""
        raise NotImplementedError

    def insert_many(self, objs: Sequence[Any]) -> Any:  # noqa: D401
        """Bulk-insert records."""
        raise NotImplementedError

    def update(self, identifier: Any, changes: Dict[str, Any]) -> Any:  # noqa: D401
        """Partial update of a single record."""
        raise NotImplementedError

    def delete(self, identifier: Any) -> Any:  # noqa: D401
        """Delete by id or filter."""
        raise NotImplementedError

    def find(self, **filters) -> Iterable[Any]:  # noqa: D401
        """Simple find/filter helper."""
        raise NotImplementedError


# ---------------------------------------------------------------------------
# MongoDB implementation
# ---------------------------------------------------------------------------
class MongoRepository(BaseRepository):
    def __init__(self, collection_name: str, db_name: Optional[str] = None, *, client=None):
        client = client or db_manager.get_mongo_client()
        database = client[db_name or db_manager.config.mongo_db]
        self.collection: Collection = database[collection_name]

    # Single-record helpers -------------------------------------------------
    def insert(self, doc: Dict[str, Any]):  # type: ignore[override]
        return self.collection.insert_one(doc)

    def update(self, identifier: Dict[str, Any], changes: Dict[str, Any]):  # type: ignore[override]
        return self.collection.update_one(identifier, {"$set": changes})

    def delete(self, identifier: Dict[str, Any]):  # type: ignore[override]
        return self.collection.delete_one(identifier)

    def find(self, **filters):  # type: ignore[override]
        return self.collection.find(filters)

    # Bulk helpers ----------------------------------------------------------
    def insert_many(self, docs: Sequence[Dict[str, Any]]):  # type: ignore[override]
        return self.collection.insert_many(list(docs))

    def delete_many(self, query: Dict[str, Any]):
        return self.collection.delete_many(query)


# ---------------------------------------------------------------------------
# SQLAlchemy implementation
# ---------------------------------------------------------------------------
class SQLAlchemyRepository(Generic[T], BaseRepository):
    def __init__(self, session_factory: Union[Session, Any], model: Type[T]):
        """``session_factory`` can be a Session *instance* or a sessionmaker."""
        self._session_factory = session_factory
        self.model = model

    def _get_session(self) -> Session:
        sess = self._session_factory() if callable(self._session_factory) else self._session_factory
        assert isinstance(sess, Session)
        return sess

    # CRUD ops --------------------------------------------------------------
    def insert(self, obj: Union[T, Dict[str, Any]]):  # type: ignore[override]
        with self._get_session() as session:
            if isinstance(obj, dict):
                stmt = sa_insert(self.model).values(**obj)
                result = session.execute(stmt)
            else:
                session.add(obj)  # type: ignore[arg-type]
                session.flush()
                result = obj
            session.commit()
            return result

    def insert_many(self, objs: Sequence[Union[T, Dict[str, Any]]]):  # type: ignore[override]
        with self._get_session() as session:
            mapped = [o if isinstance(o, self.model) else self.model(**o) for o in objs]  # type: ignore[arg-type]
            session.add_all(mapped)
            session.commit()
            return mapped

    def update(self, identifier: Any, changes: Dict[str, Any]):  # type: ignore[override]
        with self._get_session() as session:
            stmt = sa_update(self.model).where(self.model.id == identifier).values(**changes)
            result = session.execute(stmt)
            session.commit()
            return result.rowcount

    def delete(self, identifier: Any):  # type: ignore[override]
        with self._get_session() as session:
            stmt = sa_delete(self.model).where(self.model.id == identifier)
            result = session.execute(stmt)
            session.commit()
            return result.rowcount

    def find(self, **filters):  # type: ignore[override]
        with self._get_session() as session:
            stmt = sa_select(self.model).filter_by(**filters)
            return session.execute(stmt).scalars().all()


# ---------------------------------------------------------------------------
# Async-Motor implementation (for domains that need non-blocking Mongo access)
# ---------------------------------------------------------------------------
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection  # type: ignore


class AsyncMongoRepository(BaseRepository):
    """Non-blocking CRUD wrapper around a Motor collection."""

    def __init__(
        self,
        collection_name: str,
        db_name: Optional[str] = None,
        *,
        client: Optional[AsyncIOMotorClient] = None,
    ):
        client = client or db_manager.get_mongo_async_client()
        database = client[db_name or db_manager.config.mongo_db]
        self.collection: AsyncIOMotorCollection = database[collection_name]

    # Async helpers ---------------------------------------------------------
    async def insert(self, doc: Dict[str, Any]):  # type: ignore[override]
        return await self.collection.insert_one(doc)

    async def insert_many(self, docs: Sequence[Dict[str, Any]]):  # type: ignore[override]
        return await self.collection.insert_many(list(docs))

    async def update(self, filt: Dict[str, Any], changes: Dict[str, Any]):  # type: ignore[override]
        return await self.collection.update_one(filt, {"$set": changes})

    async def delete(self, filt: Dict[str, Any]):  # type: ignore[override]
        return await self.collection.delete_one(filt)

    async def delete_many(self, filt: Dict[str, Any]):
        return await self.collection.delete_many(filt)

    def find(self, **filters):  # type: ignore[override]
        return self.collection.find(filters)

    def aggregate(self, pipeline):
        return self.collection.aggregate(pipeline)


__all__ = [
    "BaseRepository",
    "MongoRepository",
    "SQLAlchemyRepository",
]
__all__.extend(["AsyncMongoRepository"]) 