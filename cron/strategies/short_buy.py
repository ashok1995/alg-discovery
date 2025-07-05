#!/usr/bin/env python3
"""
Short Buy Strategy Cron Job
===========================

This module implements the short buy strategy cron job.
It runs every 5 minutes during market hours to find short-term buy opportunities.
"""

import logging
import os
from datetime import datetime
from typing import Dict, Any

from .base_strategy import BaseStrategyCron
from api.services.swing_trading_service import SwingTradingService
from api.services.data_service import RealTimeDataService

logger = logging.getLogger(__name__)

class ShortBuyCron(BaseStrategyCron):
    """
    Short Buy Strategy Cron Job
    
    This strategy focuses on finding short-term buy opportunities (1-4 weeks) with:
    - Momentum and reversal patterns
    - Higher risk-reward ratios
    - Volume and volatility analysis
    - Breakout confirmation signals
    """
    
    def __init__(self):
        super().__init__(
            strategy_name="short_buy",
            interval_minutes=int(os.getenv("SHORT_BUY_INTERVAL", "5"))
        )
        
        # Initialize services
        self.data_service = RealTimeDataService()
        self.swing_trading_service = SwingTradingService(self.data_service)
        
    async def execute_strategy(self) -> Dict[str, Any]:
        """Execute the short buy strategy"""
        try:
            logger.info("🔍 Executing short buy strategy...")
            
            # Get short-term buy recommendations
            recommendations = await self.swing_trading_service.get_short_term_buy_recommendations(
                limit=self.limit * 2,  # Get more than needed for filtering
                confidence_threshold=self.confidence_threshold,
                strength_threshold=self.strength_threshold
            )
            
            # Filter and format recommendations
            filtered_recommendations = []
            for rec in recommendations:
                if (rec.confidence * 100 >= self.confidence_threshold and 
                    rec.strength >= self.strength_threshold):
                    filtered_recommendations.append({
                        "symbol": rec.symbol,
                        "signal_type": rec.signal_type.value,
                        "entry_price": rec.entry_price,
                        "target_price": rec.target_price,
                        "stop_loss": rec.stop_loss,
                        "confidence": rec.confidence * 100,
                        "strength": rec.strength,
                        "timestamp": datetime.now().isoformat(),
                        "reason": rec.reasoning,
                        "technical_indicators": rec.indicators,
                        "risk_reward_ratio": rec.risk_reward_ratio,
                        "volume_ratio": rec.volume_ratio,
                        "momentum_score": rec.momentum_score,
                        "timeframe": "short_term"
                    })
                    
                    if len(filtered_recommendations) >= self.limit:
                        break
            
            # Get additional candidates from configurable strategy
            try:
                config_candidates = await self.swing_trading_service.analyzer.get_candidates_from_config("short_term_buy")
                if config_candidates:
                    for symbol in config_candidates[:self.limit]:
                        try:
                            analysis = await self.swing_trading_service.analyzer.analyze_stock_with_config(symbol, "short_term_buy")
                            if analysis and analysis['confidence'] >= self.confidence_threshold:
                                filtered_recommendations.append({
                                    "symbol": symbol,
                                    "signal_type": "BUY",
                                    "entry_price": analysis.get('entry_price', 0),
                                    "target_price": analysis.get('target_price', 0),
                                    "stop_loss": analysis.get('stop_loss', 0),
                                    "confidence": analysis['confidence'],
                                    "strength": analysis['strength'],
                                    "timestamp": datetime.now().isoformat(),
                                    "reason": analysis.get('reason', 'Short-term momentum analysis'),
                                    "technical_indicators": analysis.get('indicators', {}),
                                    "risk_reward_ratio": analysis.get('risk_reward_ratio', 1.5),
                                    "volume_ratio": analysis.get('volume_ratio', 1.0),
                                    "momentum_score": analysis.get('momentum_score', 50),
                                    "timeframe": "short_term",
                                    "source": "config_strategy"
                                })
                                
                                if len(filtered_recommendations) >= self.limit:
                                    break
                        except Exception as e:
                            logger.debug(f"Error analyzing {symbol}: {e}")
                            continue
            except Exception as e:
                logger.warning(f"Could not get config candidates: {e}")
            
            # Sort by confidence and strength
            filtered_recommendations.sort(
                key=lambda x: (x['confidence'], x['strength']), 
                reverse=True
            )
            
            # Limit to requested number
            final_recommendations = filtered_recommendations[:self.limit]
            
            # Calculate summary statistics
            avg_confidence = sum(r['confidence'] for r in final_recommendations) / len(final_recommendations) if final_recommendations else 0
            avg_strength = sum(r['strength'] for r in final_recommendations) / len(final_recommendations) if final_recommendations else 0
            high_confidence_count = sum(1 for r in final_recommendations if r['confidence'] >= 70)
            
            result = {
                "strategy": "short_buy",
                "timestamp": datetime.now().isoformat(),
                "total_candidates_found": len(recommendations),
                "recommendations_returned": len(final_recommendations),
                "filters_applied": {
                    "confidence_threshold": self.confidence_threshold,
                    "strength_threshold": self.strength_threshold,
                    "limit": self.limit
                },
                "market_conditions": {
                    "scan_time": datetime.now().isoformat(),
                    "active_signals": len(final_recommendations),
                    "avg_confidence": round(avg_confidence, 2),
                    "avg_strength": round(avg_strength, 2),
                    "high_confidence_count": high_confidence_count
                },
                "recommendations": final_recommendations,
                "scan_sources": ["swing_trading_service", "config_strategy"],
                "timeframe": "1-4 weeks"
            }
            
            logger.info(f"✅ Short buy strategy completed: {len(final_recommendations)} recommendations")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error executing short buy strategy: {e}")
            raise 