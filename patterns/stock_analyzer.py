import yfinance as yf
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import json
import os

# File to store our positions
POSITIONS_FILE = "positions.json"

def get_stock_data(symbol, period="1mo", interval="1d"):
    """
    Fetch stock data from Yahoo Finance
    
    Args:
        symbol: Stock symbol (will append .NS for NSE stocks)
        period: Time period to fetch (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
        interval: Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)
    
    Returns:
        DataFrame with OHLCV data
    """
    try:
        # For NSE stocks, append .NS if not already present
        if not symbol.endswith(('.NS', '.BO')):
            symbol = f"{symbol}.NS"
            
        stock = yf.Ticker(symbol)
        df = stock.history(period=period, interval=interval)
        
        if df.empty:
            print(f"No data found for {symbol}")
            return None
            
        # Reset index to make Date a column
        df = df.reset_index()
        
        # Rename columns to standard format
        df.columns = [col if col != 'Datetime' else 'Date' for col in df.columns]
        
        return df
    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}")
        return None

def identify_patterns(df):
    """
    Identify candlestick patterns and add technical indicators
    
    Args:
        df: DataFrame with OHLCV data
    
    Returns:
        DataFrame with added pattern and indicator columns
    """
    if df is None or len(df) < 14:
        return None
    
    # Calculate basic indicators
    df['SMA_20'] = df['Close'].rolling(window=20).mean()
    df['SMA_50'] = df['Close'].rolling(window=50).mean()
    df['EMA_8'] = df['Close'].ewm(span=8, adjust=False).mean()
    df['EMA_21'] = df['Close'].ewm(span=21, adjust=False).mean()
    
    # Calculate RSI
    delta = df['Close'].diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    avg_gain = gain.rolling(window=14).mean()
    avg_loss = loss.rolling(window=14).mean()
    rs = avg_gain / avg_loss
    df['RSI'] = 100 - (100 / (1 + rs))
    
    # Calculate MACD
    df['MACD'] = df['Close'].ewm(span=12, adjust=False).mean() - df['Close'].ewm(span=26, adjust=False).mean()
    df['MACD_Signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
    df['MACD_Hist'] = df['MACD'] - df['MACD_Signal']
    
    # Calculate Bollinger Bands
    df['BB_Middle'] = df['Close'].rolling(window=20).mean()
    df['BB_Std'] = df['Close'].rolling(window=20).std()
    df['BB_Upper'] = df['BB_Middle'] + (df['BB_Std'] * 2)
    df['BB_Lower'] = df['BB_Middle'] - (df['BB_Std'] * 2)
    
    # Calculate candle patterns
    
    # Doji pattern (open and close are very close)
    df['Doji'] = abs(df['Open'] - df['Close']) <= (0.1 * (df['High'] - df['Low']))
    
    # Hammer pattern (small body at the top, long lower wick)
    body_size = abs(df['Open'] - df['Close'])
    lower_wick = df[['Open', 'Close']].min(axis=1) - df['Low']
    upper_wick = df['High'] - df[['Open', 'Close']].max(axis=1)
    
    df['Hammer'] = (body_size <= 0.3 * (df['High'] - df['Low'])) & \
                   (lower_wick >= 2 * body_size) & \
                   (upper_wick <= 0.1 * (df['High'] - df['Low']))
    
    # Engulfing patterns
    df['Bullish_Engulfing'] = (df['Open'].shift(1) > df['Close'].shift(1)) & \
                              (df['Close'] > df['Open']) & \
                              (df['Open'] <= df['Close'].shift(1)) & \
                              (df['Close'] >= df['Open'].shift(1))
    
    df['Bearish_Engulfing'] = (df['Close'].shift(1) > df['Open'].shift(1)) & \
                              (df['Open'] > df['Close']) & \
                              (df['Close'] <= df['Close'].shift(1)) & \
                              (df['Open'] >= df['Open'].shift(1))
    
    # Morning Star (3-candle bullish reversal)
    df['Morning_Star'] = (df['Close'].shift(2) > df['Open'].shift(2)) & \
                         (abs(df['Open'].shift(1) - df['Close'].shift(1)) < 0.3 * (df['High'].shift(1) - df['Low'].shift(1))) & \
                         (df['Close'] > df['Open']) & \
                         (df['Close'] > (df['Open'].shift(2) + df['Close'].shift(2)) / 2)
    
    # Calculate reward/risk ratio based on recent price action
    df['ATR'] = calculate_atr(df, 14)  # Average True Range for volatility
    
    # Potential support levels (recent lows)
    df['Support'] = df['Low'].rolling(window=10).min()
    
    # Potential resistance levels (recent highs)
    df['Resistance'] = df['High'].rolling(window=10).max()
    
    # Calculate potential reward and risk
    df['Risk'] = df['Close'] - df['Support']
    df['Reward'] = df['Resistance'] - df['Close']
    df['Reward_Risk_Ratio'] = df['Reward'] / df['Risk'].replace(0, 0.01)  # Avoid division by zero
    
    # Buy signal: Bullish pattern with good reward/risk ratio
    df['Buy_Signal'] = ((df['Bullish_Engulfing'] | df['Hammer'] | df['Morning_Star']) & 
                        (df['Reward_Risk_Ratio'] >= 2) & 
                        (df['RSI'] < 70) &  # Not overbought
                        (df['Close'] > df['EMA_8']) &  # Price above short-term EMA
                        (df['MACD'] > df['MACD_Signal']))  # MACD bullish crossover
    
    # Sell signal: Bearish pattern or reward/risk deterioration
    df['Sell_Signal'] = ((df['Bearish_Engulfing']) | 
                         (df['RSI'] > 70) |  # Overbought
                         (df['Close'] < df['EMA_8']) |  # Price below short-term EMA
                         (df['MACD'] < df['MACD_Signal']))  # MACD bearish crossover
    
    return df

def calculate_atr(df, period=14):
    """Calculate Average True Range"""
    high_low = df['High'] - df['Low']
    high_close = abs(df['High'] - df['Close'].shift())
    low_close = abs(df['Low'] - df['Close'].shift())
    
    ranges = pd.concat([high_low, high_close, low_close], axis=1)
    true_range = ranges.max(axis=1)
    
    return true_range.rolling(period).mean()

def load_positions():
    """Load current positions from file"""
    if os.path.exists(POSITIONS_FILE):
        with open(POSITIONS_FILE, 'r') as f:
            return json.load(f)
    return {"active": {}, "closed": []}

def save_positions(positions):
    """Save positions to file"""
    with open(POSITIONS_FILE, 'w') as f:
        json.dump(positions, f, indent=4)

def buy_stock(symbol, price, quantity, stop_loss, target):
    """Record a buy position"""
    positions = load_positions()
    
    # Check if we already have this position
    if symbol in positions["active"]:
        print(f"Already have an active position in {symbol}")
        return False
    
    # Create new position
    position = {
        "symbol": symbol,
        "entry_price": price,
        "quantity": quantity,
        "entry_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "stop_loss": stop_loss,
        "target": target,
        "current_price": price,
        "profit_loss": 0,
        "reward_risk": (target - price) / (price - stop_loss) if price > stop_loss else 0
    }
    
    positions["active"][symbol] = position
    save_positions(positions)
    print(f"Bought {quantity} shares of {symbol} at {price}")
    return True

def sell_stock(symbol, price, reason="Target reached"):
    """Record a sell position"""
    positions = load_positions()
    
    if symbol not in positions["active"]:
        print(f"No active position found for {symbol}")
        return False
    
    position = positions["active"][symbol]
    position["exit_price"] = price
    position["exit_date"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    position["holding_period"] = (datetime.strptime(position["exit_date"], "%Y-%m-%d %H:%M:%S") - 
                                 datetime.strptime(position["entry_date"], "%Y-%m-%d %H:%M:%S")).days
    position["profit_loss"] = (price - position["entry_price"]) * position["quantity"]
    position["profit_loss_percent"] = (price - position["entry_price"]) / position["entry_price"] * 100
    position["exit_reason"] = reason
    
    # Move from active to closed
    positions["closed"].append(position)
    del positions["active"][symbol]
    
    save_positions(positions)
    print(f"Sold {position['quantity']} shares of {symbol} at {price} ({reason})")
    return True

def update_positions():
    """Update all active positions with current prices and check for stop/target hits"""
    positions = load_positions()
    
    for symbol in list(positions["active"].keys()):
        # Get current data
        df = get_stock_data(symbol, period="5d", interval="1d")
        if df is None or df.empty:
            continue
            
        current_price = df['Close'].iloc[-1]
        position = positions["active"][symbol]
        
        # Update current price and P&L
        position["current_price"] = current_price
        position["profit_loss"] = (current_price - position["entry_price"]) * position["quantity"]
        position["profit_loss_percent"] = (current_price - position["entry_price"]) / position["entry_price"] * 100
        
        # Check for stop loss or target hit
        if current_price <= position["stop_loss"]:
            sell_stock(symbol, current_price, "Stop loss hit")
        elif current_price >= position["target"]:
            sell_stock(symbol, current_price, "Target reached")
    
    save_positions(positions)

def plot_stock(symbol, with_signals=True):
    """Plot stock chart with indicators and signals"""
    df = get_stock_data(symbol, period="3mo", interval="1d")
    if df is None:
        return None
        
    df = identify_patterns(df)
    if df is None:
        return None
    
    # Create figure with subplots
    fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(12, 10), gridspec_kw={'height_ratios': [3, 1, 1]})
    
    # Plot candlestick chart
    width = 0.6
    width2 = 0.05
    
    up = df[df['Close'] >= df['Open']]
    down = df[df['Close'] < df['Open']]
    
    # Plot up candles
    ax1.bar(up.index, up['Close'] - up['Open'], width, bottom=up['Open'], color='green')
    ax1.bar(up.index, up['High'] - up['Close'], width2, bottom=up['Close'], color='green')
    ax1.bar(up.index, up['Open'] - up['Low'], width2, bottom=up['Low'], color='green')
    
    # Plot down candles
    ax1.bar(down.index, down['Open'] - down['Close'], width, bottom=down['Close'], color='red')
    ax1.bar(down.index, down['High'] - down['Open'], width2, bottom=down['Open'], color='red')
    ax1.bar(down.index, down['Close'] - down['Low'], width2, bottom=down['Low'], color='red')
    
    # Plot EMAs
    ax1.plot(df.index, df['EMA_8'], color='blue', linewidth=1, label='EMA 8')
    ax1.plot(df.index, df['EMA_21'], color='orange', linewidth=1, label='EMA 21')
    
    # Plot Bollinger Bands
    ax1.plot(df.index, df['BB_Upper'], 'k--', alpha=0.3)
    ax1.plot(df.index, df['BB_Middle'], 'k-', alpha=0.3)
    ax1.plot(df.index, df['BB_Lower'], 'k--', alpha=0.3)
    
    # Plot buy/sell signals
    if with_signals:
        buy_signals = df[df['Buy_Signal']]
        sell_signals = df[df['Sell_Signal']]
        
        if not buy_signals.empty:
            ax1.scatter(buy_signals.index, buy_signals['Low'] * 0.99, marker='^', color='green', s=100, label='Buy')
        if not sell_signals.empty:
            ax1.scatter(sell_signals.index, sell_signals['High'] * 1.01, marker='v', color='red', s=100, label='Sell')
    
    # Plot RSI
    ax2.plot(df.index, df['RSI'], color='purple', linewidth=1)
    ax2.axhline(y=70, color='r', linestyle='--', alpha=0.3)
    ax2.axhline(y=30, color='g', linestyle='--', alpha=0.3)
    ax2.set_ylabel('RSI')
    
    # Plot MACD
    ax3.plot(df.index, df['MACD'], color='blue', linewidth=1, label='MACD')
    ax3.plot(df.index, df['MACD_Signal'], color='red', linewidth=1, label='Signal')
    ax3.bar(df.index, df['MACD_Hist'], color=['green' if x > 0 else 'red' for x in df['MACD_Hist']], alpha=0.3)
    ax3.set_ylabel('MACD')
    
    # Set titles and labels
    ax1.set_title(f'{symbol} Stock Price')
    ax1.set_ylabel('Price')
    ax1.legend()
    
    ax3.legend()
    
    plt.tight_layout()
    return fig 