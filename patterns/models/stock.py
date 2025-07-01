"""
Stock data models
"""

from datetime import datetime
from utils.logger import get_logger

logger = get_logger(__name__)

class Stock:
    """Stock data model"""
    
    def __init__(self, symbol, name=None, sector=None, industry=None):
        """
        Initialize Stock
        
        Args:
            symbol: Stock symbol
            name: Company name
            sector: Company sector
            industry: Company industry
        """
        self.symbol = symbol
        self.name = name
        self.sector = sector
        self.industry = industry
        self.last_price = None
        self.last_update = None
        self.signals = []
        self.patterns = []
        self.indicators = {}
        self.fundamentals = {}
    
    def update_price(self, price):
        """
        Update last price
        
        Args:
            price: Last price
        """
        self.last_price = price
        self.last_update = datetime.now()
    
    def add_signal(self, signal_type, strategy, entry_price, stop_loss, target, timestamp=None):
        """
        Add trading signal
        
        Args:
            signal_type: Signal type (buy, sell)
            strategy: Strategy name
            entry_price: Entry price
            stop_loss: Stop loss price
            target: Target price
            timestamp: Signal timestamp (default: now)
        """
        if timestamp is None:
            timestamp = datetime.now()
        
        signal = {
            "type": signal_type,
            "strategy": strategy,
            "entry_price": entry_price,
            "stop_loss": stop_loss,
            "target": target,
            "timestamp": timestamp,
            "active": True
        }
        
        self.signals.append(signal)
    
    def add_pattern(self, pattern_name, pattern_type, timestamp=None):
        """
        Add detected pattern
        
        Args:
            pattern_name: Pattern name
            pattern_type: Pattern type (bullish, bearish, neutral)
            timestamp: Pattern timestamp (default: now)
        """
        if timestamp is None:
            timestamp = datetime.now()
        
        pattern = {
            "name": pattern_name,
            "type": pattern_type,
            "timestamp": timestamp
        }
        
        self.patterns.append(pattern)
    
    def update_indicators(self, indicators):
        """
        Update technical indicators
        
        Args:
            indicators: Dictionary of indicators
        """
        self.indicators = indicators
    
    def update_fundamentals(self, fundamentals):
        """
        Update fundamental data
        
        Args:
            fundamentals: Dictionary of fundamental data
        """
        self.fundamentals = fundamentals
    
    def to_dict(self):
        """
        Convert to dictionary
        
        Returns:
            Dictionary representation
        """
        return {
            "symbol": self.symbol,
            "name": self.name,
            "sector": self.sector,
            "industry": self.industry,
            "last_price": self.last_price,
            "last_update": self.last_update.isoformat() if self.last_update else None,
            "signals": self.signals,
            "patterns": self.patterns,
            "indicators": self.indicators,
            "fundamentals": self.fundamentals
        }
    
    @classmethod
    def from_dict(cls, data):
        """
        Create from dictionary
        
        Args:
            data: Dictionary data
        
        Returns:
            Stock instance
        """
        stock = cls(
            symbol=data["symbol"],
            name=data.get("name"),
            sector=data.get("sector"),
            industry=data.get("industry")
        )
        
        stock.last_price = data.get("last_price")
        
        if data.get("last_update"):
            stock.last_update = datetime.fromisoformat(data["last_update"])
        
        stock.signals = data.get("signals", [])
        stock.patterns = data.get("patterns", [])
        stock.indicators = data.get("indicators", {})
        stock.fundamentals = data.get("fundamentals", {})
        
        return stock 