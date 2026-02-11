# Autonomous Stock Trading System

An autonomous stock trading system for the Indian stock market that combines technical analysis, pattern recognition, and machine learning to identify trading opportunities across different timeframes.

## Features

- **Market Analysis**: Analyzes market conditions to determine trend, strength, volatility, and momentum
- **Multiple Timeframes**: Supports intraday, swing, long-term, and short-selling strategies
- **Pattern Recognition**: Identifies candlestick patterns, chart patterns, and technical patterns
- **Risk Management**: Calculates position sizes based on risk parameters
- **Automated Monitoring**: Monitors open positions and executes exits based on stop-loss and target levels
- **Performance Tracking**: Tracks trade performance and generates performance metrics
- **Web Dashboard**: Provides a Streamlit-based web dashboard for visualization and interaction

## System Architecture

The system is organized into the following components:

- **Data**: Modules for fetching data from Yahoo Finance and ChartInk
- **Analysis**: Technical indicators, pattern recognition, and market condition analysis
- **Strategies**: Trading strategies for different timeframes
- **Models**: Stock data model and machine learning model for pattern learning
- **Dashboard**: Streamlit-based web dashboard
- **Utils**: Utility functions for logging and scheduling
- **Config**: Configuration settings and pattern definitions

## Installation

1. Clone the repository: 

git clone https://github.com/yourusername/stock-trading-system.git
cd stock-trading-system

2. Create a virtual environment:
On Linux/macOS
python -m venv venv
source venv/bin/activate
On Windows
python -m venv venv
venv\Scripts\activate

3. Install dependencies:

pip install -r requirements.txt

4. Set up MongoDB:
Install MongoDB if not already installed
On Ubuntu
sudo apt-get install mongodb

On macOS
brew install mongodb-community

On Windows
choco install mongodb-community

5. Create a .env file:

cp .env.example .env
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DB=stock_trading
ALPHA_VANTAGE_API_KEY=your_api_key
YAHOO_FINANCE_PROXY=your_proxy_if_needed
DASHBOARD_PORT=8501
DASHBOARD_HOST=localhost


## Usage

### Running the System

To start the trading system:

python main.py
This will start the scheduler and run the trading system in the background. The system will:
- Analyze market conditions at market open
- Scan for trading opportunities
- Monitor active positions
- Update performance metrics

### Running the Dashboard

To start the web dashboard:

streamlit run dashboard/app.py

This will start the Streamlit server and open the dashboard in your web browser at `http://localhost:8501`.

### Running Individual Components

You can also run individual components for testing or development:
### Dashboard

To view the dashboard:

streamlit run dashboard/app.py

### Data Fetching

To fetch stock data from ChartInk:

python -c "from data.chartink import get_stocks_with_fallback; from config.queries import INTRADAY_QUERIES; print(get_stocks_with_fallback(INTRADAY_QUERIES))"



## Dashboard

The dashboard provides the following features:

- **Home**: Overview of market condition, active trades, and performance metrics
- **Intraday Trading**: Scanner, analysis, and watchlist for intraday trading
- **Swing Trading**: Scanner, analysis, and watchlist for swing trading
- **Long-Term Investment**: Scanner, analysis, and watchlist for long-term investment
- **Short Selling**: Scanner, analysis, and watchlist for short selling

### Dashboard Navigation

1. **Home Page**:
   - Market condition summary
   - Active trades overview
   - Performance metrics
   - Equity curve

2. **Intraday Trading**:
   - Scanner: Scan for intraday opportunities
   - Analysis: Analyze specific stocks for intraday trading
   - Watchlist: Manage intraday watchlist

3. **Swing Trading**:
   - Scanner: Scan for swing trading opportunities
   - Analysis: Analyze specific stocks for swing trading
   - Watchlist: Manage swing trading watchlist

4. **Long-Term Investment**:
   - Scanner: Scan for long-term investment opportunities
   - Analysis: Analyze specific stocks for long-term investment
   - Watchlist: Manage long-term investment watchlist

5. **Short Selling**:
   - Scanner: Scan for short selling opportunities
   - Analysis: Analyze specific stocks for short selling
   - Watchlist: Manage short selling watchlist

## Trading Strategies

### Intraday Strategies

- **Momentum Long**: Buys stocks showing strong momentum with increasing volume
- **Breakout Long**: Buys stocks breaking out of resistance levels with high volume
- **Reversal Long**: Buys stocks showing reversal patterns at support levels

### Swing Strategies

- **Trend Following Long**: Buys stocks in established uptrends
- **Pullback Long**: Buys pullbacks in uptrending stocks
- **Breakout Long**: Buys stocks breaking out of consolidation patterns

### Long-Term Strategies

- **Value Investing**: Buys undervalued stocks with strong fundamentals
- **Growth Investing**: Buys stocks with strong growth potential
- **Momentum Investing**: Buys stocks with strong long-term momentum

### Short Selling Strategies

- **Trend Following Short**: Shorts stocks in established downtrends
- **Breakdown Short**: Shorts stocks breaking down from support levels
- **Volatility Short**: Shorts stocks with high volatility and bearish patterns

## Risk Management

The system implements the following risk management features:

- **Position Sizing**: Calculates position size based on account balance and risk percentage
- **Stop Loss**: Sets stop loss levels based on technical analysis
- **Take Profit**: Sets take profit levels based on reward-to-risk ratio
- **Maximum Positions**: Limits the number of open positions
- **Market Condition Filter**: Adjusts strategy selection based on market conditions

## Data Sources

- **Yahoo Finance**: Used for historical price data and real-time quotes
- **ChartInk**: Used for stock screening based on technical criteria
- **MongoDB**: Used for storing scan results, trades, and performance metrics

## Customization

### Adding New Strategies

To add a new strategy:

1. Create a new function in the appropriate strategy module
2. Implement the strategy logic
3. Add the strategy to the strategy registry
4. Update the strategy selection logic

Example:

def momentum_long_strategy(stock):
    """Momentum Long Strategy"""
    if stock.momentum > 0.5 and stock.volume > 1000000:
        return True
    return False

### Adding New Patterns

To add a new pattern:

1. Create a new function in the appropriate pattern module
2. Implement the pattern logic
3. Add the pattern to the pattern registry

Example:

def bullish_engulfing_pattern(stock):
    """Bullish Engulfing Pattern"""
    if stock.close > stock.open and stock.open < stock.previous_close and stock.close > stock.previous_close:
        return True
    return False


### Adding New Indicators

To add a new indicator:

1. Create a new function in the appropriate indicator module
2. Implement the indicator logic
3. Add the indicator to the indicator registry

Example:

def bollinger_bands(stock):
    """Bollinger Bands"""
    return stock.close > stock.upper_band                                               


## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**:
   - Ensure MongoDB is installed and running
   - Check MongoDB connection string in `.env` file

2. **Yahoo Finance Data Error**:
   - Check internet connection
   - Try using a proxy if you're in a region with restricted access

3. **ChartInk Scanning Error**:
   - Check ChartInk query syntax
   - Try using alternative queries

### Logs

Logs are stored in the `logs` directory. You can check the logs for detailed information about system operation and errors:

cat logs/system.log
cat logs/error.log

### Debugging

To enable debugging:

1. Set `DEBUG=True` in `.env` file
2. Run the system with `python main.py`

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.