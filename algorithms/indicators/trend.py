import numpy as np
import pandas as pd

def simple_moving_average(data, period=50):
    """Calculate Simple Moving Average."""
    return data.rolling(window=period).mean()

def exponential_moving_average(data, period=20):
    """Calculate Exponential Moving Average."""
    return data.ewm(span=period, adjust=False).mean()

def macd(data, fast_period=12, slow_period=26, signal_period=9):
    """Calculate MACD (Moving Average Convergence Divergence)."""
    fast_ema = exponential_moving_average(data, fast_period)
    slow_ema = exponential_moving_average(data, slow_period)
    macd_line = fast_ema - slow_ema
    signal_line = exponential_moving_average(macd_line, signal_period)
    histogram = macd_line - signal_line
    
    return pd.DataFrame({
        'macd_line': macd_line,
        'signal_line': signal_line,
        'histogram': histogram
    }) 