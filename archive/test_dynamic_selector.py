#!/usr/bin/env python3
"""
Test Script for Dynamic Stock Selector

This script tests the dynamic stock selector with minimal dependencies.
It can run without MongoDB and provides a quick way to validate the system.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import time
import json

# Import our dynamic selector components
from dynamic_stock_selector import ChartinkDataProvider, SeedAlgorithmRanker


class MockDataProvider:
    """Mock data provider for testing without Chartink dependency"""
    
    def __init__(self):
        self.logger = self._setup_logger()
    
    def _setup_logger(self):
        import logging
        logger = logging.getLogger(__name__)
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)
            logger.setLevel(logging.INFO)
        return logger
    
    def generate_mock_stocks(self, count=100):
        """Generate mock stock data for testing"""
        symbols = [f"STOCK{i:03d}" for i in range(1, count + 1)]
        
        data = []
        for symbol in symbols:
            # Generate realistic stock data
            base_price = np.random.uniform(100, 1500)
            price_change = np.random.normal(0, 2.5)  # Average 2.5% volatility
            volume = np.random.lognormal(13, 1)  # Log-normal distribution for volume
            
            stock = {
                'nsecode': symbol,
                'close': round(base_price, 2),
                'per_chg': round(price_change, 2),
                'volume': int(volume),
                'high': round(base_price * (1 + abs(np.random.normal(0, 0.01))), 2),
                'low': round(base_price * (1 - abs(np.random.normal(0, 0.01))), 2),
            }
            data.append(stock)
        
        df = pd.DataFrame(data)
        df = df.sort_values(by=['per_chg'], ascending=False)
        self.logger.info(f"Generated {len(df)} mock stocks")
        return df
    
    def get_liquid_stocks(self, min_price=50, max_price=2000, min_volume=100000):
        """Mock liquid stocks"""
        all_stocks = self.generate_mock_stocks(80)
        filtered = all_stocks[
            (all_stocks['close'] >= min_price) &
            (all_stocks['close'] <= max_price) &
            (all_stocks['volume'] >= min_volume)
        ]
        return filtered
    
    def get_momentum_stocks(self, min_change=2.0, min_volume=200000):
        """Mock momentum stocks"""
        all_stocks = self.generate_mock_stocks(60)
        filtered = all_stocks[
            (abs(all_stocks['per_chg']) >= min_change) &
            (all_stocks['volume'] >= min_volume)
        ]
        return filtered
    
    def get_high_volume_stocks(self, volume_multiplier=2.0):
        """Mock high volume stocks"""
        all_stocks = self.generate_mock_stocks(50)
        # Simulate volume surge
        high_volume_mask = all_stocks['volume'] > 300000
        return all_stocks[high_volume_mask]


def test_chartink_connection():
    """Test connection to Chartink (if available)"""
    print("Testing Chartink connection...")
    
    try:
        provider = ChartinkDataProvider()
        
        # Test CSRF token
        if provider.get_csrf_token():
            print("✅ Chartink CSRF token obtained successfully")
            
            # Test a simple query
            simple_query = "( {cash} ( latest close > 100 and latest close < 500 ) )"
            stocks = provider.get_stocks_by_query(simple_query)
            
            if not stocks.empty:
                print(f"✅ Retrieved {len(stocks)} stocks from Chartink")
                print("Sample stocks:")
                print(stocks[['nsecode', 'close', 'per_chg', 'volume']].head())
                return True, provider
            else:
                print("⚠️ No stocks returned from Chartink query")
                return False, None
        else:
            print("❌ Failed to get Chartink CSRF token")
            return False, None
            
    except Exception as e:
        print(f"❌ Chartink connection failed: {e}")
        return False, None


def test_ranking_system():
    """Test the seed algorithm ranking system"""
    print("\nTesting ranking system...")
    
    # Use mock data for consistent testing
    mock_provider = MockDataProvider()
    ranker = SeedAlgorithmRanker()
    
    # Get mock stocks
    liquid_stocks = mock_provider.get_liquid_stocks()
    momentum_stocks = mock_provider.get_momentum_stocks()
    volume_stocks = mock_provider.get_high_volume_stocks()
    
    # Combine stocks
    all_stocks = pd.concat([liquid_stocks, momentum_stocks, volume_stocks], ignore_index=True)
    all_stocks = all_stocks.drop_duplicates(subset=['nsecode'])
    
    print(f"Combined stock universe: {len(all_stocks)} stocks")
    
    # Rank stocks
    ranked_stocks = ranker.rank_stocks(all_stocks)
    
    if not ranked_stocks.empty:
        print("✅ Ranking system working")
        print("\nTop 10 ranked stocks:")
        print(ranked_stocks[['symbol', 'composite_score', 'momentum', 'volume', 'liquidity']].head(10))
        
        # Show score distribution
        print(f"\nScore statistics:")
        print(f"Average composite score: {ranked_stocks['composite_score'].mean():.1f}")
        print(f"Score range: {ranked_stocks['composite_score'].min():.1f} - {ranked_stocks['composite_score'].max():.1f}")
        
        return True, ranked_stocks
    else:
        print("❌ Ranking system failed")
        return False, None


def test_algorithm_weights():
    """Test different algorithm weight configurations"""
    print("\nTesting algorithm weight configurations...")
    
    mock_provider = MockDataProvider()
    stocks = mock_provider.get_liquid_stocks()
    
    # Test different weight configurations
    configurations = [
        {"momentum": 0.4, "volume": 0.3, "volatility": 0.1, "technical": 0.1, "liquidity": 0.1},  # Momentum focused
        {"momentum": 0.1, "volume": 0.1, "volatility": 0.1, "technical": 0.4, "liquidity": 0.3},  # Technical focused
        {"momentum": 0.2, "volume": 0.2, "volatility": 0.2, "technical": 0.2, "liquidity": 0.2},  # Balanced
    ]
    
    config_names = ["Momentum-Focused", "Technical-Focused", "Balanced"]
    
    for i, config in enumerate(configurations):
        ranker = SeedAlgorithmRanker()
        ranker.weights = config
        
        ranked = ranker.rank_stocks(stocks)
        top_stock = ranked.iloc[0] if not ranked.empty else None
        
        print(f"{config_names[i]:15} - Top stock: {top_stock['symbol']} (Score: {top_stock['composite_score']:.1f})")
    
    print("✅ Weight configuration testing completed")


def test_performance():
    """Test system performance with larger datasets"""
    print("\nTesting performance...")
    
    mock_provider = MockDataProvider()
    ranker = SeedAlgorithmRanker()
    
    # Test with different dataset sizes
    sizes = [100, 500, 1000]
    
    for size in sizes:
        start_time = time.time()
        
        # Generate data
        stocks = mock_provider.generate_mock_stocks(size)
        
        # Rank stocks
        ranked = ranker.rank_stocks(stocks)
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        print(f"Dataset size: {size:4d} stocks - Processing time: {processing_time:.3f}s ({size/processing_time:.0f} stocks/sec)")
    
    print("✅ Performance testing completed")


def demo_full_workflow():
    """Demonstrate the full workflow"""
    print("\n" + "="*60)
    print("DYNAMIC STOCK SELECTOR - FULL WORKFLOW DEMO")
    print("="*60)
    
    # Try Chartink first, fallback to mock
    chartink_available, provider = test_chartink_connection()
    
    if not chartink_available:
        print("Using mock data provider for demo...")
        provider = MockDataProvider()
    
    ranker = SeedAlgorithmRanker()
    
    try:
        # Step 1: Get stocks from multiple sources
        print("\n1. Fetching stocks from multiple sources...")
        
        if chartink_available:
            liquid_stocks = provider.get_liquid_stocks()
            momentum_stocks = provider.get_momentum_stocks()
            volume_stocks = provider.get_high_volume_stocks()
        else:
            liquid_stocks = provider.get_liquid_stocks()
            momentum_stocks = provider.get_momentum_stocks()
            volume_stocks = provider.get_high_volume_stocks()
        
        print(f"   Liquid stocks: {len(liquid_stocks)}")
        print(f"   Momentum stocks: {len(momentum_stocks)}")
        print(f"   High volume stocks: {len(volume_stocks)}")
        
        # Step 2: Combine and deduplicate
        print("\n2. Combining and deduplicating...")
        all_stocks = pd.concat([liquid_stocks, momentum_stocks, volume_stocks], ignore_index=True)
        all_stocks = all_stocks.drop_duplicates(subset=['nsecode'])
        print(f"   Total unique stocks: {len(all_stocks)}")
        
        # Step 3: Rank stocks
        print("\n3. Ranking stocks using seed algorithms...")
        ranked_stocks = ranker.rank_stocks(all_stocks)
        
        # Step 4: Display results
        print("\n4. Top 15 Selected Stocks:")
        print("-" * 80)
        print(f"{'Rank':<4} {'Symbol':<10} {'Score':<6} {'Price':<8} {'Change%':<8} {'Volume':<10} {'Category'}")
        print("-" * 80)
        
        for i, stock in ranked_stocks.head(15).iterrows():
            # Determine category based on scores
            if stock['momentum'] > 70:
                category = "Momentum"
            elif stock['volume'] > 80:
                category = "Volume"
            elif stock['liquidity'] > 80:
                category = "Liquid"
            else:
                category = "Balanced"
            
            print(f"{stock['rank']:<4} {stock['symbol']:<10} {stock['composite_score']:<6.1f} "
                  f"₹{stock['price']:<7.2f} {stock['change_pct']:>6.2f}% {stock['volume']:<10.0f} {category}")
        
        # Step 5: Summary statistics
        print("\n5. Summary Statistics:")
        print(f"   Average score: {ranked_stocks['composite_score'].mean():.1f}")
        print(f"   Score range: {ranked_stocks['composite_score'].min():.1f} - {ranked_stocks['composite_score'].max():.1f}")
        print(f"   High momentum stocks (>70): {len(ranked_stocks[ranked_stocks['momentum'] > 70])}")
        print(f"   High volume stocks (>80): {len(ranked_stocks[ranked_stocks['volume'] > 80])}")
        print(f"   Liquid stocks (>80): {len(ranked_stocks[ranked_stocks['liquidity'] > 80])}")
        
        return True
        
    except Exception as e:
        print(f"❌ Demo failed: {e}")
        return False


def main():
    """Main test function"""
    print("DYNAMIC STOCK SELECTOR - TEST SUITE")
    print("=" * 50)
    
    tests = [
        ("Chartink Connection", test_chartink_connection),
        ("Ranking System", test_ranking_system),
        ("Algorithm Weights", test_algorithm_weights),
        ("Performance", test_performance),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if test_name == "Chartink Connection":
                success, _ = test_func()
            else:
                if test_name == "Ranking System":
                    success, _ = test_func()
                else:
                    test_func()
                    success = True
            results[test_name] = success
        except Exception as e:
            print(f"❌ {test_name} failed: {e}")
            results[test_name] = False
    
    # Full workflow demo
    demo_full_workflow()
    
    # Test summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    for test_name, success in results.items():
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{test_name:<25} {status}")
    
    passed = sum(results.values())
    total = len(results)
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! System ready for production.")
    else:
        print("⚠️ Some tests failed. Check logs for details.")


if __name__ == "__main__":
    main() 