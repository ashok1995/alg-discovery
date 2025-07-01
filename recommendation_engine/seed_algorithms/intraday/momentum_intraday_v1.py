#!/usr/bin/env python3
"""
Momentum Intraday Algorithm v1.0

Seed algorithm focused on momentum-based stock selection for intraday trading.
Identifies stocks with strong price momentum and trending behavior.

Algorithm ID: momentum_intraday_v1
Version: 1.0
Trading Theme: intraday_buy
"""

import numpy as np
import pandas as pd
from typing import Dict, Any
from datetime import datetime

from recommendation_engine.utils.base_algorithm import BaseSeedAlgorithm


class MomentumIntradayV1(BaseSeedAlgorithm):
    """
    Momentum-based seed algorithm for intraday trading
    
    Features:
    - Price momentum analysis (short-term trend strength)
    - Volume momentum confirmation
    - Relative strength vs market
    - Momentum persistence scoring
    """
    
    def __init__(self, **kwargs):
        # Default parameters
        default_params = {
            'min_price_change': 1.0,        # Minimum % price change
            'momentum_lookback': 5,         # Days for momentum calculation
            'volume_factor': 1.5,           # Volume vs average multiplier
            'min_price': 50.0,              # Minimum stock price
            'max_price': 5000.0,            # Maximum stock price
            'min_volume': 100000,           # Minimum daily volume
            'momentum_weight': 0.4,         # Weight for price momentum
            'volume_weight': 0.3,           # Weight for volume momentum
            'persistence_weight': 0.2,      # Weight for momentum persistence
            'rsi_weight': 0.1              # Weight for RSI component
        }
        
        # Merge with provided parameters
        default_params.update(kwargs)
        
        super().__init__(
            alg_id='momentum_intraday_v1',
            version='1.0',
            trading_theme='intraday_buy',
            **default_params
        )
    
    def _initialize_parameters(self):
        """Initialize algorithm-specific parameters"""
        # Extract parameters
        self.min_price_change = self.parameters.get('min_price_change', 1.0)
        self.momentum_lookback = self.parameters.get('momentum_lookback', 5)
        self.volume_factor = self.parameters.get('volume_factor', 1.5)
        self.min_price = self.parameters.get('min_price', 50.0)
        self.max_price = self.parameters.get('max_price', 5000.0)
        self.min_volume = self.parameters.get('min_volume', 100000)
        
        # Scoring weights
        self.momentum_weight = self.parameters.get('momentum_weight', 0.4)
        self.volume_weight = self.parameters.get('volume_weight', 0.3)
        self.persistence_weight = self.parameters.get('persistence_weight', 0.2)
        self.rsi_weight = self.parameters.get('rsi_weight', 0.1)
        
        self.logger.info(f"Initialized {self.alg_id} with momentum_weight={self.momentum_weight}")
    
    def calculate_score(self, stock_data: Dict[str, Any]) -> float:
        """
        Calculate momentum score for a stock
        
        Args:
            stock_data: Dictionary with stock information
            
        Returns:
            float: Score between 0-100
        """
        try:
            # Extract basic data
            current_price = float(stock_data.get('close', 0))
            volume = float(stock_data.get('volume', 0))
            price_change_pct = float(stock_data.get('per_chg', 0))
            
            # Basic validation
            if current_price <= 0 or volume <= 0:
                return 0.0
            
            # Calculate individual components
            momentum_score = self._calculate_momentum_score(stock_data)
            volume_score = self._calculate_volume_score(stock_data)
            persistence_score = self._calculate_persistence_score(stock_data)
            rsi_score = self._calculate_rsi_score(stock_data)
            
            # Combine scores with weights
            total_score = (
                momentum_score * self.momentum_weight +
                volume_score * self.volume_weight +
                persistence_score * self.persistence_weight +
                rsi_score * self.rsi_weight
            )
            
            # Ensure score is between 0-100
            final_score = max(0, min(100, total_score))
            
            return final_score
            
        except Exception as e:
            self.logger.error(f"Error calculating score: {e}")
            return 0.0
    
    def _calculate_momentum_score(self, stock_data: Dict[str, Any]) -> float:
        """Calculate price momentum score"""
        try:
            price_change_pct = float(stock_data.get('per_chg', 0))
            
            # Score based on price change magnitude
            if price_change_pct >= 5.0:
                return 100.0
            elif price_change_pct >= 3.0:
                return 85.0
            elif price_change_pct >= 2.0:
                return 70.0
            elif price_change_pct >= 1.0:
                return 55.0
            elif price_change_pct >= 0.5:
                return 40.0
            elif price_change_pct >= 0:
                return 25.0
            else:
                return 10.0  # Negative momentum gets low score
                
        except:
            return 25.0
    
    def _calculate_volume_score(self, stock_data: Dict[str, Any]) -> float:
        """Calculate volume momentum score"""
        try:
            volume = float(stock_data.get('volume', 0))
            avg_volume = float(stock_data.get('avg_volume', volume))
            
            if avg_volume <= 0:
                avg_volume = volume
            
            volume_ratio = volume / avg_volume
            
            # Score based on volume surge
            if volume_ratio >= 3.0:
                return 100.0
            elif volume_ratio >= 2.0:
                return 85.0
            elif volume_ratio >= 1.5:
                return 70.0
            elif volume_ratio >= 1.2:
                return 55.0
            elif volume_ratio >= 1.0:
                return 40.0
            else:
                return 20.0
                
        except:
            return 40.0
    
    def _calculate_persistence_score(self, stock_data: Dict[str, Any]) -> float:
        """Calculate momentum persistence score"""
        try:
            # Use available data to estimate persistence
            price_change = float(stock_data.get('per_chg', 0))
            high = float(stock_data.get('high', 0))
            low = float(stock_data.get('low', 0))
            close = float(stock_data.get('close', 0))
            
            if high <= low:
                return 50.0
            
            # Calculate position within day's range
            range_position = (close - low) / (high - low)
            
            # For buy signals, prefer stocks closing near highs
            if price_change > 0:
                if range_position >= 0.8:
                    return 90.0
                elif range_position >= 0.6:
                    return 70.0
                elif range_position >= 0.4:
                    return 50.0
                else:
                    return 30.0
            else:
                # For negative momentum, lower persistence score
                return 20.0
                
        except:
            return 50.0
    
    def _calculate_rsi_score(self, stock_data: Dict[str, Any]) -> float:
        """Calculate RSI-based score (simplified)"""
        try:
            price_change = float(stock_data.get('per_chg', 0))
            
            # Simplified RSI-like calculation
            if price_change > 0:
                # Positive momentum
                if price_change >= 3.0:
                    return 80.0  # Strong but not overbought
                elif price_change >= 1.5:
                    return 70.0
                else:
                    return 60.0
            else:
                # Negative momentum - might be oversold opportunity
                if price_change <= -3.0:
                    return 40.0  # Potential oversold bounce
                else:
                    return 30.0
                    
        except:
            return 50.0
    
    def get_selection_criteria(self) -> Dict[str, Any]:
        """Get selection criteria for this algorithm"""
        return {
            'min_price': self.min_price,
            'max_price': self.max_price,
            'min_volume': self.min_volume,
            'min_price_change': self.min_price_change,
            'trading_theme': self.trading_theme,
            'algorithm_focus': 'momentum',
            'timeframe': 'intraday',
            'signal_type': 'buy'
        }
    
    def get_algorithm_description(self) -> str:
        """Get detailed algorithm description"""
        return """
        Momentum Intraday v1.0 - Seed Algorithm
        
        This algorithm identifies stocks with strong intraday momentum suitable for buy signals.
        
        Key Features:
        - Analyzes price momentum strength and direction
        - Confirms momentum with volume analysis
        - Evaluates momentum persistence through range position
        - Incorporates simplified RSI-like momentum quality
        
        Scoring Components:
        - Price Momentum (40%): Recent price change magnitude and direction
        - Volume Momentum (30%): Volume surge vs historical average
        - Persistence (20%): Position within daily range (for trend continuation)
        - RSI Component (10%): Momentum quality and potential reversal signals
        
        Best Used For:
        - Intraday breakout trading
        - Momentum continuation strategies
        - Gap-up follow-through trades
        - Volume-confirmed price moves
        
        Target Score Range:
        - 80-100: Strong momentum candidates
        - 60-79: Moderate momentum opportunities  
        - 40-59: Weak momentum (proceed with caution)
        - 0-39: Low momentum (avoid for momentum strategies)
        """
    
    def validate_stock(self, stock_data: Dict[str, Any]) -> bool:
        """Validate stock meets momentum criteria"""
        try:
            # Call parent validation first
            if not super().validate_stock(stock_data):
                return False
            
            # Additional momentum-specific validation
            price_change = float(stock_data.get('per_chg', 0))
            
            # Must have minimum momentum
            if abs(price_change) < self.min_price_change:
                return False
            
            # For buy signals, prefer positive momentum
            if self.trading_theme == 'intraday_buy' and price_change < 0:
                # Allow some negative momentum for potential reversal plays
                if price_change < -2.0:  # Too much negative momentum
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error in validation: {e}")
            return False 