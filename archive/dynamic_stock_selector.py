#!/usr/bin/env python3
"""
Dynamic Stock Selector with Seed Algorithms

This module provides:
1. Dynamic stock universe selection using Chartink
2. Multi-algorithm ranking system
3. Periodic re-ranking at defined intervals
4. Integration with intraday trading strategies
5. Real-time decision making for buy/sell signals

Usage:
    python dynamic_stock_selector.py
"""

import requests
from bs4 import BeautifulSoup as bs
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pymongo import MongoClient
import yfinance as yf
import logging
import time
import threading
from typing import Dict, List, Optional, Tuple
import json

# Import our algorithms
from algorithms.strategies.intraday_orchestrator import IntradayOrchestrator
from algorithms.screeners.intraday_scanner import IntradayScanner
from algorithms.strategies.gap_trading import GapTradingStrategy
from algorithms.strategies.scalping_strategy import ScalpingStrategy
from algorithms.strategies.support_resistance import SupportResistanceStrategy

class ChartinkDataProvider:
    """Enhanced Chartink data provider with multiple screening capabilities"""
    
    def __init__(self, base_url="https://chartink.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.csrf_token = None
        self.setup_logging()
    
    def setup_logging(self):
        """Setup logging for the data provider"""
        today = datetime.now().strftime('%Y-%m-%d')
        log_file = f'logs/dynamic_selector_{today}.log'
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def get_csrf_token(self):
        """Get CSRF token for Chartink API"""
        try:
            r = self.session.get(f'{self.base_url}/screener/alg-test-1')
            soup = bs(r.content, 'html.parser')
            csrf_element = soup.select_one('[name=csrf-token]')
            if csrf_element:
                self.csrf_token = csrf_element['content']
                self.session.headers['X-CSRF-TOKEN'] = self.csrf_token
                return True
            return False
        except Exception as e:
            self.logger.error(f"Error getting CSRF token: {e}")
            return False
    
    def get_stocks_by_query(self, query: str) -> pd.DataFrame:
        """Get stocks using custom Chartink query"""
        if not self.csrf_token:
            if not self.get_csrf_token():
                return pd.DataFrame()
        
        data = {'scan_clause': query}
        
        try:
            response = self.session.post(f'{self.base_url}/screener/process', data=data)
            result = response.json()
            
            if 'data' in result:
                df = pd.DataFrame(result['data'])
                if not df.empty:
                    df = df.sort_values(by=['per_chg'], ascending=False)
                    self.logger.info(f"Retrieved {len(df)} stocks from Chartink")
                return df
            else:
                self.logger.warning("No data returned from Chartink")
                return pd.DataFrame()
                
        except Exception as e:
            self.logger.error(f"Error fetching stocks: {e}")
            return pd.DataFrame()
    
    def get_liquid_stocks(self, min_price=50, max_price=2000, min_volume=100000):
        """Get liquid stocks suitable for intraday trading"""
        query = f"""
        ( {{cash}} ( latest close > {min_price} and latest close < {max_price} and 
        latest volume > {min_volume} and latest "close - 1" > 0 ) )
        """
        return self.get_stocks_by_query(query)
    
    def get_momentum_stocks(self, min_change=2.0, min_volume=200000):
        """Get stocks with momentum (price change > threshold)"""
        query = f"""
        ( {{cash}} ( latest "close - 1" > 0 and 
        latest "close" / latest "close - 1" * 100 - 100 > {min_change} and
        latest volume > {min_volume} ) )
        """
        return self.get_stocks_by_query(query)
    
    def get_high_volume_stocks(self, volume_multiplier=2.0):
        """Get stocks with volume surge"""
        query = f"""
        ( {{cash}} ( latest volume > {volume_multiplier} * 20 day avg of volume and
        latest close > 50 and latest close < 2000 ) )
        """
        return self.get_stocks_by_query(query)


class SeedAlgorithmRanker:
    """Multi-algorithm ranking system for stock selection"""
    
    def __init__(self):
        self.algorithms = {
            'momentum': self._momentum_score,
            'volume': self._volume_score,
            'volatility': self._volatility_score,
            'technical': self._technical_score,
            'liquidity': self._liquidity_score
        }
        self.weights = {
            'momentum': 0.25,
            'volume': 0.20,
            'volatility': 0.15,
            'technical': 0.25,
            'liquidity': 0.15
        }
    
    def _momentum_score(self, stock_data: Dict) -> float:
        """Calculate momentum score (0-100)"""
        try:
            price_change = float(stock_data.get('per_chg', 0))
            # Normalize to 0-100 scale
            score = min(100, max(0, (price_change + 10) * 5))  # -10% to +10% -> 0 to 100
            return score
        except:
            return 50  # Neutral score
    
    def _volume_score(self, stock_data: Dict) -> float:
        """Calculate volume score (0-100)"""
        try:
            volume = float(stock_data.get('volume', 0))
            # Simple volume scoring - higher volume gets higher score
            if volume > 1000000:
                return 90
            elif volume > 500000:
                return 75
            elif volume > 200000:
                return 60
            elif volume > 100000:
                return 45
            else:
                return 20
        except:
            return 30
    
    def _volatility_score(self, stock_data: Dict) -> float:
        """Calculate volatility score (0-100)"""
        try:
            # Using price change as proxy for volatility
            price_change = abs(float(stock_data.get('per_chg', 0)))
            # Moderate volatility (1-3%) gets highest score
            if 1 <= price_change <= 3:
                return 85
            elif 0.5 <= price_change <= 5:
                return 70
            elif price_change <= 8:
                return 55
            else:
                return 30  # Too volatile
        except:
            return 40
    
    def _technical_score(self, stock_data: Dict) -> float:
        """Calculate technical score (placeholder - would use actual technical analysis)"""
        try:
            # Simplified technical scoring based on price position
            close = float(stock_data.get('close', 0))
            high = float(stock_data.get('high', close))
            low = float(stock_data.get('low', close))
            
            if high > low:
                position = (close - low) / (high - low) * 100
                return position
            return 50
        except:
            return 50
    
    def _liquidity_score(self, stock_data: Dict) -> float:
        """Calculate liquidity score (0-100)"""
        try:
            volume = float(stock_data.get('volume', 0))
            close = float(stock_data.get('close', 0))
            
            # Volume * Price as liquidity measure
            turnover = volume * close
            
            if turnover > 10000000:  # 1 crore
                return 95
            elif turnover > 5000000:  # 50 lakhs
                return 80
            elif turnover > 1000000:  # 10 lakhs
                return 65
            elif turnover > 500000:   # 5 lakhs
                return 45
            else:
                return 25
        except:
            return 30
    
    def rank_stocks(self, stocks_df: pd.DataFrame) -> pd.DataFrame:
        """Rank stocks using multiple algorithms"""
        if stocks_df.empty:
            return stocks_df
        
        scores = []
        
        for _, stock in stocks_df.iterrows():
            stock_dict = stock.to_dict()
            
            # Calculate individual scores
            individual_scores = {}
            for algo_name, algo_func in self.algorithms.items():
                individual_scores[algo_name] = algo_func(stock_dict)
            
            # Calculate weighted composite score
            composite_score = sum(
                individual_scores[algo] * self.weights[algo] 
                for algo in individual_scores
            )
            
            scores.append({
                'symbol': stock.get('nsecode', ''),
                'composite_score': composite_score,
                **individual_scores,
                'price': stock.get('close', 0),
                'volume': stock.get('volume', 0),
                'change_pct': stock.get('per_chg', 0)
            })
        
        # Create ranked DataFrame
        ranked_df = pd.DataFrame(scores)
        ranked_df = ranked_df.sort_values('composite_score', ascending=False)
        ranked_df['rank'] = range(1, len(ranked_df) + 1)
        
        return ranked_df


class DynamicStockSelector:
    """Main class for dynamic stock selection and trading decisions"""
    
    def __init__(self, 
                 config_path='config/dynamic_selector_config.json',
                 rerank_interval_minutes=15,
                 top_stocks_count=50,
                 mongo_uri='mongodb://localhost:27017/',
                 db_name='stocks_dynamic'):
        
        # Load configuration
        try:
            with open(config_path, 'r') as f:
                self.config = json.load(f)
        except FileNotFoundError:
            self.config = self._default_config()
        
        self.rerank_interval = rerank_interval_minutes * 60  # Convert to seconds
        self.top_stocks_count = top_stocks_count
        self.running = False
        
        # Initialize components
        self.data_provider = ChartinkDataProvider()
        self.ranker = SeedAlgorithmRanker()
        self.orchestrator = IntradayOrchestrator(max_positions=5, risk_per_trade=0.02)
        self.scanner = IntradayScanner()
        
        # MongoDB setup
        self.mongo_client = MongoClient(mongo_uri)
        self.db = self.mongo_client[db_name]
        self.rankings_collection = self.db['stock_rankings']
        self.signals_collection = self.db['trading_signals']
        
        # Current state
        self.current_universe = pd.DataFrame()
        self.last_ranking_time = None
        
        self.logger = logging.getLogger(__name__)
    
    def _default_config(self) -> dict:
        """Default configuration"""
        return {
            "stock_selection": {
                "max_stocks": 50,
                "min_price": 100,
                "max_price": 2000,
                "min_volume": 100000
            },
            "database": {
                "collections": {
                    "rankings": "stock_rankings",
                    "signals": "trading_signals"
                }
            }
        }
    
    def get_intraday_data(self, symbol: str, period="1d", interval="5m") -> Optional[pd.DataFrame]:
        """Get intraday data for a stock"""
        try:
            ticker = yf.Ticker(f"{symbol}.NS")  # Assuming NSE stocks
            data = ticker.history(period=period, interval=interval)
            
            if not data.empty:
                return data
            else:
                self.logger.warning(f"No data available for {symbol}")
                return None
                
        except Exception as e:
            self.logger.error(f"Error fetching data for {symbol}: {e}")
            return None
    
    def update_stock_universe(self):
        """Update and rank the stock universe"""
        self.logger.info("Updating stock universe...")
        
        try:
            # Get stocks from multiple criteria
            liquid_stocks = self.data_provider.get_liquid_stocks()
            momentum_stocks = self.data_provider.get_momentum_stocks()
            volume_stocks = self.data_provider.get_high_volume_stocks()
            
            # Combine and deduplicate
            all_stocks = pd.concat([liquid_stocks, momentum_stocks, volume_stocks], 
                                 ignore_index=True)
            
            if not all_stocks.empty:
                all_stocks = all_stocks.drop_duplicates(subset=['nsecode'])
                
                # Rank stocks using seed algorithms
                ranked_stocks = self.ranker.rank_stocks(all_stocks)
                
                # Keep top N stocks
                self.current_universe = ranked_stocks.head(self.top_stocks_count)
                self.last_ranking_time = datetime.now()
                
                # Store in MongoDB
                self._store_rankings(self.current_universe)
                
                self.logger.info(f"Updated universe with {len(self.current_universe)} stocks")
                return True
            else:
                self.logger.warning("No stocks retrieved from data provider")
                return False
                
        except Exception as e:
            self.logger.error(f"Error updating stock universe: {e}")
            return False
    
    def get_top_stocks(self, limit: int = 50) -> pd.DataFrame:
        """Get top ranked stocks from the current universe"""
        try:
            if not self.current_universe.empty:
                return self.current_universe.head(limit)
            else:
                self.logger.warning("No stocks in current universe, try updating first")
                return pd.DataFrame()
        except Exception as e:
            self.logger.error(f"Failed to get top stocks: {e}")
            return pd.DataFrame()
    
    def generate_trading_signals(self) -> List[Dict]:
        """Generate trading signals for current universe"""
        if self.current_universe.empty:
            return []
        
        signals = []
        symbols = self.current_universe['symbol'].tolist()
        
        self.logger.info(f"Generating signals for {len(symbols)} stocks...")
        
        # Get intraday data for top stocks
        stock_data = {}
        for symbol in symbols[:20]:  # Limit to top 20 for performance
            data = self.get_intraday_data(symbol)
            if data is not None:
                stock_data[symbol] = data
        
        if stock_data:
            # Use orchestrator to find opportunities
            opportunities = self.orchestrator.scan_multiple_symbols(
                stock_data, list(stock_data.keys())
            )
            
            # Enhanced scanning
            scan_results = self.scanner.comprehensive_scan(
                stock_data, list(stock_data.keys())
            )
            
            # Combine results
            for opp in opportunities:
                signal = {
                    'symbol': opp['symbol'],
                    'signal_type': opp['signal_type'],
                    'strategy': opp['strategy'],
                    'reason': opp['reason'],
                    'entry_price': opp['entry_price'],
                    'target_price': opp['target_price'],
                    'stop_loss': opp['stop_loss'],
                    'risk_reward_ratio': opp['risk_reward_ratio'],
                    'priority': opp['priority'],
                    'timestamp': datetime.now(),
                    'source': 'orchestrator'
                }
                signals.append(signal)
            
            # Add scanner results
            for scan in scan_results[:5]:  # Top 5 scan results
                signal = {
                    'symbol': scan['symbol'],
                    'signal_type': 'WATCH',
                    'strategy': 'scanner',
                    'reason': scan['scan_reason'],
                    'entry_price': scan['current_price'],
                    'target_price': scan['current_price'] * 1.02,  # 2% target
                    'stop_loss': scan['current_price'] * 0.995,   # 0.5% stop
                    'risk_reward_ratio': 4.0,
                    'priority': 2,
                    'scan_score': scan['final_score'],
                    'timestamp': datetime.now(),
                    'source': 'scanner'
                }
                signals.append(signal)
        
        # Store signals in MongoDB
        if signals:
            self._store_signals(signals)
            self.logger.info(f"Generated {len(signals)} trading signals")
        
        return signals
    
    def _store_rankings(self, rankings_df: pd.DataFrame):
        """Store stock rankings in MongoDB"""
        try:
            records = rankings_df.to_dict('records')
            for record in records:
                record['timestamp'] = datetime.now()
            
            self.rankings_collection.insert_many(records)
            self.logger.info(f"Stored {len(records)} ranking records")
            
        except Exception as e:
            self.logger.error(f"Error storing rankings: {e}")
    
    def _store_signals(self, signals: List[Dict]):
        """Store trading signals in MongoDB"""
        try:
            self.signals_collection.insert_many(signals)
            self.logger.info(f"Stored {len(signals)} signal records")
            
        except Exception as e:
            self.logger.error(f"Error storing signals: {e}")
    
    def get_current_recommendations(self) -> Dict:
        """Get current trading recommendations"""
        signals = self.generate_trading_signals()
        
        # Categorize signals
        buy_signals = [s for s in signals if 'BUY' in s.get('signal_type', '')]
        sell_signals = [s for s in signals if 'SELL' in s.get('signal_type', '')]
        watch_signals = [s for s in signals if s.get('signal_type') == 'WATCH']
        
        return {
            'timestamp': datetime.now(),
            'total_signals': len(signals),
            'buy_signals': buy_signals,
            'sell_signals': sell_signals,
            'watch_list': watch_signals,
            'top_stocks': self.current_universe.head(10).to_dict('records') if not self.current_universe.empty else [],
            'last_update': self.last_ranking_time
        }
    
    def run_periodic_ranking(self):
        """Run periodic re-ranking in background"""
        self.running = True
        self.logger.info(f"Starting periodic ranking every {self.rerank_interval/60} minutes")
        
        # Initial ranking
        self.update_stock_universe()
        
        while self.running:
            try:
                time.sleep(self.rerank_interval)
                if self.running:  # Check again after sleep
                    self.update_stock_universe()
            except KeyboardInterrupt:
                self.logger.info("Periodic ranking interrupted by user")
                break
            except Exception as e:
                self.logger.error(f"Error in periodic ranking: {e}")
                time.sleep(60)  # Wait a minute before retrying
    
    def start_background_ranking(self):
        """Start background ranking thread"""
        if not self.running:
            ranking_thread = threading.Thread(target=self.run_periodic_ranking)
            ranking_thread.daemon = True
            ranking_thread.start()
            return ranking_thread
        return None
    
    def stop(self):
        """Stop the dynamic selector"""
        self.running = False
        self.logger.info("Stopping dynamic stock selector")


def main():
    """Main function for testing"""
    selector = DynamicStockSelector(rerank_interval_minutes=15, top_stocks_count=30)
    
    try:
        # Start background ranking
        ranking_thread = selector.start_background_ranking()
        
        # Wait a bit for initial ranking
        time.sleep(5)
        
        # Generate some recommendations
        recommendations = selector.get_current_recommendations()
        
        print("=== DYNAMIC STOCK SELECTOR DEMO ===")
        print(f"Timestamp: {recommendations['timestamp']}")
        print(f"Total Signals: {recommendations['total_signals']}")
        print(f"Buy Signals: {len(recommendations['buy_signals'])}")
        print(f"Sell Signals: {len(recommendations['sell_signals'])}")
        print(f"Watch List: {len(recommendations['watch_list'])}")
        
        # Display top signals
        if recommendations['buy_signals']:
            print("\n--- TOP BUY SIGNALS ---")
            for signal in recommendations['buy_signals'][:3]:
                print(f"{signal['symbol']}: {signal['signal_type']} - {signal['reason']}")
                print(f"  Entry: ₹{signal['entry_price']:.2f}, Target: ₹{signal['target_price']:.2f}")
                print(f"  R:R = 1:{signal['risk_reward_ratio']:.1f}")
        
        if recommendations['watch_list']:
            print("\n--- WATCH LIST ---")
            for signal in recommendations['watch_list'][:3]:
                print(f"{signal['symbol']}: {signal['reason']}")
                print(f"  Price: ₹{signal['entry_price']:.2f}, Score: {signal.get('scan_score', 0):.1f}")
        
        # Keep running for demo
        print(f"\nRunning... Press Ctrl+C to stop")
        
        while True:
            time.sleep(30)
            current_recs = selector.get_current_recommendations()
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Signals: {current_recs['total_signals']}")
            
    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        selector.stop()


if __name__ == "__main__":
    main() 