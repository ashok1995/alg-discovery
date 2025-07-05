import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm

# Direct list of NSE stocks
NSE_STOCKS = [
    # NIFTY 50 stocks
    'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
    'HINDUNILVR', 'ITC', 'SBIN', 'BHARTIARTL', 'HDFC',
    'KOTAKBANK', 'BAJFINANCE', 'LICI', 'HCLTECH', 'AXISBANK',
    'ASIANPAINT', 'MARUTI', 'WIPRO', 'SUNPHARMA', 'TITAN',
    'ULTRACEMCO', 'BAJAJFINSV', 'NESTLEIND', 'TATAMOTORS', 'POWERGRID',
    'ADANIENT', 'LTIM', 'NTPC', 'ADANIPORTS', 'JSWSTEEL',
    'TATASTEEL', 'GRASIM', 'DRREDDY', 'COALINDIA', 'HINDALCO',
    'M&M', 'TECHM', 'APOLLOHOSP', 'BRITANNIA', 'CIPLA',
    'BAJAJ-AUTO', 'INDUSINDBK', 'EICHERMOT', 'DIVISLAB', 'TATACONSUM',
    'SBILIFE', 'UPL', 'HEROMOTOCO', 'BPCL', 'HINDUNILVR',
    
    # Additional large & mid-cap stocks
    'ZOMATO', 'PAYTM', 'NYKAA', 'PNB', 'BANKBARODA',
    'IDEA', 'YESBANK', 'SUZLON', 'IRCTC', 'POLICYBZR',
    'TATAPOWER', 'VEDL', 'DLF', 'JINDALSTEL', 'SAIL',
    'ONGC', 'IOC', 'RECLTD', 'PFC', 'NMDC',
    'ASHOKLEY', 'MOTHERSON', 'HAVELLS', 'DABUR', 'MARICO',
    'GODREJCP', 'PIDILITIND', 'SIEMENS', 'ABB', 'BHEL',
    'ADANIPOWER', 'ADANIGREEN', 'TATACOMM', 'MCDOWELL-N', 'BIOCON',
    'LUPIN', 'AUROPHARMA', 'GLENMARK', 'TORNTPHARM', 'CADILAHC'
]

def detect_abnormal_movement(hist_data):
    """
    Detect abnormal price and volume movements using recent data points.
    """
    try:
        # Calculate rolling statistics for the last 10 periods (20 minutes)
        rolling_mean_price = hist_data['Close'].rolling(window=10).mean()
        rolling_std_price = hist_data['Close'].rolling(window=10).std()
        rolling_mean_volume = hist_data['Volume'].rolling(window=10).mean()
        rolling_std_volume = hist_data['Volume'].rolling(window=10).std()

        # Get current values
        current_price = hist_data['Close'].iloc[-1]
        current_volume = hist_data['Volume'].iloc[-1]
        
        # Calculate Z-scores for latest point
        price_zscore = (current_price - rolling_mean_price.iloc[-1]) / rolling_std_price.iloc[-1] if rolling_std_price.iloc[-1] != 0 else 0
        volume_zscore = (current_volume - rolling_mean_volume.iloc[-1]) / rolling_std_volume.iloc[-1] if rolling_std_volume.iloc[-1] != 0 else 0
        
        # Calculate price velocity (rate of change over last 3 periods - 6 minutes)
        price_velocity = hist_data['Close'].pct_change(3).iloc[-1] * 100 if len(hist_data) > 3 else 0
        
        # Calculate volume surge ratio
        volume_surge_ratio = current_volume / rolling_mean_volume.iloc[-1] if rolling_mean_volume.iloc[-1] > 0 else 1

        return {
            'price_zscore': price_zscore,
            'volume_zscore': volume_zscore,
            'price_velocity': price_velocity,
            'volume_surge_ratio': volume_surge_ratio,
            'is_price_abnormal': abs(price_zscore) > 2,  # More than 2 standard deviations
            'is_volume_abnormal': abs(volume_zscore) > 3,  # More than 3 standard deviations
            'is_rapid_movement': abs(price_velocity) > 1,  # More than 1% change in 6 minutes
            'is_volume_surge': volume_surge_ratio > 3  # Volume more than 3x average
        }
    except Exception as e:
        print(f"Error in abnormal detection: {str(e)}")
        return None

def get_stock_data(symbol):
    """Get stock data for a single symbol."""
    try:
        ticker = yf.Ticker(f"{symbol}.NS")
        hist = ticker.history(period='1d', interval='1m')
        
        if hist.empty:
            return None
            
        current_price = hist['Close'].iloc[-1]
        prev_close = hist['Close'].iloc[0]
        price_change = ((current_price - prev_close) / prev_close) * 100
        volume = hist['Volume'].sum()
        vwap = (hist['Close'] * hist['Volume']).sum() / volume if volume > 0 else current_price
        
        # Detect abnormal movements
        abnormal_data = detect_abnormal_movement(hist)
        
        return {
            'symbol': symbol,
            'current_price': current_price,
            'price_change': price_change,
            'volume': volume,
            'vwap': vwap,
            'high': hist['High'].max(),
            'low': hist['Low'].min(),
            'data': hist,
            'abnormal_data': abnormal_data
        }
    except Exception as e:
        print(f"Error fetching data for {symbol}: {str(e)}")
        return None

def fetch_all_stocks_data():
    """Fetch data for all stocks with progress bar."""
    stocks_data = {}
    
    print("\nFetching stock data...")
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {
            executor.submit(get_stock_data, symbol): symbol 
            for symbol in NSE_STOCKS
        }
        
        for future in tqdm(as_completed(futures), total=len(NSE_STOCKS), desc="Fetching stocks"):
            symbol = futures[future]
            try:
                data = future.result()
                if data is not None:
                    stocks_data[symbol] = data
            except Exception as e:
                print(f"Error processing {symbol}: {str(e)}")
    
    return stocks_data

def display_stock_info(stock):
    """Display formatted stock information."""
    print(f"\n{stock['symbol']}:")
    print(f"  Price: ₹{stock['current_price']:.2f} ({stock['price_change']:+.2f}%)")
    print(f"  Volume: {stock['volume']:,}")
    print(f"  VWAP: ₹{stock['vwap']:.2f}")
    print(f"  High: ₹{stock['high']:.2f}")
    print(f"  Low: ₹{stock['low']:.2f}")
    
    # Display abnormal movements if detected
    abnormal = stock.get('abnormal_data')
    if abnormal:
        alerts = []
        if abnormal['is_price_abnormal']:
            alerts.append(f"PRICE ALERT! Z-score: {abnormal['price_zscore']:.2f}")
        if abnormal['is_volume_abnormal']:
            alerts.append(f"VOLUME ALERT! Z-score: {abnormal['volume_zscore']:.2f}")
        if abnormal['is_rapid_movement']:
            alerts.append(f"RAPID MOVEMENT! {abnormal['price_velocity']:.2f}% in 6min")
        if abnormal['is_volume_surge']:
            alerts.append(f"VOLUME SURGE! {abnormal['volume_surge_ratio']:.1f}x normal")
        
        if alerts:
            print("  ⚠️ ALERTS:")
            for alert in alerts:
                print(f"    • {alert}")

def main():
    print(f"Starting market scan at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Fetch all stock data
    stocks_data = fetch_all_stocks_data()
    
    # Sort by price change
    sorted_stocks = sorted(
        stocks_data.values(),
        key=lambda x: x['price_change'],
        reverse=True
    )
    
    # Get top gainers and losers
    top_gainers = sorted_stocks[:50]
    top_losers = sorted_stocks[-50:]
    
    # Display results
    print("\n=== TOP 50 GAINERS ===")
    for stock in top_gainers:
        display_stock_info(stock)
    
    print("\n=== TOP 50 LOSERS ===")
    for stock in top_losers:
        display_stock_info(stock)

if __name__ == "__main__":
    main()
