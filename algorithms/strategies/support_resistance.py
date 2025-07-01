import pandas as pd
import numpy as np
from scipy.signal import find_peaks

class SupportResistanceStrategy:
    """
    Support and Resistance Trading Strategy
    
    This strategy identifies key support and resistance levels and trades:
    1. Breakouts above resistance (bullish)
    2. Breakdowns below support (bearish)
    3. Bounces off support (bullish)
    4. Rejections at resistance (bearish)
    """
    
    def __init__(self, target_pct=1.2, stop_loss_pct=0.6, lookback_period=50, 
                 min_touches=2, level_tolerance=0.2):
        self.target_pct = target_pct
        self.stop_loss_pct = stop_loss_pct
        self.lookback_period = lookback_period
        self.min_touches = min_touches  # Minimum touches to confirm S/R level
        self.level_tolerance = level_tolerance  # % tolerance for level matching
        
    def find_support_resistance_levels(self, df):
        """Find significant support and resistance levels"""
        highs = df['High'].values
        lows = df['Low'].values
        
        # Find peaks (resistance) and valleys (support)
        resistance_peaks, _ = find_peaks(highs, distance=5, prominence=np.std(highs)*0.5)
        support_valleys, _ = find_peaks(-lows, distance=5, prominence=np.std(lows)*0.5)
        
        # Get resistance levels
        resistance_levels = []
        if len(resistance_peaks) > 0:
            resistance_prices = highs[resistance_peaks]
            for price in resistance_prices:
                # Count how many times price tested this level
                touches = self.count_level_touches(df, price, 'resistance')
                if touches >= self.min_touches:
                    resistance_levels.append(price)
        
        # Get support levels
        support_levels = []
        if len(support_valleys) > 0:
            support_prices = lows[support_valleys]
            for price in support_prices:
                # Count how many times price tested this level
                touches = self.count_level_touches(df, price, 'support')
                if touches >= self.min_touches:
                    support_levels.append(price)
        
        return {
            'resistance': sorted(set(resistance_levels), reverse=True)[:5],  # Top 5
            'support': sorted(set(support_levels))[:5]  # Bottom 5
        }
    
    def count_level_touches(self, df, level, level_type):
        """Count how many times price touched a support/resistance level"""
        tolerance = level * (self.level_tolerance / 100)
        
        if level_type == 'resistance':
            # Count touches at resistance (highs near the level)
            touches = ((df['High'] >= level - tolerance) & 
                      (df['High'] <= level + tolerance)).sum()
        else:  # support
            # Count touches at support (lows near the level)
            touches = ((df['Low'] >= level - tolerance) & 
                      (df['Low'] <= level + tolerance)).sum()
        
        return touches
    
    def calculate_indicators(self, df):
        """Calculate technical indicators"""
        # Volume indicators
        df['Volume_SMA'] = df['Volume'].rolling(window=20).mean()
        df['Volume_Ratio'] = df['Volume'] / df['Volume_SMA']
        
        # Price momentum
        df['RSI'] = self.calculate_rsi(df)
        df['Price_Change'] = df['Close'].pct_change() * 100
        
        # Trend indicators
        df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
        df['EMA_50'] = df['Close'].ewm(span=50, adjust=False).mean()
        
        # Find S/R levels and add to dataframe
        levels = self.find_support_resistance_levels(df)
        
        # Find nearest support and resistance for each candle
        df['Nearest_Resistance'] = df['Close'].apply(
            lambda x: min([r for r in levels['resistance'] if r >= x], 
                         default=float('inf'))
        )
        df['Nearest_Support'] = df['Close'].apply(
            lambda x: max([s for s in levels['support'] if s <= x], 
                         default=0)
        )
        
        # Distance to nearest levels
        df['Resistance_Distance'] = ((df['Nearest_Resistance'] - df['Close']) / df['Close']) * 100
        df['Support_Distance'] = ((df['Close'] - df['Nearest_Support']) / df['Close']) * 100
        
        return df, levels
    
    def calculate_rsi(self, df, period=14):
        """Calculate RSI"""
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    def identify_breakout_signals(self, df, levels):
        """Identify breakout/breakdown signals"""
        signals = pd.DataFrame(index=df.index)
        signals['Signal'] = 0
        signals['Strategy'] = 'Breakout'
        
        # Resistance breakout (Long)
        for resistance in levels['resistance']:
            breakout_condition = (
                (df['Close'] > resistance) &                          # Price above resistance
                (df['Close'].shift(1) <= resistance) &                # Previous close below
                (df['Volume_Ratio'] > 1.5) &                         # Volume confirmation
                (df['RSI'] > 50) &                                   # Momentum confirmation
                (df['High'] > resistance * 1.002)                    # Clear breakout
            )
            signals.loc[breakout_condition, 'Signal'] = 1
            signals.loc[breakout_condition, 'Level'] = resistance
        
        # Support breakdown (Short)
        for support in levels['support']:
            breakdown_condition = (
                (df['Close'] < support) &                            # Price below support
                (df['Close'].shift(1) >= support) &                 # Previous close above
                (df['Volume_Ratio'] > 1.5) &                        # Volume confirmation
                (df['RSI'] < 50) &                                  # Momentum confirmation
                (df['Low'] < support * 0.998)                       # Clear breakdown
            )
            signals.loc[breakdown_condition, 'Signal'] = -1
            signals.loc[breakdown_condition, 'Level'] = support
        
        return signals
    
    def identify_bounce_signals(self, df, levels):
        """Identify bounce/rejection signals"""
        signals = pd.DataFrame(index=df.index)
        signals['Signal'] = 0
        signals['Strategy'] = 'Bounce'
        
        # Support bounce (Long)
        for support in levels['support']:
            bounce_condition = (
                (df['Low'] <= support * 1.005) &                    # Touch support
                (df['Close'] > df['Open']) &                        # Bullish candle
                (df['Close'] > support) &                           # Close above support
                (df['Volume_Ratio'] > 1.2) &                       # Volume confirmation
                (df['RSI'] < 40) &                                 # Oversold bounce
                (df['Support_Distance'] < 1.0)                     # Near support
            )
            signals.loc[bounce_condition, 'Signal'] = 1
            signals.loc[bounce_condition, 'Level'] = support
        
        # Resistance rejection (Short)
        for resistance in levels['resistance']:
            rejection_condition = (
                (df['High'] >= resistance * 0.995) &               # Touch resistance
                (df['Close'] < df['Open']) &                       # Bearish candle
                (df['Close'] < resistance) &                       # Close below resistance
                (df['Volume_Ratio'] > 1.2) &                      # Volume confirmation
                (df['RSI'] > 60) &                                # Overbought rejection
                (df['Resistance_Distance'] < 1.0)                 # Near resistance
            )
            signals.loc[rejection_condition, 'Signal'] = -1
            signals.loc[rejection_condition, 'Level'] = resistance
        
        return signals
    
    def calculate_targets(self, df, signals):
        """Calculate targets based on S/R levels"""
        targets = pd.DataFrame(index=signals.index)
        targets['Entry'] = df['Close']
        targets['Level'] = signals['Level']
        
        # Standard percentage targets
        targets['Target_Long'] = targets['Entry'] * (1 + self.target_pct/100)
        targets['Target_Short'] = targets['Entry'] * (1 - self.target_pct/100)
        
        # S/R based targets
        targets['SR_Target_Long'] = targets['Level'] * 1.01   # Just above resistance
        targets['SR_Target_Short'] = targets['Level'] * 0.99  # Just below support
        
        # Stop losses
        targets['StopLoss_Long'] = targets['Entry'] * (1 - self.stop_loss_pct/100)
        targets['StopLoss_Short'] = targets['Entry'] * (1 + self.stop_loss_pct/100)
        
        return targets
    
    def analyze(self, df, symbol, strategy_type='both'):
        """
        Analyze for support/resistance trading opportunities
        
        Args:
            df: OHLCV data
            symbol: Stock symbol
            strategy_type: 'breakout', 'bounce', or 'both'
        """
        if len(df) < self.lookback_period:
            return pd.DataFrame()
        
        # Calculate indicators and find S/R levels
        df, levels = self.calculate_indicators(df)
        
        # Generate signals based on strategy type
        if strategy_type == 'breakout':
            signals = self.identify_breakout_signals(df, levels)
        elif strategy_type == 'bounce':
            signals = self.identify_bounce_signals(df, levels)
        else:  # both
            breakout_signals = self.identify_breakout_signals(df, levels)
            bounce_signals = self.identify_bounce_signals(df, levels)
            
            # Combine signals
            signals = breakout_signals.copy()
            signals.update(bounce_signals)
        
        # Calculate targets
        targets = self.calculate_targets(df, signals)
        
        # Merge results - using suffixes to avoid column overlap
        result = signals.join(targets, how='inner', rsuffix='_target')
        
        # Keep the Level column from signals and drop the duplicate from targets
        if 'Level_target' in result.columns:
            result = result.drop('Level_target', axis=1)
        
        # Add context
        result['Volume_Ratio'] = df['Volume_Ratio']
        result['RSI'] = df['RSI']
        result['Resistance_Distance'] = df['Resistance_Distance']
        result['Support_Distance'] = df['Support_Distance']
        
        # Add S/R levels info
        result['Resistance_Levels'] = str(levels['resistance'])
        result['Support_Levels'] = str(levels['support'])
        
        return result[result['Signal'] != 0]
    
    def get_signal_description(self, signal_row):
        """Get description of the S/R signal"""
        signal_type = signal_row['Signal']
        strategy = signal_row.get('Strategy', 'Unknown')
        level = signal_row['Level']
        rsi = signal_row['RSI']
        
        if signal_type == 1:  # Long
            if strategy == 'Breakout':
                return {
                    'type': 'BUY (Resistance Breakout)',
                    'reason': f"Breaking resistance at ₹{level:.2f} with RSI {rsi:.1f}",
                    'target': signal_row['Target_Long'],
                    'stop_loss': signal_row['StopLoss_Long'],
                    'key_level': level,
                    'strategy': 'Momentum breakout above resistance'
                }
            else:  # Bounce
                return {
                    'type': 'BUY (Support Bounce)',
                    'reason': f"Bouncing off support at ₹{level:.2f} with RSI {rsi:.1f}",
                    'target': signal_row['Target_Long'],
                    'stop_loss': signal_row['StopLoss_Long'],
                    'key_level': level,
                    'strategy': 'Mean reversion from support'
                }
        
        elif signal_type == -1:  # Short
            if strategy == 'Breakout':
                return {
                    'type': 'SELL (Support Breakdown)',
                    'reason': f"Breaking support at ₹{level:.2f} with RSI {rsi:.1f}",
                    'target': signal_row['Target_Short'],
                    'stop_loss': signal_row['StopLoss_Short'],
                    'key_level': level,
                    'strategy': 'Momentum breakdown below support'
                }
            else:  # Bounce/Rejection
                return {
                    'type': 'SELL (Resistance Rejection)',
                    'reason': f"Rejected at resistance ₹{level:.2f} with RSI {rsi:.1f}",
                    'target': signal_row['Target_Short'],
                    'stop_loss': signal_row['StopLoss_Short'],
                    'key_level': level,
                    'strategy': 'Mean reversion from resistance'
                }
        
        return None
    
    def get_current_signal(self, df, symbol):
        """Get the latest S/R trading signal"""
        try:
            if len(df) < self.lookback_period:
                return None
                
            signals = self.analyze(df, symbol)
            if signals.empty:
                return None
            
            latest = signals.iloc[-1]
            return self.get_signal_description(latest)
            
        except Exception as e:
            print(f"Error in S/R signal for {symbol}: {str(e)}")
            return None 