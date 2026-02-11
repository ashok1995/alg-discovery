import pandas as pd
import numpy as np
from algorithms.indicators.trend import simple_moving_average, macd
from algorithms.indicators.momentum import rsi
from algorithms.indicators.volatility import bollinger_bands

def golden_cross_screener(stock_data, symbols, short_period=50, long_period=200):
    """
    Screen for stocks that have a golden cross (short MA crosses above long MA).
    
    Args:
        stock_data: DataFrame with stock prices
        symbols: List of stock symbols
        short_period: Short period MA
        long_period: Long period MA
        
    Returns:
        List of symbols with golden cross
    """
    golden_cross_stocks = []
    
    for symbol in symbols:
        if symbol not in stock_data:
            continue
            
        price_data = stock_data[symbol]['Close']
        
        # Calculate moving averages
        short_ma = simple_moving_average(price_data, short_period)
        long_ma = simple_moving_average(price_data, long_period)
        
        # Check for golden cross (today's short MA > long MA but yesterday's short MA < long MA)
        if (short_ma.iloc[-1] > long_ma.iloc[-1] and 
            short_ma.iloc[-2] <= long_ma.iloc[-2]):
            golden_cross_stocks.append(symbol)
    
    return golden_cross_stocks

def oversold_bounce_screener(stock_data, symbols, rsi_period=14, rsi_threshold=30):
    """
    Screen for oversold stocks based on RSI that may be ready to bounce.
    
    Args:
        stock_data: DataFrame with stock prices
        symbols: List of stock symbols
        rsi_period: Period for RSI calculation
        rsi_threshold: RSI threshold for oversold condition
        
    Returns:
        List of oversold symbols
    """
    oversold_stocks = []
    
    for symbol in symbols:
        if symbol not in stock_data:
            continue
            
        price_data = stock_data[symbol]['Close']
        
        # Calculate RSI
        rsi_values = rsi(price_data, period=rsi_period)
        
        # Check for oversold condition
        if rsi_values.iloc[-1] < rsi_threshold:
            oversold_stocks.append(symbol)
    
    return oversold_stocks 