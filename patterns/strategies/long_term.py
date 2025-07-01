"""
Long-term investment strategies
"""

import pandas as pd
import numpy as np
from analysis.technical import add_all_indicators
from analysis.patterns import identify_all_patterns
from utils.logger import get_logger

logger = get_logger(__name__)

def value_investing_strategy(df, fundamentals=None):
    """
    Value investing strategy for long-term investment
    
    Args:
        df: DataFrame with OHLCV data
        fundamentals: Dictionary with fundamental data (optional)
    
    Returns:
        Dictionary with strategy analysis
    """
    try:
        # Add indicators
        df = add_all_indicators(df)
        
        # Check for value investing setup
        latest = df.iloc[-1]
        
        # Basic technical criteria
        technical_criteria = (
            latest['Close'] > latest['SMA_200'] * 0.9 and  # Allow for some discount
            latest['RSI'] < 60  # Not overbought
        )
        
        # Fundamental criteria (if available)
        fundamental_criteria = True
        pe_ratio = None
        pb_ratio = None
        dividend_yield = None
        
        if fundamentals:
            pe_ratio = fundamentals.get('pe_ratio')
            pb_ratio = fundamentals.get('pb_ratio')
            dividend_yield = fundamentals.get('dividend_yield')
            
            if pe_ratio and pb_ratio:
                fundamental_criteria = (
                    pe_ratio < 15 and  # Low P/E ratio
                    pb_ratio < 3  # Low P/B ratio
                )
        
        criteria_met = technical_criteria and fundamental_criteria
        
        if not criteria_met:
            return {
                "strategy": "value_investing",
                "signal": "no_signal",
                "criteria_met": False
            }
        
        # Calculate entry price
        entry_price = latest['Close']
        
        return {
            "strategy": "value_investing",
            "signal": "buy",
            "criteria_met": True,
            "entry_price": entry_price,
            "pe_ratio": pe_ratio,
            "pb_ratio": pb_ratio,
            "dividend_yield": dividend_yield,
            "technical_criteria": technical_criteria,
            "fundamental_criteria": fundamental_criteria
        }
    except Exception as e:
        logger.error(f"Error in value investing strategy: {e}")
        return {
            "strategy": "value_investing",
            "signal": "error",
            "error": str(e)
        }

def growth_investing_strategy(df, fundamentals=None):
    """
    Growth investing strategy for long-term investment
    
    Args:
        df: DataFrame with OHLCV data
        fundamentals: Dictionary with fundamental data (optional)
    
    Returns:
        Dictionary with strategy analysis
    """
    try:
        # Add indicators
        df = add_all_indicators(df)
        
        # Check for growth investing setup
        latest = df.iloc[-1]
        
        # Basic technical criteria
        technical_criteria = (
            latest['Close'] > latest['SMA_50'] > latest['SMA_200'] and
            latest['EMA_8'] > latest['EMA_21'] and
            latest['RSI'] > 40  # Not oversold
        )
        
        # Fundamental criteria (if available)
        fundamental_criteria = True
        revenue_growth = None
        earnings_growth = None
        
        if fundamentals:
            revenue_growth = fundamentals.get('revenue_growth')
            earnings_growth = fundamentals.get('earnings_growth')
            
            if revenue_growth and earnings_growth:
                fundamental_criteria = (
                    revenue_growth > 15 and  # High revenue growth
                    earnings_growth > 15  # High earnings growth
                )
        
        criteria_met = technical_criteria and fundamental_criteria
        
        if not criteria_met:
            return {
                "strategy": "growth_investing",
                "signal": "no_signal",
                "criteria_met": False
            }
        
        # Calculate entry price
        entry_price = latest['Close']
        
        return {
            "strategy": "growth_investing",
            "signal": "buy",
            "criteria_met": True,
            "entry_price": entry_price,
            "revenue_growth": revenue_growth,
            "earnings_growth": earnings_growth,
            "technical_criteria": technical_criteria,
            "fundamental_criteria": fundamental_criteria
        }
    except Exception as e:
        logger.error(f"Error in growth investing strategy: {e}")
        return {
            "strategy": "growth_investing",
            "signal": "error",
            "error": str(e)
        }

def momentum_investing_strategy(df):
    """
    Momentum investing strategy for long-term investment
    
    Args:
        df: DataFrame with OHLCV data
    
    Returns:
        Dictionary with strategy analysis
    """
    try:
        # Add indicators
        df = add_all_indicators(df)
        
        # Check for momentum investing setup
        latest = df.iloc[-1]
        
        # Calculate returns
        df['Returns_3M'] = df['Close'].pct_change(periods=60)  # 3 months (approx. 60 trading days)
        df['Returns_6M'] = df['Close'].pct_change(periods=120)  # 6 months
        df['Returns_12M'] = df['Close'].pct_change(periods=252)  # 12 months
        
        # Strategy criteria
        criteria_met = (
            latest['Close'] > latest['SMA_50'] > latest['SMA_200'] and
            latest['Returns_3M'] > 0.1 and  # 10% return in 3 months
            latest['Returns_6M'] > 0.15 and  # 15% return in 6 months
            latest['RSI'] > 50 and
            latest['MACD'] > latest['MACD_Signal']
        )
        
        if not criteria_met:
            return {
                "strategy": "momentum_investing",
                "signal": "no_signal",
                "criteria_met": False
            }
        
        # Calculate entry price
        entry_price = latest['Close']
        
        return {
            "strategy": "momentum_investing",
            "signal": "buy",
            "criteria_met": True,
            "entry_price": entry_price,
            "returns_3m": latest['Returns_3M'],
            "returns_6m": latest['Returns_6M'],
            "returns_12m": latest['Returns_12M']
        }
    except Exception as e:
        logger.error(f"Error in momentum investing strategy: {e}")
        return {
            "strategy": "momentum_investing",
            "signal": "error",
            "error": str(e)
        }

def get_long_term_strategy(strategy_name):
    """
    Get long-term strategy function by name
    
    Args:
        strategy_name: Strategy name
    
    Returns:
        Strategy function
    """
    strategies = {
        "value_investing": value_investing_strategy,
        "growth_investing": growth_investing_strategy,
        "momentum_investing": momentum_investing_strategy
    }
    
    return strategies.get(strategy_name)

def analyze_stock_long_term(symbol, df, strategy_names, fundamentals=None):
    """
    Analyze stock for long-term investment using multiple strategies
    
    Args:
        symbol: Stock symbol
        df: DataFrame with OHLCV data
        strategy_names: List of strategy names to use
        fundamentals: Dictionary with fundamental data (optional)
    
    Returns:
        Dictionary with analysis results
    """
    results = []
    
    for strategy_name in strategy_names:
        strategy_func = get_long_term_strategy(strategy_name)
        if strategy_func:
            if strategy_name in ["value_investing", "growth_investing"]:
                result = strategy_func(df, fundamentals)
            else:
                result = strategy_func(df)
            
            result["symbol"] = symbol
            results.append(result)
    
    # Find buy signals
    buy_signals = [r for r in results if r.get("signal") == "buy"]
    
    if buy_signals:
        # For long-term, we'll just return all buy signals
        return {
            "symbol": symbol,
            "signal": "buy",
            "strategies": [r["strategy"] for r in buy_signals],
            "entry_price": buy_signals[0]["entry_price"],
            "details": buy_signals
        }
    else:
        return {
            "symbol": symbol,
            "signal": "no_signal",
            "strategies_checked": strategy_names
        } 