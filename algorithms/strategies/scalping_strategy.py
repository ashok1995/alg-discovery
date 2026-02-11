import pandas as pd
import numpy as np

class ScalpingStrategy:
    """
    Scalping Strategy for Ultra-Short Term Intraday Trading
    
    This strategy focuses on:
    1. Quick profits from small price movements (0.2-0.8%)
    2. High volume confirmation
    3. Tight stop losses
    4. Mean reversion and momentum scalps
    """
    
    def __init__(self, target_pct=0.4, stop_loss_pct=0.2, volume_threshold=2.0, 
                 bollinger_period=20, bollinger_std=2.0):
        self.target_pct = target_pct
        self.stop_loss_pct = stop_loss_pct
        self.volume_threshold = volume_threshold
        self.bollinger_period = bollinger_period
        self.bollinger_std = bollinger_std
        
    def calculate_indicators(self, df):
        """Calculate scalping indicators"""
        # Price indicators
        df['EMA_5'] = df['Close'].ewm(span=5, adjust=False).mean()
        df['EMA_10'] = df['Close'].ewm(span=10, adjust=False).mean()
        df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
        
        # Bollinger Bands for mean reversion
        df['BB_Middle'] = df['Close'].rolling(window=self.bollinger_period).mean()
        bb_std = df['Close'].rolling(window=self.bollinger_period).std()
        df['BB_Upper'] = df['BB_Middle'] + (bb_std * self.bollinger_std)
        df['BB_Lower'] = df['BB_Middle'] - (bb_std * self.bollinger_std)
        df['BB_Width'] = df['BB_Upper'] - df['BB_Lower']
        
        # Volume indicators
        df['Volume_SMA'] = df['Volume'].rolling(window=10).mean()
        df['Volume_Ratio'] = df['Volume'] / df['Volume_SMA']
        
        # Price momentum
        df['Price_Change'] = df['Close'].pct_change() * 100
        df['Price_Velocity'] = df['Price_Change'].rolling(window=3).mean()
        
        # Volatility
        df['ATR'] = self.calculate_atr(df, period=10)
        df['Volatility'] = df['Close'].rolling(window=10).std()
        
        # Support/Resistance levels (simplified)
        df['Resistance'] = df['High'].rolling(window=20).max()
        df['Support'] = df['Low'].rolling(window=20).min()
        
        return df
    
    def calculate_atr(self, df, period=10):
        """Calculate Average True Range for volatility"""
        high_low = df['High'] - df['Low']
        high_close = np.abs(df['High'] - df['Close'].shift())
        low_close = np.abs(df['Low'] - df['Close'].shift())
        
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = np.max(ranges, axis=1)
        
        return true_range.rolling(window=period).mean()
    
    def identify_mean_reversion_scalps(self, df):
        """Identify mean reversion scalping opportunities"""
        signals = pd.DataFrame(index=df.index)
        signals['Signal'] = 0
        signals['Strategy'] = 'Mean_Reversion'
        
        # Oversold bounce (Long)
        oversold_scalp = (
            (df['Close'] <= df['BB_Lower']) &                    # Price at lower BB
            (df['Volume_Ratio'] > self.volume_threshold) &       # High volume
            (df['Price_Velocity'] > 0) &                         # Momentum turning positive
            (df['Close'] > df['Close'].shift(1)) &               # Current candle green
            (df['BB_Width'] > df['ATR'])                         # Sufficient volatility
        )
        
        # Overbought fade (Short)
        overbought_scalp = (
            (df['Close'] >= df['BB_Upper']) &                    # Price at upper BB
            (df['Volume_Ratio'] > self.volume_threshold) &       # High volume
            (df['Price_Velocity'] < 0) &                         # Momentum turning negative
            (df['Close'] < df['Close'].shift(1)) &               # Current candle red
            (df['BB_Width'] > df['ATR'])                         # Sufficient volatility
        )
        
        signals.loc[oversold_scalp, 'Signal'] = 1   # Long
        signals.loc[overbought_scalp, 'Signal'] = -1 # Short
        
        return signals
    
    def identify_momentum_scalps(self, df):
        """Identify momentum scalping opportunities"""
        signals = pd.DataFrame(index=df.index)
        signals['Signal'] = 0
        signals['Strategy'] = 'Momentum'
        
        # Momentum breakout (Long)
        momentum_long = (
            (df['Close'] > df['EMA_5']) &                        # Above fast EMA
            (df['EMA_5'] > df['EMA_10']) &                       # EMA alignment
            (df['Volume_Ratio'] > self.volume_threshold) &       # High volume
            (df['Price_Change'] > 0.2) &                         # Minimum price move
            (df['Close'] > df['Resistance'].shift(1)) &          # Breaking resistance
            (df['ATR'] > df['Volatility'])                       # Expanding volatility
        )
        
        # Momentum breakdown (Short)
        momentum_short = (
            (df['Close'] < df['EMA_5']) &                        # Below fast EMA
            (df['EMA_5'] < df['EMA_10']) &                       # EMA alignment
            (df['Volume_Ratio'] > self.volume_threshold) &       # High volume
            (df['Price_Change'] < -0.2) &                        # Minimum price move
            (df['Close'] < df['Support'].shift(1)) &             # Breaking support
            (df['ATR'] > df['Volatility'])                       # Expanding volatility
        )
        
        signals.loc[momentum_long, 'Signal'] = 1    # Long
        signals.loc[momentum_short, 'Signal'] = -1  # Short
        
        return signals
    
    def calculate_targets(self, df, signals):
        """Calculate scalping targets and stops"""
        targets = pd.DataFrame(index=signals.index)
        targets['Entry'] = df['Close']
        targets['ATR'] = df['ATR']
        targets['BB_Middle'] = df['BB_Middle']
        
        # Scalping targets (small and quick)
        targets['Target_Long'] = targets['Entry'] * (1 + self.target_pct/100)
        targets['Target_Short'] = targets['Entry'] * (1 - self.target_pct/100)
        
        # Tight stop losses
        targets['StopLoss_Long'] = targets['Entry'] * (1 - self.stop_loss_pct/100)
        targets['StopLoss_Short'] = targets['Entry'] * (1 + self.stop_loss_pct/100)
        
        # Alternative targets based on strategy
        # Mean reversion: target middle BB
        targets['MeanReversion_Target'] = df['BB_Middle']
        
        # Momentum: use ATR-based targets
        targets['Momentum_Target_Long'] = targets['Entry'] + (targets['ATR'] * 0.5)
        targets['Momentum_Target_Short'] = targets['Entry'] - (targets['ATR'] * 0.5)
        
        return targets
    
    def analyze(self, df, symbol, strategy_type='both'):
        """
        Analyze for scalping opportunities
        
        Args:
            df: OHLCV data (preferably 1-5 minute timeframe)
            symbol: Stock symbol
            strategy_type: 'mean_reversion', 'momentum', or 'both'
        """
        # Calculate indicators
        df = self.calculate_indicators(df)
        
        # Generate signals based on strategy type
        if strategy_type == 'mean_reversion':
            signals = self.identify_mean_reversion_scalps(df)
        elif strategy_type == 'momentum':
            signals = self.identify_momentum_scalps(df)
        else:  # both
            mean_rev_signals = self.identify_mean_reversion_scalps(df)
            momentum_signals = self.identify_momentum_scalps(df)
            
            # Combine signals (momentum takes priority)
            signals = mean_rev_signals.copy()
            signals.update(momentum_signals)
        
        # Calculate targets
        targets = self.calculate_targets(df, signals)
        
        # Merge results
        result = signals.join(targets, how='inner')
        
        # Add context
        result['Volume_Ratio'] = df['Volume_Ratio']
        result['Price_Change'] = df['Price_Change']
        result['ATR'] = df['ATR']
        
        return result[result['Signal'] != 0]
    
    def get_signal_description(self, signal_row):
        """Get description of the scalping signal"""
        signal_type = signal_row['Signal']
        strategy = signal_row.get('Strategy', 'Unknown')
        price_change = signal_row['Price_Change']
        volume_ratio = signal_row['Volume_Ratio']
        
        if signal_type == 1:  # Long
            if strategy == 'Mean_Reversion':
                return {
                    'type': 'BUY (Scalp - Mean Reversion)',
                    'reason': f"Oversold bounce with {volume_ratio:.1f}x volume",
                    'target': signal_row['MeanReversion_Target'],
                    'stop_loss': signal_row['StopLoss_Long'],
                    'timeframe': 'Very short term (5-15 minutes)',
                    'risk_reward': f"1:{(self.target_pct/self.stop_loss_pct):.1f}"
                }
            else:  # Momentum
                return {
                    'type': 'BUY (Scalp - Momentum)',
                    'reason': f"Momentum breakout +{price_change:.2f}%",
                    'target': signal_row['Target_Long'],
                    'stop_loss': signal_row['StopLoss_Long'],
                    'timeframe': 'Very short term (5-15 minutes)',
                    'risk_reward': f"1:{(self.target_pct/self.stop_loss_pct):.1f}"
                }
        
        elif signal_type == -1:  # Short
            if strategy == 'Mean_Reversion':
                return {
                    'type': 'SELL (Scalp - Mean Reversion)',
                    'reason': f"Overbought fade with {volume_ratio:.1f}x volume",
                    'target': signal_row['MeanReversion_Target'],
                    'stop_loss': signal_row['StopLoss_Short'],
                    'timeframe': 'Very short term (5-15 minutes)',
                    'risk_reward': f"1:{(self.target_pct/self.stop_loss_pct):.1f}"
                }
            else:  # Momentum
                return {
                    'type': 'SELL (Scalp - Momentum)',
                    'reason': f"Momentum breakdown {price_change:.2f}%",
                    'target': signal_row['Target_Short'],
                    'stop_loss': signal_row['StopLoss_Short'],
                    'timeframe': 'Very short term (5-15 minutes)',
                    'risk_reward': f"1:{(self.target_pct/self.stop_loss_pct):.1f}"
                }
        
        return None
    
    def get_current_signal(self, df, symbol):
        """Get the latest scalping signal"""
        try:
            if len(df) < 25:  # Need sufficient data for indicators
                return None
                
            signals = self.analyze(df, symbol)
            if signals.empty:
                return None
            
            latest = signals.iloc[-1]
            return self.get_signal_description(latest)
            
        except Exception as e:
            print(f"Error in scalping signal for {symbol}: {str(e)}")
            return None 