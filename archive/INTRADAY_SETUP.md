# Intraday Trading Algorithms Setup Guide

## Overview

I've created a comprehensive set of seed algorithms for intraday buy and sell trading that complement your existing stock discovery app. These algorithms are designed to work together to identify, validate, and execute intraday trading opportunities.

## New Algorithms Created

### 1. **Gap Trading Strategy** (`algorithms/strategies/gap_trading.py`)
- **Purpose**: Trades stocks that gap up or down significantly at market open
- **Strategies**: Gap fill (mean reversion) and gap continuation (momentum)
- **Best for**: Market open (9:15-11:00 AM), stocks with 2%+ gaps
- **Target R:R**: 1:1.5 to 1:3

### 2. **Scalping Strategy** (`algorithms/strategies/scalping_strategy.py`)
- **Purpose**: Ultra-short term trades for quick 0.2-0.8% profits
- **Strategies**: Mean reversion and momentum scalps
- **Best for**: High volume, liquid stocks
- **Target R:R**: 1:2 (5-15 minute trades)

### 3. **Support & Resistance Strategy** (`algorithms/strategies/support_resistance.py`)
- **Purpose**: Trades breakouts and bounces from key price levels
- **Strategies**: Breakouts above resistance, bounces off support
- **Best for**: Stocks with clear S/R levels
- **Target R:R**: 1:2 to 1:3

### 4. **Intraday Orchestrator** (`algorithms/strategies/intraday_orchestrator.py`)
- **Purpose**: Combines all strategies with unified risk management
- **Features**: Strategy prioritization, position sizing, time filtering
- **Best for**: Portfolio-level coordination
- **Risk Management**: 2% risk per trade, position sizing

### 5. **Enhanced Intraday Scanner** (`algorithms/screeners/intraday_scanner.py`)
- **Purpose**: Identifies best stocks for day trading
- **Criteria**: Volume surge, gaps, momentum, breakout potential
- **Best for**: Market surveillance and opportunity discovery
- **Output**: Ranked list of candidates with scores

## Quick Start

### 1. Install Dependencies
```bash
pip install pandas numpy scipy yfinance
```

### 2. Test the Algorithms
```bash
python intraday_demo.py
```

### 3. Basic Usage Example
```python
from algorithms.strategies.intraday_orchestrator import IntradayOrchestrator
from algorithms.screeners.intraday_scanner import IntradayScanner

# Initialize components
orchestrator = IntradayOrchestrator(max_positions=5, risk_per_trade=0.02)
scanner = IntradayScanner()

# Scan for opportunities
candidates = scanner.comprehensive_scan(stock_data, symbols)

# Get trading signals
opportunities = orchestrator.scan_multiple_symbols(stock_data, symbols)

# Display results
for opp in opportunities:
    print(f"{opp['symbol']}: {opp['signal_type']} - {opp['reason']}")
```

## Integration with Your Existing App

### 1. **Add to your main dashboard**
```python
# In your main dashboard file
from algorithms.strategies.intraday_orchestrator import IntradayOrchestrator

orchestrator = IntradayOrchestrator()
intraday_signals = orchestrator.scan_multiple_symbols(your_stock_data, symbols)
```

### 2. **Enhance your stock scanner**
```python
# Add to your existing scanner
from algorithms.screeners.intraday_scanner import IntradayScanner

scanner = IntradayScanner()
intraday_candidates = scanner.comprehensive_scan(stock_data, symbols)
```

### 3. **Create alerts**
```python
# Set up alerts for high-priority signals
for opportunity in opportunities:
    if opportunity['priority'] >= 4:  # High priority signals
        send_alert(opportunity)
```

## Key Features

### ✅ **Risk Management**
- Position sizing based on stop loss and portfolio value
- Maximum positions limit (default: 5)
- Risk per trade limit (default: 2%)
- Time-based filtering (no trades during lunch, last 15 minutes)

### ✅ **Strategy Coordination**
- Priority-based signal selection
- Multiple timeframe analysis
- Volume and liquidity filtering
- Comprehensive market scanning

### ✅ **Real-time Monitoring**
- Live signal generation
- Market summary statistics
- Performance tracking (ready for implementation)
- Portfolio-level risk tracking

## Configuration Options

### Strategy Parameters
```python
# Gap Trading
gap_strategy = GapTradingStrategy(
    gap_threshold_pct=2.0,    # Minimum gap size
    target_pct=1.5,           # Target profit %
    stop_loss_pct=0.75        # Stop loss %
)

# Scalping
scalp_strategy = ScalpingStrategy(
    target_pct=0.4,           # Quick profit target
    stop_loss_pct=0.2,        # Tight stop loss
    volume_threshold=2.0      # Volume surge requirement
)

# Support/Resistance
sr_strategy = SupportResistanceStrategy(
    target_pct=1.2,           # Target profit %
    min_touches=2,            # Minimum S/R confirmations
    level_tolerance=0.2       # Level matching tolerance
)
```

### Scanner Settings
```python
scanner = IntradayScanner(
    min_price=50.0,           # Minimum stock price
    max_price=3000.0,         # Maximum stock price
    min_volume=100000,        # Minimum daily volume
    volume_surge_threshold=2.0, # Volume spike requirement
    gap_threshold=1.5         # Gap size threshold
)
```

## Next Steps

### Immediate (Next 1-2 weeks)
1. **Test with live data**: Replace sample data with real market feeds
2. **Backtest strategies**: Validate performance on historical data
3. **Add to your dashboard**: Integrate with existing Streamlit app
4. **Set up alerts**: Email/SMS notifications for high-priority signals

### Short-term (Next month)
1. **Paper trading**: Test strategies with virtual money
2. **Performance tracking**: Track win rates and profit factors
3. **Additional indicators**: MACD, Bollinger Bands, VWAP
4. **Market regime detection**: Bull/bear/sideways market adaptation

### Long-term (Next 3 months)
1. **Machine learning**: Signal validation and market prediction
2. **Automated execution**: Connect to broker APIs (Zerodha, etc.)
3. **Advanced risk management**: Correlation analysis, sector limits
4. **Mobile app**: Real-time alerts and monitoring

## File Structure
```
algorithms/
├── strategies/
│   ├── gap_trading.py           # NEW: Gap trading algorithm
│   ├── scalping_strategy.py     # NEW: Scalping algorithm
│   ├── support_resistance.py    # NEW: S/R algorithm
│   ├── intraday_orchestrator.py # NEW: Strategy coordinator
│   ├── momentum_reversal.py     # EXISTING: Enhanced
│   └── volume_breakout.py       # EXISTING: Enhanced
├── screeners/
│   ├── intraday_scanner.py      # NEW: Enhanced scanner
│   └── technical.py             # EXISTING
└── indicators/
    └── trend.py                 # EXISTING

intraday_demo.py                 # NEW: Complete demonstration
INTRADAY_SETUP.md               # NEW: This setup guide
```

## Support

For questions or issues:
1. Check the demo script: `python intraday_demo.py`
2. Review algorithm documentation in each file
3. Test with sample data first before using live data
4. Start with paper trading before real money

---

**Happy Trading! 🚀📈**

*Remember: These are tools to assist your trading decisions. Always do your own research and never risk more than you can afford to lose.* 