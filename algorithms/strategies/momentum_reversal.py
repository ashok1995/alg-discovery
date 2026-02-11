import pandas as pd
import numpy as np
from datetime import datetime, timedelta

class MomentumReversalStrategy:
    def __init__(self, target_pct=1.0, stop_loss_pct=0.5, lookback_period=20, direction='long'):
        self.target_pct = target_pct
        self.stop_loss_pct = stop_loss_pct
        self.lookback_period = lookback_period
        self.direction = direction  # 'long' or 'short'
        
    def calculate_indicators(self, df):
        """Calculate technical indicators for the strategy"""
        # RSI for momentum
        def calculate_rsi(data, periods=14):
            delta = data['Close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=periods).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=periods).mean()
            rs = gain / loss
            return 100 - (100 / (1 + rs))

        # Volume indicators
        df['Volume_SMA'] = df['Volume'].rolling(window=20).mean()
        df['Volume_Ratio'] = df['Volume'] / df['Volume_SMA']
        
        # Price momentum indicators
        df['RSI'] = calculate_rsi(df)
        df['EMA_9'] = df['Close'].ewm(span=9, adjust=False).mean()
        df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
        df['EMA_50'] = df['Close'].ewm(span=50, adjust=False).mean()
        
        # Candlestick patterns
        df['Body'] = df['Close'] - df['Open']
        df['Upper_Shadow'] = df['High'] - df[['Open', 'Close']].max(axis=1)
        df['Lower_Shadow'] = df[['Open', 'Close']].min(axis=1) - df['Low']
        df['Body_Ratio'] = abs(df['Body']) / (df['High'] - df['Low'])
        
        return df

    def identify_signals(self, df):
        """Identify buy/sell signals based on indicators"""
        signals = pd.DataFrame(index=df.index)
        signals['Signal'] = 0  # 0: No signal, 1: Buy, -1: Sell
        
        # Long (Buy) Conditions
        long_conditions = (
            (df['Volume_Ratio'] > 1.2) &  # Lower volume threshold
            (df['RSI'] < 35) &  # Adjusted oversold threshold
            (df['Close'] > df['EMA_9']) &  # Price above short EMA
            (df['Body'] > 0) &  # Bullish candle
            (df['Lower_Shadow'] > abs(df['Body']))  # Long lower shadow (reversal)
        )
        
        # Short (Sell) Conditions
        short_conditions = (
            (df['Volume_Ratio'] > 1.2) &  # Lower volume threshold
            (df['RSI'] > 65) &  # Adjusted overbought threshold
            (df['Close'] < df['EMA_9']) &  # Price below short EMA
            (df['Body'] < 0) &  # Bearish candle
            (df['Upper_Shadow'] > abs(df['Body']))  # Long upper shadow (reversal)
        )
        
        signals.loc[long_conditions, 'Signal'] = 1
        signals.loc[short_conditions, 'Signal'] = -1
        
        return signals

    def calculate_targets(self, df, signals):
        """Calculate target and stop-loss prices for each signal"""
        targets = pd.DataFrame(index=signals.index)
        targets['Entry'] = df['Close']
        
        # Calculate targets and stop-loss for both long and short positions
        targets['Target_Long'] = targets['Entry'] * (1 + self.target_pct/100)
        targets['StopLoss_Long'] = targets['Entry'] * (1 - self.stop_loss_pct/100)
        
        targets['Target_Short'] = targets['Entry'] * (1 - self.target_pct/100)
        targets['StopLoss_Short'] = targets['Entry'] * (1 + self.stop_loss_pct/100)
        
        return targets

    def analyze(self, df, symbol):
        """Analyze price data using momentum reversal strategy"""
        # Calculate momentum indicators
        df['SMA'] = df['Close'].rolling(window=self.lookback_period).mean()
        df['STD'] = df['Close'].rolling(window=self.lookback_period).std()
        df['Upper'] = df['SMA'] + (df['STD'] * 2)
        df['Lower'] = df['SMA'] - (df['STD'] * 2)
        df['RSI'] = self.calculate_rsi(df, period=14)
        
        # Generate signals DataFrame
        signals = pd.DataFrame(index=df.index)
        signals['Signal'] = 0
        
        if self.direction == 'long':
            # Buy signals for long positions
            signals.loc[
                (df['Close'] < df['Lower']) &  # Price below lower band
                (df['RSI'] < 30) &             # Oversold condition
                (df['Close'] > df['Close'].shift(1)),  # Price starting to rise
                'Signal'
            ] = 1
        else:  # short
            # Sell signals for short positions
            signals.loc[
                (df['Close'] > df['Upper']) &  # Price above upper band
                (df['RSI'] > 70) &             # Overbought condition
                (df['Close'] < df['Close'].shift(1)),  # Price starting to fall
                'Signal'
            ] = -1
        
        # Add entry prices and targets
        signals['Entry'] = df['Close']
        signals['Target_Long'] = signals['Entry'] * (1 + self.target_pct/100)
        signals['Target_Short'] = signals['Entry'] * (1 - self.target_pct/100)
        signals['StopLoss_Long'] = signals['Entry'] * (1 - self.stop_loss_pct/100)
        signals['StopLoss_Short'] = signals['Entry'] * (1 + self.stop_loss_pct/100)
        
        # Add indicator values for analysis
        signals['RSI'] = df['RSI']
        signals['Upper_Band'] = df['Upper']
        signals['Lower_Band'] = df['Lower']
        signals['SMA'] = df['SMA']
        
        return signals[signals['Signal'] != 0]
    
    def calculate_rsi(self, df, period=14):
        """Calculate RSI indicator"""
        delta = df['Close'].diff()
        
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def get_signal_description(self, signal_row):
        """Get description of the signal for display"""
        if signal_row['Signal'] == 1:
            return {
                'type': 'BUY',
                'reason': f"Price below lower band with RSI {signal_row['RSI']:.1f}",
                'confirmation': 'Price showing reversal signs',
                'target': signal_row['Target_Long'],
                'stop_loss': signal_row['StopLoss_Long']
            }
        elif signal_row['Signal'] == -1:
            return {
                'type': 'SELL',
                'reason': f"Price above upper band with RSI {signal_row['RSI']:.1f}",
                'confirmation': 'Price showing reversal signs',
                'target': signal_row['Target_Short'],
                'stop_loss': signal_row['StopLoss_Short']
            }
        return None

    def get_current_signal(self, data, symbol):
        try:
            # Skip if not enough data
            if len(data) < 20:  # Minimum required candles
                return None
                
            # Calculate indicators
            results = self.calculate_indicators(data)
            
            # Get latest values
            if not results.empty:
                latest = results.iloc[-1]
                # Rest of your signal logic...
            
            return None  # Return None if no signal
            
        except Exception as e:
            print(f"Error in get_current_signal for {symbol}: {str(e)}")
            return None
            
    def calculate_indicators(self, data):
        # Your indicator calculations...
        pass 