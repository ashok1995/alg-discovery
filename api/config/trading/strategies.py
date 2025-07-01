"""
Trading Strategies Configuration
==============================

Configuration for trading strategies and algorithmic trading parameters.
"""

import os
from typing import Dict, List, Optional

class TradingStrategies:
    """Trading strategies configuration and parameters."""
    
    def __init__(self):
        # Strategy Enablement
        self.strategies_enabled = os.getenv("TRADING_STRATEGIES_ENABLED", "true").lower() == "true"
        
        # RSI Strategy Configuration
        self.rsi_strategy = {
            "enabled": os.getenv("RSI_STRATEGY_ENABLED", "true").lower() == "true",
            "period": int(os.getenv("RSI_PERIOD", "14")),
            "oversold_threshold": float(os.getenv("RSI_OVERSOLD", "30")),
            "overbought_threshold": float(os.getenv("RSI_OVERBOUGHT", "70")),
            "signal_threshold": float(os.getenv("RSI_SIGNAL_THRESHOLD", "5")),
            "cooldown_periods": int(os.getenv("RSI_COOLDOWN", "5")),
            "min_volume": int(os.getenv("RSI_MIN_VOLUME", "100000"))
        }
        
        # MACD Strategy Configuration
        self.macd_strategy = {
            "enabled": os.getenv("MACD_STRATEGY_ENABLED", "true").lower() == "true",
            "fast_period": int(os.getenv("MACD_FAST_PERIOD", "12")),
            "slow_period": int(os.getenv("MACD_SLOW_PERIOD", "26")),
            "signal_period": int(os.getenv("MACD_SIGNAL_PERIOD", "9")),
            "histogram_threshold": float(os.getenv("MACD_HISTOGRAM_THRESHOLD", "0.01")),
            "convergence_threshold": float(os.getenv("MACD_CONVERGENCE_THRESHOLD", "0.02")),
            "min_signal_strength": float(os.getenv("MACD_MIN_SIGNAL_STRENGTH", "0.5"))
        }
        
        # Bollinger Bands Strategy
        self.bollinger_strategy = {
            "enabled": os.getenv("BOLLINGER_STRATEGY_ENABLED", "true").lower() == "true",
            "period": int(os.getenv("BOLLINGER_PERIOD", "20")),
            "std_deviation": float(os.getenv("BOLLINGER_STD_DEV", "2.0")),
            "squeeze_threshold": float(os.getenv("BOLLINGER_SQUEEZE_THRESHOLD", "0.02")),
            "breakout_confirmation": int(os.getenv("BOLLINGER_BREAKOUT_CONFIRMATION", "2")),
            "volume_confirmation": os.getenv("BOLLINGER_VOLUME_CONFIRMATION", "true").lower() == "true"
        }
        
        # Moving Average Strategy
        self.moving_average_strategy = {
            "enabled": os.getenv("MA_STRATEGY_ENABLED", "true").lower() == "true",
            "short_period": int(os.getenv("MA_SHORT_PERIOD", "10")),
            "long_period": int(os.getenv("MA_LONG_PERIOD", "30")),
            "signal_confirmation": int(os.getenv("MA_SIGNAL_CONFIRMATION", "3")),
            "trend_strength_threshold": float(os.getenv("MA_TREND_STRENGTH", "0.02")),
            "volume_multiplier": float(os.getenv("MA_VOLUME_MULTIPLIER", "1.5"))
        }
        
        # Volume Analysis Strategy
        self.volume_strategy = {
            "enabled": os.getenv("VOLUME_STRATEGY_ENABLED", "true").lower() == "true",
            "volume_surge_multiplier": float(os.getenv("VOLUME_SURGE_MULTIPLIER", "2.0")),
            "average_volume_period": int(os.getenv("VOLUME_AVERAGE_PERIOD", "20")),
            "price_volume_correlation": float(os.getenv("PRICE_VOLUME_CORRELATION", "0.6")),
            "accumulation_threshold": float(os.getenv("ACCUMULATION_THRESHOLD", "1.5")),
            "distribution_threshold": float(os.getenv("DISTRIBUTION_THRESHOLD", "0.7"))
        }
        
        # Momentum Strategy
        self.momentum_strategy = {
            "enabled": os.getenv("MOMENTUM_STRATEGY_ENABLED", "true").lower() == "true",
            "lookback_period": int(os.getenv("MOMENTUM_LOOKBACK", "10")),
            "momentum_threshold": float(os.getenv("MOMENTUM_THRESHOLD", "0.05")),
            "acceleration_factor": float(os.getenv("MOMENTUM_ACCELERATION", "0.02")),
            "reversal_detection": os.getenv("MOMENTUM_REVERSAL_DETECTION", "true").lower() == "true",
            "trend_confirmation_period": int(os.getenv("MOMENTUM_TREND_CONFIRMATION", "3"))
        }
        
        # Gap Trading Strategy
        self.gap_strategy = {
            "enabled": os.getenv("GAP_STRATEGY_ENABLED", "true").lower() == "true",
            "min_gap_percent": float(os.getenv("GAP_MIN_PERCENT", "2.0")),
            "max_gap_percent": float(os.getenv("GAP_MAX_PERCENT", "10.0")),
            "volume_confirmation": float(os.getenv("GAP_VOLUME_CONFIRMATION", "1.5")),
            "fill_probability_threshold": float(os.getenv("GAP_FILL_PROBABILITY", "0.7")),
            "time_decay_factor": float(os.getenv("GAP_TIME_DECAY", "0.1"))
        }
        
        # Breakout Strategy
        self.breakout_strategy = {
            "enabled": os.getenv("BREAKOUT_STRATEGY_ENABLED", "true").lower() == "true",
            "consolidation_period": int(os.getenv("BREAKOUT_CONSOLIDATION_PERIOD", "20")),
            "volatility_threshold": float(os.getenv("BREAKOUT_VOLATILITY_THRESHOLD", "0.02")),
            "volume_confirmation_multiplier": float(os.getenv("BREAKOUT_VOLUME_MULTIPLIER", "1.5")),
            "false_breakout_filter": os.getenv("BREAKOUT_FALSE_FILTER", "true").lower() == "true",
            "support_resistance_strength": float(os.getenv("BREAKOUT_SR_STRENGTH", "0.03"))
        }
        
        # Mean Reversion Strategy
        self.mean_reversion_strategy = {
            "enabled": os.getenv("MEAN_REVERSION_ENABLED", "false").lower() == "true",
            "deviation_threshold": float(os.getenv("MEAN_REVERSION_DEVIATION", "2.0")),
            "lookback_period": int(os.getenv("MEAN_REVERSION_LOOKBACK", "50")),
            "reversion_strength": float(os.getenv("MEAN_REVERSION_STRENGTH", "0.5")),
            "max_holding_period": int(os.getenv("MEAN_REVERSION_MAX_HOLDING", "5")),
            "stop_loss_multiplier": float(os.getenv("MEAN_REVERSION_STOP_LOSS", "1.5"))
        }
        
        # Signal Combination Settings
        self.signal_combination = {
            "enabled": os.getenv("SIGNAL_COMBINATION_ENABLED", "true").lower() == "true",
            "min_strategies_agreement": int(os.getenv("MIN_STRATEGIES_AGREEMENT", "2")),
            "weight_rsi": float(os.getenv("WEIGHT_RSI", "0.2")),
            "weight_macd": float(os.getenv("WEIGHT_MACD", "0.25")),
            "weight_bollinger": float(os.getenv("WEIGHT_BOLLINGER", "0.15")),
            "weight_moving_average": float(os.getenv("WEIGHT_MA", "0.2")),
            "weight_volume": float(os.getenv("WEIGHT_VOLUME", "0.1")),
            "weight_momentum": float(os.getenv("WEIGHT_MOMENTUM", "0.1")),
            "confidence_threshold": float(os.getenv("SIGNAL_CONFIDENCE_THRESHOLD", "0.6"))
        }
        
        # Global Strategy Settings
        self.global_settings = {
            "signal_generation_interval": int(os.getenv("SIGNAL_GENERATION_INTERVAL", "60")),  # seconds
            "strategy_evaluation_window": int(os.getenv("STRATEGY_EVALUATION_WINDOW", "100")),  # bars
            "performance_tracking_enabled": os.getenv("PERFORMANCE_TRACKING_ENABLED", "true").lower() == "true",
            "backtesting_enabled": os.getenv("BACKTESTING_ENABLED", "true").lower() == "true",
            "paper_trading_mode": os.getenv("PAPER_TRADING_MODE", "true").lower() == "true",
            "max_concurrent_signals": int(os.getenv("MAX_CONCURRENT_SIGNALS", "10"))
        }
    
    def get_enabled_strategies(self) -> List[str]:
        """Get list of enabled strategies."""
        enabled_strategies = []
        
        strategy_map = {
            "rsi": self.rsi_strategy,
            "macd": self.macd_strategy,
            "bollinger": self.bollinger_strategy,
            "moving_average": self.moving_average_strategy,
            "volume": self.volume_strategy,
            "momentum": self.momentum_strategy,
            "gap": self.gap_strategy,
            "breakout": self.breakout_strategy,
            "mean_reversion": self.mean_reversion_strategy
        }
        
        for strategy_name, config in strategy_map.items():
            if config.get("enabled", False):
                enabled_strategies.append(strategy_name)
        
        return enabled_strategies
    
    def get_strategy_config(self, strategy_name: str) -> Dict:
        """Get configuration for a specific strategy."""
        strategy_configs = {
            "rsi": self.rsi_strategy,
            "macd": self.macd_strategy,
            "bollinger": self.bollinger_strategy,
            "moving_average": self.moving_average_strategy,
            "volume": self.volume_strategy,
            "momentum": self.momentum_strategy,
            "gap": self.gap_strategy,
            "breakout": self.breakout_strategy,
            "mean_reversion": self.mean_reversion_strategy
        }
        return strategy_configs.get(strategy_name, {})
    
    def is_strategy_enabled(self, strategy_name: str) -> bool:
        """Check if a specific strategy is enabled."""
        config = self.get_strategy_config(strategy_name)
        return config.get("enabled", False)
    
    def get_signal_weights(self) -> Dict[str, float]:
        """Get signal combination weights."""
        return {
            "rsi": self.signal_combination["weight_rsi"],
            "macd": self.signal_combination["weight_macd"],
            "bollinger": self.signal_combination["weight_bollinger"],
            "moving_average": self.signal_combination["weight_moving_average"],
            "volume": self.signal_combination["weight_volume"],
            "momentum": self.signal_combination["weight_momentum"]
        }
    
    def validate_configuration(self) -> Dict[str, List[str]]:
        """Validate strategy configuration and return any warnings or errors."""
        warnings = []
        errors = []
        
        # Check if at least one strategy is enabled
        if not self.get_enabled_strategies():
            warnings.append("No trading strategies are enabled")
        
        # Check signal combination weights sum to 1.0
        total_weight = sum(self.get_signal_weights().values())
        if abs(total_weight - 1.0) > 0.01:
            warnings.append(f"Signal weights sum to {total_weight:.3f}, should be 1.0")
        
        # Check RSI thresholds
        if self.rsi_strategy["oversold_threshold"] >= self.rsi_strategy["overbought_threshold"]:
            errors.append("RSI oversold threshold must be less than overbought threshold")
        
        # Check MACD periods
        if self.macd_strategy["fast_period"] >= self.macd_strategy["slow_period"]:
            errors.append("MACD fast period must be less than slow period")
        
        # Check Moving Average periods
        if self.moving_average_strategy["short_period"] >= self.moving_average_strategy["long_period"]:
            errors.append("MA short period must be less than long period")
        
        return {"warnings": warnings, "errors": errors}
    
    def get_strategies_summary(self) -> Dict:
        """Get summary of all strategy configurations."""
        enabled_strategies = self.get_enabled_strategies()
        validation_result = self.validate_configuration()
        
        return {
            "total_strategies": 9,
            "enabled_strategies": enabled_strategies,
            "enabled_count": len(enabled_strategies),
            "signal_combination_enabled": self.signal_combination["enabled"],
            "min_strategies_agreement": self.signal_combination["min_strategies_agreement"],
            "confidence_threshold": self.signal_combination["confidence_threshold"],
            "paper_trading_mode": self.global_settings["paper_trading_mode"],
            "performance_tracking": self.global_settings["performance_tracking_enabled"],
            "validation_warnings": len(validation_result["warnings"]),
            "validation_errors": len(validation_result["errors"])
        } 