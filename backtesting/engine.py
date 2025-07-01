import pandas as pd
import numpy as np
from typing import Dict, Any

class BacktestEngine:
    """Simple backtesting engine for testing trading strategies."""
    
    def __init__(self, initial_capital=100000):
        """
        Initialize the backtesting engine.
        
        Args:
            initial_capital: Starting capital in rupees
        """
        self.initial_capital = initial_capital
        self.portfolio = {
            'cash': initial_capital,
            'positions': {},
            'history': []
        }
        
    def run(self, data: pd.DataFrame, strategy: Any) -> Dict:
        """
        Run backtest for a given strategy
        
        Args:
            data: DataFrame with OHLCV data
            strategy: Strategy instance that generates signals
        """
        # Generate signals
        df = strategy.generate_signals(data)
        
        # Calculate returns
        df['next_day_return'] = df['close'].pct_change().shift(-1)
        df['strategy_returns'] = df['signal'] * df['next_day_return']
        
        # Calculate metrics
        metrics = self._calculate_metrics(df)
        
        return {
            'metrics': metrics,
            'trades': df[df['signal'] != 0],
            'equity_curve': self._calculate_equity_curve(df)
        }

    def _calculate_metrics(self, df: pd.DataFrame) -> Dict:
        """Calculate performance metrics"""
        returns = df['strategy_returns'].dropna()
        
        return {
            'total_trades': len(df[df['signal'] != 0]),
            'winning_trades': len(returns[returns > 0]),
            'losing_trades': len(returns[returns < 0]),
            'win_rate': len(returns[returns > 0]) / len(returns[returns != 0]),
            'total_return': returns.sum(),
            'sharpe_ratio': self._calculate_sharpe_ratio(returns),
            'max_drawdown': self._calculate_max_drawdown(returns)
        }

    def _calculate_sharpe_ratio(self, returns, risk_free_rate=0.05):
        if len(returns) == 0:
            return 0
        excess_returns = returns - risk_free_rate/252
        return np.sqrt(252) * excess_returns.mean() / returns.std() if returns.std() != 0 else 0

    def _calculate_max_drawdown(self, returns):
        cumulative = (1 + returns).cumprod()
        rolling_max = cumulative.expanding().max()
        drawdowns = cumulative / rolling_max - 1
        return drawdowns.min()

    def _calculate_equity_curve(self, df):
        return (1 + df['strategy_returns']).cumprod() * self.initial_capital
    
    def run_backtest(self, price_data, strategy_func, **strategy_params):
        """
        Run a backtest on historical price data using a strategy function.
        
        Args:
            price_data: DataFrame with historical prices
            strategy_func: Function that generates buy/sell signals
            strategy_params: Parameters to pass to the strategy function
            
        Returns:
            DataFrame with backtest results
        """
        # Reset portfolio
        self.portfolio = {
            'cash': self.initial_capital,
            'positions': {},
            'history': []
        }
        
        # Get signals from strategy
        signals = strategy_func(price_data, **strategy_params)
        
        # Iterate through each day
        for date, row in signals.iterrows():
            # Execute trades based on signals
            if row['signal'] == 1:  # Buy signal
                self._execute_buy(date, row['symbol'], row['price'], row.get('quantity', 1))
            elif row['signal'] == -1:  # Sell signal
                self._execute_sell(date, row['symbol'], row['price'], row.get('quantity', 1))
            
            # Update portfolio value
            self._update_portfolio_value(date, price_data)
        
        # Convert history to DataFrame
        results = pd.DataFrame(self.portfolio['history'])
        
        # Calculate performance metrics
        if not results.empty:
            results['returns'] = results['portfolio_value'].pct_change()
            results['cumulative_returns'] = (1 + results['returns']).cumprod() - 1
        
        return results
    
    def _execute_buy(self, date, symbol, price, quantity):
        """Execute a buy order."""
        cost = price * quantity
        
        if cost <= self.portfolio['cash']:
            # Update cash
            self.portfolio['cash'] -= cost
            
            # Update position
            if symbol in self.portfolio['positions']:
                self.portfolio['positions'][symbol]['quantity'] += quantity
                self.portfolio['positions'][symbol]['value'] += cost
            else:
                self.portfolio['positions'][symbol] = {
                    'quantity': quantity,
                    'value': cost
                }
            
            # Log trade
            self.portfolio['history'].append({
                'date': date,
                'action': 'BUY',
                'symbol': symbol,
                'price': price,
                'quantity': quantity,
                'value': cost,
                'cash': self.portfolio['cash']
            })
    
    def _execute_sell(self, date, symbol, price, quantity):
        """Execute a sell order."""
        if symbol in self.portfolio['positions'] and self.portfolio['positions'][symbol]['quantity'] >= quantity:
            # Calculate sale value
            sale_value = price * quantity
            
            # Update cash
            self.portfolio['cash'] += sale_value
            
            # Update position
            self.portfolio['positions'][symbol]['quantity'] -= quantity
            
            # If no more shares, remove position
            if self.portfolio['positions'][symbol]['quantity'] == 0:
                del self.portfolio['positions'][symbol]
            
            # Log trade
            self.portfolio['history'].append({
                'date': date,
                'action': 'SELL',
                'symbol': symbol,
                'price': price,
                'quantity': quantity,
                'value': sale_value,
                'cash': self.portfolio['cash']
            })
    
    def _update_portfolio_value(self, date, price_data):
        """Update the portfolio value at the end of the day."""
        # Calculate value of positions
        positions_value = 0
        for symbol, position in self.portfolio['positions'].items():
            if symbol in price_data.columns:
                current_price = price_data.loc[date, symbol]
                positions_value += current_price * position['quantity']
        
        # Total portfolio value
        portfolio_value = self.portfolio['cash'] + positions_value
        
        # Log portfolio value
        self.portfolio['history'].append({
            'date': date,
            'portfolio_value': portfolio_value,
            'cash': self.portfolio['cash'],
            'positions_value': positions_value
        }) 