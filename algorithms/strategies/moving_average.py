import pandas as pd
import numpy as np

class MovingAverageStrategy:
    def __init__(self, target_pct=1.0, stop_loss_pct=0.5, fast_period=9, slow_period=20, direction='long'):
        self.target_pct = target_pct
        self.stop_loss_pct = stop_loss_pct
        self.fast_period = fast_period
        self.slow_period = slow_period
        self.direction = direction  # 'long' or 'short'
    
    def analyze(self, df, symbol):
        """Analyze price data using moving average crossover strategy"""
        # Calculate moving averages
        df['MA_Fast'] = df['Close'].ewm(span=self.fast_period, adjust=False).mean()
        df['MA_Slow'] = df['Close'].ewm(span=self.slow_period, adjust=False).mean()
        
        # Generate signals DataFrame
        signals = pd.DataFrame(index=df.index)
        signals['Signal'] = 0
        
        if self.direction == 'long':
            # Buy signal: Fast MA crosses above Slow MA
            signals.loc[(df['MA_Fast'] > df['MA_Slow']) & 
                       (df['MA_Fast'].shift(1) <= df['MA_Slow'].shift(1)), 'Signal'] = 1
        else:  # short
            # Sell signal: Fast MA crosses below Slow MA
            signals.loc[(df['MA_Fast'] < df['MA_Slow']) & 
                       (df['MA_Fast'].shift(1) >= df['MA_Slow'].shift(1)), 'Signal'] = -1
        
        # Add entry prices and targets
        signals['Entry'] = df['Close']
        signals['Target_Long'] = signals['Entry'] * (1 + self.target_pct/100)
        signals['Target_Short'] = signals['Entry'] * (1 - self.target_pct/100)
        signals['StopLoss_Long'] = signals['Entry'] * (1 - self.stop_loss_pct/100)
        signals['StopLoss_Short'] = signals['Entry'] * (1 + self.stop_loss_pct/100)
        
        return signals[signals['Signal'] != 0] 