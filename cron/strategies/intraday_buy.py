#!/usr/bin/env python3
"""
Intraday Buy Strategy Cron Job
==============================

This module implements the intraday buy strategy cron job.
It runs every 5 minutes during market hours to find intraday buy opportunities.
"""

import logging
import os
from datetime import datetime
from typing import Dict, Any

from .base_strategy import BaseStrategyCron
from api.services.intraday_service import IntradayService
from api.services.data_service import RealTimeDataService

logger = logging.getLogger(__name__)

class IntradayBuyCron(BaseStrategyCron):
    """
    Intraday Buy Strategy Cron Job
    
    This strategy focuses on finding intraday buy opportunities with:
    - High momentum stocks
    - Breakout patterns
    - Volume confirmation
    - RSI optimization
    """
    
    def __init__(self):
        super().__init__(
            strategy_name="intraday_buy",
            interval_minutes=int(os.getenv("INTRADAY_BUY_INTERVAL", "5"))
        )
        
        # Initialize services
        self.data_service = RealTimeDataService()
        self.intraday_service = IntradayService(self.data_service)
        
    async def execute_strategy(self) -> Dict[str, Any]:
        """Execute the intraday buy strategy"""
        try:
            logger.info("🔍 Executing intraday buy strategy...")
            
            # Get intraday buy recommendations
            recommendations = await self.intraday_service.get_intraday_buy_recommendations(
                limit=self.limit * 2,  # Get more than needed for filtering
                chartink_theme="intraday_buy"
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
            
            # Get additional candidates from screeners
            breakout_candidates = await self.intraday_service.get_breakout_candidates(self.limit)
            volume_leaders = await self.intraday_service.get_volume_leaders(self.limit)
            
            # Process breakout candidates
            for candidate in breakout_candidates:
                if (candidate.overall_score >= self.strength_threshold and 
                    len(filtered_recommendations) < self.limit):
                    
                    filtered_recommendations.append({
                        "symbol": candidate.symbol,
                        "signal_type": "BUY",
                        "entry_price": candidate.current_price,
                        "target_price": candidate.current_price * 1.03,
                        "stop_loss": candidate.current_price * 0.98,
                        "confidence": min(candidate.overall_score, 95.0),
                        "strength": candidate.overall_score,
                        "timestamp": datetime.now().isoformat(),
                        "reason": f"Breakout candidate: momentum {candidate.momentum_score:.1f}, volume {candidate.volume_ratio:.1f}x",
                        "technical_indicators": {
                            "rsi": candidate.rsi or 0,
                            "momentum_score": candidate.momentum_score,
                            "volume_ratio": candidate.volume_ratio
                        },
                        "risk_reward_ratio": 1.5,
                        "volume_ratio": candidate.volume_ratio,
                        "momentum_score": candidate.momentum_score,
                        "source": "breakout_screener"
                    })
            
            # Process volume leaders
            for candidate in volume_leaders:
                if (candidate.overall_score >= self.strength_threshold and 
                    candidate.change_percent > 0 and
                    len(filtered_recommendations) < self.limit):
                    
                    filtered_recommendations.append({
                        "symbol": candidate.symbol,
                        "signal_type": "BUY",
                        "entry_price": candidate.current_price,
                        "target_price": candidate.current_price * 1.025,
                        "stop_loss": candidate.current_price * 0.985,
                        "confidence": min(candidate.volume_score, 90.0),
                        "strength": candidate.overall_score,
                        "timestamp": datetime.now().isoformat(),
                        "reason": f"Volume leader: {candidate.volume_ratio:.1f}x volume, {candidate.change_percent:.1f}% gain",
                        "technical_indicators": {
                            "volume_ratio": candidate.volume_ratio,
                            "momentum_score": candidate.momentum_score,
                            "change_percent": candidate.change_percent
                        },
                        "risk_reward_ratio": 1.67,
                        "volume_ratio": candidate.volume_ratio,
                        "momentum_score": candidate.momentum_score,
                        "source": "volume_screener"
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
                "strategy": "intraday_buy",
                "timestamp": datetime.now().isoformat(),
                "total_candidates_found": len(recommendations) + len(breakout_candidates) + len(volume_leaders),
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
                "scan_sources": ["intraday_service", "breakout_screener", "volume_screener"]
            }
            
            logger.info(f"✅ Intraday buy strategy completed: {len(final_recommendations)} recommendations")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error executing intraday buy strategy: {e}")
            raise 