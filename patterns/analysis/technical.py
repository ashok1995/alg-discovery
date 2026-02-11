"""
Technical indicators and analysis
"""

import pandas as pd
import numpy as np
from utils.logger import get_logger

logger = get_logger(__name__, group="shared", service="analysis_technical")

def add_moving_averages(df):
    """
    Add moving averages to DataFrame
    
    Args:
        df: DataFrame with OHLCV data
    
    Returns:
        DataFrame with added moving averages
    """
    try:
        # Simple Moving Averages
        df['SMA_20'] = df['Close'].rolling(window=20).mean()
        df['SMA_50'] = df['Close'].rolling(window=50).mean()
        df['SMA_100'] = df['Close'].rolling(window=100).mean()
        df['SMA_200'] = df['Close'].rolling(window=200).mean()
        
        # Exponential Moving Averages
        df['EMA_8'] = df['Close'].ewm(span=8, adjust=False).mean()
        df['EMA_21'] = df['Close'].ewm(span=21, adjust=False).mean()
        df['EMA_50'] = df['Close'].ewm(span=50, adjust=False).mean()
        df['EMA_200'] = df['Close'].ewm(span=200, adjust=False).mean()
        
        return df
    except Exception as e:
        logger.error(f"Error adding moving averages: {e}")
        return df

def add_rsi(df, period=14):
    """
    Add Relative Strength Index (RSI) to DataFrame
    
    Args:
        df: DataFrame with OHLCV data
        period: RSI period
    
    Returns:
        DataFrame with added RSI
    """
    try:
        delta = df['Close'].diff()
        gain = delta.where(delta > 0, 0)
        loss = -delta.where(delta < 0, 0)
        
        avg_gain = gain.rolling(window=period).mean()
        avg_loss = loss.rolling(window=period).mean()
        
        rs = avg_gain / avg_loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        return df
    except Exception as e:
        logger.error(f"Error adding RSI: {e}")
        return df

def add_macd(df, fast=12, slow=26, signal=9):
    """
    Add Moving Average Convergence Divergence (MACD) to DataFrame
    
    Args:
        df: DataFrame with OHLCV data
        fast: Fast EMA period
        slow: Slow EMA period
        signal: Signal EMA period
    
    Returns:
        DataFrame with added MACD
    """
    try:
        df['MACD'] = df['Close'].ewm(span=fast, adjust=False).mean() - df['Close'].ewm(span=slow, adjust=False).mean()
        df['MACD_Signal'] = df['MACD'].ewm(span=signal, adjust=False).mean()
        df['MACD_Hist'] = df['MACD'] - df['MACD_Signal']
        
        return df
    except Exception as e:
        logger.error(f"Error adding MACD: {e}")
        return df

def add_bollinger_bands(df, period=20, std_dev=2):
    """
    Add Bollinger Bands to DataFrame
    
    Args:
        df: DataFrame with OHLCV data
        period: SMA period
        std_dev: Standard deviation multiplier
    
    Returns:
        DataFrame with added Bollinger Bands
    """
    try:
        df['BB_Middle'] = df['Close'].rolling(window=period).mean()
        df['BB_Std'] = df['Close'].rolling(window=period).std()
        df['BB_Upper'] = df['BB_Middle'] + (df['BB_Std'] * std_dev)
        df['BB_Lower'] = df['BB_Middle'] - (df['BB_Std'] * std_dev)
        df['BB_Width'] = (df['BB_Upper'] - df['BB_Lower']) / df['BB_Middle']
        
        return df
    except Exception as e:
        logger.error(f"Error adding Bollinger Bands: {e}")
        return df

def add_atr(df, period=14):
    """
    Add Average True Range (ATR) to DataFrame
    
    Args:
        df: DataFrame with OHLCV data
        period: ATR period
    
    Returns:
        DataFrame with added ATR
    """
    try:
        high_low = df['High'] - df['Low']
        high_close = np.abs(df['High'] - df['Close'].shift())
        low_close = np.abs(df['Low'] - df['Close'].shift())
        
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = np.max(ranges, axis=1)
        
        df['ATR'] = true_range.rolling(window=period).mean()
        
        return df
    except Exception as e:
        logger.error(f"Error adding ATR: {e}")
        return df

def add_adx(df, period=14):
    """
    Add Average Directional Index (ADX) to DataFrame
    
    Args:
        df: DataFrame with OHLCV data
        period: ADX period
    
    Returns:
        DataFrame with added ADX
    """
    try:
        # Calculate True Range
        df = add_atr(df, period)
        
        # Calculate +DM and -DM
        df['Plus_DM'] = np.where(
            (df['High'] - df['High'].shift(1)) > (df['Low'].shift(1) - df['Low']),
            np.maximum(df['High'] - df['High'].shift(1), 0),
            0
        )
        
        df['Minus_DM'] = np.where(
            (df['Low'].shift(1) - df['Low']) > (df['High'] - df['High'].shift(1)),
            np.maximum(df['Low'].shift(1) - df['Low'], 0),
            0
        )
        
        # Calculate +DI and -DI
        df['Plus_DI'] = 100 * (df['Plus_DM'].rolling(window=period).mean() / df['ATR'])
        df['Minus_DI'] = 100 * (df['Minus_DM'].rolling(window=period).mean() / df['ATR'])
        
        # Calculate DX
        df['DX'] = 100 * np.abs(df['Plus_DI'] - df['Minus_DI']) / (df['Plus_DI'] + df['Minus_DI'])
        
        # Calculate ADX
        df['ADX'] = df['DX'].rolling(window=period).mean()
        
        return df
    except Exception as e:
        logger.error(f"Error adding ADX: {e}")
        return df

def add_stochastic(df, k_period=14, d_period=3):
    """
    Add Stochastic Oscillator to DataFrame
    
    Args:
        df: DataFrame with OHLCV data
        k_period: %K period
        d_period: %D period
    
    Returns:
        DataFrame with added Stochastic Oscillator
    """
    try:
        df['Stoch_Lowest'] = df['Low'].rolling(window=k_period).min()
        df['Stoch_Highest'] = df['High'].rolling(window=k_period).max()
        
        df['Stoch_K'] = 100 * ((df['Close'] - df['Stoch_Lowest']) / (df['Stoch_Highest'] - df['Stoch_Lowest']))
        df['Stoch_D'] = df['Stoch_K'].rolling(window=d_period).mean()
        
        # Clean up temporary columns
        df = df.drop(['Stoch_Lowest', 'Stoch_Highest'], axis=1)
        
        return df
    except Exception as e:
        logger.error(f"Error adding Stochastic Oscillator: {e}")
        return df

def add_support_resistance(df, window=10):
    """
    Add support and resistance levels to DataFrame
    
    Args:
        df: DataFrame with OHLCV data
        window: Window size for finding local minima and maxima
    
    Returns:
        DataFrame with added support and resistance levels
    """
    try:
        # Find local minima and maxima
        df['Local_Min'] = df['Low'].rolling(window=window, center=True).min()
        df['Local_Max'] = df['High'].rolling(window=window, center=True).max()
        
        # Identify support and resistance levels
        df['Support'] = df['Local_Min'].rolling(window=window).mean()
        df['Resistance'] = df['Local_Max'].rolling(window=window).mean()
        
        # Clean up temporary columns
        df = df.drop(['Local_Min', 'Local_Max'], axis=1)
        
        return df
    except Exception as e:
        logger.error(f"Error adding support and resistance: {e}")
        return df

def add_all_indicators(df):
    """
    Add all technical indicators to DataFrame
    
    Args:
        df: DataFrame with OHLCV data
    
    Returns:
        DataFrame with all indicators
    """
    try:
        df = add_moving_averages(df)
        df = add_rsi(df)
        df = add_macd(df)
        df = add_bollinger_bands(df)
        df = add_atr(df)
        df = add_adx(df)
        df = add_stochastic(df)
        df = add_support_resistance(df)
        
        return df
    except Exception as e:
        logger.error(f"Error adding all indicators: {e}")
        return df 