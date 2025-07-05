#!/usr/bin/env python3
"""
Volume Surge Intraday Algorithm v1.0

Seed algorithm focused on volume surge analysis for intraday trading.
Identifies stocks with unusual volume activity indicating potential price movements.

Algorithm ID: volume_surge_intraday_v1
Version: 1.0
Trading Theme: intraday_buy
"""

import numpy as np
import pandas as pd
from typing import Dict, Any
from datetime import datetime

from recommendation_engine.utils.base_algorithm import BaseSeedAlgorithm


class VolumeSurgeIntradayV1(BaseSeedAlgorithm):
    """
    Volume surge-based seed algorithm for intraday trading
    
    Features:
    - Volume surge detection vs historical average
    - Price-volume correlation analysis
    - Breakout volume confirmation
    - Institutional activity indicators
    """
    
    def __init__(self, **kwargs):
        # Default parameters
        default_params = {
            'min_volume_surge': 1.5,        # Minimum volume vs average
            'max_volume_surge': 10.0,       # Maximum volume vs average (avoid manipulation)
            'price_volume_correlation': 0.7,# Minimum price-volume correlation
            'min_price': 50.0,              # Minimum stock price
            'max_price': 5000.0,            # Maximum stock price
            'min_volume': 200000,           # Minimum daily volume
            'surge_weight': 0.4,            # Weight for volume surge
            'correlation_weight': 0.25,     # Weight for price-volume correlation
            'breakout_weight': 0.2,         # Weight for breakout confirmation
            'institutional_weight': 0.15    # Weight for institutional activity
        }
        
        # Merge with provided parameters
        default_params.update(kwargs)
        
        super().__init__(
            alg_id='volume_surge_intraday_v1',
            version='1.0',
            trading_theme='intraday_buy',
            **default_params
        )
    
    def _initialize_parameters(self):
        """Initialize algorithm-specific parameters"""
        # Extract parameters
        self.min_volume_surge = self.parameters.get('min_volume_surge', 1.5)
        self.max_volume_surge = self.parameters.get('max_volume_surge', 10.0)
        self.price_volume_correlation = self.parameters.get('price_volume_correlation', 0.7)
        self.min_price = self.parameters.get('min_price', 50.0)
        self.max_price = self.parameters.get('max_price', 5000.0)
        self.min_volume = self.parameters.get('min_volume', 200000)
        
        # Scoring weights
        self.surge_weight = self.parameters.get('surge_weight', 0.4)
        self.correlation_weight = self.parameters.get('correlation_weight', 0.25)
        self.breakout_weight = self.parameters.get('breakout_weight', 0.2)
        self.institutional_weight = self.parameters.get('institutional_weight', 0.15)
        
        self.logger.info(f"Initialized {self.alg_id} with min_volume_surge={self.min_volume_surge}")
    
    def calculate_score(self, stock_data: Dict[str, Any]) -> float:
        """
        Calculate volume surge score for a stock
        
        Args:
            stock_data: Dictionary with stock information
            
        Returns:
            float: Score between 0-100
        """
        try:
            # Extract basic data
            current_volume = float(stock_data.get('volume', 0))
            current_price = float(stock_data.get('close', 0))
            
            # Basic validation
            if current_price <= 0 or current_volume <= 0:
                return 0.0
            
            # Calculate individual components
            surge_score = self._calculate_surge_score(stock_data)
            correlation_score = self._calculate_correlation_score(stock_data)
            breakout_score = self._calculate_breakout_score(stock_data)
            institutional_score = self._calculate_institutional_score(stock_data)
            
            # Combine scores with weights
            total_score = (
                surge_score * self.surge_weight +
                correlation_score * self.correlation_weight +
                breakout_score * self.breakout_weight +
                institutional_score * self.institutional_weight
            )
            
            # Ensure score is between 0-100
            final_score = max(0, min(100, total_score))
            
            return final_score
            
        except Exception as e:
            self.logger.error(f"Error calculating score: {e}")
            return 0.0
    
    def _calculate_surge_score(self, stock_data: Dict[str, Any]) -> float:
        """Calculate volume surge score"""
        try:
            volume = float(stock_data.get('volume', 0))
            avg_volume = float(stock_data.get('avg_volume', volume))
            
            if avg_volume <= 0:
                return 0.0
            
            volume_ratio = volume / avg_volume
            
            # Score based on volume surge magnitude
            if volume_ratio >= 5.0:
                return 100.0
            elif volume_ratio >= 3.0:
                return 90.0
            elif volume_ratio >= 2.5:
                return 80.0
            elif volume_ratio >= 2.0:
                return 70.0
            elif volume_ratio >= 1.5:
                return 60.0
            elif volume_ratio >= 1.2:
                return 45.0
            elif volume_ratio >= 1.0:
                return 30.0
            else:
                return 15.0
                
        except:
            return 30.0
    
    def _calculate_correlation_score(self, stock_data: Dict[str, Any]) -> float:
        """Calculate price-volume correlation score"""
        try:
            price_change = float(stock_data.get('per_chg', 0))
            volume = float(stock_data.get('volume', 0))
            avg_volume = float(stock_data.get('avg_volume', volume))
            
            if avg_volume <= 0:
                return 50.0
            
            volume_change = (volume - avg_volume) / avg_volume * 100
            
            # Check if price and volume move in same direction
            if price_change > 0 and volume_change > 0:
                # Both positive - good correlation
                correlation_strength = min(abs(price_change), abs(volume_change))
                if correlation_strength >= 3.0:
                    return 95.0
                elif correlation_strength >= 2.0:
                    return 80.0
                elif correlation_strength >= 1.0:
                    return 65.0
                else:
                    return 50.0
            elif price_change < 0 and volume_change > 0:
                # Price down, volume up - potential reversal
                return 40.0
            elif price_change > 0 and volume_change < 0:
                # Price up, volume down - weak signal
                return 25.0
            else:
                # Both negative
                return 30.0
                
        except:
            return 50.0
    
    def _calculate_breakout_score(self, stock_data: Dict[str, Any]) -> float:
        """Calculate breakout confirmation score"""
        try:
            price_change = float(stock_data.get('per_chg', 0))
            high = float(stock_data.get('high', 0))
            low = float(stock_data.get('low', 0))
            close = float(stock_data.get('close', 0))
            volume = float(stock_data.get('volume', 0))
            avg_volume = float(stock_data.get('avg_volume', volume))
            
            if high <= low or avg_volume <= 0:
                return 50.0
            
            # Calculate daily range and position
            daily_range = (high - low) / low * 100
            range_position = (close - low) / (high - low)
            volume_ratio = volume / avg_volume
            
            # Score based on breakout characteristics
            breakout_score = 0.0
            
            # Wide range suggests volatility/breakout
            if daily_range >= 5.0:
                breakout_score += 30.0
            elif daily_range >= 3.0:
                breakout_score += 20.0
            elif daily_range >= 2.0:
                breakout_score += 10.0
            
            # Position near high with volume suggests bullish breakout
            if range_position >= 0.8 and volume_ratio >= 1.5:
                breakout_score += 40.0
            elif range_position >= 0.6 and volume_ratio >= 1.2:
                breakout_score += 25.0
            elif range_position >= 0.4:
                breakout_score += 15.0
            
            # Price change confirmation
            if price_change >= 2.0:
                breakout_score += 30.0
            elif price_change >= 1.0:
                breakout_score += 20.0
            elif price_change >= 0.5:
                breakout_score += 10.0
            
            return min(100.0, breakout_score)
                
        except:
            return 50.0
    
    def _calculate_institutional_score(self, stock_data: Dict[str, Any]) -> float:
        """Calculate institutional activity score"""
        try:
            volume = float(stock_data.get('volume', 0))
            market_cap = float(stock_data.get('market_cap', 0))
            avg_volume = float(stock_data.get('avg_volume', volume))
            close = float(stock_data.get('close', 0))
            
            if avg_volume <= 0 or close <= 0:
                return 50.0
            
            # Estimate institutional interest
            volume_turnover = volume / (market_cap / close) if market_cap > 0 else 0
            volume_ratio = volume / avg_volume
            
            # Large volume with reasonable turnover suggests institutional activity
            institutional_score = 0.0
            
            # Volume-based indicators
            if volume >= 10000000:  # 1 crore+ volume
                institutional_score += 40.0
            elif volume >= 5000000:  # 50 lakh+ volume
                institutional_score += 30.0
            elif volume >= 1000000:  # 10 lakh+ volume
                institutional_score += 20.0
            
            # Volume surge suggests new interest
            if volume_ratio >= 3.0:
                institutional_score += 35.0
            elif volume_ratio >= 2.0:
                institutional_score += 25.0
            elif volume_ratio >= 1.5:
                institutional_score += 15.0
            
            # Turnover analysis
            if 0.02 <= volume_turnover <= 0.1:  # Reasonable turnover
                institutional_score += 25.0
            elif volume_turnover <= 0.02:
                institutional_score += 15.0
            
            return min(100.0, institutional_score)
                
        except:
            return 50.0
    
    def get_selection_criteria(self) -> Dict[str, Any]:
        """Get selection criteria for this algorithm"""
        return {
            'min_price': self.min_price,
            'max_price': self.max_price,
            'min_volume': self.min_volume,
            'min_volume_surge': self.min_volume_surge,
            'trading_theme': self.trading_theme,
            'algorithm_focus': 'volume_surge',
            'timeframe': 'intraday',
            'signal_type': 'buy'
        }
    
    def validate_stock(self, stock_data: Dict[str, Any]) -> bool:
        """Validate stock meets volume surge criteria"""
        try:
            # Call parent validation first
            if not super().validate_stock(stock_data):
                return False
            
            # Additional volume-specific validation
            volume = float(stock_data.get('volume', 0))
            avg_volume = float(stock_data.get('avg_volume', volume))
            
            if avg_volume <= 0:
                return False
            
            volume_ratio = volume / avg_volume
            
            # Must have minimum volume surge
            if volume_ratio < self.min_volume_surge:
                return False
            
            # Avoid extreme volume surges (potential manipulation)
            if volume_ratio > self.max_volume_surge:
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error in validation: {e}")
            return False 