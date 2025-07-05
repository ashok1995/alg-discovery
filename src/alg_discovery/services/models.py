"""
Shared models for AlgoDiscovery microservices.
"""

from typing import Dict, Optional
from pydantic import BaseModel
from enum import Enum

class PageType(str, Enum):
    """Supported page types for variant selection."""
    LONG_TERM = "long-term"
    SWING = "swing"
    SHORT_TERM = "short-term"
    INTRADAY_BUY = "intraday-buy"
    INTRADAY_SELL = "intraday-sell"
    CUSTOM = "custom"

class AlgorithmVariant(BaseModel):
    """Model for algorithm variant details."""
    name: str
    description: str
    query: str
    weight: float
    expected_results: int

class VariantResponse(BaseModel):
    """Response model for variant selection options."""
    fundamental: Dict[str, AlgorithmVariant]
    momentum: Dict[str, AlgorithmVariant]
    value: Dict[str, AlgorithmVariant]
    quality: Dict[str, AlgorithmVariant]
    default_combination: Dict[str, str]
    page_specific_weights: Optional[Dict[str, float]] = None

class SelectedCombination(BaseModel):
    """Model for selected algorithm combination."""
    fundamental: str
    momentum: str
    value: str
    quality: str
    page_type: Optional[PageType] = None

class IntradayVariantResponse(BaseModel):
    """Response model for intraday variant selection options."""
    momentum: Dict[str, AlgorithmVariant]
    reversal: Dict[str, AlgorithmVariant]
    technical: Dict[str, AlgorithmVariant]
    volume: Dict[str, AlgorithmVariant]
    default_combination: Optional[Dict[str, str]] = None
    page_specific_weights: Optional[Dict[str, float]] = None

class IntradaySelectedCombination(BaseModel):
    """Model for selected intraday algorithm combination."""
    momentum: str
    reversal: str
    technical: str
    volume: str 