"""
Risk Management Configuration
============================

Configuration for risk management parameters and position sizing.
"""

import os

class RiskManagement:
    """Risk management configuration settings."""
    
    def __init__(self):
        # Position sizing
        self.max_position_size = float(os.getenv("MAX_POSITION_SIZE", "10000"))
        self.max_daily_loss = float(os.getenv("MAX_DAILY_LOSS", "5000"))
        self.max_portfolio_risk = float(os.getenv("MAX_PORTFOLIO_RISK", "0.02"))
        
        # Stop loss and take profit
        self.default_stop_loss_percent = float(os.getenv("DEFAULT_STOP_LOSS", "0.05"))
        self.default_take_profit_ratio = float(os.getenv("DEFAULT_TAKE_PROFIT_RATIO", "2.0"))
        
        # Portfolio limits
        self.max_open_positions = int(os.getenv("MAX_OPEN_POSITIONS", "10"))
        self.max_positions_per_sector = int(os.getenv("MAX_POSITIONS_PER_SECTOR", "3"))
        self.max_correlation_threshold = float(os.getenv("MAX_CORRELATION", "0.7"))
        
        # Risk thresholds
        self.min_signal_strength = float(os.getenv("MIN_SIGNAL_STRENGTH", "60"))
        self.min_signal_confidence = float(os.getenv("MIN_SIGNAL_CONFIDENCE", "0.7"))
        self.max_drawdown_limit = float(os.getenv("MAX_DRAWDOWN", "0.15"))
        
        # Position sizing methods
        self.position_sizing_method = os.getenv("POSITION_SIZING_METHOD", "fixed_risk")
        self.risk_per_trade = float(os.getenv("RISK_PER_TRADE", "0.01"))  # 1% of portfolio
        
        # Emergency stops
        self.emergency_stop_loss = float(os.getenv("EMERGENCY_STOP_LOSS", "0.20"))  # 20% loss
        self.circuit_breaker_threshold = float(os.getenv("CIRCUIT_BREAKER", "0.10"))  # 10% daily loss
        
        # Volatility adjustments
        self.volatility_adjustment_enabled = os.getenv("VOLATILITY_ADJUSTMENT", "true").lower() == "true"
        self.min_volatility_multiplier = float(os.getenv("MIN_VOLATILITY_MULT", "0.5"))
        self.max_volatility_multiplier = float(os.getenv("MAX_VOLATILITY_MULT", "2.0"))
    
    def calculate_position_size(self, account_balance: float, entry_price: float, 
                              stop_loss_price: float) -> float:
        """Calculate position size based on risk management rules."""
        if self.position_sizing_method == "fixed_risk":
            risk_amount = account_balance * self.risk_per_trade
            price_risk = abs(entry_price - stop_loss_price)
            if price_risk > 0:
                position_size = risk_amount / price_risk
                return min(position_size, self.max_position_size)
        
        return self.max_position_size
    
    def is_position_allowed(self, current_positions: int, sector_positions: int) -> bool:
        """Check if a new position is allowed based on limits."""
        return (current_positions < self.max_open_positions and 
                sector_positions < self.max_positions_per_sector)
    
    def should_trigger_emergency_stop(self, portfolio_loss_percent: float) -> bool:
        """Check if emergency stop should be triggered."""
        return portfolio_loss_percent >= self.emergency_stop_loss
    
    def should_trigger_circuit_breaker(self, daily_loss_percent: float) -> bool:
        """Check if circuit breaker should be triggered."""
        return daily_loss_percent >= self.circuit_breaker_threshold
    
    def get_risk_config_summary(self) -> dict:
        """Get risk management configuration summary."""
        return {
            "max_position_size": self.max_position_size,
            "max_daily_loss": self.max_daily_loss,
            "max_portfolio_risk": self.max_portfolio_risk,
            "max_open_positions": self.max_open_positions,
            "position_sizing_method": self.position_sizing_method,
            "risk_per_trade": self.risk_per_trade,
            "default_stop_loss": self.default_stop_loss_percent,
            "emergency_stop_loss": self.emergency_stop_loss,
            "circuit_breaker": self.circuit_breaker_threshold
        } 