#!/usr/bin/env python3
"""
Long Buy Strategy Cron Job
==========================

This module implements the long buy strategy cron job.
It runs every 30 minutes during market hours to find long-term buy opportunities.
"""

import logging
import os
from datetime import datetime
from typing import Dict, Any

from .base_strategy import BaseStrategyCron
from api.services.long_term_service import LongTermInvestmentService
from api.services.data_service import RealTimeDataService

logger = logging.getLogger(__name__)

class LongBuyCron(BaseStrategyCron):
    """
    Long Buy Strategy Cron Job
    
    This strategy focuses on finding long-term buy opportunities (1+ years) with:
    - Fundamental and technical convergence
    - Value and growth analysis
    - Quality stock selection with sustainable returns
    - Comprehensive scoring based on multiple metrics
    """
    
    def __init__(self):
        super().__init__(
            strategy_name="long_buy",
            interval_minutes=int(os.getenv("LONG_BUY_INTERVAL", "30"))
        )
        
        # Initialize services
        self.data_service = RealTimeDataService()
        self.long_term_service = LongTermInvestmentService(self.data_service)
        
    async def execute_strategy(self) -> Dict[str, Any]:
        """Execute the long buy strategy"""
        try:
            logger.info("🔍 Executing long buy strategy...")
            
            # Get long-term recommendations
            result_data = await self.long_term_service.get_recommendations(
                limit=self.limit * 2,  # Get more than needed for filtering
                min_score=self.confidence_threshold
            )
            
            # Extract recommendations from the result
            recommendations = result_data.get('recommendations', [])
            
            # Filter and format recommendations
            filtered_recommendations = []
            for rec in recommendations:
                if rec['overall_score'] >= self.confidence_threshold:
                    filtered_recommendations.append({
                        "symbol": rec['symbol'],
                        "signal_type": "LONG_TERM_BUY",
                        "entry_price": rec['current_price'],
                        "target_price": rec['target_price'],
                        "stop_loss": rec['current_price'] * 0.88,  # 12% stop loss
                        "confidence": min(rec['overall_score'], 100),
                        "strength": min(rec['overall_score'], 100),
                        "timestamp": datetime.now().isoformat(),
                        "reason": f"Long-term investment: Score {rec['overall_score']:.1f}/100, Expected return {rec['expected_return']:.1f}%",
                        "technical_indicators": {
                            'overall_score': rec['overall_score'],
                            'fundamental_score': rec.get('fundamental_score', 0),
                            'growth_score': rec.get('growth_score', 0),
                            'quality_score': rec.get('quality_score', 0),
                            'expected_return': rec['expected_return'],
                            'sector': rec.get('sector', 'Unknown')
                        },
                        "risk_reward_ratio": rec['expected_return'] / 12.0,  # Expected return vs 12% stop loss
                        "volume_ratio": 1.0,  # Default for long-term
                        "momentum_score": rec.get('technical_score', 50),
                        "timeframe": "long_term",
                        "expected_return": rec['expected_return'],
                        "sector": rec.get('sector', 'Unknown')
                    })
                    
                    if len(filtered_recommendations) >= self.limit:
                        break
            
            # Get market outlook for context
            try:
                market_outlook = await self.long_term_service.get_market_outlook()
            except Exception as e:
                logger.warning(f"Could not get market outlook: {e}")
                market_outlook = {}
            
            # Get sector analysis for diversification
            try:
                sector_analysis = await self.long_term_service.get_sector_analysis(limit_per_sector=3)
            except Exception as e:
                logger.warning(f"Could not get sector analysis: {e}")
                sector_analysis = {}
            
            # Sort by overall score
            filtered_recommendations.sort(
                key=lambda x: x['confidence'], 
                reverse=True
            )
            
            # Limit to requested number
            final_recommendations = filtered_recommendations[:self.limit]
            
            # Calculate summary statistics
            avg_confidence = sum(r['confidence'] for r in final_recommendations) / len(final_recommendations) if final_recommendations else 0
            avg_strength = sum(r['strength'] for r in final_recommendations) / len(final_recommendations) if final_recommendations else 0
            high_confidence_count = sum(1 for r in final_recommendations if r['confidence'] >= 70)
            avg_expected_return = sum(r['expected_return'] for r in final_recommendations) / len(final_recommendations) if final_recommendations else 0
            
            result = {
                "strategy": "long_buy",
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
                    "avg_expected_return": round(avg_expected_return, 2),
                    "high_confidence_count": high_confidence_count,
                    "market_sentiment": market_outlook.get('market_sentiment', 'Unknown'),
                    "investment_advice": market_outlook.get('investment_advice', 'No advice available')
                },
                "recommendations": final_recommendations,
                "scan_sources": ["long_term_service"],
                "timeframe": "1+ years",
                "market_context": {
                    "outlook": market_outlook,
                    "sector_analysis": sector_analysis
                }
            }
            
            logger.info(f"✅ Long buy strategy completed: {len(final_recommendations)} recommendations")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error executing long buy strategy: {e}")
            raise 