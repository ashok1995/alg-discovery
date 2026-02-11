import pandas as pd
import numpy as np
import os
import json
import time
import requests
from bs4 import BeautifulSoup as bs
from datetime import datetime, timedelta
import schedule
import threading
from stock_analyzer import get_stock_data, identify_patterns
from config import (
    BASE_QUERY, VOLUME_QUERY, MOMENTUM_QUERY_1, 
    COMBINED_QUERY_1, COMBINED_QUERY_2, STOCKS_WATCHLIST
)

# File to store stock metrics
METRICS_FILE = "stock_metrics.json"

def read_stocks():
    """Read stocks from watchlist file"""
    try:
        with open(STOCKS_WATCHLIST, "r") as f:
            stocks = [line.strip().split(",") for line in f.readlines()]
        return [stock[0] for stock in stocks if len(stock) == 2]
    except FileNotFoundError:
        return []

def get_stocks_data(query):
    """Get stock data from ChartInk using the query"""
    data = {
        'scan_clause': query
    }

    with requests.Session() as s:
        r = s.get('https://chartink.com/screener/alg-test-1')
        soup = bs(r.content, 'html.parser')
        s.headers['X-CSRF-TOKEN'] = soup.select_one('[name=csrf-token]')['content']
        r = s.post('https://chartink.com/screener/process', data=data).json()
        
        df = pd.DataFrame(r['data'])
        return df

def load_metrics():
    """Load stock metrics from file"""
    if os.path.exists(METRICS_FILE):
        with open(METRICS_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_metrics(metrics):
    """Save stock metrics to file"""
    with open(METRICS_FILE, 'w') as f:
        json.dump(metrics, f, indent=4)

def calculate_score(metrics, current_time):
    """
    Calculate score based on recency and frequency
    
    Args:
        metrics: Dictionary of stock metrics
        current_time: Current datetime
        
    Returns:
        Score value (higher is better)
    """
    # Convert signal times to datetime objects
    signal_times = [datetime.strptime(t, "%Y-%m-%d %H:%M:%S") for t in metrics.get("signal_times", [])]
    
    if not signal_times:
        return 0
    
    # Calculate recency score (more recent signals get higher scores)
    most_recent = max(signal_times)
    recency_hours = (current_time - most_recent).total_seconds() / 3600
    recency_score = max(0, 24 - recency_hours) / 24  # Scale from 0 to 1, with 0 being 24+ hours old
    
    # Calculate frequency score (more signals get higher scores)
    # Only count signals from the last 3 days
    recent_signals = [t for t in signal_times if (current_time - t).days <= 3]
    frequency_score = min(1, len(recent_signals) / 5)  # Scale from 0 to 1, capped at 5 signals
    
    # Calculate strength score (average of signal strengths)
    strength_score = metrics.get("avg_strength", 0)
    
    # Calculate volume score
    volume_score = min(1, metrics.get("avg_volume", 0) / 1000000)  # Scale from 0 to 1, capped at 1M volume
    
    # Calculate reward/risk score
    rr_score = min(1, metrics.get("avg_reward_risk", 0) / 3)  # Scale from 0 to 1, capped at 3:1 ratio
    
    # Weighted score calculation
    score = (
        0.35 * recency_score +      # 35% weight to recency
        0.25 * frequency_score +    # 25% weight to frequency
        0.15 * strength_score +     # 15% weight to signal strength
        0.10 * volume_score +       # 10% weight to volume
        0.15 * rr_score             # 15% weight to reward/risk ratio
    )
    
    return score

def scan_stocks_with_fallback():
    """Scan stocks using ChartInk queries with fallback approach"""
    print(f"Starting ChartInk scan at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Define our waterfall of queries in order of preference (most selective first)
    waterfall_queries = [
        ("Combined query 2", COMBINED_QUERY_2),  # Most selective with trend strength
        ("Combined query 1", COMBINED_QUERY_1),  # Combined volume and momentum
        ("Volume filter", VOLUME_QUERY),         # Volume-based filter
        ("Momentum filter", MOMENTUM_QUERY_1),   # Momentum-based filter
        ("Base query", BASE_QUERY)               # Fallback query
    ]
    
    # Try each query in the waterfall until one works
    selected_df = None
    selected_name = None
    
    for name, query in waterfall_queries:
        try:
            df = get_stocks_data(query)
            print(f"{name}: {df.shape}")
            
            if not df.empty:
                selected_df = df
                selected_name = name
                break
        except Exception as e:
            print(f"{name} error: {e}")
    
    # If all queries failed, return empty DataFrame
    if selected_df is None:
        print("All queries failed, returning empty DataFrame")
        return pd.DataFrame(), ""
    
    print(f"Selected {selected_name} as best query")
    
    # Sort by percentage change (descending) to get the most promising stocks
    if 'per_chg' in selected_df.columns:
        selected_df = selected_df.sort_values(by=['per_chg'], ascending=False)
    
    # Take only the top 200 stocks
    if len(selected_df) > 200:
        print(f"Limiting results to top 200 stocks (from {len(selected_df)})")
        selected_df = selected_df.head(200)
    
    return selected_df, selected_name

def update_metrics_from_chartink():
    """Update metrics using ChartInk data"""
    # Load existing metrics
    metrics_dict = load_metrics()
    
    # Current time
    current_time = datetime.now()
    
    # Get stocks from ChartInk
    df, query_name = scan_stocks_with_fallback()
    
    if df.empty:
        print("No stocks found from ChartInk queries")
        return
    
    # Update metrics for each stock in the results
    for _, row in df.iterrows():
        symbol = row['nsecode']
        
        # Initialize metrics for this stock if not exists
        if symbol not in metrics_dict:
            metrics_dict[symbol] = {
                "symbol": symbol,
                "signal_times": [],
                "buy_signals": 0,
                "sell_signals": 0,
                "avg_strength": 0,
                "avg_volume": 0,
                "avg_reward_risk": 0,
                "last_price": float(row['close']),
                "last_update": current_time.strftime("%Y-%m-%d %H:%M:%S")
            }
        
        # Update last price and update time
        metrics_dict[symbol]["last_price"] = float(row['close'])
        metrics_dict[symbol]["last_update"] = current_time.strftime("%Y-%m-%d %H:%M:%S")
        
        # Add signal time (every stock in the results is considered a signal)
        metrics_dict[symbol]["signal_times"].append(current_time.strftime("%Y-%m-%d %H:%M:%S"))
        # Keep only the last 20 signal times
        metrics_dict[symbol]["signal_times"] = metrics_dict[symbol]["signal_times"][-20:]
        
        # Increment buy signals
        metrics_dict[symbol]["buy_signals"] += 1
        
        # Calculate signal strength based on percentage change
        strength = min(1, abs(float(row['per_chg'])) / 10)  # Scale percentage change to 0-1
        
        # Update average strength (exponential moving average)
        old_strength = metrics_dict[symbol]["avg_strength"]
        metrics_dict[symbol]["avg_strength"] = 0.7 * old_strength + 0.3 * strength
        
        # Update average volume
        old_volume = metrics_dict[symbol]["avg_volume"]
        metrics_dict[symbol]["avg_volume"] = 0.7 * old_volume + 0.3 * float(row['volume'])
        
        # Use a default reward/risk ratio of 2 for ChartInk results
        # This could be improved with more detailed analysis
        old_rr = metrics_dict[symbol]["avg_reward_risk"]
        metrics_dict[symbol]["avg_reward_risk"] = 0.7 * old_rr + 0.3 * 2.0
        
        # Add query source
        metrics_dict[symbol]["source"] = query_name
        
        # Calculate score
        metrics_dict[symbol]["score"] = calculate_score(metrics_dict[symbol], current_time)
    
    # Save updated metrics
    save_metrics(metrics_dict)
    
    print(f"Updated metrics for {len(df)} stocks from ChartInk")

def scan_additional_stocks():
    """Scan additional stocks from watchlist that weren't in ChartInk results"""
    # Load existing metrics
    metrics_dict = load_metrics()
    
    # Get all stocks from watchlist
    all_stocks = read_stocks()
    
    # Current time
    current_time = datetime.now()
    
    # Get stocks that need detailed analysis (not updated in the last hour)
    stocks_to_analyze = []
    for symbol in all_stocks:
        if symbol not in metrics_dict or "last_update" not in metrics_dict[symbol]:
            stocks_to_analyze.append(symbol)
        else:
            last_update = datetime.strptime(metrics_dict[symbol]["last_update"], "%Y-%m-%d %H:%M:%S")
            if (current_time - last_update).total_seconds() > 3600:  # 1 hour
                stocks_to_analyze.append(symbol)
    
    print(f"Analyzing {len(stocks_to_analyze)} additional stocks from watchlist")
    
    # Analyze each stock
    for symbol in stocks_to_analyze:
        try:
            # Get stock data
            df = get_stock_data(symbol, period="5d", interval="5m")
            if df is None or df.empty:
                continue
            
            # Identify patterns
            df = identify_patterns(df)
            if df is None or df.empty:
                continue
            
            # Get the latest data point
            latest = df.iloc[-1]
            
            # Initialize metrics for this stock if not exists
            if symbol not in metrics_dict:
                metrics_dict[symbol] = {
                    "symbol": symbol,
                    "signal_times": [],
                    "buy_signals": 0,
                    "sell_signals": 0,
                    "avg_strength": 0,
                    "avg_volume": 0,
                    "avg_reward_risk": 0,
                    "last_price": latest["Close"],
                    "last_update": current_time.strftime("%Y-%m-%d %H:%M:%S")
                }
            
            # Update last price and update time
            metrics_dict[symbol]["last_price"] = latest["Close"]
            metrics_dict[symbol]["last_update"] = current_time.strftime("%Y-%m-%d %H:%M:%S")
            
            # Check for buy signal
            if latest["Buy_Signal"]:
                # Add signal time
                metrics_dict[symbol]["signal_times"].append(current_time.strftime("%Y-%m-%d %H:%M:%S"))
                # Keep only the last 20 signal times
                metrics_dict[symbol]["signal_times"] = metrics_dict[symbol]["signal_times"][-20:]
                
                # Increment buy signals
                metrics_dict[symbol]["buy_signals"] += 1
                
                # Calculate signal strength (0-1 scale)
                strength = min(1, (latest["RSI"] - 30) / 40)  # RSI from 30-70 scaled to 0-1
                
                # Update average strength (exponential moving average)
                old_strength = metrics_dict[symbol]["avg_strength"]
                metrics_dict[symbol]["avg_strength"] = 0.7 * old_strength + 0.3 * strength
                
                # Update average volume
                old_volume = metrics_dict[symbol]["avg_volume"]
                metrics_dict[symbol]["avg_volume"] = 0.7 * old_volume + 0.3 * latest["Volume"]
                
                # Update average reward/risk
                old_rr = metrics_dict[symbol]["avg_reward_risk"]
                metrics_dict[symbol]["avg_reward_risk"] = 0.7 * old_rr + 0.3 * latest["Reward_Risk_Ratio"]
            
            # Check for sell signal
            if latest["Sell_Signal"]:
                metrics_dict[symbol]["sell_signals"] += 1
            
            # Calculate score
            metrics_dict[symbol]["score"] = calculate_score(metrics_dict[symbol], current_time)
            
        except Exception as e:
            print(f"Error scanning {symbol}: {e}")
    
    # Save updated metrics
    save_metrics(metrics_dict)

def scan_all_stocks():
    """Scan all stocks using both ChartInk and detailed analysis"""
    print(f"Starting full scan at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # First update from ChartInk
    update_metrics_from_chartink()
    
    # Then scan additional stocks
    scan_additional_stocks()
    
    print(f"Full scan completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

def run_scheduler():
    """Run the scheduler in a separate thread"""
    schedule.every(5).minutes.do(scan_all_stocks)
    
    while True:
        schedule.run_pending()
        time.sleep(1)

def start_scheduler():
    """Start the scheduler in a background thread"""
    thread = threading.Thread(target=run_scheduler)
    thread.daemon = True
    thread.start()

def get_top_stocks(n=100):
    """Get the top N stocks by score"""
    metrics_dict = load_metrics()
    
    # Convert to DataFrame
    df = pd.DataFrame(metrics_dict.values())
    
    if df.empty:
        return pd.DataFrame()
    
    # Sort by score (descending)
    df = df.sort_values(by="score", ascending=False)
    
    # Take top N
    return df.head(n)

if __name__ == "__main__":
    # Run an initial scan
    scan_all_stocks()
    
    # Start the scheduler
    start_scheduler()
    
    # Keep the script running
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        print("Stopping...") 