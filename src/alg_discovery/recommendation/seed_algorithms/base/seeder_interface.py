from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

class TradingTheme(Enum):
    """Trading themes for stock recommendations"""
    INTRADAY_BUY = "intraday_buy"
    INTRADAY_SELL = "intraday_sell"
    SWING_BUY = "swing_buy"
    SHORT_TERM_BUY = "short_term_buy"
    LONG_BUY = "long_buy"

@dataclass
class MarketContext:
    """Market context information for seeding algorithms"""
    timestamp: datetime
    market_trend: str  # 'bullish', 'bearish', 'sideways'
    volatility_index: float  # VIX or equivalent
    sector_performance: Dict[str, float]  # Sector-wise performance
    market_cap_preference: str  # 'large', 'mid', 'small', 'all'
    volume_threshold: float  # Minimum volume requirement
    liquidity_requirement: float  # Minimum liquidity requirement
    nifty_change: float  # Nifty percentage change
    bank_nifty_change: float  # Bank Nifty percentage change
    advance_decline_ratio: float  # Market breadth indicator

@dataclass
class StockCandidate:
    """Stock candidate with metadata"""
    symbol: str
    name: str
    sector: str
    market_cap: float
    current_price: float
    seed_score: float  # Score from seed algorithm (0-1)
    confidence: float  # Confidence in the signal (0-1)
    theme: TradingTheme
    entry_criteria: Dict[str, Any]
    exit_criteria: Dict[str, Any]
    risk_metrics: Dict[str, float]
    technical_indicators: Dict[str, float]
    metadata: Dict[str, Any]

class SeederInterface(ABC):
    """Base interface for all seeding algorithms"""
    
    @abstractmethod
    def generate_candidates(
        self, 
        market_context: MarketContext,
        max_candidates: int = 50
    ) -> List[StockCandidate]:
        """Generate stock candidates based on theme criteria"""
        pass
    
    @abstractmethod
    def validate_context(self, market_context: MarketContext) -> bool:
        """Validate if market context is suitable for this theme"""
        pass
    
    @abstractmethod
    def get_theme_name(self) -> str:
        """Return the theme name"""
        pass
    
    @abstractmethod
    def get_required_indicators(self) -> List[str]:
        """Return list of required technical indicators"""
        pass 