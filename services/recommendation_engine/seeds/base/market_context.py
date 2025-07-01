from dataclasses import dataclass
from typing import Dict, Any, List, Optional
from datetime import datetime, time
import logging

logger = logging.getLogger(__name__)

@dataclass
class IntradayContext:
    """Specific context for intraday trading"""
    time_of_day: time
    session_high: float
    session_low: float
    session_volume: int
    opening_gap: float  # Gap from previous close
    pre_market_sentiment: str  # 'positive', 'negative', 'neutral'
    major_events: List[str]  # List of major events/news
    expiry_week: bool  # Is it expiry week?

@dataclass
class TechnicalContext:
    """Technical analysis context"""
    trend_strength: float  # 0-1 scale
    support_levels: List[float]
    resistance_levels: List[float]
    volume_profile: Dict[float, int]  # Price -> Volume
    momentum_strength: float  # 0-1 scale
    volatility_percentile: float  # Historical volatility percentile

class MarketContextBuilder:
    """Builder class for creating market context"""
    
    def __init__(self):
        self.context_data = {}
        
    def with_basic_market_data(
        self,
        nifty_change: float,
        bank_nifty_change: float,
        volatility_index: float
    ) -> 'MarketContextBuilder':
        """Add basic market data"""
        self.context_data.update({
            'nifty_change': nifty_change,
            'bank_nifty_change': bank_nifty_change,
            'volatility_index': volatility_index
        })
        return self
        
    def with_sector_performance(
        self,
        sector_performance: Dict[str, float]
    ) -> 'MarketContextBuilder':
        """Add sector performance data"""
        self.context_data['sector_performance'] = sector_performance
        return self
        
    def with_intraday_context(
        self,
        intraday_context: IntradayContext
    ) -> 'MarketContextBuilder':
        """Add intraday specific context"""
        self.context_data['intraday_context'] = intraday_context
        return self
        
    def build(self) -> 'MarketContext':
        """Build the market context"""
        from .seeder_interface import MarketContext
        
        # Determine market trend based on indices
        nifty_change = self.context_data.get('nifty_change', 0)
        bank_nifty_change = self.context_data.get('bank_nifty_change', 0)
        
        if nifty_change > 0.5 and bank_nifty_change > 0.5:
            market_trend = 'bullish'
        elif nifty_change < -0.5 and bank_nifty_change < -0.5:
            market_trend = 'bearish'
        else:
            market_trend = 'sideways'
            
        # Calculate advance decline ratio (placeholder)
        advance_decline_ratio = 1.2 if market_trend == 'bullish' else 0.8
        
        return MarketContext(
            timestamp=datetime.now(),
            market_trend=market_trend,
            volatility_index=self.context_data.get('volatility_index', 15.0),
            sector_performance=self.context_data.get('sector_performance', {}),
            market_cap_preference='all',
            volume_threshold=100000,
            liquidity_requirement=0.1,
            nifty_change=nifty_change,
            bank_nifty_change=bank_nifty_change,
            advance_decline_ratio=advance_decline_ratio
        ) 