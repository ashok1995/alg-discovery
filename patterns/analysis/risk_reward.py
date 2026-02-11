"""
Risk/reward calculator
"""

import pandas as pd
import numpy as np
from utils.logger import get_logger

logger = get_logger(__name__, group="shared", service="analysis_risk_reward")

def calculate_support_resistance(df, window=10):
    """
    Calculate support and resistance levels
    
    Args:
        df: DataFrame with OHLCV data
        window: Window size for finding local minima and maxima
    
    Returns:
        Tuple of (support, resistance) levels
    """
    try:
        # Use existing support and resistance if available
        if 'Support' in df.columns and 'Resistance' in df.columns:
            support = df['Support'].iloc[-1]
            resistance = df['Resistance'].iloc[-1]
            return support, resistance
        
        # Otherwise calculate them
        recent_low = df['Low'].rolling(window=window).min().iloc[-1]
        recent_high = df['High'].rolling(window=window).max().iloc[-1]
        
        return recent_low, recent_high
    except Exception as e:
        logger.error(f"Error calculating support and resistance: {e}")
        return df['Low'].iloc[-1], df['High'].iloc[-1]

def calculate_atr(df, period=14):
    """
    Calculate Average True Range (ATR)
    
    Args:
        df: DataFrame with OHLCV data
        period: ATR period
    
    Returns:
        ATR value
    """
    try:
        # Use existing ATR if available
        if 'ATR' in df.columns:
            return df['ATR'].iloc[-1]
        
        # Otherwise calculate it
        high_low = df['High'] - df['Low']
        high_close = np.abs(df['High'] - df['Close'].shift())
        low_close = np.abs(df['Low'] - df['Close'].shift())
        
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = ranges.max(axis=1)
        
        atr = true_range.rolling(window=period).mean().iloc[-1]
        
        return atr
    except Exception as e:
        logger.error(f"Error calculating ATR: {e}")
        return (df['High'].iloc[-1] - df['Low'].iloc[-1]) * 0.1

def calculate_reward_risk(df, entry_price=None, stop_loss=None, target=None, atr_multiplier=2.0):
    """
    Calculate reward/risk ratio
    
    Args:
        df: DataFrame with OHLCV data
        entry_price: Entry price (default: latest close)
        stop_loss: Stop loss price (default: calculated based on ATR)
        target: Target price (default: calculated based on support/resistance)
        atr_multiplier: ATR multiplier for stop loss calculation
    
    Returns:
        Dictionary with reward/risk analysis
    """
    try:
        # Default entry price is the latest close
        if entry_price is None:
            entry_price = df['Close'].iloc[-1]
        
        # Calculate ATR
        atr = calculate_atr(df)
        
        # Calculate support and resistance
        support, resistance = calculate_support_resistance(df)
        
        # Default stop loss is based on ATR
        if stop_loss is None:
            if entry_price > df['Close'].iloc[-2]:  # If entry is on an up move
                stop_loss = entry_price - (atr * atr_multiplier)
            else:
                stop_loss = min(entry_price - (atr * atr_multiplier), support)
        
        # Default target is based on resistance
        if target is None:
            if entry_price < resistance:
                target = resistance
            else:
                target = entry_price + (entry_price - support)
        
        # Calculate risk and reward
        risk = abs(entry_price - stop_loss)
        reward = abs(target - entry_price)
        
        # Calculate reward/risk ratio
        if risk == 0:
            reward_risk_ratio = 0
        else:
            reward_risk_ratio = reward / risk
        
        return {
            "entry_price": entry_price,
            "stop_loss": stop_loss,
            "target": target,
            "risk": risk,
            "reward": reward,
            "reward_risk_ratio": reward_risk_ratio,
            "atr": atr,
            "support": support,
            "resistance": resistance
        }
    except Exception as e:
        logger.error(f"Error calculating reward/risk: {e}")
        return {
            "entry_price": entry_price or df['Close'].iloc[-1],
            "stop_loss": 0,
            "target": 0,
            "risk": 0,
            "reward": 0,
            "reward_risk_ratio": 0,
            "atr": 0,
            "support": 0,
            "resistance": 0
        }

def calculate_position_size(account_balance, risk_percent, entry_price, stop_loss):
    """
    Calculate position size based on risk percentage
    
    Args:
        account_balance: Account balance
        risk_percent: Risk percentage (0-100)
        entry_price: Entry price
        stop_loss: Stop loss price
    
    Returns:
        Dictionary with position size analysis
    """
    try:
        # Calculate risk amount
        risk_amount = account_balance * (risk_percent / 100)
        
        # Calculate risk per share
        risk_per_share = abs(entry_price - stop_loss)
        
        if risk_per_share == 0:
            return {
                "shares": 0,
                "position_value": 0,
                "risk_amount": 0,
                "risk_percent": 0
            }
        
        # Calculate number of shares
        shares = risk_amount / risk_per_share
        
        # Round down to nearest whole share
        shares = int(shares)
        
        # Calculate position value
        position_value = shares * entry_price
        
        # Recalculate actual risk amount and percentage
        actual_risk_amount = shares * risk_per_share
        actual_risk_percent = (actual_risk_amount / account_balance) * 100
        
        return {
            "shares": shares,
            "position_value": position_value,
            "risk_amount": actual_risk_amount,
            "risk_percent": actual_risk_percent
        }
    except Exception as e:
        logger.error(f"Error calculating position size: {e}")
        return {
            "shares": 0,
            "position_value": 0,
            "risk_amount": 0,
            "risk_percent": 0
        } 