import pandas as pd
import numpy as np
from datetime import datetime, timedelta

class IntradayScanner:
    """
    Enhanced Intraday Stock Scanner
    
    This scanner identifies stocks that are ideal for intraday trading based on:
    1. Volume surge
    2. Price momentum
    3. Volatility expansion
    4. Gap analysis
    5. Technical breakouts
    """
    
    def __init__(self, 
                 min_price=20.0, 
                 max_price=2000.0,
                 min_volume=100000,
                 volume_surge_threshold=2.0,
                 volatility_threshold=0.02,
                 gap_threshold=1.5):
        
        self.min_price = min_price
        self.max_price = max_price
        self.min_volume = min_volume
        self.volume_surge_threshold = volume_surge_threshold
        self.volatility_threshold = volatility_threshold
        self.gap_threshold = gap_threshold
        
    def calculate_scanning_metrics(self, df):
        """Calculate metrics for intraday scanning"""
        if len(df) < 30:
            return None
        
        latest = df.iloc[-1]
        
        # Volume metrics
        avg_volume_20 = df['Volume'].tail(20).mean()
        current_volume = latest['Volume']
        volume_ratio = current_volume / avg_volume_20 if avg_volume_20 > 0 else 0
        
        # Price metrics
        current_price = latest['Close']
        prev_close = df['Close'].iloc[-2]
        price_change_pct = ((current_price - prev_close) / prev_close) * 100
        
        # Gap analysis
        today_open = latest['Open']
        gap_pct = ((today_open - prev_close) / prev_close) * 100
        
        # Volatility metrics
        returns = df['Close'].pct_change().tail(20)
        volatility = returns.std() * np.sqrt(252)  # Annualized volatility
        
        # Range metrics
        high_low_range = ((latest['High'] - latest['Low']) / latest['Open']) * 100
        
        # Momentum metrics
        rsi = self.calculate_rsi(df)
        
        # Support/Resistance proximity
        support_resistance = self.find_nearby_levels(df)
        
        # Trend strength
        ema_9 = df['Close'].ewm(span=9).mean().iloc[-1]
        ema_21 = df['Close'].ewm(span=21).mean().iloc[-1]
        trend_strength = ((ema_9 - ema_21) / ema_21) * 100
        
        return {
            'symbol': getattr(df, 'name', 'Unknown'),
            'current_price': current_price,
            'price_change_pct': price_change_pct,
            'gap_pct': gap_pct,
            'volume_ratio': volume_ratio,
            'avg_volume': avg_volume_20,
            'current_volume': current_volume,
            'volatility': volatility,
            'high_low_range': high_low_range,
            'rsi': rsi,
            'trend_strength': trend_strength,
            'near_support': support_resistance['near_support'],
            'near_resistance': support_resistance['near_resistance'],
            'breakout_potential': self.assess_breakout_potential(df),
            'liquidity_score': self.calculate_liquidity_score(df),
            'momentum_score': self.calculate_momentum_score(df),
            'scan_time': datetime.now()
        }
    
    def calculate_rsi(self, df, period=14):
        """Calculate RSI"""
        if len(df) < period + 1:
            return 50  # Neutral RSI if insufficient data
        
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.iloc[-1] if not rsi.empty else 50
    
    def find_nearby_levels(self, df):
        """Find if price is near support/resistance levels"""
        if len(df) < 20:
            return {'near_support': False, 'near_resistance': False}
        
        current_price = df['Close'].iloc[-1]
        
        # Simple S/R calculation using rolling max/min
        resistance = df['High'].rolling(window=20).max().iloc[-1]
        support = df['Low'].rolling(window=20).min().iloc[-1]
        
        # Check proximity (within 1% of levels)
        near_resistance = abs(current_price - resistance) / resistance < 0.01
        near_support = abs(current_price - support) / support < 0.01
        
        return {
            'near_support': near_support,
            'near_resistance': near_resistance,
            'support_level': support,
            'resistance_level': resistance
        }
    
    def assess_breakout_potential(self, df):
        """Assess breakout potential based on price compression and volume"""
        if len(df) < 20:
            return 0
        
        # Bollinger Band squeeze
        bb_period = 20
        bb_std = 2
        bb_middle = df['Close'].rolling(window=bb_period).mean()
        bb_std_val = df['Close'].rolling(window=bb_period).std()
        bb_upper = bb_middle + (bb_std_val * bb_std)
        bb_lower = bb_middle - (bb_std_val * bb_std)
        bb_width = (bb_upper - bb_lower) / bb_middle
        
        current_width = bb_width.iloc[-1]
        avg_width = bb_width.tail(50).mean()
        
        # Breakout potential score (0-100)
        squeeze_score = max(0, (1 - current_width / avg_width) * 100) if avg_width > 0 else 0
        
        # Volume confirmation
        volume_score = min(100, (df['Volume'].iloc[-1] / df['Volume'].tail(20).mean()) * 20)
        
        return (squeeze_score + volume_score) / 2
    
    def calculate_liquidity_score(self, df):
        """Calculate liquidity score based on volume and spread"""
        if len(df) < 10:
            return 0
        
        # Volume consistency
        volume_cv = df['Volume'].tail(20).std() / df['Volume'].tail(20).mean()
        volume_score = max(0, 100 - (volume_cv * 100))
        
        # Average volume score
        avg_volume = df['Volume'].tail(20).mean()
        volume_threshold_score = min(100, (avg_volume / self.min_volume) * 50)
        
        return (volume_score + volume_threshold_score) / 2
    
    def calculate_momentum_score(self, df):
        """Calculate momentum score"""
        if len(df) < 20:
            return 0
        
        # Price momentum
        price_momentum = df['Close'].pct_change(5).iloc[-1] * 100
        momentum_score = min(100, max(0, 50 + price_momentum * 10))
        
        # Volume momentum
        volume_momentum = (df['Volume'].iloc[-1] / df['Volume'].tail(20).mean()) * 25
        volume_momentum_score = min(100, volume_momentum)
        
        return (momentum_score + volume_momentum_score) / 2
    
    def apply_basic_filters(self, metrics):
        """Apply basic filters to screen out unsuitable stocks"""
        if not metrics:
            return False
        
        # Price range filter
        if metrics['current_price'] < self.min_price or metrics['current_price'] > self.max_price:
            return False
        
        # Minimum volume filter
        if metrics['current_volume'] < self.min_volume:
            return False
        
        # Exclude penny stocks or illiquid stocks
        if metrics['current_price'] < 10 or metrics['avg_volume'] < 50000:
            return False
        
        return True
    
    def scan_for_volume_surge(self, stock_data, symbols):
        """Scan for stocks with significant volume surge"""
        candidates = []
        
        for symbol in symbols:
            if symbol not in stock_data:
                continue
            
            try:
                df = stock_data[symbol].copy()
                df.name = symbol
                
                metrics = self.calculate_scanning_metrics(df)
                if not self.apply_basic_filters(metrics):
                    continue
                
                # Volume surge criteria
                if (metrics['volume_ratio'] >= self.volume_surge_threshold and
                    abs(metrics['price_change_pct']) >= 0.5):
                    
                    metrics['scan_reason'] = 'Volume Surge'
                    metrics['scan_score'] = metrics['volume_ratio'] * abs(metrics['price_change_pct'])
                    candidates.append(metrics)
                    
            except Exception as e:
                print(f"Error scanning {symbol}: {str(e)}")
                continue
        
        return sorted(candidates, key=lambda x: x['scan_score'], reverse=True)
    
    def scan_for_gap_stocks(self, stock_data, symbols):
        """Scan for stocks with significant gaps"""
        candidates = []
        
        for symbol in symbols:
            if symbol not in stock_data:
                continue
            
            try:
                df = stock_data[symbol].copy()
                df.name = symbol
                
                metrics = self.calculate_scanning_metrics(df)
                if not self.apply_basic_filters(metrics):
                    continue
                
                # Gap criteria
                if abs(metrics['gap_pct']) >= self.gap_threshold:
                    metrics['scan_reason'] = f"Gap {'Up' if metrics['gap_pct'] > 0 else 'Down'}"
                    metrics['scan_score'] = abs(metrics['gap_pct']) * metrics['volume_ratio']
                    candidates.append(metrics)
                    
            except Exception as e:
                print(f"Error scanning {symbol}: {str(e)}")
                continue
        
        return sorted(candidates, key=lambda x: x['scan_score'], reverse=True)
    
    def scan_for_breakout_candidates(self, stock_data, symbols):
        """Scan for stocks showing breakout potential"""
        candidates = []
        
        for symbol in symbols:
            if symbol not in stock_data:
                continue
            
            try:
                df = stock_data[symbol].copy()
                df.name = symbol
                
                metrics = self.calculate_scanning_metrics(df)
                if not self.apply_basic_filters(metrics):
                    continue
                
                # Breakout criteria
                if (metrics['breakout_potential'] >= 60 and
                    metrics['volume_ratio'] >= 1.2 and
                    (metrics['near_support'] or metrics['near_resistance'])):
                    
                    metrics['scan_reason'] = 'Breakout Setup'
                    metrics['scan_score'] = metrics['breakout_potential'] + metrics['volume_ratio'] * 10
                    candidates.append(metrics)
                    
            except Exception as e:
                print(f"Error scanning {symbol}: {str(e)}")
                continue
        
        return sorted(candidates, key=lambda x: x['scan_score'], reverse=True)
    
    def comprehensive_scan(self, stock_data, symbols, max_results=20):
        """Perform comprehensive intraday scan"""
        all_candidates = []
        
        # Different scan types
        volume_surge = self.scan_for_volume_surge(stock_data, symbols)
        gap_stocks = self.scan_for_gap_stocks(stock_data, symbols)
        breakout_candidates = self.scan_for_breakout_candidates(stock_data, symbols)
        
        # Combine and deduplicate
        seen_symbols = set()
        for candidate_list in [volume_surge, gap_stocks, breakout_candidates]:
            for candidate in candidate_list:
                if candidate['symbol'] not in seen_symbols:
                    all_candidates.append(candidate)
                    seen_symbols.add(candidate['symbol'])
        
        # Final ranking based on multiple factors
        for candidate in all_candidates:
            candidate['final_score'] = (
                candidate['scan_score'] * 0.4 +
                candidate['momentum_score'] * 0.3 +
                candidate['liquidity_score'] * 0.2 +
                candidate['breakout_potential'] * 0.1
            )
        
        # Sort by final score and return top candidates
        final_candidates = sorted(all_candidates, key=lambda x: x['final_score'], reverse=True)
        
        return final_candidates[:max_results]
    
    def get_scan_summary(self, candidates):
        """Generate summary of scan results"""
        if not candidates:
            return {
                'total_candidates': 0,
                'avg_volume_ratio': 0,
                'scan_categories': {},
                'top_performers': []
            }
        
        scan_categories = {}
        for candidate in candidates:
            reason = candidate['scan_reason']
            if reason not in scan_categories:
                scan_categories[reason] = 0
            scan_categories[reason] += 1
        
        return {
            'total_candidates': len(candidates),
            'avg_volume_ratio': np.mean([c['volume_ratio'] for c in candidates]),
            'avg_price_change': np.mean([abs(c['price_change_pct']) for c in candidates]),
            'scan_categories': scan_categories,
            'top_performers': candidates[:5],
            'scan_timestamp': datetime.now()
        } 