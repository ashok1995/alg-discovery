#!/usr/bin/env python3
"""
Intraday Sell Strategy Cron Job
===============================

This module implements the intraday sell strategy cron job.
It runs every 5 minutes during market hours to find intraday sell opportunities.
"""

import logging
import os
from datetime import datetime
from typing import Dict, Any

from .base_strategy import BaseStrategyCron
from api.services.intraday_service import IntradayService
from api.services.data_service import RealTimeDataService

logger = logging.getLogger(__name__)

class IntradaySellCron(BaseStrategyCron):
    """
    Intraday Sell Strategy Cron Job
    
    This strategy focuses on finding intraday sell opportunities with:
    - Bearish momentum stocks
    - Breakdown patterns
    - Overbought conditions
    - Volume confirmation
    """
    
    def __init__(self):
        super().__init__(
            strategy_name="intraday_sell",
            interval_minutes=int(os.getenv("INTRADAY_SELL_INTERVAL", "5"))
        )
        
        # Initialize services
        self.data_service = RealTimeDataService()
        self.intraday_service = IntradayService(self.data_service)
        
    async def execute_strategy(self) -> Dict[str, Any]:
        """Execute the intraday sell strategy"""
        try:
            logger.info("🔍 Executing intraday sell strategy...")
            
            # Get intraday sell recommendations
            recommendations = await self.intraday_service.get_intraday_sell_recommendations(
                limit=self.limit * 2,  # Get more than needed for filtering
                chartink_theme="intraday_sell"
            )
            
            # Filter recommendations based on thresholds
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
                        "momentum_score": rec.momentum_score
                    })
                    
                    if len(filtered_recommendations) >= self.limit:
                        break
            
            # Get additional bearish candidates from screening
            all_stocks = await self.intraday_service.screener.screen_stocks("momentum_breakout")
            
            # Look for bearish signals
            for candidate in all_stocks:
                # Bearish breakdown signals
                if (candidate.change_percent < -1.5 and 
                    candidate.momentum_score < 40 and 
                    candidate.volume_ratio > 1.5 and
                    len(filtered_recommendations) < self.limit):
                    
                    filtered_recommendations.append({
                        "symbol": candidate.symbol,
                        "signal_type": "SELL",
                        "entry_price": candidate.current_price,
                        "target_price": candidate.current_price * 0.97,
                        "stop_loss": candidate.current_price * 1.02,
                        "confidence": min((100 - candidate.momentum_score), 85.0),
                        "strength": 100 - candidate.momentum_score,
                        "timestamp": datetime.now().isoformat(),
                        "reason": f"Bearish breakdown: weak momentum {candidate.momentum_score:.1f}, selling volume {candidate.volume_ratio:.1f}x",
                        "technical_indicators": {
                            "momentum_score": candidate.momentum_score,
                            "volume_ratio": candidate.volume_ratio,
                            "change_percent": candidate.change_percent
                        },
                        "risk_reward_ratio": 2.0,
                        "volume_ratio": candidate.volume_ratio,
                        "momentum_score": candidate.momentum_score,
                        "source": "bearish_screener"
                    })
                
                # Overbought reversal signals
                elif (candidate.rsi and candidate.rsi > 75 and 
                      candidate.change_percent > 3.0 and 
                      candidate.volatility_score > 60 and
                      len(filtered_recommendations) < self.limit):
                    
                    filtered_recommendations.append({
                        "symbol": candidate.symbol,
                        "signal_type": "SELL",
                        "entry_price": candidate.current_price,
                        "target_price": candidate.current_price * 0.95,
                        "stop_loss": candidate.current_price * 1.025,
                        "confidence": 75.0,
                        "strength": candidate.rsi,
                        "timestamp": datetime.now().isoformat(),
                        "reason": f"Overbought reversal: RSI {candidate.rsi:.1f}, extended rally showing exhaustion",
                        "technical_indicators": {
                            "rsi": candidate.rsi,
                            "volatility_score": candidate.volatility_score,
                            "change_percent": candidate.change_percent
                        },
                        "risk_reward_ratio": 2.5,
                        "volume_ratio": candidate.volume_ratio,
                        "momentum_score": candidate.momentum_score,
                        "source": "reversal_screener"
                    })
            
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
                "strategy": "intraday_sell",
                "timestamp": datetime.now().isoformat(),
                "total_candidates_found": len(recommendations) + len(all_stocks),
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
                "scan_sources": ["intraday_service", "bearish_screener", "reversal_screener"]
            }
            
            logger.info(f"✅ Intraday sell strategy completed: {len(final_recommendations)} recommendations")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error executing intraday sell strategy: {e}")
            raise 