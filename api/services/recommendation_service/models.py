"""
Models for recommendation service.
"""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime

class PageType(str, Enum):
    LONG_TERM = "longterm"
    SWING = "swing"
    SHORT_TERM = "shortterm"
    INTRADAY_BUY = "intraday_buy"
    INTRADAY_SELL = "intraday_sell"
    CUSTOM = "custom"

class RecommendationStrategy(str, Enum):
    LONGTERM = "longterm"
    SWING = "swing"
    SHORTTERM = "shortterm"
    INTRADAY = "intraday"
    CUSTOM = "custom"

class StockRecommendation(BaseModel):
    symbol: str
    name: str
    price: float
    score: float
    per_change: float = 0.0
    volume: int = 0
    recommendation_type: str
    appearances: int = 1
    category_count: int = 0
    categories: List[str] = []
    momentum: bool = False
    breakout: bool = False
    reversal: bool = False
    sector_rotation: bool = False
    fundamental: bool = False
    value: bool = False
    quality: bool = False
    indicators: Dict = {}
    fundamental_metrics: Dict = {}

class RecommendationRequest(BaseModel):
    combination: Optional[Dict[str, str]] = None
    limit_per_query: Optional[int] = 50
    min_score: Optional[float] = 25.0
    top_recommendations: Optional[int] = 20
    force_refresh: Optional[bool] = False

class RecommendationMetadata(BaseModel):
    combination_used: Dict = {}
    performance_metrics: Dict = {}
    category_breakdown: Dict = {}
    total_recommendations: int = 0
    processing_time_seconds: float = 0
    algorithm_info: Dict = {}
    timestamp: str = datetime.now().isoformat()
    market_status: str = "unknown"

class RecommendationResponse(BaseModel):
    recommendations: List[StockRecommendation]
    metadata: RecommendationMetadata
    status: str = "success"
    error: Optional[str] = None
    details: Optional[str] = None 