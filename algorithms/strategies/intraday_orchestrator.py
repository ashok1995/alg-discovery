import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from .gap_trading import GapTradingStrategy
from .scalping_strategy import ScalpingStrategy
from .support_resistance import SupportResistanceStrategy

class IntradayOrchestrator:
    """
    Intraday Trading Strategy Orchestrator
    
    This class combines multiple intraday strategies and provides:
    1. Unified signal generation
    2. Strategy prioritization
    3. Risk management
    4. Position sizing
    5. Time-based filtering
    """
    
    def __init__(self, max_positions=5, risk_per_trade=0.02, min_volume=100000):
        self.max_positions = max_positions
        self.risk_per_trade = risk_per_trade  # 2% risk per trade
        self.min_volume = min_volume
        
        # Initialize strategies (only new intraday strategies)
        self.strategies = {
            'gap_trading': GapTradingStrategy(gap_threshold_pct=2.0, target_pct=1.5),
            'scalping': ScalpingStrategy(target_pct=0.4, stop_loss_pct=0.2),
            'support_resistance': SupportResistanceStrategy(target_pct=1.2, stop_loss_pct=0.6)
        }
        
        # Strategy priorities (higher number = higher priority)
        self.strategy_priorities = {
            'gap_trading': 5,        # Highest priority for gap trades
            'support_resistance': 3, # S/R levels
            'scalping': 1           # Lowest priority for scalps
        }
        
        # Time-based filters for intraday trading
        self.trading_hours = {
            'market_open': '09:15',
            'market_close': '15:30',
            'no_trade_zones': [
                ('11:30', '12:00'),  # Pre-lunch quiet period
                ('15:15', '15:30'),  # Last 15 minutes
            ]
        }
    
    def is_trading_time(self, timestamp=None):
        """Check if current time is within trading hours"""
        if timestamp is None:
            timestamp = datetime.now()
        
        current_time = timestamp.strftime('%H:%M')
        
        # Check if within market hours
        if current_time < self.trading_hours['market_open'] or current_time > self.trading_hours['market_close']:
            return False
        
        # Check no-trade zones
        for start, end in self.trading_hours['no_trade_zones']:
            if start <= current_time <= end:
                return False
        
        return True
    
    def calculate_position_size(self, entry_price, stop_loss, portfolio_value):
        """Calculate position size based on risk management"""
        if entry_price <= 0 or stop_loss <= 0:
            return 0
        
        # Calculate risk per share
        risk_per_share = abs(entry_price - stop_loss)
        
        # Calculate total risk amount
        total_risk = portfolio_value * self.risk_per_trade
        
        # Calculate position size
        position_size = int(total_risk / risk_per_share)
        
        return max(position_size, 0)
    
    def filter_by_liquidity(self, df, symbol):
        """Filter signals based on liquidity requirements"""
        if len(df) < 20:
            return False
        
        # Check average volume
        avg_volume = df['Volume'].tail(20).mean()
        if avg_volume < self.min_volume:
            return False
        
        # Check recent volume
        recent_volume = df['Volume'].tail(5).mean()
        if recent_volume < avg_volume * 0.5:  # At least 50% of average volume
            return False
        
        return True
    
    def get_strategy_signals(self, df, symbol):
        """Get signals from all strategies"""
        signals = {}
        
        for strategy_name, strategy in self.strategies.items():
            try:
                signal = None
                
                if strategy_name == 'gap_trading':
                    # Gap trading needs to check for gaps
                    signal = strategy.get_current_signal(df, symbol)
                elif strategy_name == 'scalping':
                    # Scalping works best on shorter timeframes
                    signal = strategy.get_current_signal(df.tail(50), symbol)  # Last 50 candles
                elif strategy_name == 'support_resistance':
                    # Support & Resistance strategy
                    signal = strategy.get_current_signal(df, symbol)
                
                # Only add signal if it's not None and not empty
                if signal is not None:
                    signals[strategy_name] = {
                        'signal': signal,
                        'priority': self.strategy_priorities[strategy_name],
                        'timestamp': datetime.now()
                    }
                    
            except Exception as e:
                print(f"Error in {strategy_name} for {symbol}: {str(e)}")
                continue
        
        return signals
    
    def prioritize_signals(self, signals):
        """Prioritize signals based on strategy importance and timing"""
        if not signals:
            return None
        
        # Sort by priority (highest first)
        sorted_signals = sorted(
            signals.items(),
            key=lambda x: x[1]['priority'],
            reverse=True
        )
        
        return sorted_signals[0]  # Return highest priority signal
    
    def validate_signal(self, signal_data, df, symbol):
        """Validate signal before execution"""
        signal = signal_data['signal']
        
        # Check liquidity
        if not self.filter_by_liquidity(df, symbol):
            return False, "Insufficient liquidity"
        
        # Check trading time
        if not self.is_trading_time():
            return False, "Outside trading hours"
        
        # Check for conflicting signals in recent candles
        if len(df) < 5:
            return False, "Insufficient data"
        
        # Additional validation can be added here
        return True, "Valid signal"
    
    def analyze_symbol(self, df, symbol, portfolio_value=1000000):
        """
        Comprehensive analysis for a single symbol
        
        Args:
            df: OHLCV data
            symbol: Stock symbol
            portfolio_value: Portfolio value for position sizing
        """
        if len(df) < 50:  # Need sufficient data
            return None
        
        # Get signals from all strategies
        signals = self.get_strategy_signals(df, symbol)
        
        if not signals:
            return None
        
        # Prioritize signals
        best_signal_name, best_signal_data = self.prioritize_signals(signals)
        
        # Validate signal
        is_valid, validation_msg = self.validate_signal(best_signal_data, df, symbol)
        
        if not is_valid:
            return {
                'symbol': symbol,
                'status': 'rejected',
                'reason': validation_msg,
                'timestamp': datetime.now()
            }
        
        # Extract signal details
        signal = best_signal_data['signal']
        
        # Calculate position size
        entry_price = df['Close'].iloc[-1]
        stop_loss = signal.get('stop_loss', entry_price * 0.995)  # Default 0.5% stop
        position_size = self.calculate_position_size(entry_price, stop_loss, portfolio_value)
        
        # Compile comprehensive result
        result = {
            'symbol': symbol,
            'strategy': best_signal_name,
            'signal_type': signal['type'],
            'reason': signal['reason'],
            'entry_price': entry_price,
            'target_price': signal['target'],
            'stop_loss': stop_loss,
            'position_size': position_size,
            'risk_amount': abs(entry_price - stop_loss) * position_size,
            'potential_profit': abs(signal['target'] - entry_price) * position_size,
            'risk_reward_ratio': abs(signal['target'] - entry_price) / abs(entry_price - stop_loss),
            'timestamp': datetime.now(),
            'priority': best_signal_data['priority'],
            'all_signals': list(signals.keys()),  # Show which strategies triggered
            'market_data': {
                'volume': df['Volume'].iloc[-1],
                'avg_volume': df['Volume'].tail(20).mean(),
                'price_change_pct': ((df['Close'].iloc[-1] - df['Close'].iloc[-2]) / df['Close'].iloc[-2]) * 100,
                'volatility': df['Close'].tail(20).std()
            }
        }
        
        return result
    
    def scan_multiple_symbols(self, stock_data, symbols, portfolio_value=1000000):
        """
        Scan multiple symbols and return prioritized opportunities
        
        Args:
            stock_data: Dict of symbol -> DataFrame
            symbols: List of symbols to scan
            portfolio_value: Portfolio value for position sizing
        """
        opportunities = []
        
        for symbol in symbols:
            if symbol not in stock_data:
                continue
            
            try:
                result = self.analyze_symbol(stock_data[symbol], symbol, portfolio_value)
                if result and result.get('status') != 'rejected':
                    opportunities.append(result)
            except Exception as e:
                print(f"Error analyzing {symbol}: {str(e)}")
                continue
        
        # Sort by priority and risk-reward ratio
        opportunities.sort(key=lambda x: (x['priority'], x['risk_reward_ratio']), reverse=True)
        
        # Limit to max positions
        return opportunities[:self.max_positions]
    
    def get_market_summary(self, opportunities):
        """Generate market summary from opportunities"""
        if not opportunities:
            return {
                'total_opportunities': 0,
                'avg_risk_reward': 0,
                'strategies_active': [],
                'total_risk': 0,
                'total_potential_profit': 0
            }
        
        return {
            'total_opportunities': len(opportunities),
            'avg_risk_reward': np.mean([op['risk_reward_ratio'] for op in opportunities]),
            'strategies_active': list(set([op['strategy'] for op in opportunities])),
            'total_risk': sum([op['risk_amount'] for op in opportunities]),
            'total_potential_profit': sum([op['potential_profit'] for op in opportunities]),
            'symbols': [op['symbol'] for op in opportunities],
            'signal_types': list(set([op['signal_type'] for op in opportunities]))
        }
    
    def update_strategy_parameters(self, strategy_name, **params):
        """Update parameters for a specific strategy"""
        if strategy_name in self.strategies:
            for param, value in params.items():
                if hasattr(self.strategies[strategy_name], param):
                    setattr(self.strategies[strategy_name], param, value)
    
    def get_strategy_performance_stats(self):
        """Get performance statistics for each strategy (placeholder for future implementation)"""
        # This would track win rates, profit factors, etc. for each strategy
        return {strategy: {'signals_generated': 0, 'win_rate': 0.0} for strategy in self.strategies.keys()} 