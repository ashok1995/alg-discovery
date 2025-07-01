"""
Risk Management Configuration
===========================

Configuration for risk management and position sizing parameters.
"""

import os
from typing import Dict, List, Optional

class RiskManagement:
    """Risk management configuration and parameters."""
    
    def __init__(self):
        # Position Sizing
        self.position_sizing = {
            "method": os.getenv("POSITION_SIZING_METHOD", "fixed_percent"),  # fixed_percent, volatility_adjusted, kelly
            "default_position_size": float(os.getenv("DEFAULT_POSITION_SIZE", "10000")),  # USD
            "max_position_size": float(os.getenv("MAX_POSITION_SIZE", "50000")),  # USD
            "position_size_percent": float(os.getenv("POSITION_SIZE_PERCENT", "2.0")),  # % of portfolio
            "min_position_size": float(os.getenv("MIN_POSITION_SIZE", "1000")),  # USD
            "volatility_lookback": int(os.getenv("VOLATILITY_LOOKBACK", "20"))  # days
        }
        
        # Portfolio Risk Limits
        self.portfolio_limits = {
            "max_portfolio_risk": float(os.getenv("MAX_PORTFOLIO_RISK", "10.0")),  # % of portfolio
            "max_sector_concentration": float(os.getenv("MAX_SECTOR_CONCENTRATION", "25.0")),  # %
            "max_single_position": float(os.getenv("MAX_SINGLE_POSITION", "5.0")),  # % of portfolio
            "max_correlated_positions": float(os.getenv("MAX_CORRELATED_POSITIONS", "15.0")),  # %
            "correlation_threshold": float(os.getenv("CORRELATION_THRESHOLD", "0.7")),
            "max_daily_trades": int(os.getenv("MAX_DAILY_TRADES", "20")),
            "max_open_positions": int(os.getenv("MAX_OPEN_POSITIONS", "10"))
        }
        
        # Stop Loss Configuration
        self.stop_loss = {
            "enabled": os.getenv("STOP_LOSS_ENABLED", "true").lower() == "true",
            "default_stop_loss_percent": float(os.getenv("DEFAULT_STOP_LOSS_PERCENT", "2.0")),
            "max_stop_loss_percent": float(os.getenv("MAX_STOP_LOSS_PERCENT", "5.0")),
            "trailing_stop_enabled": os.getenv("TRAILING_STOP_ENABLED", "true").lower() == "true",
            "trailing_stop_percent": float(os.getenv("TRAILING_STOP_PERCENT", "1.5")),
            "atr_stop_multiplier": float(os.getenv("ATR_STOP_MULTIPLIER", "2.0")),
            "time_based_stop": os.getenv("TIME_BASED_STOP", "false").lower() == "true",
            "max_holding_days": int(os.getenv("MAX_HOLDING_DAYS", "30"))
        }
        
        # Take Profit Configuration
        self.take_profit = {
            "enabled": os.getenv("TAKE_PROFIT_ENABLED", "true").lower() == "true",
            "default_take_profit_percent": float(os.getenv("DEFAULT_TAKE_PROFIT_PERCENT", "4.0")),
            "partial_profit_enabled": os.getenv("PARTIAL_PROFIT_ENABLED", "true").lower() == "true",
            "partial_profit_levels": [
                float(os.getenv("PARTIAL_PROFIT_LEVEL_1", "2.0")),
                float(os.getenv("PARTIAL_PROFIT_LEVEL_2", "3.5")),
                float(os.getenv("PARTIAL_PROFIT_LEVEL_3", "5.0"))
            ],
            "partial_profit_percentages": [
                float(os.getenv("PARTIAL_PROFIT_PERCENT_1", "33.0")),
                float(os.getenv("PARTIAL_PROFIT_PERCENT_2", "33.0")),
                float(os.getenv("PARTIAL_PROFIT_PERCENT_3", "34.0"))
            ],
            "risk_reward_ratio": float(os.getenv("RISK_REWARD_RATIO", "2.0"))
        }
        
        # Daily Loss Limits
        self.daily_limits = {
            "max_daily_loss": float(os.getenv("MAX_DAILY_LOSS", "5000")),  # USD
            "max_daily_loss_percent": float(os.getenv("MAX_DAILY_LOSS_PERCENT", "3.0")),  # % of portfolio
            "consecutive_loss_limit": int(os.getenv("CONSECUTIVE_LOSS_LIMIT", "3")),
            "daily_drawdown_limit": float(os.getenv("DAILY_DRAWDOWN_LIMIT", "2.0")),  # %
            "circuit_breaker_enabled": os.getenv("CIRCUIT_BREAKER_ENABLED", "true").lower() == "true",
            "circuit_breaker_threshold": float(os.getenv("CIRCUIT_BREAKER_THRESHOLD", "1.0")),  # %
            "cooling_off_period": int(os.getenv("COOLING_OFF_PERIOD", "60"))  # minutes
        }
        
        # Volatility Management
        self.volatility_management = {
            "max_volatility_threshold": float(os.getenv("MAX_VOLATILITY_THRESHOLD", "0.04")),  # 4%
            "volatility_adjustment_enabled": os.getenv("VOLATILITY_ADJUSTMENT_ENABLED", "true").lower() == "true",
            "volatility_lookback_period": int(os.getenv("VOLATILITY_LOOKBACK_PERIOD", "20")),
            "low_volatility_threshold": float(os.getenv("LOW_VOLATILITY_THRESHOLD", "0.01")),  # 1%
            "high_volatility_threshold": float(os.getenv("HIGH_VOLATILITY_THRESHOLD", "0.03")),  # 3%
            "volatility_position_scaling": os.getenv("VOLATILITY_POSITION_SCALING", "true").lower() == "true"
        }
        
        # Market Condition Adjustments
        self.market_conditions = {
            "bear_market_max_exposure": float(os.getenv("BEAR_MARKET_MAX_EXPOSURE", "50.0")),  # %
            "bull_market_max_exposure": float(os.getenv("BULL_MARKET_MAX_EXPOSURE", "90.0")),  # %
            "sideways_market_max_exposure": float(os.getenv("SIDEWAYS_MARKET_MAX_EXPOSURE", "70.0")),  # %
            "market_regime_detection": os.getenv("MARKET_REGIME_DETECTION", "true").lower() == "true",
            "regime_lookback_period": int(os.getenv("REGIME_LOOKBACK_PERIOD", "60")),  # days
            "trend_strength_threshold": float(os.getenv("TREND_STRENGTH_THRESHOLD", "0.6"))
        }
        
        # Liquidity Requirements
        self.liquidity_requirements = {
            "min_avg_volume": int(os.getenv("MIN_AVG_VOLUME", "100000")),  # shares
            "min_dollar_volume": float(os.getenv("MIN_DOLLAR_VOLUME", "1000000")),  # USD
            "volume_lookback_period": int(os.getenv("VOLUME_LOOKBACK_PERIOD", "20")),  # days
            "liquidity_buffer": float(os.getenv("LIQUIDITY_BUFFER", "0.1")),  # % of avg volume
            "max_position_vs_volume": float(os.getenv("MAX_POSITION_VS_VOLUME", "5.0"))  # % of daily volume
        }
        
        # Emergency Procedures
        self.emergency_procedures = {
            "emergency_stop_enabled": os.getenv("EMERGENCY_STOP_ENABLED", "true").lower() == "true",
            "auto_liquidation_enabled": os.getenv("AUTO_LIQUIDATION_ENABLED", "false").lower() == "true",
            "emergency_contacts": os.getenv("EMERGENCY_CONTACTS", "").split(","),
            "max_system_downtime": int(os.getenv("MAX_SYSTEM_DOWNTIME", "300")),  # seconds
            "backup_system_enabled": os.getenv("BACKUP_SYSTEM_ENABLED", "false").lower() == "true"
        }
        
        # Monitoring and Alerts
        self.monitoring = {
            "real_time_monitoring": os.getenv("REAL_TIME_MONITORING", "true").lower() == "true",
            "alert_on_limit_breach": os.getenv("ALERT_ON_LIMIT_BREACH", "true").lower() == "true",
            "performance_tracking": os.getenv("PERFORMANCE_TRACKING", "true").lower() == "true",
            "daily_reports": os.getenv("DAILY_REPORTS", "true").lower() == "true",
            "weekly_reports": os.getenv("WEEKLY_REPORTS", "true").lower() == "true",
            "risk_dashboard_enabled": os.getenv("RISK_DASHBOARD_ENABLED", "true").lower() == "true"
        }
    
    def calculate_position_size(self, account_value: float, risk_percent: float, stop_loss_percent: float) -> float:
        """Calculate position size based on risk parameters."""
        if self.position_sizing["method"] == "fixed_percent":
            position_size = account_value * (self.position_sizing["position_size_percent"] / 100)
        elif self.position_sizing["method"] == "volatility_adjusted":
            # Simplified volatility adjustment
            base_size = account_value * (self.position_sizing["position_size_percent"] / 100)
            volatility_factor = min(2.0, max(0.5, 2.0 / (stop_loss_percent + 1.0)))
            position_size = base_size * volatility_factor
        else:  # default to fixed amount
            position_size = self.position_sizing["default_position_size"]
        
        # Apply limits
        position_size = max(self.position_sizing["min_position_size"], position_size)
        position_size = min(self.position_sizing["max_position_size"], position_size)
        
        return position_size
    
    def is_position_allowed(self, symbol: str, position_value: float, current_positions: Dict) -> bool:
        """Check if a new position is allowed based on risk limits."""
        # Check maximum single position limit
        account_value = sum(pos.get("value", 0) for pos in current_positions.values())
        if account_value > 0:
            position_percent = (position_value / account_value) * 100
            if position_percent > self.portfolio_limits["max_single_position"]:
                return False
        
        # Check maximum open positions
        if len(current_positions) >= self.portfolio_limits["max_open_positions"]:
            return False
        
        return True
    
    def calculate_stop_loss(self, entry_price: float, is_long: bool, atr_value: Optional[float] = None) -> float:
        """Calculate stop loss price."""
        if atr_value and self.stop_loss["atr_stop_multiplier"]:
            stop_distance = atr_value * self.stop_loss["atr_stop_multiplier"]
        else:
            stop_distance = entry_price * (self.stop_loss["default_stop_loss_percent"] / 100)
        
        if is_long:
            return entry_price - stop_distance
        else:
            return entry_price + stop_distance
    
    def calculate_take_profit(self, entry_price: float, stop_loss_price: float, is_long: bool) -> float:
        """Calculate take profit price based on risk-reward ratio."""
        risk = abs(entry_price - stop_loss_price)
        reward = risk * self.take_profit["risk_reward_ratio"]
        
        if is_long:
            return entry_price + reward
        else:
            return entry_price - reward
    
    def check_daily_limits(self, current_pnl: float, trades_today: int) -> Dict[str, bool]:
        """Check if daily limits are breached."""
        return {
            "max_loss_breached": current_pnl <= -self.daily_limits["max_daily_loss"],
            "max_trades_breached": trades_today >= self.portfolio_limits["max_daily_trades"],
            "circuit_breaker_triggered": (
                self.daily_limits["circuit_breaker_enabled"] and 
                current_pnl <= -self.daily_limits["circuit_breaker_threshold"]
            )
        }
    
    def get_risk_metrics(self) -> Dict:
        """Get risk management metrics summary."""
        return {
            "position_sizing_method": self.position_sizing["method"],
            "max_portfolio_risk": self.portfolio_limits["max_portfolio_risk"],
            "max_daily_loss": self.daily_limits["max_daily_loss"],
            "stop_loss_enabled": self.stop_loss["enabled"],
            "take_profit_enabled": self.take_profit["enabled"],
            "max_open_positions": self.portfolio_limits["max_open_positions"],
            "circuit_breaker_enabled": self.daily_limits["circuit_breaker_enabled"],
            "emergency_stop_enabled": self.emergency_procedures["emergency_stop_enabled"],
            "real_time_monitoring": self.monitoring["real_time_monitoring"]
        }
    
    def validate_risk_parameters(self) -> Dict[str, List[str]]:
        """Validate risk management parameters."""
        warnings = []
        errors = []
        
        # Check stop loss vs take profit
        if (self.stop_loss["default_stop_loss_percent"] * 
            self.take_profit["risk_reward_ratio"]) > 10.0:
            warnings.append("Risk-reward ratio may result in very wide take profit levels")
        
        # Check position sizing
        if self.position_sizing["max_position_size"] < self.position_sizing["min_position_size"]:
            errors.append("Maximum position size cannot be less than minimum position size")
        
        # Check portfolio limits
        if self.portfolio_limits["max_single_position"] > self.portfolio_limits["max_portfolio_risk"]:
            warnings.append("Maximum single position exceeds maximum portfolio risk")
        
        return {"warnings": warnings, "errors": errors} 