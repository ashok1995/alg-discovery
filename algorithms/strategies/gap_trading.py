import pandas as pd
import numpy as np
from datetime import datetime, timedelta

class GapTradingStrategy:
    """
    Gap Trading Strategy for Intraday Trading
    
    This strategy identifies stocks that gap up or down significantly at market open
    and trades either:
    1. Gap fill (mean reversion) - expecting price to return to previous close
    2. Gap continuation (momentum) - expecting gap to continue in same direction
    """
    
    def __init__(self, gap_threshold_pct=2.0, volume_threshold=1.5, target_pct=1.5, stop_loss_pct=0.75):
        self.gap_threshold_pct = gap_threshold_pct  # Minimum gap % to consider
        self.volume_threshold = volume_threshold    # Volume multiplier vs average
        self.target_pct = target_pct               # Target profit %
        self.stop_loss_pct = stop_loss_pct         # Stop loss %
        
    def calculate_indicators(self, df):
        """Calculate gap trading indicators"""
        # Previous session close
        df['Prev_Close'] = df['Close'].shift(1)
        
        # Gap calculation
        df['Gap_Pct'] = ((df['Open'] - df['Prev_Close']) / df['Prev_Close']) * 100
        df['Gap_Size'] = abs(df['Gap_Pct'])
        
        # Volume indicators
        df['Volume_SMA'] = df['Volume'].rolling(window=20).mean()
        df['Volume_Ratio'] = df['Volume'] / df['Volume_SMA']
        
        # Intraday range and momentum
        df['High_Low_Range'] = ((df['High'] - df['Low']) / df['Open']) * 100
        df['Open_Close_Change'] = ((df['Close'] - df['Open']) / df['Open']) * 100
        
        # First hour momentum (assuming 5min data)
        df['First_Hour_High'] = df['High'].rolling(window=12).max()  # 12 * 5min = 1 hour
        df['First_Hour_Low'] = df['Low'].rolling(window=12).min()
        
        return df
    
    def identify_gap_fill_signals(self, df):
        """Identify gap fill opportunities (mean reversion)"""
        signals = pd.DataFrame(index=df.index)
        signals['Signal'] = 0
        signals['Strategy'] = 'Gap_Fill'
        
        # Gap Up - Fill signals (Short)
        gap_up_fill = (
            (df['Gap_Pct'] > self.gap_threshold_pct) &      # Significant gap up
            (df['Volume_Ratio'] > self.volume_threshold) &   # High volume
            (df['Open_Close_Change'] < -0.5) &              # Price declining from open
            (df['Close'] < df['Open'])                       # Bearish candle
        )
        
        # Gap Down - Fill signals (Long)
        gap_down_fill = (
            (df['Gap_Pct'] < -self.gap_threshold_pct) &     # Significant gap down
            (df['Volume_Ratio'] > self.volume_threshold) &  # High volume
            (df['Open_Close_Change'] > 0.5) &               # Price rising from open
            (df['Close'] > df['Open'])                      # Bullish candle
        )
        
        signals.loc[gap_up_fill, 'Signal'] = -1  # Short gap up for fill
        signals.loc[gap_down_fill, 'Signal'] = 1  # Long gap down for fill
        
        return signals
    
    def identify_gap_continuation_signals(self, df):
        """Identify gap continuation opportunities (momentum)"""
        signals = pd.DataFrame(index=df.index)
        signals['Signal'] = 0
        signals['Strategy'] = 'Gap_Continuation'
        
        # Gap Up - Continuation signals (Long)
        gap_up_continuation = (
            (df['Gap_Pct'] > self.gap_threshold_pct) &      # Significant gap up
            (df['Volume_Ratio'] > self.volume_threshold) &  # High volume
            (df['Open_Close_Change'] > 0.3) &               # Continued momentum
            (df['Close'] > df['High'].shift(1))             # Breaking previous high
        )
        
        # Gap Down - Continuation signals (Short)
        gap_down_continuation = (
            (df['Gap_Pct'] < -self.gap_threshold_pct) &     # Significant gap down
            (df['Volume_Ratio'] > self.volume_threshold) &  # High volume
            (df['Open_Close_Change'] < -0.3) &              # Continued decline
            (df['Close'] < df['Low'].shift(1))              # Breaking previous low
        )
        
        signals.loc[gap_up_continuation, 'Signal'] = 1   # Long gap up continuation
        signals.loc[gap_down_continuation, 'Signal'] = -1 # Short gap down continuation
        
        return signals
    
    def calculate_targets(self, df, signals):
        """Calculate target and stop-loss prices"""
        targets = pd.DataFrame(index=signals.index)
        targets['Entry'] = df['Close']
        targets['Gap_Pct'] = df['Gap_Pct']
        targets['Prev_Close'] = df['Prev_Close']
        
        # For gap fill trades, target is previous close
        targets['Gap_Fill_Target'] = df['Prev_Close']
        
        # For momentum trades, use percentage targets
        targets['Target_Long'] = targets['Entry'] * (1 + self.target_pct/100)
        targets['Target_Short'] = targets['Entry'] * (1 - self.target_pct/100)
        
        # Stop losses
        targets['StopLoss_Long'] = targets['Entry'] * (1 - self.stop_loss_pct/100)
        targets['StopLoss_Short'] = targets['Entry'] * (1 + self.stop_loss_pct/100)
        
        return targets
    
    def analyze(self, df, symbol, strategy_type='both'):
        """
        Analyze price data for gap trading opportunities
        
        Args:
            df: OHLCV data
            symbol: Stock symbol
            strategy_type: 'fill', 'continuation', or 'both'
        """
        # Calculate indicators
        df = self.calculate_indicators(df)
        
        # Generate signals based on strategy type
        if strategy_type == 'fill':
            signals = self.identify_gap_fill_signals(df)
        elif strategy_type == 'continuation':
            signals = self.identify_gap_continuation_signals(df)
        else:  # both
            fill_signals = self.identify_gap_fill_signals(df)
            continuation_signals = self.identify_gap_continuation_signals(df)
            
            # Combine signals (prefer continuation over fill for same timestamp)
            signals = fill_signals.copy()
            signals.update(continuation_signals)
        
        # Calculate targets
        targets = self.calculate_targets(df, signals)
        
        # Merge signals with targets
        result = signals.join(targets, how='inner')
        
        # Add additional context
        result['Volume_Ratio'] = df['Volume_Ratio']
        result['High_Low_Range'] = df['High_Low_Range']
        result['Open_Close_Change'] = df['Open_Close_Change']
        
        return result[result['Signal'] != 0]
    
    def get_signal_description(self, signal_row):
        """Get description of the signal for display"""
        signal_type = signal_row['Signal']
        strategy = signal_row.get('Strategy', 'Unknown')
        gap_pct = signal_row['Gap_Pct']
        
        if signal_type == 1:  # Long
            if strategy == 'Gap_Fill':
                return {
                    'type': 'BUY (Gap Fill)',
                    'reason': f"Gap down {gap_pct:.1f}% with reversal signs",
                    'target': signal_row['Gap_Fill_Target'],
                    'stop_loss': signal_row['StopLoss_Long'],
                    'strategy': 'Mean reversion to previous close'
                }
            else:  # Gap Continuation
                return {
                    'type': 'BUY (Gap Continuation)',
                    'reason': f"Gap up {gap_pct:.1f}% with momentum confirmation",
                    'target': signal_row['Target_Long'],
                    'stop_loss': signal_row['StopLoss_Long'],
                    'strategy': 'Momentum continuation'
                }
        
        elif signal_type == -1:  # Short
            if strategy == 'Gap_Fill':
                return {
                    'type': 'SELL (Gap Fill)',
                    'reason': f"Gap up {gap_pct:.1f}% showing weakness",
                    'target': signal_row['Gap_Fill_Target'],
                    'stop_loss': signal_row['StopLoss_Short'],
                    'strategy': 'Mean reversion to previous close'
                }
            else:  # Gap Continuation
                return {
                    'type': 'SELL (Gap Continuation)',
                    'reason': f"Gap down {gap_pct:.1f}% with continued selling",
                    'target': signal_row['Target_Short'],
                    'stop_loss': signal_row['StopLoss_Short'],
                    'strategy': 'Momentum continuation'
                }
        
        return None
    
    def get_current_signal(self, df, symbol):
        """Get the latest trading signal"""
        try:
            if len(df) < 20:
                return None
                
            signals = self.analyze(df, symbol)
            if signals.empty:
                return None
            
            latest = signals.iloc[-1]
            return self.get_signal_description(latest)
            
        except Exception as e:
            print(f"Error in gap trading signal for {symbol}: {str(e)}")
            return None 