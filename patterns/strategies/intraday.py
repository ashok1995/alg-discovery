"""
Intraday trading strategies
"""

import pandas as pd
import numpy as np
from analysis.technical import add_all_indicators
from analysis.patterns import identify_all_patterns
from analysis.risk_reward import calculate_reward_risk, calculate_position_size
from config.settings import DEFAULT_RISK_PERCENT, DEFAULT_REWARD_RISK_RATIO
from utils.logger import get_logger

logger = get_logger(__name__)

def momentum_long_strategy(df, account_balance=100000, risk_percent=DEFAULT_RISK_PERCENT):
    """
    Momentum long strategy for intraday trading
    
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
        
        # Check for momentum long setup
        latest = df.iloc[-1]
        
        # Strategy criteria
        criteria_met = (
            latest['Close'] > latest['EMA_8'] > latest['EMA_21'] and
            latest['RSI'] > 50 and
            latest['MACD'] > latest['MACD_Signal'] and
            latest['Volume'] > df['Volume'].rolling(window=20).mean().iloc[-1]
        )
        
        if not criteria_met:
            return {
                "strategy": "momentum_long",
                "signal": "no_signal",
                "criteria_met": False
            }
        
        # Calculate entry, stop loss, and target
        entry_price = latest['Close']
        stop_loss = min(latest['Low'], latest['Close'] - (2 * latest['ATR']))
        
        # Calculate reward/risk
        rr = calculate_reward_risk(df, entry_price, stop_loss)
        
        # Check if reward/risk ratio is acceptable
        if rr['reward_risk_ratio'] < DEFAULT_REWARD_RISK_RATIO:
            return {
                "strategy": "momentum_long",
                "signal": "no_signal",
                "criteria_met": True,
                "reason": "insufficient_reward_risk",
                "reward_risk_ratio": rr['reward_risk_ratio']
            }
        
        # Calculate position size
        position = calculate_position_size(account_balance, risk_percent, entry_price, stop_loss)
        
        return {
            "strategy": "momentum_long",
            "signal": "buy",
            "criteria_met": True,
            "entry_price": entry_price,
            "stop_loss": stop_loss,
            "target": rr['target'],
            "reward_risk_ratio": rr['reward_risk_ratio'],
            "shares": position['shares'],
            "position_value": position['position_value'],
            "risk_amount": position['risk_amount'],
            "risk_percent": position['risk_percent']
        }
    except Exception as e:
        logger.error(f"Error in momentum long strategy: {e}")
        return {
            "strategy": "momentum_long",
            "signal": "error",
            "error": str(e)
        }

def breakout_long_strategy(df, account_balance=100000, risk_percent=DEFAULT_RISK_PERCENT):
    """
    Breakout long strategy for intraday trading
    
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
        
        # Check for breakout setup
        latest = df.iloc[-1]
        prev = df.iloc[-2]
        
        # Calculate recent high
        recent_high = df['High'].rolling(window=10).max().iloc[-2]
        
        # Strategy criteria
        criteria_met = (
            latest['Close'] > recent_high and
            latest['Volume'] > 1.5 * df['Volume'].rolling(window=20).mean().iloc[-1] and
            latest['RSI'] > 50 and
            latest['ADX'] > 20
        )
        
        if not criteria_met:
            return {
                "strategy": "breakout_long",
                "signal": "no_signal",
                "criteria_met": False
            }
        
        # Calculate entry, stop loss, and target
        entry_price = latest['Close']
        stop_loss = min(prev['Low'], latest['Low'], latest['Close'] - (1.5 * latest['ATR']))
        
        # Calculate reward/risk
        rr = calculate_reward_risk(df, entry_price, stop_loss)
        
        # Check if reward/risk ratio is acceptable
        if rr['reward_risk_ratio'] < DEFAULT_REWARD_RISK_RATIO:
            return {
                "strategy": "breakout_long",
                "signal": "no_signal",
                "criteria_met": True,
                "reason": "insufficient_reward_risk",
                "reward_risk_ratio": rr['reward_risk_ratio']
            }
        
        # Calculate position size
        position = calculate_position_size(account_balance, risk_percent, entry_price, stop_loss)
        
        return {
            "strategy": "breakout_long",
            "signal": "buy",
            "criteria_met": True,
            "entry_price": entry_price,
            "stop_loss": stop_loss,
            "target": rr['target'],
            "reward_risk_ratio": rr['reward_risk_ratio'],
            "shares": position['shares'],
            "position_value": position['position_value'],
            "risk_amount": position['risk_amount'],
            "risk_percent": position['risk_percent']
        }
    except Exception as e:
        logger.error(f"Error in breakout long strategy: {e}")
        return {
            "strategy": "breakout_long",
            "signal": "error",
            "error": str(e)
        }

def momentum_short_strategy(df, account_balance=100000, risk_percent=DEFAULT_RISK_PERCENT):
    """
    Momentum short strategy for intraday trading
    
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
        
        # Check for momentum short setup
        latest = df.iloc[-1]
        
        # Strategy criteria
        criteria_met = (
            latest['Close'] < latest['EMA_8'] < latest['EMA_21'] and
            latest['RSI'] < 50 and
            latest['MACD'] < latest['MACD_Signal'] and
            latest['Volume'] > df['Volume'].rolling(window=20).mean().iloc[-1]
        )
        
        if not criteria_met:
            return {
                "strategy": "momentum_short",
                "signal": "no_signal",
                "criteria_met": False
            }
        
        # Calculate entry, stop loss, and target
        entry_price = latest['Close']
        stop_loss = max(latest['High'], latest['Close'] + (2 * latest['ATR']))
        
        # Calculate reward/risk
        rr = calculate_reward_risk(df, entry_price, stop_loss)
        
        # For short positions, we need to adjust the reward/risk calculation
        reward = abs(entry_price - rr['support'])
        risk = abs(stop_loss - entry_price)
        
        if risk == 0:
            reward_risk_ratio = 0
        else:
            reward_risk_ratio = reward / risk
        
        # Check if reward/risk ratio is acceptable
        if reward_risk_ratio < DEFAULT_REWARD_RISK_RATIO:
            return {
                "strategy": "momentum_short",
                "signal": "no_signal",
                "criteria_met": True,
                "reason": "insufficient_reward_risk",
                "reward_risk_ratio": reward_risk_ratio
            }
        
        # Calculate position size
        position = calculate_position_size(account_balance, risk_percent, entry_price, stop_loss)
        
        return {
            "strategy": "momentum_short",
            "signal": "sell",
            "criteria_met": True,
            "entry_price": entry_price,
            "stop_loss": stop_loss,
            "target": rr['support'],
            "reward_risk_ratio": reward_risk_ratio,
            "shares": position['shares'],
            "position_value": position['position_value'],
            "risk_amount": position['risk_amount'],
            "risk_percent": position['risk_percent']
        }
    except Exception as e:
        logger.error(f"Error in momentum short strategy: {e}")
        return {
            "strategy": "momentum_short",
            "signal": "error",
            "error": str(e)
        }

def get_intraday_strategy(strategy_name):
    """
    Get intraday strategy function by name
    
    Args:
        strategy_name: Strategy name
    
    Returns:
        Strategy function
    """
    strategies = {
        "momentum_long": momentum_long_strategy,
        "breakout_long": breakout_long_strategy,
        "momentum_short": momentum_short_strategy
    }
    
    return strategies.get(strategy_name)

def analyze_stock_intraday(symbol, df, strategy_names, account_balance=100000, risk_percent=DEFAULT_RISK_PERCENT):
    """
    Analyze stock for intraday trading using multiple strategies
    
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
        strategy_func = get_intraday_strategy(strategy_name)
        if strategy_func:
            result = strategy_func(df, account_balance, risk_percent)
            result["symbol"] = symbol
            results.append(result)
    
    # Find the best signal
    buy_signals = [r for r in results if r.get("signal") == "buy"]
    sell_signals = [r for r in results if r.get("signal") == "sell"]
    
    if buy_signals:
        # Sort by reward/risk ratio (descending)
        best_buy = sorted(buy_signals, key=lambda x: x.get("reward_risk_ratio", 0), reverse=True)[0]
        return {
            "symbol": symbol,
            "signal": "buy",
            "strategy": best_buy["strategy"],
            "entry_price": best_buy["entry_price"],
            "stop_loss": best_buy["stop_loss"],
            "target": best_buy["target"],
            "reward_risk_ratio": best_buy["reward_risk_ratio"],
            "shares": best_buy["shares"],
            "position_value": best_buy["position_value"],
            "risk_amount": best_buy["risk_amount"],
            "risk_percent": best_buy["risk_percent"]
        }
    elif sell_signals:
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