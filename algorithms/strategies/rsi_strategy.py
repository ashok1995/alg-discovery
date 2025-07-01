import pandas as pd
import numpy as np

class RSIStrategy:
    def __init__(self, target_pct=1.0, stop_loss_pct=0.5, rsi_period=14, 
                 overbought=70, oversold=30, direction='long'):
        self.target_pct = target_pct
        self.stop_loss_pct = stop_loss_pct
        self.rsi_period = rsi_period
        self.overbought = overbought
        self.oversold = oversold
        self.direction = direction  # 'long' or 'short'
    
    def calculate_rsi(self, data):
        """Calculate RSI indicator"""
        delta = data['Close'].diff()
        
        # Separate gains and losses
        gain = (delta.where(delta > 0, 0)).rolling(window=self.rsi_period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=self.rsi_period).mean()
        
        # Calculate RS and RSI
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def analyze(self, df, symbol):
        """Analyze price data using RSI strategy"""
        # Calculate RSI
        df['RSI'] = self.calculate_rsi(df)
        
        # Generate signals DataFrame
        signals = pd.DataFrame(index=df.index)
        signals['Signal'] = 0
        
        if self.direction == 'long':
            # Buy signal: RSI crosses above oversold
            signals.loc[(df['RSI'] > self.oversold) & 
                       (df['RSI'].shift(1) <= self.oversold), 'Signal'] = 1
        else:  # short
            # Sell signal: RSI crosses below overbought
            signals.loc[(df['RSI'] < self.overbought) & 
                       (df['RSI'].shift(1) >= self.overbought), 'Signal'] = -1
        
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
                'reason': f"RSI crossed above {self.oversold} (oversold)",
                'confirmation': 'Price above EMA20, increased volume',
                'target': signal_row['Target_Long'],
                'stop_loss': signal_row['StopLoss_Long']
            }
        elif signal_row['Signal'] == -1:
            return {
                'type': 'SELL',
                'reason': f"RSI crossed below {self.overbought} (overbought)",
                'confirmation': 'Price below EMA20, increased volume',
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