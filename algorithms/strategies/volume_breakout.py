import pandas as pd
import numpy as np

class VolumeBreakoutStrategy:
    def __init__(self, target_pct=1.0, stop_loss_pct=0.5, volume_multiplier=2.0, direction='long'):
        self.target_pct = target_pct
        self.stop_loss_pct = stop_loss_pct
        self.volume_multiplier = volume_multiplier
        self.direction = direction  # 'long' or 'short'
    
    def calculate_indicators(self, df):
        """Calculate technical indicators for volume breakout"""
        # Volume indicators
        df['Volume_SMA'] = df['Volume'].rolling(window=20).mean()
        df['Volume_Ratio'] = df['Volume'] / df['Volume_SMA']
        
        # Price indicators
        df['Price_Change'] = df['Close'].pct_change() * 100
        df['ATR'] = self.calculate_atr(df)
        df['Upper_Band'] = df['Close'].rolling(window=20).max()
        df['Lower_Band'] = df['Close'].rolling(window=20).min()
        
        # Trend indicators
        df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
        df['EMA_50'] = df['Close'].ewm(span=50, adjust=False).mean()
        
        return df
    
    def calculate_atr(self, df, period=14):
        """Calculate Average True Range"""
        high_low = df['High'] - df['Low']
        high_close = np.abs(df['High'] - df['Close'].shift())
        low_close = np.abs(df['Low'] - df['Close'].shift())
        
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = np.max(ranges, axis=1)
        
        return true_range.rolling(window=period).mean()
    
    def analyze(self, df, symbol):
        """Analyze price data using volume breakout strategy"""
        # Calculate volume indicators
        df['Volume_SMA'] = df['Volume'].rolling(window=20).mean()
        df['Volume_Ratio'] = df['Volume'] / df['Volume_SMA']
        
        # Generate signals DataFrame
        signals = pd.DataFrame(index=df.index)
        signals['Signal'] = 0
        
        if self.direction == 'long':
            # Buy signal: High volume breakout up
            signals.loc[(df['Volume_Ratio'] > self.volume_multiplier) & 
                       (df['Close'] > df['Close'].shift(1)), 'Signal'] = 1
        else:  # short
            # Sell signal: High volume breakout down
            signals.loc[(df['Volume_Ratio'] > self.volume_multiplier) & 
                       (df['Close'] < df['Close'].shift(1)), 'Signal'] = -1
        
        # Add entry prices and targets
        signals['Entry'] = df['Close']
        signals['Target_Long'] = signals['Entry'] * (1 + self.target_pct/100)
        signals['Target_Short'] = signals['Entry'] * (1 - self.target_pct/100)
        signals['StopLoss_Long'] = signals['Entry'] * (1 - self.stop_loss_pct/100)
        signals['StopLoss_Short'] = signals['Entry'] * (1 + self.stop_loss_pct/100)
        
        return signals[signals['Signal'] != 0]
    
    def get_signal_description(self, signal_row):
        """Get description of the signal for display"""
        if signal_row['Signal'] == 1:
            return {
                'type': 'BUY',
                'reason': f"Volume spike {signal_row['Volume_Ratio']:.1f}x average",
                'confirmation': (
                    f"Price breakout above {signal_row['Upper_Band']:.2f} "
                    f"with {signal_row['Price_Change']:.1f}% change"
                ),
                'target': signal_row['Target_Long'],
                'stop_loss': signal_row['StopLoss_Long']
            }
        elif signal_row['Signal'] == -1:
            return {
                'type': 'SELL',
                'reason': f"Volume spike {signal_row['Volume_Ratio']:.1f}x average",
                'confirmation': (
                    f"Price breakdown below {signal_row['Lower_Band']:.2f} "
                    f"with {signal_row['Price_Change']:.1f}% change"
                ),
                'target': signal_row['Target_Short'],
                'stop_loss': signal_row['StopLoss_Short']
            }
        return None

    def get_current_signal(self, df):
        """Get the latest trading signal"""
        signals = self.analyze(df)
        if signals.empty:
            return None
        
        latest = signals.iloc[-1]
        if latest['Signal'] != 0:
            return self.get_signal_description(latest)
        return None 