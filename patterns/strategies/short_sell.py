"""
Short selling strategies
"""

import pandas as pd
import numpy as np
from analysis.technical import add_all_indicators
from analysis.patterns import identify_all_patterns
from analysis.risk_reward import calculate_reward_risk, calculate_position_size
from shared.config.settings import DEFAULT_RISK_PERCENT, DEFAULT_REWARD_RISK_RATIO
from utils.logger import get_logger

logger = get_logger(__name__, group="shared", service="strategy_short_sell")

def breakdown_short_strategy(df, account_balance=100000, risk_percent=DEFAULT_RISK_PERCENT):
    """
    Breakdown short strategy for short selling
    
    Args:
        df: DataFrame with OHLCV data
        account_balance: Account balance
        risk_percent: Risk percentage
    
    Returns:
        Dictionary with strategy analysis
    """
    try:
        # Add indicators and patterns
        df = add_all_indicators(df)
        df = identify_all_patterns(df)
        
        # Check for breakdown setup
        latest = df.iloc[-1]
        prev = df.iloc[-2]
        
        # Calculate recent low
        recent_low = df['Low'].rolling(window=10).min().iloc[-2]
        
        # Strategy criteria
        criteria_met = (
            latest['Close'] < recent_low and  # Price broke below recent low
            latest['Close'] < latest['SMA_50'] and
            latest['RSI'] < 40 and
            latest['MACD'] < latest['MACD_Signal'] and
            latest['Volume'] > df['Volume'].rolling(window=20).mean().iloc[-1] * 1.2  # Increased volume
        )
        
        if not criteria_met:
            return {
                "strategy": "breakdown_short",
                "signal": "no_signal",
                "criteria_met": False
            }
        
        # Calculate entry, stop loss, and target
        entry_price = latest['Close']
        stop_loss = max(
            latest['High'],
            latest['Close'] + (1.5 * latest['ATR'])
        )
        
        # Calculate reward/risk
        rr = calculate_reward_risk(df, entry_price, stop_loss)
        reward_risk_ratio = rr['reward_risk_ratio']
        
        # Check if reward/risk ratio is acceptable
        if reward_risk_ratio < DEFAULT_REWARD_RISK_RATIO:
            return {
                "strategy": "breakdown_short",
                "signal": "no_signal",
                "criteria_met": True,
                "reason": "insufficient_reward_risk",
                "reward_risk_ratio": reward_risk_ratio
            }
        
        # Calculate position size
        position = calculate_position_size(account_balance, risk_percent, entry_price, stop_loss)
        
        return {
            "strategy": "breakdown_short",
            "signal": "sell",
            "criteria_met": True,
            "entry_price": entry_price,
            "stop_loss": stop_loss,
            "target": rr['target'],
            "reward_risk_ratio": reward_risk_ratio,
            "shares": position['shares'],
            "position_value": position['position_value'],
            "risk_amount": position['risk_amount'],
            "risk_percent": position['risk_percent']
        }
    except Exception as e:
        logger.error(f"Error in breakdown short strategy: {e}")
        return {
            "strategy": "breakdown_short",
            "signal": "error",
            "error": str(e)
        }

def volatility_short_strategy(df, account_balance=100000, risk_percent=DEFAULT_RISK_PERCENT):
    """
    Volatility short strategy for short selling
    
    Args:
        df: DataFrame with OHLCV data
        account_balance: Account balance
        risk_percent: Risk percentage
    
    Returns:
        Dictionary with strategy analysis
    """
    try:
        # Add indicators and patterns
        df = add_all_indicators(df)
        df = identify_all_patterns(df)
        
        # Check for volatility short setup
        latest = df.iloc[-1]
        
        # Strategy criteria
        criteria_met = (
            latest['Close'] < latest['SMA_50'] and
            latest['BB_Width'] > df['BB_Width'].rolling(window=20).mean().iloc[-1] * 1.5 and  # High volatility
            latest['Close'] > latest['BB_Upper'] and  # Price above upper Bollinger Band
            latest['RSI'] > 70 and  # Overbought
            latest['MACD'] < latest['MACD_Signal']  # MACD bearish
        )
        
        if not criteria_met:
            return {
                "strategy": "volatility_short",
                "signal": "no_signal",
                "criteria_met": False
            }
        
        # Calculate entry, stop loss, and target
        entry_price = latest['Close']
        stop_loss = max(
            latest['High'],
            latest['Close'] + (1.5 * latest['ATR'])
        )
        
        # Calculate reward/risk
        rr = calculate_reward_risk(df, entry_price, stop_loss)
        reward_risk_ratio = rr['reward_risk_ratio']
        
        # Check if reward/risk ratio is acceptable
        if reward_risk_ratio < DEFAULT_REWARD_RISK_RATIO:
            return {
                "strategy": "volatility_short",
                "signal": "no_signal",
                "criteria_met": True,
                "reason": "insufficient_reward_risk",
                "reward_risk_ratio": reward_risk_ratio
            }
        
        # Calculate position size
        position = calculate_position_size(account_balance, risk_percent, entry_price, stop_loss)
        
        return {
            "strategy": "volatility_short",
            "signal": "sell",
            "criteria_met": True,
            "entry_price": entry_price,
            "stop_loss": stop_loss,
            "target": rr['target'],
            "reward_risk_ratio": reward_risk_ratio,
            "shares": position['shares'],
            "position_value": position['position_value'],
            "risk_amount": position['risk_amount'],
            "risk_percent": position['risk_percent']
        }
    except Exception as e:
        logger.error(f"Error in volatility short strategy: {e}")
        return {
            "strategy": "volatility_short",
            "signal": "error",
            "error": str(e)
        }

def get_short_sell_strategy(strategy_name):
    """
    Get short selling strategy function by name
    
    Args:
        strategy_name: Strategy name
    
    Returns:
        Strategy function
    """
    strategies = {
        "breakdown_short": breakdown_short_strategy,
        "volatility_short": volatility_short_strategy
    }
    
    return strategies.get(strategy_name)

def analyze_stock_short_sell(symbol, df, strategy_names, account_balance=100000, risk_percent=DEFAULT_RISK_PERCENT):
    """
    Analyze stock for short selling using multiple strategies
    
    Args:
        symbol: Stock symbol
        df: DataFrame with OHLCV data
        strategy_names: List of strategy names to use
        account_balance: Account balance
        risk_percent: Risk percentage
    
    Returns:
        Dictionary with analysis results
    """
    results = []
    
    for strategy_name in strategy_names:
        strategy_func = get_short_sell_strategy(strategy_name)
        if strategy_func:
            result = strategy_func(df, account_balance, risk_percent)
            result["symbol"] = symbol
            results.append(result)
    
    # Find sell signals
    sell_signals = [r for r in results if r.get("signal") == "sell"]
    
    if sell_signals:
        # Sort by reward/risk ratio (descending)
        best_sell = sorted(sell_signals, key=lambda x: x.get("reward_risk_ratio", 0), reverse=True)[0]
        return {
            "symbol": symbol,
            "signal": "sell",
            "strategy": best_sell["strategy"],
            "entry_price": best_sell["entry_price"],
            "stop_loss": best_sell["stop_loss"],
            "target": best_sell["target"],
            "reward_risk_ratio": best_sell["reward_risk_ratio"],
            "shares": best_sell["shares"],
            "position_value": best_sell["position_value"],
            "risk_amount": best_sell["risk_amount"],
            "risk_percent": best_sell["risk_percent"]
        }
    else:
        return {
            "symbol": symbol,
            "signal": "no_signal",
            "strategies_checked": strategy_names
        } 