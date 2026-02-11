"""domains.recommendations.repositories"""

from __future__ import annotations

from common.db.repository import AsyncMongoRepository


class RecoBatchRepository(AsyncMongoRepository):
    def __init__(self):
        super().__init__("recommendation_batches")

    async def latest(self, limit: int = 20):
        cursor = self.collection.find().sort("generated_at", -1).limit(limit)
        return [doc async for doc in cursor]


class RecoRepository(AsyncMongoRepository):
    def __init__(self):
        super().__init__("individual_recommendations")

    async def by_symbol(self, symbol: str, limit: int = 50):
        cursor = (
            self.collection.find({"symbol": symbol})
            .sort("generated_at", -1)
            .limit(limit)
        )
        return [doc async for doc in cursor]


__all__ = ["RecoBatchRepository", "RecoRepository"] 