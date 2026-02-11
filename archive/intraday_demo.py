#!/usr/bin/env python3
"""
Intraday Trading Algorithm Demo

This script demonstrates how to use the new seed algorithms for intraday trading:
1. Gap Trading Strategy
2. Scalping Strategy  
3. Support & Resistance Strategy
4. Intraday Orchestrator
5. Enhanced Scanner

Run this script to see how the algorithms work together.
"""

import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# Import our new strategies
from algorithms.strategies.gap_trading import GapTradingStrategy
from algorithms.strategies.scalping_strategy import ScalpingStrategy
from algorithms.strategies.support_resistance import SupportResistanceStrategy
from algorithms.strategies.intraday_orchestrator import IntradayOrchestrator
from algorithms.screeners.intraday_scanner import IntradayScanner

def generate_sample_data(symbol="RELIANCE.NS", period="5d", interval="5m"):
    """Generate sample intraday data for demonstration"""
    try:
        ticker = yf.Ticker(symbol)
        data = ticker.history(period=period, interval=interval)
        
        if data.empty:
            # Generate synthetic data for demo
            print(f"No data for {symbol}, generating synthetic data...")
            dates = pd.date_range(start=datetime.now() - timedelta(days=5), 
                                 end=datetime.now(), freq='5min')
            
            # Create realistic price movements
            base_price = 2500
            price_changes = np.random.normal(0, 0.002, len(dates))
            prices = [base_price]
            
            for change in price_changes[1:]:
                new_price = prices[-1] * (1 + change)
                prices.append(new_price)
            
            data = pd.DataFrame({
                'Open': prices,
                'High': [p * (1 + abs(np.random.normal(0, 0.001))) for p in prices],
                'Low': [p * (1 - abs(np.random.normal(0, 0.001))) for p in prices],
                'Close': prices,
                'Volume': np.random.normal(100000, 20000, len(dates))
            }, index=dates)
            
            # Add some gaps and volume spikes for demo
            gap_indices = np.random.choice(len(data), 3, replace=False)
            for idx in gap_indices:
                if idx > 0:
                    gap_size = np.random.choice([-0.02, 0.02])  # 2% gap
                    data.iloc[idx:idx+5] *= (1 + gap_size)
                    data.iloc[idx:idx+5, 4] *= 3  # Volume spike
        
        return data
        
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

def demo_individual_strategies():
    """Demonstrate individual strategy performance"""
    print("="*60)
    print("INDIVIDUAL STRATEGY DEMONSTRATION")
    print("="*60)
    
    # Generate sample data
    sample_data = generate_sample_data()
    if sample_data is None:
        print("Could not generate sample data")
        return
    
    print(f"Sample data shape: {sample_data.shape}")
    print(f"Date range: {sample_data.index[0]} to {sample_data.index[-1]}")
    print()
    
    # Test Gap Trading Strategy
    print("1. GAP TRADING STRATEGY")
    print("-" * 30)
    gap_strategy = GapTradingStrategy(gap_threshold_pct=1.5, target_pct=1.0)
    gap_signals = gap_strategy.analyze(sample_data.copy(), "DEMO", strategy_type='both')
    
    if not gap_signals.empty:
        print(f"Found {len(gap_signals)} gap trading signals:")
        for idx, signal in gap_signals.tail(3).iterrows():
            desc = gap_strategy.get_signal_description(signal)
            if desc:
                print(f"  - {desc['type']}: {desc['reason']}")
                print(f"    Target: ₹{desc['target']:.2f}, Stop: ₹{desc['stop_loss']:.2f}")
    else:
        print("No gap trading signals found in sample data")
    print()
    
    # Test Scalping Strategy
    print("2. SCALPING STRATEGY")
    print("-" * 30)
    scalp_strategy = ScalpingStrategy(target_pct=0.3, stop_loss_pct=0.15)
    scalp_signals = scalp_strategy.analyze(sample_data.copy(), "DEMO", strategy_type='both')
    
    if not scalp_signals.empty:
        print(f"Found {len(scalp_signals)} scalping signals:")
        for idx, signal in scalp_signals.tail(3).iterrows():
            desc = scalp_strategy.get_signal_description(signal)
            if desc:
                print(f"  - {desc['type']}: {desc['reason']}")
                print(f"    R:R = {desc['risk_reward']}, Timeframe: {desc['timeframe']}")
    else:
        print("No scalping signals found in sample data")
    print()
    
    # Test Support & Resistance Strategy
    print("3. SUPPORT & RESISTANCE STRATEGY")
    print("-" * 30)
    sr_strategy = SupportResistanceStrategy(target_pct=1.0, stop_loss_pct=0.5)
    sr_signals = sr_strategy.analyze(sample_data.copy(), "DEMO", strategy_type='both')
    
    if not sr_signals.empty:
        print(f"Found {len(sr_signals)} S/R signals:")
        for idx, signal in sr_signals.tail(3).iterrows():
            desc = sr_strategy.get_signal_description(signal)
            if desc:
                print(f"  - {desc['type']}: {desc['reason']}")
                print(f"    Key Level: ₹{desc['key_level']:.2f}")
    else:
        print("No S/R signals found in sample data")
    print()

def demo_orchestrator():
    """Demonstrate the intraday orchestrator"""
    print("="*60)
    print("INTRADAY ORCHESTRATOR DEMONSTRATION")
    print("="*60)
    
    # Create sample data for multiple symbols
    symbols = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS"]
    stock_data = {}
    
    print("Generating sample data for multiple symbols...")
    for symbol in symbols:
        data = generate_sample_data(symbol)
        if data is not None:
            stock_data[symbol] = data
    
    print(f"Loaded data for {len(stock_data)} symbols")
    print()
    
    # Initialize orchestrator
    orchestrator = IntradayOrchestrator(
        max_positions=3,
        risk_per_trade=0.02,  # 2% risk per trade
        min_volume=50000
    )
    
    # Scan for opportunities
    print("Scanning for trading opportunities...")
    opportunities = orchestrator.scan_multiple_symbols(
        stock_data, 
        list(stock_data.keys()), 
        portfolio_value=1000000
    )
    
    if opportunities:
        print(f"\nFound {len(opportunities)} trading opportunities:")
        print("-" * 50)
        
        for i, opp in enumerate(opportunities, 1):
            print(f"{i}. {opp['symbol']} - {opp['strategy'].upper()}")
            print(f"   Signal: {opp['signal_type']}")
            print(f"   Reason: {opp['reason']}")
            print(f"   Entry: ₹{opp['entry_price']:.2f}")
            print(f"   Target: ₹{opp['target_price']:.2f}")
            print(f"   Stop Loss: ₹{opp['stop_loss']:.2f}")
            print(f"   Position Size: {opp['position_size']} shares")
            print(f"   Risk: ₹{opp['risk_amount']:.2f}")
            print(f"   Potential Profit: ₹{opp['potential_profit']:.2f}")
            print(f"   Risk:Reward = 1:{opp['risk_reward_ratio']:.2f}")
            print(f"   Priority: {opp['priority']}")
            print()
        
        # Market summary
        summary = orchestrator.get_market_summary(opportunities)
        print("MARKET SUMMARY:")
        print(f"Total Opportunities: {summary['total_opportunities']}")
        print(f"Average Risk:Reward: 1:{summary['avg_risk_reward']:.2f}")
        print(f"Total Risk: ₹{summary['total_risk']:.2f}")
        print(f"Total Potential Profit: ₹{summary['total_potential_profit']:.2f}")
        print(f"Active Strategies: {', '.join(summary['strategies_active'])}")
        print(f"Signal Types: {', '.join(summary['signal_types'])}")
        
    else:
        print("No trading opportunities found")
    print()

def demo_scanner():
    """Demonstrate the enhanced intraday scanner"""
    print("="*60)
    print("ENHANCED INTRADAY SCANNER DEMONSTRATION")
    print("="*60)
    
    # Create sample data with more realistic characteristics
    symbols = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS"]
    stock_data = {}
    
    print("Generating sample data with intraday characteristics...")
    for symbol in symbols:
        data = generate_sample_data(symbol)
        if data is not None:
            # Add some intraday patterns
            data.name = symbol
            stock_data[symbol] = data
    
    # Initialize scanner
    scanner = IntradayScanner(
        min_price=50.0,
        max_price=3000.0,
        min_volume=50000,
        volume_surge_threshold=1.5,
        gap_threshold=1.0
    )
    
    # Comprehensive scan
    print("Performing comprehensive intraday scan...")
    candidates = scanner.comprehensive_scan(stock_data, list(stock_data.keys()), max_results=10)
    
    if candidates:
        print(f"\nTop {len(candidates)} candidates for intraday trading:")
        print("-" * 60)
        
        for i, candidate in enumerate(candidates, 1):
            print(f"{i}. {candidate['symbol']} - {candidate['scan_reason']}")
            print(f"   Price: ₹{candidate['current_price']:.2f} ({candidate['price_change_pct']:+.2f}%)")
            print(f"   Volume Ratio: {candidate['volume_ratio']:.1f}x")
            print(f"   Gap: {candidate['gap_pct']:+.1f}%")
            print(f"   RSI: {candidate['rsi']:.1f}")
            print(f"   Momentum Score: {candidate['momentum_score']:.1f}")
            print(f"   Liquidity Score: {candidate['liquidity_score']:.1f}")
            print(f"   Breakout Potential: {candidate['breakout_potential']:.1f}")
            print(f"   Final Score: {candidate['final_score']:.1f}")
            print()
        
        # Scanner summary
        summary = scanner.get_scan_summary(candidates)
        print("SCAN SUMMARY:")
        print(f"Total Candidates: {summary['total_candidates']}")
        print(f"Average Volume Ratio: {summary['avg_volume_ratio']:.1f}x")
        print(f"Average Price Change: {summary['avg_price_change']:.2f}%")
        print(f"Scan Categories: {summary['scan_categories']}")
        
    else:
        print("No candidates found in scan")
    print()

def show_algorithm_overview():
    """Show overview of all algorithms"""
    print("="*60)
    print("INTRADAY TRADING ALGORITHMS OVERVIEW")
    print("="*60)
    
    algorithms = {
        "Gap Trading Strategy": {
            "description": "Trades gaps at market open - either gap fill (mean reversion) or gap continuation (momentum)",
            "best_for": "Market open, stocks with 2%+ gaps",
            "timeframe": "First 1-2 hours of trading",
            "risk_reward": "1:1.5 to 1:3"
        },
        "Scalping Strategy": {
            "description": "Ultra-short term trades for quick 0.2-0.8% profits with tight stops",
            "best_for": "High volume, liquid stocks",
            "timeframe": "5-15 minutes",
            "risk_reward": "1:2 (tight stops, quick targets)"
        },
        "Support & Resistance": {
            "description": "Trades breakouts and bounces from key price levels",
            "best_for": "Stocks with clear S/R levels",
            "timeframe": "30 minutes to 2 hours",
            "risk_reward": "1:2 to 1:3"
        },
        "Intraday Orchestrator": {
            "description": "Combines all strategies with risk management and position sizing",
            "best_for": "Portfolio-level risk management",
            "timeframe": "All day",
            "risk_reward": "Optimized across all signals"
        },
        "Enhanced Scanner": {
            "description": "Identifies best stocks for intraday trading based on volume, momentum, gaps",
            "best_for": "Market surveillance and opportunity discovery",
            "timeframe": "Pre-market and throughout trading day",
            "risk_reward": "N/A (screening tool)"
        }
    }
    
    for name, details in algorithms.items():
        print(f"{name}:")
        print(f"  Description: {details['description']}")
        print(f"  Best for: {details['best_for']}")
        print(f"  Timeframe: {details['timeframe']}")
        print(f"  Risk:Reward: {details['risk_reward']}")
        print()

def main():
    """Main demonstration function"""
    print("INTRADAY TRADING ALGORITHMS DEMONSTRATION")
    print(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    show_algorithm_overview()
    demo_individual_strategies()
    demo_orchestrator()
    demo_scanner()
    
    print("="*60)
    print("NEXT STEPS")
    print("="*60)
    print("""
1. Integrate with real market data feeds (Yahoo Finance, Alpha Vantage, etc.)
2. Add backtesting framework to validate strategies
3. Implement paper trading for live testing
4. Set up alerts and notifications
5. Create a web dashboard for monitoring
6. Add more technical indicators and patterns
7. Implement machine learning for signal validation
8. Add risk management rules (daily loss limits, etc.)
9. Create position tracking and P&L monitoring
10. Implement automated order execution (via Zerodha/broker APIs)

Key Files Created:
- algorithms/strategies/gap_trading.py
- algorithms/strategies/scalping_strategy.py  
- algorithms/strategies/support_resistance.py
- algorithms/strategies/intraday_orchestrator.py
- algorithms/screeners/intraday_scanner.py

These algorithms provide a solid foundation for intraday trading with 
proper risk management and multiple strategy coordination.
    """)

if __name__ == "__main__":
    main() 