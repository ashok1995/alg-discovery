"""
ChartInk queries for stock screening
"""

# Intraday queries
INTRADAY_QUERIES = {
    "Gap Up": {
        "query": "open > close[1]*1.02 and volume > sma(volume,20)",
        "description": "Stocks opening more than 2% up with above average volume"
    },
    "Gap Down": {
        "query": "open < close[1]*0.98 and volume > sma(volume,20)",
        "description": "Stocks opening more than 2% down with above average volume"
    }
}

# Swing queries
SWING_QUERIES = {
    "Breakout": {
        "query": "close > sma(close,20) and close > sma(close,50) and volume > sma(volume,20)*1.5",
        "description": "Stocks breaking out with increased volume"
    },
    "Momentum": {
        "query": "rsi(14) > 60 and close > sma(close,20) and close > sma(close,50)",
        "description": "Stocks with strong momentum"
    },
    "Pullback": {
        "query": "close > sma(close,50) and close < sma(close,20) and rsi(14) < 40",
        "description": "Stocks pulling back to support in uptrend"
    },
    "Double Bottom": {
        "query": "min(low,20) = min(low,40) and low > min(low,20) and close > sma(close,20)",
        "description": "Potential double bottom pattern"
    }
}

# Long-term queries
LONG_TERM_QUERIES = [
    {
        "name": "Value Investing",
        "query": "( {cash} ( latest close > latest sma(200) * 0.9 and latest close < latest sma(200) * 1.1 and latest pe > 0 and latest pe < 15 ) )"
    },
    {
        "name": "Growth Investing",
        "query": "( {cash} ( latest close > latest sma(200) and latest sma(50) > latest sma(200) and latest volume > latest volume sma(50) ) )"
    },
    {
        "name": "Dividend Investing",
        "query": "( {cash} ( latest close > 100 and latest dividend yield % > 3 ) )"
    }
]

# Short sell queries
SHORT_SELL_QUERIES = [
    {
        "name": "Breakdown",
        "query": "( {cash} ( latest close < latest support and latest volume > latest volume sma(20) * 1.5 and latest close < latest sma(50) ) )"
    },
    {
        "name": "Bearish Trend",
        "query": "( {cash} ( latest close < latest sma(20) and latest sma(20) < latest sma(50) and latest sma(50) < latest sma(200) and latest volume > latest volume sma(20) ) )"
    },
    {
        "name": "Overbought Reversal",
        "query": "( {cash} ( latest close < latest open and latest close 1 candle ago < latest open 1 candle ago and latest rsi(14) > 70 ) )"
    }
] 