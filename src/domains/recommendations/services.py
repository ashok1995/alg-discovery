"""domains.recommendations.services"""

from __future__ import annotations

from typing import List

from .repositories import RecoBatchRepository, RecoRepository


class RecommendationService:
    """Stateless business logic for fetching recommendations."""

    def __init__(self, batch_repo: RecoBatchRepository | None = None, reco_repo: RecoRepository | None = None):
        self._batch_repo = batch_repo or RecoBatchRepository()
        self._reco_repo = reco_repo or RecoRepository()

    # ── public API ─────────────────────────────────────────────────────
    async def latest_batches(self, limit: int = 20):
        return await self._batch_repo.latest(limit)

    async def recommendations_for_symbol(self, symbol: str, limit: int = 50):
        return await self._reco_repo.by_symbol(symbol, limit) 