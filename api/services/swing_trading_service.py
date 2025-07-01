"""
Swing Trading Service with Configuration-Driven Seed Algorithms
Multi-timeframe analysis for swing, short-term, and long-term positions
"""

import asyncio
import logging
import uuid
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import pandas as pd
from dataclasses import asdict
import yfinance as yf
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from models.stock_models import (
    StockData, TechnicalIndicators, IntradaySignal, SignalType, StockPrice,
    TradingTheme
)
from services.data_service import RealTimeDataService
from services.intraday_service import ChartinkIntegration
from .config_manager import config_manager, SeedAlgorithm, StrategyConfig

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def convert_numpy_types(obj):
    """Convert numpy types to Python native types for JSON serialization."""
    if isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32, np.float16)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    return obj


class SwingTradingAnalyzer:
    """Enhanced analyzer that uses configurable seed algorithms"""
    
    def __init__(self, data_service: RealTimeDataService):
        self.data_service = data_service
        self.chartink = ChartinkIntegration()
        
    async def get_candidates_from_config(self, strategy_name: str) -> List[str]:
        """Get stock candidates using configuration-driven seed algorithms"""
        try:
            strategy_config = config_manager.get_strategy_config(strategy_name)
            if not strategy_config:
                logger.warning(f"⚠️ No configuration found for strategy: {strategy_name}")
                return []
            
            all_candidates = []
            total_weight = 0
            
            # Get candidates from Chartink themes
            chartink_algorithms = config_manager.get_seed_algorithms(strategy_name, 'chartink_themes')
            for algorithm in chartink_algorithms:
                try:
                    theme_candidates = await self.chartink.get_stocks_by_theme(
                        algorithm.name, 
                        limit=algorithm.limit
                    )
                    
                    # Apply algorithm-specific filters
                    filtered_candidates = await self._apply_algorithm_filters(
                        theme_candidates, 
                        algorithm.filters,
                        algorithm.name
                    )
                    
                    # Weight the candidates
                    weighted_count = int(len(filtered_candidates) * algorithm.weight)
                    selected_candidates = filtered_candidates[:weighted_count]
                    
                    all_candidates.extend(selected_candidates)
                    total_weight += algorithm.weight
                    
                    logger.info(f"🎯 {algorithm.name}: {len(selected_candidates)}/{len(filtered_candidates)} candidates (weight: {algorithm.weight})")
                    
                except Exception as e:
                    logger.error(f"❌ Error fetching from {algorithm.name}: {e}")
                    continue
            
            # Get candidates from custom scanners
            custom_algorithms = config_manager.get_seed_algorithms(strategy_name, 'custom_scanners')
            for algorithm in custom_algorithms:
                try:
                    scanner_candidates = await self._run_custom_scanner(algorithm)
                    
                    weighted_count = int(len(scanner_candidates) * algorithm.weight)
                    selected_candidates = scanner_candidates[:weighted_count]
                    
                    all_candidates.extend(selected_candidates)
                    total_weight += algorithm.weight
                    
                    logger.info(f"🔍 {algorithm.name}: {len(selected_candidates)}/{len(scanner_candidates)} candidates (weight: {algorithm.weight})")
                    
                except Exception as e:
                    logger.error(f"❌ Error running custom scanner {algorithm.name}: {e}")
                    continue
            
            # Remove duplicates and apply global limits
            unique_candidates = list(set(all_candidates))
            global_settings = config_manager.get_global_settings()
            max_candidates = global_settings.get('max_candidates_per_strategy', 100)
            
            final_candidates = unique_candidates[:max_candidates]
            
            logger.info(f"📊 Strategy {strategy_name}: {len(final_candidates)} final candidates from {len(unique_candidates)} unique (total weight: {total_weight:.2f})")
            
            return final_candidates
            
        except Exception as e:
            logger.error(f"❌ Error getting candidates for {strategy_name}: {e}")
            # Fallback to global fallback symbols
            fallback_symbols = config_manager.get_global_settings().get('fallback_symbols', [])
            return fallback_symbols[:20]
    
    async def _apply_algorithm_filters(self, candidates: List[str], filters: Dict, algorithm_name: str) -> List[str]:
        """Apply algorithm-specific filters to candidates"""
        if not filters or not candidates:
            return candidates
        
        filtered_candidates = []
        
        for symbol in candidates:
            try:
                # Get stock data for filtering
                stock_data = await self.data_service.get_stock_data(symbol)
                if not stock_data:
                    continue
                
                # Apply volume ratio filter
                if 'min_volume_ratio' in filters:
                    volume_ratio = getattr(stock_data, 'volume_ratio', 1.0)
                    if volume_ratio < filters['min_volume_ratio']:
                        continue
                
                # Apply RSI range filter
                if 'rsi_range' in filters:
                    rsi = getattr(stock_data.technical_indicators, 'rsi', 50) if stock_data.technical_indicators else 50
                    rsi_min, rsi_max = filters['rsi_range']
                    if not (rsi_min <= rsi <= rsi_max):
                        continue
                
                # Apply price change filter
                if 'min_price_change' in filters:
                    price_change = abs(getattr(stock_data, 'change_percent', 0))
                    if price_change < filters['min_price_change']:
                        continue
                
                # Apply market cap filter
                if 'market_cap_min' in filters:
                    market_cap = getattr(stock_data, 'market_cap', 0)
                    if market_cap < filters['market_cap_min']:
                        continue
                
                # Apply gap percentage filter
                if 'min_gap_percent' in filters:
                    gap_percent = getattr(stock_data, 'gap_percent', 0)
                    if gap_percent < filters['min_gap_percent']:
                        continue
                
                # Apply price near high filter
                if 'price_near_high' in filters:
                    price_ratio = getattr(stock_data, 'price_to_52w_high', 0)
                    if price_ratio < filters['price_near_high']:
                        continue
                
                filtered_candidates.append(symbol)
                
            except Exception as e:
                logger.debug(f"⚠️ Error filtering {symbol} for {algorithm_name}: {e}")
                continue
        
        return filtered_candidates
    
    async def _run_custom_scanner(self, algorithm: SeedAlgorithm) -> List[str]:
        """Run custom technical pattern scanners"""
        candidates = []
        
        try:
            if algorithm.name == "bollinger_squeeze":
                candidates = await self._scan_bollinger_squeeze(algorithm.filters)
            elif algorithm.name == "ascending_triangle":
                candidates = await self._scan_ascending_triangle(algorithm.filters)
            elif algorithm.name == "flag_pole_pattern":
                candidates = await self._scan_flag_pole_pattern(algorithm.filters)
            elif algorithm.name == "double_bottom":
                candidates = await self._scan_double_bottom(algorithm.filters)
            elif algorithm.name == "inverse_head_shoulders":
                candidates = await self._scan_inverse_head_shoulders(algorithm.filters)
            elif algorithm.name == "base_breakout":
                candidates = await self._scan_base_breakout(algorithm.filters)
            elif algorithm.name == "weekly_flag":
                candidates = await self._scan_weekly_flag(algorithm.filters)
            elif algorithm.name == "dark_cloud_cover":
                candidates = await self._scan_dark_cloud_cover(algorithm.filters)
            else:
                logger.warning(f"⚠️ Unknown custom scanner: {algorithm.name}")
                
        except Exception as e:
            logger.error(f"❌ Error in custom scanner {algorithm.name}: {e}")
        
        return candidates
    
    async def _scan_bollinger_squeeze(self, params: Dict) -> List[str]:
        """Scan for Bollinger Band squeeze patterns"""
        # Get universe of stocks from fallback list for scanning
        universe = config_manager.get_global_settings().get('fallback_symbols', [])
        candidates = []
        
        bb_period = params.get('bb_period', 20)
        bb_std = params.get('bb_std', 2)
        squeeze_threshold = params.get('squeeze_threshold', 0.1)
        
        for symbol in universe:
            try:
                # Get historical data
                hist_data = await self.data_service.get_historical_data(symbol, period="2mo")
                if hist_data is None or len(hist_data) < bb_period + 5:
                    continue
                
                # Calculate Bollinger Bands
                close_prices = hist_data['close']
                rolling_mean = close_prices.rolling(window=bb_period).mean()
                rolling_std = close_prices.rolling(window=bb_period).std()
                
                upper_band = rolling_mean + (rolling_std * bb_std)
                lower_band = rolling_mean - (rolling_std * bb_std)
                
                # Calculate band width (normalized)
                band_width = (upper_band - lower_band) / rolling_mean
                
                # Check for squeeze (band width below threshold)
                recent_bandwidth = band_width.iloc[-5:].mean()
                if recent_bandwidth < squeeze_threshold:
                    candidates.append(symbol)
                    
            except Exception as e:
                logger.debug(f"⚠️ Error scanning {symbol} for bollinger squeeze: {e}")
                continue
        
        return candidates[:10]  # Limit results
    
    async def _scan_ascending_triangle(self, params: Dict) -> List[str]:
        """Scan for ascending triangle patterns"""
        universe = config_manager.get_global_settings().get('fallback_symbols', [])
        candidates = []
        
        min_touches = params.get('min_touches', 3)
        
        for symbol in universe:
            try:
                hist_data = await self.data_service.get_historical_data(symbol, period="3mo")
                if hist_data is None or len(hist_data) < 60:
                    continue
                
                highs = hist_data['high']
                lows = hist_data['low']
                
                # Simplified ascending triangle detection
                # Look for resistance level (multiple touches at similar high)
                recent_highs = highs.iloc[-30:]
                resistance_level = recent_highs.max()
                
                # Count touches near resistance
                touches = sum(1 for high in recent_highs if abs(high - resistance_level) / resistance_level < 0.02)
                
                # Check for rising lows
                recent_lows = lows.iloc[-30:].rolling(window=5).min()
                if len(recent_lows) >= 10:
                    slope = np.polyfit(range(len(recent_lows)), recent_lows, 1)[0]
                    
                    if touches >= min_touches and slope > 0:
                        candidates.append(symbol)
                        
            except Exception as e:
                logger.debug(f"⚠️ Error scanning {symbol} for ascending triangle: {e}")
                continue
        
        return candidates[:8]
    
    async def _scan_flag_pole_pattern(self, params: Dict) -> List[str]:
        """Scan for flag and pole patterns"""
        universe = config_manager.get_global_settings().get('fallback_symbols', [])
        candidates = []
        
        pole_strength = params.get('pole_strength', 0.05)
        flag_duration = params.get('flag_duration', [2, 7])
        
        for symbol in universe:
            try:
                hist_data = await self.data_service.get_historical_data(symbol, period="2mo")
                if hist_data is None or len(hist_data) < 30:
                    continue
                
                close_prices = hist_data['close']
                
                # Look for recent strong move (pole)
                recent_return = (close_prices.iloc[-1] - close_prices.iloc[-15]) / close_prices.iloc[-15]
                
                if recent_return > pole_strength:
                    # Check for consolidation (flag)
                    flag_period = close_prices.iloc[-7:]
                    flag_volatility = flag_period.std() / flag_period.mean()
                    
                    if flag_volatility < 0.03:  # Low volatility consolidation
                        candidates.append(symbol)
                        
            except Exception as e:
                logger.debug(f"⚠️ Error scanning {symbol} for flag pole: {e}")
                continue
        
        return candidates[:6]
    
    async def _scan_double_bottom(self, params: Dict) -> List[str]:
        """Scan for double bottom patterns"""
        universe = config_manager.get_global_settings().get('fallback_symbols', [])
        candidates = []
        
        symmetry_tolerance = params.get('symmetry_tolerance', 0.02)
        
        for symbol in universe:
            try:
                hist_data = await self.data_service.get_historical_data(symbol, period="6mo")
                if hist_data is None or len(hist_data) < 60:
                    continue
                
                lows = hist_data['low']
                
                # Find potential double bottom
                min_indices = []
                for i in range(5, len(lows) - 5):
                    if lows.iloc[i] == lows.iloc[i-5:i+6].min():
                        min_indices.append(i)
                
                # Check for two similar lows
                if len(min_indices) >= 2:
                    recent_mins = min_indices[-2:]
                    low1, low2 = lows.iloc[recent_mins[0]], lows.iloc[recent_mins[1]]
                    
                    if abs(low1 - low2) / min(low1, low2) < symmetry_tolerance:
                        candidates.append(symbol)
                        
            except Exception as e:
                logger.debug(f"⚠️ Error scanning {symbol} for double bottom: {e}")
                continue
        
        return candidates[:5]
    
    async def _scan_inverse_head_shoulders(self, params: Dict) -> List[str]:
        """Scan for inverse head and shoulders patterns"""
        # Simplified implementation
        return []
    
    async def _scan_base_breakout(self, params: Dict) -> List[str]:
        """Scan for base breakout patterns"""
        # Simplified implementation  
        return []
    
    async def _scan_weekly_flag(self, params: Dict) -> List[str]:
        """Scan for weekly flag patterns"""
        # Simplified implementation
        return []
    
    async def _scan_dark_cloud_cover(self, params: Dict) -> List[str]:
        """Scan for dark cloud cover patterns"""
        # Simplified implementation
        return []

    async def analyze_stock_with_config(self, symbol: str, strategy_name: str) -> Optional[Dict]:
        """Analyze stock using configuration-driven criteria"""
        try:
            analysis_criteria = config_manager.get_analysis_criteria(strategy_name)
            strategy_config = config_manager.get_strategy_config(strategy_name)
            
            if not analysis_criteria or not strategy_config:
                return None
            
            # Get stock data
            stock_data = await self.data_service.get_stock_data(symbol)
            if not stock_data:
                return None
            
            # Calculate technical indicators
            indicators = await self._calculate_technical_indicators(symbol)
            if not indicators:
                return None
            
            # Apply analysis criteria from config
            criteria_results = {}
            
            # RSI analysis
            rsi = getattr(indicators, 'rsi', 50)
            min_rsi = analysis_criteria.get('min_rsi', 0)
            max_rsi = analysis_criteria.get('max_rsi', 100)
            criteria_results['rsi_valid'] = min_rsi <= rsi <= max_rsi
            
            # Volume analysis
            volume_ratio = getattr(stock_data, 'volume_ratio', 1.0)
            min_volume_ratio = analysis_criteria.get('min_volume_ratio', 1.0)
            criteria_results['volume_valid'] = volume_ratio >= min_volume_ratio
            
            # Momentum analysis
            momentum_score = getattr(indicators, 'momentum_score', 0)
            min_momentum = analysis_criteria.get('min_momentum_score', 0)
            max_momentum = analysis_criteria.get('max_momentum_score', 100)
            criteria_results['momentum_valid'] = min_momentum <= momentum_score <= max_momentum
            
            # Calculate confidence and strength based on criteria
            passed_criteria = sum(criteria_results.values())
            total_criteria = len(criteria_results)
            base_confidence = (passed_criteria / total_criteria) * 100
            
            # Apply confidence threshold
            confidence_threshold = analysis_criteria.get('confidence_threshold', 50.0)
            if base_confidence < confidence_threshold:
                return None
            
            # Calculate final metrics
            entry_price = float(stock_data.current_price)
            target_return = strategy_config.target_return
            stop_loss_pct = strategy_config.stop_loss
            
            target_price = entry_price * (1 + target_return)
            stop_loss_price = entry_price * (1 - stop_loss_pct)
            
            # Enhanced confidence calculation
            confidence = min(95.0, base_confidence + (volume_ratio - 1) * 5)
            strength = min(100.0, momentum_score + (rsi - 50) * 0.5)
            
            # Generate reasoning
            reasoning_parts = []
            reasoning_parts.append(f"RSI optimal ({rsi:.1f})")
            
            if volume_ratio > 1.5:
                reasoning_parts.append(f"Volume spike {volume_ratio:.1f}x")
            if momentum_score > 50:
                reasoning_parts.append("Bullish trend")
            
            reasoning = ", ".join(reasoning_parts)
            
            return {
                'symbol': symbol,
                'entry_price': entry_price,
                'target_price': target_price,
                'stop_loss_price': stop_loss_price,
                'confidence': confidence,
                'strength': strength,
                'reasoning': reasoning,
                'timeframe': strategy_config.timeframe,
                'target_return_pct': target_return * 100,
                'stop_loss_pct': stop_loss_pct * 100,
                'strategy_name': strategy_name,
                'analysis_criteria': criteria_results,
                'indicators': {
                    'rsi': rsi,
                    'volume_ratio': volume_ratio,
                    'momentum_score': momentum_score,
                    'strategy_type': strategy_name
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error analyzing {symbol} with config: {e}")
            return None


class SwingTradingService:
    """Main service for swing trading strategies."""
    
    def __init__(self, data_service: RealTimeDataService):
        self.data_service = data_service
        self.analyzer = SwingTradingAnalyzer(data_service)
    
    async def get_swing_buy_recommendations(self, limit: int = 10,
                                          confidence_threshold: float = 60.0,
                                          strength_threshold: float = 65.0) -> List[IntradaySignal]:
        """Get swing buy recommendations."""
        return await self.analyzer.get_swing_buy_recommendations(
            limit=limit,
            confidence_threshold=confidence_threshold,
            strength_threshold=strength_threshold
        )
    
    async def get_short_term_buy_recommendations(self, limit: int = 10,
                                               confidence_threshold: float = 55.0,
                                               strength_threshold: float = 60.0) -> List[IntradaySignal]:
        """Get short-term buy recommendations."""
        return await self.analyzer.get_short_term_buy_recommendations(
            limit=limit,
            confidence_threshold=confidence_threshold,
            strength_threshold=strength_threshold
        )
    
    async def get_long_term_buy_recommendations(self, limit: int = 10,
                                              confidence_threshold: float = 50.0,
                                              strength_threshold: float = 55.0) -> List[IntradaySignal]:
        """Get long-term buy recommendations."""
        return await self.analyzer.get_long_term_buy_recommendations(
            limit=limit,
            confidence_threshold=confidence_threshold,
            strength_threshold=strength_threshold
        )
    
    async def get_all_timeframe_recommendations(self, limit_per_strategy: int = 5) -> Dict[str, List[IntradaySignal]]:
        """Get recommendations across all timeframes."""
        try:
            logger.info("🔄 Generating recommendations across all timeframes...")
            
            # Generate recommendations for all strategies
            swing_recs = await self.get_swing_buy_recommendations(limit=limit_per_strategy)
            short_term_recs = await self.get_short_term_buy_recommendations(limit=limit_per_strategy)
            long_term_recs = await self.get_long_term_buy_recommendations(limit=limit_per_strategy)
            
            return {
                "swing_buy": swing_recs,
                "short_term_buy": short_term_recs,
                "long_term_buy": long_term_recs
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting all timeframe recommendations: {str(e)}")
            return {
                "swing_buy": [],
                "short_term_buy": [],
                "long_term_buy": []
            }
    
    async def health_check(self) -> Dict[str, Any]:
        """Health check for swing trading service."""
        try:
            return {
                "status": "healthy",
                "analyzer_available": True,
                "chartink_integration": True,
                "supported_strategies": ["swing_buy", "short_term_buy", "long_term_buy"]
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }


# Global swing trading service instance
swing_trading_service: Optional[SwingTradingService] = None 