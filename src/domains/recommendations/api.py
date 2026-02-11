"""domains.recommendations.api"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from .schemas import RecoList, BatchList, RecoPublic, RecoBatchPublic
from .services import RecommendationService

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def get_service() -> RecommendationService:
    return RecommendationService()


@router.get("/latest", response_model=BatchList)
async def latest_batches(limit: int = 20, svc: RecommendationService = Depends(get_service)):
    batches = await svc.latest_batches(limit)
    return {"batches": [RecoBatchPublic(**b) for b in batches]}


@router.get("/{symbol}", response_model=RecoList)
async def by_symbol(symbol: str, limit: int = 50, svc: RecommendationService = Depends(get_service)):
    recs = await svc.recommendations_for_symbol(symbol, limit)
    return {"recommendations": [RecoPublic(**r) for r in recs]} 