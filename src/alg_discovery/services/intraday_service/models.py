"""
Shared models for Intraday Service.
"""

from typing import Optional
from pydantic import BaseModel

class IntradaySettings(BaseModel):
    """Model for intraday trading settings."""
    max_trades_per_day: int
    min_profit_target: float
    max_loss_per_trade: float
    trading_start_time: str
    trading_end_time: str
    cooldown_period: int
    risk_level: str

class RiskParameters(BaseModel):
    """Model for risk management parameters."""
    position_size: float
    stop_loss: float
    trailing_stop: Optional[float] = None
    take_profit: float
    max_holding_time: int 