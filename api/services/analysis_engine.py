"""
Analysis Engine
===============

Advanced analysis engine for automated trading decisions, signal generation,
and portfolio optimization. Integrates multiple strategies and risk management.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from dataclasses import dataclass, field
import threading
from concurrent.futures import ThreadPoolExecutor

from models.stock_models import (
    StockData, TechnicalIndicators, TradingSignal, SignalType, TradingTheme,
    StockAnalysis, MarketSentiment, PerformanceMetrics, BacktestResult,
    Portfolio, LiveDataUpdate
)
from services.data_service import RealTimeDataService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class StrategyConfig:
    """Trading strategy configuration."""
    name: str
    enabled: bool
    weight: float  # Weight in ensemble
    params: Dict[str, any]
    min_confidence: float = 0.7
    risk_level: str = "medium"

@dataclass
class RiskLimits:
    """Risk management limits."""
    max_position_size: float = 0.1  # 10% of portfolio
    max_portfolio_risk: float = 0.02  # 2% per trade
    max_drawdown: float = 0.15  # 15% max drawdown
    stop_loss_percent: float = 0.05  # 5% stop loss
    take_profit_ratio: float = 2.0  # 2:1 reward:risk

class TradingStrategy:
    """Base class for trading strategies."""
    
    def __init__(self, config: StrategyConfig):
        self.config = config
        self.name = config.name
        
    async def analyze(self, stock_data: StockData, indicators: TechnicalIndicators) -> Optional[TradingSignal]:
        """Analyze stock and generate signal."""
        raise NotImplementedError("Subclasses must implement analyze method")
    
    def calculate_confidence(self, strength: float, additional_factors: Dict) -> float:
        """Calculate confidence score based on multiple factors."""
        base_confidence = min(strength / 100.0, 1.0)
        
        # Adjust based on volume, volatility, etc.
        volume_factor = additional_factors.get('volume_factor', 1.0)
        volatility_factor = additional_factors.get('volatility_factor', 1.0)
        trend_factor = additional_factors.get('trend_factor', 1.0)
        
        confidence = base_confidence * volume_factor * volatility_factor * trend_factor
        return min(max(confidence, 0.0), 1.0)

class RSIMomentumStrategy(TradingStrategy):
    """RSI-based momentum strategy."""
    
    async def analyze(self, stock_data: StockData, indicators: TechnicalIndicators) -> Optional[TradingSignal]:
        try:
            if not indicators.rsi:
                return None
            
            rsi = indicators.rsi
            current_price = stock_data.current_price
            
            # RSI signals
            signal_type = None
            strength = 0
            reasoning = ""
            
            if rsi < 30:  # Oversold
                signal_type = SignalType.BUY
                strength = (30 - rsi) * 2  # Stronger signal for lower RSI
                reasoning = f"RSI oversold at {rsi:.1f}"
            elif rsi > 70:  # Overbought
                signal_type = SignalType.SELL
                strength = (rsi - 70) * 2  # Stronger signal for higher RSI
                reasoning = f"RSI overbought at {rsi:.1f}"
            else:
                return None  # No clear signal
            
            # Additional confirmation factors
            additional_factors = {}
            
            # Volume confirmation
            if stock_data.volume > 0:
                avg_volume = getattr(indicators, 'volume_sma', stock_data.volume)
                volume_ratio = stock_data.volume / avg_volume if avg_volume > 0 else 1.0
                additional_factors['volume_factor'] = min(volume_ratio, 2.0) / 2.0 + 0.5
            else:
                additional_factors['volume_factor'] = 0.8
            
            # Price trend confirmation
            if indicators.sma_20:
                trend_factor = 1.2 if current_price > indicators.sma_20 else 0.8
                additional_factors['trend_factor'] = trend_factor
            else:
                additional_factors['trend_factor'] = 1.0
            
            confidence = self.calculate_confidence(strength, additional_factors)
            
            if confidence < self.config.min_confidence:
                return None
            
            # Calculate target and stop loss
            risk_percent = 0.05  # 5% risk
            reward_ratio = 2.0   # 2:1 reward:risk
            
            if signal_type == SignalType.BUY:
                stop_loss = current_price * (1 - risk_percent)
                target_price = current_price * (1 + risk_percent * reward_ratio)
            else:  # SELL
                stop_loss = current_price * (1 + risk_percent)
                target_price = current_price * (1 - risk_percent * reward_ratio)
            
            return TradingSignal(
                id=str(uuid.uuid4()),
                symbol=stock_data.symbol,
                signal_type=signal_type,
                strength=strength,
                price=current_price,
                target_price=target_price,
                stop_loss=stop_loss,
                confidence=confidence,
                reasoning=reasoning,
                indicators=indicators,
                theme=TradingTheme.INTRADAY_BUY if signal_type == SignalType.BUY else TradingTheme.SHORT_TERM_BUY,
                algorithm=self.name,
                expires_at=datetime.now() + timedelta(hours=1)
            )
            
        except Exception as e:
            logger.error(f"Error in RSI strategy for {stock_data.symbol}: {str(e)}")
            return None

class MACDStrategy(TradingStrategy):
    """MACD-based trend following strategy."""
    
    async def analyze(self, stock_data: StockData, indicators: TechnicalIndicators) -> Optional[TradingSignal]:
        try:
            if not indicators.macd or not indicators.macd_signal:
                return None
            
            macd = indicators.macd
            macd_signal = indicators.macd_signal
            current_price = stock_data.current_price
            
            # MACD crossover signals
            signal_type = None
            strength = 0
            reasoning = ""
            
            macd_diff = macd - macd_signal
            
            if macd_diff > 0 and abs(macd_diff) > 0.1:  # Bullish crossover
                signal_type = SignalType.BUY
                strength = min(abs(macd_diff) * 50, 80)
                reasoning = f"MACD bullish crossover: {macd:.2f} > {macd_signal:.2f}"
            elif macd_diff < 0 and abs(macd_diff) > 0.1:  # Bearish crossover
                signal_type = SignalType.SELL
                strength = min(abs(macd_diff) * 50, 80)
                reasoning = f"MACD bearish crossover: {macd:.2f} < {macd_signal:.2f}"
            else:
                return None
            
            # Additional confirmation
            additional_factors = {}
            
            # Trend confirmation with moving averages
            if indicators.sma_20 and indicators.sma_50:
                if indicators.sma_20 > indicators.sma_50:
                    additional_factors['trend_factor'] = 1.2
                else:
                    additional_factors['trend_factor'] = 0.8
            else:
                additional_factors['trend_factor'] = 1.0
            
            # Volume factor
            additional_factors['volume_factor'] = 1.0  # Default
            
            confidence = self.calculate_confidence(strength, additional_factors)
            
            if confidence < self.config.min_confidence:
                return None
            
            # Risk management
            risk_percent = 0.04  # 4% risk for swing trades
            reward_ratio = 2.5   # 2.5:1 reward:risk
            
            if signal_type == SignalType.BUY:
                stop_loss = current_price * (1 - risk_percent)
                target_price = current_price * (1 + risk_percent * reward_ratio)
            else:
                stop_loss = current_price * (1 + risk_percent)
                target_price = current_price * (1 - risk_percent * reward_ratio)
            
            return TradingSignal(
                id=str(uuid.uuid4()),
                symbol=stock_data.symbol,
                signal_type=signal_type,
                strength=strength,
                price=current_price,
                target_price=target_price,
                stop_loss=stop_loss,
                confidence=confidence,
                reasoning=reasoning,
                indicators=indicators,
                theme=TradingTheme.SWING_BUY if signal_type == SignalType.BUY else TradingTheme.SHORT_TERM_BUY,
                algorithm=self.name,
                expires_at=datetime.now() + timedelta(hours=4)
            )
            
        except Exception as e:
            logger.error(f"Error in MACD strategy for {stock_data.symbol}: {str(e)}")
            return None

class BollingerBandsStrategy(TradingStrategy):
    """Bollinger Bands mean reversion strategy."""
    
    async def analyze(self, stock_data: StockData, indicators: TechnicalIndicators) -> Optional[TradingSignal]:
        try:
            if not indicators.bollinger_upper or not indicators.bollinger_lower or not indicators.sma_20:
                return None
            
            current_price = stock_data.current_price
            upper_band = indicators.bollinger_upper
            lower_band = indicators.bollinger_lower
            middle_band = indicators.sma_20
            
            # Calculate position within bands
            band_width = upper_band - lower_band
            price_position = (current_price - lower_band) / band_width
            
            signal_type = None
            strength = 0
            reasoning = ""
            
            if price_position <= 0.1:  # Near lower band
                signal_type = SignalType.BUY
                strength = (0.1 - price_position) * 500  # Scale to 0-50
                reasoning = f"Price near lower Bollinger Band: {current_price:.2f} vs {lower_band:.2f}"
            elif price_position >= 0.9:  # Near upper band
                signal_type = SignalType.SELL
                strength = (price_position - 0.9) * 500  # Scale to 0-50
                reasoning = f"Price near upper Bollinger Band: {current_price:.2f} vs {upper_band:.2f}"
            else:
                return None
            
            # Confirmation factors
            additional_factors = {}
            
            # RSI confirmation for mean reversion
            if indicators.rsi:
                if signal_type == SignalType.BUY and indicators.rsi < 40:
                    additional_factors['rsi_factor'] = 1.3
                elif signal_type == SignalType.SELL and indicators.rsi > 60:
                    additional_factors['rsi_factor'] = 1.3
                else:
                    additional_factors['rsi_factor'] = 0.9
            else:
                additional_factors['rsi_factor'] = 1.0
            
            # Volume factor
            additional_factors['volume_factor'] = 1.0
            additional_factors['trend_factor'] = 1.0
            
            confidence = self.calculate_confidence(strength, additional_factors)
            
            if confidence < self.config.min_confidence:
                return None
            
            # Mean reversion targets
            if signal_type == SignalType.BUY:
                target_price = middle_band  # Target is middle band
                stop_loss = current_price * 0.97  # 3% stop loss
            else:
                target_price = middle_band
                stop_loss = current_price * 1.03  # 3% stop loss
            
            return TradingSignal(
                id=str(uuid.uuid4()),
                symbol=stock_data.symbol,
                signal_type=signal_type,
                strength=strength,
                price=current_price,
                target_price=target_price,
                stop_loss=stop_loss,
                confidence=confidence,
                reasoning=reasoning,
                indicators=indicators,
                theme=TradingTheme.INTRADAY_BUY,
                algorithm=self.name,
                expires_at=datetime.now() + timedelta(hours=2)
            )
            
        except Exception as e:
            logger.error(f"Error in Bollinger Bands strategy for {stock_data.symbol}: {str(e)}")
            return None

class AnalysisEngine:
    """Main analysis engine coordinating multiple strategies."""
    
    def __init__(self, data_service: RealTimeDataService):
        self.data_service = data_service
        self.strategies: List[TradingStrategy] = []
        self.risk_limits = RiskLimits()
        self.executor = ThreadPoolExecutor(max_workers=5)
        self.signal_cache: Dict[str, TradingSignal] = {}
        self.analysis_cache: Dict[str, StockAnalysis] = {}
        self._cache_lock = threading.Lock()
        
        # Initialize strategies
        self._initialize_strategies()
    
    def _initialize_strategies(self):
        """Initialize trading strategies."""
        strategies_config = [
            StrategyConfig(
                name="RSI_Momentum",
                enabled=True,
                weight=0.4,
                params={"rsi_oversold": 30, "rsi_overbought": 70},
                min_confidence=0.7
            ),
            StrategyConfig(
                name="MACD_Trend",
                enabled=True,
                weight=0.35,
                params={"signal_threshold": 0.1},
                min_confidence=0.75
            ),
            StrategyConfig(
                name="Bollinger_MeanReversion",
                enabled=True,
                weight=0.25,
                params={"band_threshold": 0.1},
                min_confidence=0.7
            )
        ]
        
        strategy_classes = {
            "RSI_Momentum": RSIMomentumStrategy,
            "MACD_Trend": MACDStrategy,
            "Bollinger_MeanReversion": BollingerBandsStrategy
        }
        
        for config in strategies_config:
            if config.enabled and config.name in strategy_classes:
                strategy = strategy_classes[config.name](config)
                self.strategies.append(strategy)
                logger.info(f"Initialized strategy: {config.name}")
    
    async def analyze_stock(self, symbol: str) -> Optional[StockAnalysis]:
        """Comprehensive stock analysis."""
        try:
            # Get stock data and indicators
            stock_data = await self.data_service.get_stock_data(symbol)
            if not stock_data:
                return None
            
            indicators = await self.data_service.get_technical_indicators(symbol)
            if not indicators:
                indicators = TechnicalIndicators()
            
            # Generate signals from all strategies
            signals = await self._generate_signals(stock_data, indicators)
            
            # Analyze price trends
            price_trend = self._analyze_price_trend(stock_data, indicators)
            volume_trend = self._analyze_volume_trend(stock_data, indicators)
            
            # Calculate support and resistance levels
            support_levels, resistance_levels = self._calculate_support_resistance(stock_data)
            
            # Generate recommendation
            recommendation = self._generate_recommendation(signals, indicators)
            
            # Assess risk level
            risk_level = self._assess_risk_level(stock_data, indicators)
            
            # Calculate target and stop loss
            target_price, stop_loss = self._calculate_targets(stock_data, signals, recommendation)
            
            analysis = StockAnalysis(
                symbol=symbol,
                current_price=stock_data.current_price,
                price_trend=price_trend,
                volume_trend=volume_trend,
                technical_rating=self._get_technical_rating(signals),
                support_levels=support_levels,
                resistance_levels=resistance_levels,
                indicators=indicators,
                recommendation=recommendation,
                risk_level=risk_level,
                target_price=target_price,
                stop_loss=stop_loss,
                analyzed_at=datetime.now()
            )
            
            # Cache analysis
            with self._cache_lock:
                self.analysis_cache[symbol] = analysis
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing stock {symbol}: {str(e)}")
            return None
    
    async def _generate_signals(self, stock_data: StockData, indicators: TechnicalIndicators) -> List[TradingSignal]:
        """Generate signals from all strategies."""
        tasks = []
        for strategy in self.strategies:
            task = strategy.analyze(stock_data, indicators)
            tasks.append(task)
        
        signals = await asyncio.gather(*tasks, return_exceptions=True)
        
        valid_signals = []
        for signal in signals:
            if isinstance(signal, TradingSignal):
                valid_signals.append(signal)
                # Cache signal
                with self._cache_lock:
                    self.signal_cache[signal.id] = signal
        
        return valid_signals
    
    def _analyze_price_trend(self, stock_data: StockData, indicators: TechnicalIndicators) -> str:
        """Analyze overall price trend."""
        current_price = stock_data.current_price
        
        # Check moving averages
        uptrend_signals = 0
        downtrend_signals = 0
        
        if indicators.sma_20 and current_price > indicators.sma_20:
            uptrend_signals += 1
        elif indicators.sma_20 and current_price < indicators.sma_20:
            downtrend_signals += 1
        
        if indicators.sma_50 and current_price > indicators.sma_50:
            uptrend_signals += 1
        elif indicators.sma_50 and current_price < indicators.sma_50:
            downtrend_signals += 1
        
        if indicators.sma_20 and indicators.sma_50 and indicators.sma_20 > indicators.sma_50:
            uptrend_signals += 1
        elif indicators.sma_20 and indicators.sma_50 and indicators.sma_20 < indicators.sma_50:
            downtrend_signals += 1
        
        if uptrend_signals > downtrend_signals:
            return "Uptrend"
        elif downtrend_signals > uptrend_signals:
            return "Downtrend"
        else:
            return "Sideways"
    
    def _analyze_volume_trend(self, stock_data: StockData, indicators: TechnicalIndicators) -> str:
        """Analyze volume trend."""
        current_volume = stock_data.volume
        
        if indicators.volume_sma and current_volume > indicators.volume_sma * 1.2:
            return "High"
        elif indicators.volume_sma and current_volume < indicators.volume_sma * 0.8:
            return "Low"
        else:
            return "Normal"
    
    def _calculate_support_resistance(self, stock_data: StockData) -> Tuple[List[float], List[float]]:
        """Calculate support and resistance levels."""
        if not stock_data.prices:
            return [], []
        
        prices = [p.close for p in stock_data.prices[-50:]]  # Last 50 periods
        if len(prices) < 10:
            return [], []
        
        # Simple method: find local minima and maxima
        support_levels = []
        resistance_levels = []
        
        for i in range(2, len(prices) - 2):
            # Local minimum (support)
            if (prices[i] < prices[i-1] and prices[i] < prices[i-2] and 
                prices[i] < prices[i+1] and prices[i] < prices[i+2]):
                support_levels.append(prices[i])
            
            # Local maximum (resistance)
            if (prices[i] > prices[i-1] and prices[i] > prices[i-2] and 
                prices[i] > prices[i+1] and prices[i] > prices[i+2]):
                resistance_levels.append(prices[i])
        
        # Return top 3 of each
        support_levels = sorted(set(support_levels), reverse=True)[:3]
        resistance_levels = sorted(set(resistance_levels))[:3]
        
        return support_levels, resistance_levels
    
    def _generate_recommendation(self, signals: List[TradingSignal], indicators: TechnicalIndicators) -> str:
        """Generate overall recommendation."""
        if not signals:
            return "HOLD"
        
        buy_strength = sum(s.strength * s.confidence for s in signals if s.signal_type == SignalType.BUY)
        sell_strength = sum(s.strength * s.confidence for s in signals if s.signal_type == SignalType.SELL)
        
        if buy_strength > sell_strength * 1.2:
            return "BUY"
        elif sell_strength > buy_strength * 1.2:
            return "SELL"
        else:
            return "HOLD"
    
    def _assess_risk_level(self, stock_data: StockData, indicators: TechnicalIndicators) -> str:
        """Assess risk level of the stock."""
        risk_score = 0
        
        # Volatility assessment
        if stock_data.change_percent > 5:
            risk_score += 2
        elif stock_data.change_percent > 2:
            risk_score += 1
        
        # RSI assessment
        if indicators.rsi:
            if indicators.rsi > 80 or indicators.rsi < 20:
                risk_score += 2
            elif indicators.rsi > 70 or indicators.rsi < 30:
                risk_score += 1
        
        # Volume assessment
        volume_trend = self._analyze_volume_trend(stock_data, indicators)
        if volume_trend == "High":
            risk_score += 1
        
        if risk_score >= 4:
            return "High"
        elif risk_score >= 2:
            return "Medium"
        else:
            return "Low"
    
    def _calculate_targets(self, stock_data: StockData, signals: List[TradingSignal], recommendation: str) -> Tuple[Optional[float], Optional[float]]:
        """Calculate target price and stop loss."""
        if not signals or recommendation == "HOLD":
            return None, None
        
        current_price = stock_data.current_price
        
        # Use the highest confidence signal for targets
        best_signal = max(signals, key=lambda s: s.confidence) if signals else None
        
        if best_signal:
            return best_signal.target_price, best_signal.stop_loss
        
        # Default calculation
        if recommendation == "BUY":
            target_price = current_price * 1.06  # 6% target
            stop_loss = current_price * 0.95    # 5% stop loss
        else:  # SELL
            target_price = current_price * 0.94  # 6% target
            stop_loss = current_price * 1.05    # 5% stop loss
        
        return target_price, stop_loss
    
    def _get_technical_rating(self, signals: List[TradingSignal]) -> str:
        """Get technical rating based on signals."""
        if not signals:
            return "NEUTRAL"
        
        avg_confidence = sum(s.confidence for s in signals) / len(signals)
        
        if avg_confidence >= 0.8:
            return "STRONG"
        elif avg_confidence >= 0.6:
            return "MODERATE"
        else:
            return "WEAK"
    
    async def get_market_sentiment(self, symbols: List[str]) -> MarketSentiment:
        """Analyze overall market sentiment."""
        try:
            # Analyze multiple stocks
            analyses = []
            for symbol in symbols[:20]:  # Limit to 20 stocks for performance
                analysis = await self.analyze_stock(symbol)
                if analysis:
                    analyses.append(analysis)
            
            if not analyses:
                return MarketSentiment(
                    sentiment_score=0,
                    sentiment_label="NEUTRAL",
                    bullish_stocks=0,
                    bearish_stocks=0,
                    neutral_stocks=0,
                    market_trend="UNKNOWN",
                    volatility_index=0,
                    volume_trend="UNKNOWN"
                )
            
            # Count recommendations
            bullish_count = sum(1 for a in analyses if a.recommendation == "BUY")
            bearish_count = sum(1 for a in analyses if a.recommendation == "SELL")
            neutral_count = len(analyses) - bullish_count - bearish_count
            
            # Calculate sentiment score
            total_stocks = len(analyses)
            sentiment_score = (bullish_count - bearish_count) / total_stocks
            
            # Determine sentiment label
            if sentiment_score >= 0.3:
                sentiment_label = "BULLISH"
            elif sentiment_score <= -0.3:
                sentiment_label = "BEARISH"
            else:
                sentiment_label = "NEUTRAL"
            
            # Market trend
            uptrend_count = sum(1 for a in analyses if a.price_trend == "Uptrend")
            if uptrend_count > total_stocks * 0.6:
                market_trend = "BULLISH"
            elif uptrend_count < total_stocks * 0.4:
                market_trend = "BEARISH"
            else:
                market_trend = "MIXED"
            
            # Volatility index (simplified)
            high_risk_count = sum(1 for a in analyses if a.risk_level == "High")
            volatility_index = high_risk_count / total_stocks * 100
            
            # Volume trend
            high_volume_count = sum(1 for a in analyses if a.volume_trend == "High")
            if high_volume_count > total_stocks * 0.5:
                volume_trend = "INCREASING"
            else:
                volume_trend = "NORMAL"
            
            return MarketSentiment(
                sentiment_score=sentiment_score,
                sentiment_label=sentiment_label,
                bullish_stocks=bullish_count,
                bearish_stocks=bearish_count,
                neutral_stocks=neutral_count,
                market_trend=market_trend,
                volatility_index=volatility_index,
                volume_trend=volume_trend
            )
            
        except Exception as e:
            logger.error(f"Error calculating market sentiment: {str(e)}")
            return MarketSentiment(
                sentiment_score=0,
                sentiment_label="ERROR",
                bullish_stocks=0,
                bearish_stocks=0,
                neutral_stocks=0,
                market_trend="UNKNOWN",
                volatility_index=0,
                volume_trend="UNKNOWN"
            )
    
    def get_cached_signals(self, symbol: Optional[str] = None) -> List[TradingSignal]:
        """Get cached signals."""
        with self._cache_lock:
            if symbol:
                return [s for s in self.signal_cache.values() if s.symbol == symbol]
            else:
                return list(self.signal_cache.values())
    
    def clear_expired_signals(self):
        """Clear expired signals from cache."""
        current_time = datetime.now()
        with self._cache_lock:
            expired_keys = [
                signal_id for signal_id, signal in self.signal_cache.items()
                if signal.expires_at and signal.expires_at < current_time
            ]
            for key in expired_keys:
                del self.signal_cache[key]
    
    async def health_check(self) -> Dict[str, any]:
        """Health check for the analysis engine."""
        try:
            # Test analysis with a known stock
            test_symbol = "TCS.NS"
            start_time = datetime.now()
            analysis = await self.analyze_stock(test_symbol)
            analysis_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "status": "healthy" if analysis else "degraded",
                "test_symbol": test_symbol,
                "analysis_time_seconds": round(analysis_time, 2),
                "active_strategies": len(self.strategies),
                "cached_signals": len(self.signal_cache),
                "cached_analyses": len(self.analysis_cache),
                "strategies": [s.name for s in self.strategies]
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "active_strategies": len(self.strategies)
            }

# Global analysis engine instance will be initialized with data service
analysis_engine: Optional[AnalysisEngine] = None 