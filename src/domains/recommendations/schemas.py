"""domains.recommendations.schemas"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class RecoPublic(BaseModel):
    id: Optional[UUID] = Field(None, alias="_id")
    symbol: str
    score: float
    strategy: str
    generated_at: datetime

    class Config:
        allow_population_by_field_name = True


class RecoBatchPublic(BaseModel):
    batch_id: str
    strategy: str
    generated_at: datetime
    total_recommendations: int


class RecoList(BaseModel):
    recommendations: List[RecoPublic]


class BatchList(BaseModel):
    batches: List[RecoBatchPublic]


__all__ = [
    "RecoPublic",
    "RecoBatchPublic",
    "RecoList",
    "BatchList",
] 