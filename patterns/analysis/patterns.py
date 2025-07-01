"""
Pattern recognition
"""

import pandas as pd
import numpy as np
from config.patterns import CANDLESTICK_PATTERNS, CHART_PATTERNS, TECHNICAL_PATTERNS
from utils.logger import get_logger

logger = get_logger(__name__)

def identify_doji(df, tolerance=0.1):
    """
    Identify Doji candlestick pattern
    
    Args:
        df: DataFrame with OHLCV data
        tolerance: Tolerance for body size as a percentage of the range
    
    Returns:
        DataFrame with added Doji column
    """
    try:
        # Calculate body size and range
        df['Body_Size'] = abs(df['Close'] - df['Open'])
        df['Range'] = df['High'] - df['Low']
        
        # Identify Doji
        df['Doji'] = df['Body_Size'] <= (df['Range'] * tolerance)
        
        # Clean up temporary columns
        df = df.drop(['Body_Size', 'Range'], axis=1)
        
        return df
    except Exception as e:
        logger.error(f"Error identifying Doji: {e}")
        return df

def identify_hammer(df, body_ratio=0.3, shadow_ratio=2.0):
    """
    Identify Hammer candlestick pattern
    
    Args:
        df: DataFrame with OHLCV data
        body_ratio: Maximum body size as a percentage of the range
        shadow_ratio: Minimum lower shadow to body ratio
    
    Returns:
        DataFrame with added Hammer column
    """
    try:
        # Calculate body size and shadows
        df['Body_Size'] = abs(df['Close'] - df['Open'])
        df['Range'] = df['High'] - df['Low']
        df['Upper_Shadow'] = df['High'] - df[['Open', 'Close']].max(axis=1)
        df['Lower_Shadow'] = df[['Open', 'Close']].min(axis=1) - df['Low']
        
        # Identify Hammer
        df['Hammer'] = (
            (df['Body_Size'] <= (df['Range'] * body_ratio)) &  # Small body
            (df['Lower_Shadow'] >= (df['Body_Size'] * shadow_ratio)) &  # Long lower shadow
            (df['Upper_Shadow'] <= (df['Body_Size'] * 0.5))  # Short upper shadow
        )
        
        # Clean up temporary columns
        df = df.drop(['Body_Size', 'Range', 'Upper_Shadow', 'Lower_Shadow'], axis=1)
        
        return df
    except Exception as e:
        logger.error(f"Error identifying Hammer: {e}")
        return df

def identify_shooting_star(df, body_ratio=0.3, shadow_ratio=2.0):
    """
    Identify Shooting Star candlestick pattern
    
    Args:
        df: DataFrame with OHLCV data
        body_ratio: Maximum body size as a percentage of the range
        shadow_ratio: Minimum upper shadow to body ratio
    
    Returns:
        DataFrame with added Shooting_Star column
    """
    try:
        # Calculate body size and shadows
        df['Body_Size'] = abs(df['Close'] - df['Open'])
        df['Range'] = df['High'] - df['Low']
        df['Upper_Shadow'] = df['High'] - df[['Open', 'Close']].max(axis=1)
        df['Lower_Shadow'] = df[['Open', 'Close']].min(axis=1) - df['Low']
        
        # Identify Shooting Star
        df['Shooting_Star'] = (
            (df['Body_Size'] <= (df['Range'] * body_ratio)) &  # Small body
            (df['Upper_Shadow'] >= (df['Body_Size'] * shadow_ratio)) &  # Long upper shadow
            (df['Lower_Shadow'] <= (df['Body_Size'] * 0.5))  # Short lower shadow
        )
        
        # Clean up temporary columns
        df = df.drop(['Body_Size', 'Range', 'Upper_Shadow', 'Lower_Shadow'], axis=1)
        
        return df
    except Exception as e:
        logger.error(f"Error identifying Shooting Star: {e}")
        return df

def identify_engulfing(df):
    """
    Identify Bullish and Bearish Engulfing patterns
    
    Args:
        df: DataFrame with OHLCV data
    
    Returns:
        DataFrame with added Bullish_Engulfing and Bearish_Engulfing columns
    """
    try:
        # Calculate body size
        df['Body_Size'] = abs(df['Close'] - df['Open'])
        df['Prev_Body_Size'] = df['Body_Size'].shift(1)
        df['Prev_Open'] = df['Open'].shift(1)
        df['Prev_Close'] = df['Close'].shift(1)
        
        # Identify Bullish Engulfing
        df['Bullish_Engulfing'] = (
            (df['Close'] > df['Open']) &  # Current candle is bullish
            (df['Prev_Close'] < df['Prev_Open']) &  # Previous candle is bearish
            (df['Open'] <= df['Prev_Close']) &  # Current open is lower than or equal to previous close
            (df['Close'] >= df['Prev_Open'])  # Current close is higher than or equal to previous open
        )
        
        # Identify Bearish Engulfing
        df['Bearish_Engulfing'] = (
            (df['Close'] < df['Open']) &  # Current candle is bearish
            (df['Prev_Close'] > df['Prev_Open']) &  # Previous candle is bullish
            (df['Open'] >= df['Prev_Close']) &  # Current open is higher than or equal to previous close
            (df['Close'] <= df['Prev_Open'])  # Current close is lower than or equal to previous open
        )
        
        # Clean up temporary columns
        df = df.drop(['Body_Size', 'Prev_Body_Size', 'Prev_Open', 'Prev_Close'], axis=1)
        
        return df
    except Exception as e:
        logger.error(f"Error identifying Engulfing patterns: {e}")
        return df

def identify_morning_star(df, doji_tolerance=0.1):
    """
    Identify Morning Star pattern
    
    Args:
        df: DataFrame with OHLCV data
        doji_tolerance: Tolerance for middle candle body size
    
    Returns:
        DataFrame with added Morning_Star column
    """
    try:
        # Calculate body sizes
        df['Body_Size'] = abs(df['Close'] - df['Open'])
        df['Range'] = df['High'] - df['Low']
        df['Body_Size_Ratio'] = df['Body_Size'] / df['Range']
        
        df['Prev_Body_Size'] = df['Body_Size'].shift(1)
        df['Prev_Range'] = df['Range'].shift(1)
        df['Prev_Body_Size_Ratio'] = df['Prev_Body_Size'] / df['Prev_Range']
        
        df['Prev2_Body_Size'] = df['Body_Size'].shift(2)
        df['Prev2_Range'] = df['Range'].shift(2)
        df['Prev2_Body_Size_Ratio'] = df['Prev2_Body_Size'] / df['Prev2_Range']
        
        df['Prev_Open'] = df['Open'].shift(1)
        df['Prev_Close'] = df['Close'].shift(1)
        df['Prev2_Open'] = df['Open'].shift(2)
        df['Prev2_Close'] = df['Close'].shift(2)
        
        # Identify Morning Star
        df['Morning_Star'] = (
            (df['Close'] > df['Open']) &  # Current candle is bullish
            (df['Prev_Body_Size_Ratio'] <= doji_tolerance) &  # Middle candle has small body
            (df['Prev2_Close'] < df['Prev2_Open']) &  # First candle is bearish
            (df['Prev2_Body_Size_Ratio'] > 0.5) &  # First candle has significant body
            (df['Prev_Close'] < df['Prev2_Close']) &  # Middle candle gaps down
            (df['Open'] > df['Prev_Close']) &  # Last candle opens above middle candle close
            (df['Close'] > (df['Prev2_Open'] + df['Prev2_Close']) / 2)  # Last candle closes above midpoint of first candle
        )
        
        # Clean up temporary columns
        df = df.drop([
            'Body_Size', 'Range', 'Body_Size_Ratio',
            'Prev_Body_Size', 'Prev_Range', 'Prev_Body_Size_Ratio',
            'Prev2_Body_Size', 'Prev2_Range', 'Prev2_Body_Size_Ratio',
            'Prev_Open', 'Prev_Close', 'Prev2_Open', 'Prev2_Close'
        ], axis=1)
        
        return df
    except Exception as e:
        logger.error(f"Error identifying Morning Star: {e}")
        return df

def identify_evening_star(df, doji_tolerance=0.1):
    """
    Identify Evening Star pattern
    
    Args:
        df: DataFrame with OHLCV data
        doji_tolerance: Tolerance for middle candle body size
    
    Returns:
        DataFrame with added Evening_Star column
    """
    try:
        # Calculate body sizes
        df['Body_Size'] = abs(df['Close'] - df['Open'])
        df['Range'] = df['High'] - df['Low']
        df['Body_Size_Ratio'] = df['Body_Size'] / df['Range']
        
        df['Prev_Body_Size'] = df['Body_Size'].shift(1)
        df['Prev_Range'] = df['Range'].shift(1)
        df['Prev_Body_Size_Ratio'] = df['Prev_Body_Size'] / df['Prev_Range']
        
        df['Prev2_Body_Size'] = df['Body_Size'].shift(2)
        df['Prev2_Range'] = df['Range'].shift(2)
        df['Prev2_Body_Size_Ratio'] = df['Prev2_Body_Size'] / df['Prev2_Range']
        
        df['Prev_Open'] = df['Open'].shift(1)
        df['Prev_Close'] = df['Close'].shift(1)
        df['Prev2_Open'] = df['Open'].shift(2)
        df['Prev2_Close'] = df['Close'].shift(2)
        
        # Identify Evening Star
        df['Evening_Star'] = (
            (df['Close'] < df['Open']) &  # Current candle is bearish
            (df['Prev_Body_Size_Ratio'] <= doji_tolerance) &  # Middle candle has small body
            (df['Prev2_Close'] > df['Prev2_Open']) &  # First candle is bullish
            (df['Prev2_Body_Size_Ratio'] > 0.5) &  # First candle has significant body
            (df['Prev_Close'] > df['Prev2_Close']) &  # Middle candle gaps up
            (df['Open'] < df['Prev_Close']) &  # Last candle opens below middle candle close
            (df['Close'] < (df['Prev2_Open'] + df['Prev2_Close']) / 2)  # Last candle closes below midpoint of first candle
        )
        
        # Clean up temporary columns
        df = df.drop([
            'Body_Size', 'Range', 'Body_Size_Ratio',
            'Prev_Body_Size', 'Prev_Range', 'Prev_Body_Size_Ratio',
            'Prev2_Body_Size', 'Prev2_Range', 'Prev2_Body_Size_Ratio',
            'Prev_Open', 'Prev_Close', 'Prev2_Open', 'Prev2_Close'
        ], axis=1)
        
        return df
    except Exception as e:
        logger.error(f"Error identifying Evening Star: {e}")
        return df

def identify_technical_patterns(df):
    """
    Identify technical patterns
    
    Args:
        df: DataFrame with OHLCV data and technical indicators
    
    Returns:
        DataFrame with added technical pattern columns
    """
    try:
        # Golden Cross and Death Cross
        df['Golden_Cross'] = (
            (df['SMA_50'] > df['SMA_200']) & 
            (df['SMA_50'].shift(1) <= df['SMA_200'].shift(1))
        )
        
        df['Death_Cross'] = (
            (df['SMA_50'] < df['SMA_200']) & 
            (df['SMA_50'].shift(1) >= df['SMA_200'].shift(1))
        )
        
        # MACD Crossover and Crossunder
        df['MACD_Crossover'] = (
            (df['MACD'] > df['MACD_Signal']) & 
            (df['MACD'].shift(1) <= df['MACD_Signal'].shift(1))
        )
        
        df['MACD_Crossunder'] = (
            (df['MACD'] < df['MACD_Signal']) & 
            (df['MACD'].shift(1) >= df['MACD_Signal'].shift(1))
        )
        
        # RSI Oversold and Overbought
        df['RSI_Oversold'] = df['RSI'] < 30
        df['RSI_Overbought'] = df['RSI'] > 70
        
        # Bollinger Band Squeeze and Breakout
        df['BB_Squeeze'] = df['BB_Width'] < df['BB_Width'].rolling(window=20).mean() * 0.8
        
        df['BB_Upper_Breakout'] = df['Close'] > df['BB_Upper']
        df['BB_Lower_Breakout'] = df['Close'] < df['BB_Lower']
        
        return df
    except Exception as e:
        logger.error(f"Error identifying technical patterns: {e}")
        return df

def identify_all_patterns(df):
    """
    Identify all patterns
    
    Args:
        df: DataFrame with OHLCV data and technical indicators
    
    Returns:
        DataFrame with all pattern columns
    """
    try:
        # Candlestick patterns
        df = identify_doji(df)
        df = identify_hammer(df)
        df = identify_shooting_star(df)
        df = identify_engulfing(df)
        df = identify_morning_star(df)
        df = identify_evening_star(df)
        
        # Technical patterns
        df = identify_technical_patterns(df)
        
        # Add Buy and Sell signals
        df['Buy_Signal'] = (
            df['Hammer'] | 
            df['Bullish_Engulfing'] | 
            df['Morning_Star'] | 
            df['Golden_Cross'] | 
            df['MACD_Crossover'] | 
            df['RSI_Oversold'] | 
            df['BB_Lower_Breakout']
        )
        
        df['Sell_Signal'] = (
            df['Shooting_Star'] | 
            df['Bearish_Engulfing'] | 
            df['Evening_Star'] | 
            df['Death_Cross'] | 
            df['MACD_Crossunder'] | 
            df['RSI_Overbought'] | 
            df['BB_Upper_Breakout']
        )
        
        return df
    except Exception as e:
        logger.error(f"Error identifying all patterns: {e}")
        return df 