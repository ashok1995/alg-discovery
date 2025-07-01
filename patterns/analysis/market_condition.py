"""
Market condition analyzer
"""

import pandas as pd
import numpy as np
from data.yahoo import get_market_index_data
from analysis.technical import add_all_indicators
from utils.logger import get_logger

logger = get_logger(__name__)

def analyze_market_condition(index_symbol="^NSEI", period="3mo", interval="1d"):
    """
    Analyze market condition
    
    Args:
        index_symbol: Market index symbol
        period: Time period to analyze
        interval: Data interval
    
    Returns:
        Dictionary with market condition analysis
    """
    try:
        # Get market index data
        df = get_market_index_data(index_symbol, period, interval)
        if df is None or len(df) < 50:
            logger.warning(f"Insufficient data for market condition analysis")
            return {
                "trend": "unknown",
                "strength": 0,
                "volatility": 0,
                "momentum": 0,
                "overall": "neutral"
            }
        
        # Add technical indicators
        df = add_all_indicators(df)
        
        # Analyze trend
        trend_above_200 = df['Close'].iloc[-1] > df['SMA_200'].iloc[-1]
        trend_above_50 = df['Close'].iloc[-1] > df['SMA_50'].iloc[-1]
        trend_50_above_200 = df['SMA_50'].iloc[-1] > df['SMA_200'].iloc[-1]
        
        if trend_above_200 and trend_above_50 and trend_50_above_200:
            trend = "strong_bullish"
            trend_score = 1.0
        elif trend_above_50 and trend_50_above_200:
            trend = "bullish"
            trend_score = 0.75
        elif trend_above_50:
            trend = "weak_bullish"
            trend_score = 0.6
        elif not trend_above_200 and not trend_above_50 and not trend_50_above_200:
            trend = "strong_bearish"
            trend_score = 0.0
        elif not trend_above_50 and not trend_50_above_200:
            trend = "bearish"
            trend_score = 0.25
        elif not trend_above_50:
            trend = "weak_bearish"
            trend_score = 0.4
        else:
            trend = "neutral"
            trend_score = 0.5
        
        # Analyze trend strength (ADX)
        adx = df['ADX'].iloc[-1]
        if adx > 30:
            strength = "strong"
            strength_score = 1.0
        elif adx > 20:
            strength = "moderate"
            strength_score = 0.7
        else:
            strength = "weak"
            strength_score = 0.4
        
        # Analyze volatility (Bollinger Band Width)
        bb_width = df['BB_Width'].iloc[-1]
        bb_width_avg = df['BB_Width'].rolling(window=20).mean().iloc[-1]
        
        if bb_width > bb_width_avg * 1.5:
            volatility = "high"
            volatility_score = 1.0
        elif bb_width > bb_width_avg * 1.2:
            volatility = "above_average"
            volatility_score = 0.8
        elif bb_width < bb_width_avg * 0.8:
            volatility = "low"
            volatility_score = 0.3
        else:
            volatility = "average"
            volatility_score = 0.5
        
        # Analyze momentum (RSI)
        rsi = df['RSI'].iloc[-1]
        if rsi > 70:
            momentum = "overbought"
            momentum_score = 0.3  # Overbought is not good for future momentum
        elif rsi > 60:
            momentum = "strong"
            momentum_score = 0.9
        elif rsi > 50:
            momentum = "positive"
            momentum_score = 0.7
        elif rsi > 40:
            momentum = "neutral"
            momentum_score = 0.5
        elif rsi > 30:
            momentum = "negative"
            momentum_score = 0.3
        else:
            momentum = "oversold"
            momentum_score = 0.7  # Oversold can be good for future momentum
        
        # Calculate overall market condition score
        overall_score = (
            0.4 * trend_score +
            0.2 * strength_score +
            0.2 * momentum_score +
            0.2 * (1 - volatility_score if trend_score < 0.5 else volatility_score)
        )
        
        if overall_score > 0.8:
            overall = "strongly_bullish"
        elif overall_score > 0.6:
            overall = "bullish"
        elif overall_score > 0.4:
            overall = "neutral"
        elif overall_score > 0.2:
            overall = "bearish"
        else:
            overall = "strongly_bearish"
        
        return {
            "trend": trend,
            "trend_score": trend_score,
            "strength": strength,
            "strength_score": strength_score,
            "volatility": volatility,
            "volatility_score": volatility_score,
            "momentum": momentum,
            "momentum_score": momentum_score,
            "overall": overall,
            "overall_score": overall_score
        }
    except Exception as e:
        logger.error(f"Error analyzing market condition: {e}")
        return {
            "trend": "unknown",
            "strength": "unknown",
            "volatility": "unknown",
            "momentum": "unknown",
            "overall": "neutral"
        }

def get_recommended_strategies(market_condition):
    """
    Get recommended strategies based on market condition
    
    Args:
        market_condition: Market condition dictionary
    
    Returns:
        Dictionary with recommended strategies
    """
    try:
        overall = market_condition.get("overall", "neutral")
        trend = market_condition.get("trend", "neutral")
        volatility = market_condition.get("volatility", "average")
        
        strategies = {
            "intraday": [],
            "swing": [],
            "long_term": [],
            "short_sell": []
        }
        
        # Intraday strategies
        if overall in ["strongly_bullish", "bullish"]:
            strategies["intraday"].append("momentum_long")
            strategies["intraday"].append("breakout_long")
            
            if volatility in ["high", "above_average"]:
                strategies["intraday"].append("volatility_long")
        
        elif overall in ["strongly_bearish", "bearish"]:
            strategies["intraday"].append("momentum_short")
            strategies["intraday"].append("breakdown_short")
            
            if volatility in ["high", "above_average"]:
                strategies["intraday"].append("volatility_short")
        
        else:  # neutral
            if volatility in ["high", "above_average"]:
                strategies["intraday"].append("range_trading")
                strategies["intraday"].append("volatility_both")
            else:
                strategies["intraday"].append("scalping")
        
        # Swing strategies
        if overall in ["strongly_bullish", "bullish"]:
            strategies["swing"].append("trend_following_long")
            strategies["swing"].append("pullback_long")
            
            if trend == "strong_bullish":
                strategies["swing"].append("breakout_long")
        
        elif overall in ["strongly_bearish", "bearish"]:
            strategies["swing"].append("trend_following_short")
            strategies["swing"].append("rally_short")
            
            if trend == "strong_bearish":
                strategies["swing"].append("breakdown_short")
        
        else:  # neutral
            strategies["swing"].append("range_bound")
            strategies["swing"].append("mean_reversion")
        
        # Long-term strategies
        if overall in ["strongly_bullish", "bullish", "neutral"]:
            strategies["long_term"].append("value_investing")
            strategies["long_term"].append("growth_investing")
            
            if overall in ["strongly_bullish", "bullish"]:
                strategies["long_term"].append("momentum_investing")
        
        # Short-sell strategies
        if overall in ["strongly_bearish", "bearish"]:
            strategies["short_sell"].append("trend_following_short")
            strategies["short_sell"].append("breakdown_short")
            
            if volatility in ["high", "above_average"]:
                strategies["short_sell"].append("volatility_short")
        
        return strategies
    except Exception as e:
        logger.error(f"Error getting recommended strategies: {e}")
        return {
            "intraday": ["scalping"],
            "swing": ["mean_reversion"],
            "long_term": ["value_investing"],
            "short_sell": []
        }

"""
Function to generate default market condition data when actual analysis is unavailable
"""

def get_default_market_condition():
    """
    Return default market condition data when real analysis is unavailable
    
    Returns:
        Dict: Default market condition values
    """
    return {
        "overall": "Neutral",
        "trend": "Sideways",
        "strength": "Moderate",
        "volatility": "Medium",
        "momentum": "Neutral",
        "NIFTY": {
            "value": "19,425.35",
            "change": "+0.75%"
        },
        "SENSEX": {
            "value": "65,214.50",
            "change": "+0.62%"
        },
        "BANKNIFTY": {
            "value": "44,123.70",
            "change": "-0.18%"
        }
    } 