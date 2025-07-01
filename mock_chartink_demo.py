#!/usr/bin/env python3
"""
Mock Chartink + Recommendation Engine Demo

Demonstrates the system with simulated stock data to show the complete workflow
without hitting Chartink API rate limits.
"""

import sys
import os
import logging
import pandas as pd
import numpy as np
from datetime import datetime
import json

# Add paths for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from recommendation_engine.utils.chartink_integration import ChartinkRecommendationEngine
from recommendation_engine.recommendation_orchestrator import RecommendationOrchestrator

class MockChartinkDemo:
    """Mock demo showing the recommendation engine with simulated data"""
    
    def __init__(self):
        """Initialize the demo"""
        self.setup_logging()
        self.logger = logging.getLogger(__name__)
        self.orchestrator = None
        
    def setup_logging(self):
        """Setup logging"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
    
    def create_mock_stock_data(self, theme: str = "intraday_buy", count: int = 20) -> pd.DataFrame:
        """Create realistic mock stock data"""
        
        # Popular Indian stocks
        symbols = [
            "RELIANCE", "TCS", "HDFC", "INFY", "HCLTECH", "ICICIBANK", "KOTAKBANK", 
            "BHARTIARTL", "ITC", "SBIN", "LT", "ASIANPAINT", "MARUTI", "AXISBANK",
            "BAJFINANCE", "HDFCBANK", "WIPRO", "ULTRACEMCO", "POWERGRID", "NTPC",
            "ONGC", "TATASTEEL", "SUNPHARMA", "DRREDDY", "TECHM", "TITAN", "NESTLEIND",
            "COALINDIA", "BAJAJFINSV", "HINDUNILVR"
        ]
        
        np.random.seed(42)  # For reproducible results
        
        stocks = []
        for i in range(count):
            symbol = symbols[i % len(symbols)]
            
            # Generate realistic stock data based on theme
            if theme == "intraday_buy":
                base_price = np.random.uniform(200, 2000)
                volume_multiplier = np.random.uniform(1.5, 3.0)  # High volume for intraday
                change_pct = np.random.uniform(1.0, 5.0)  # Positive momentum
            elif theme == "swing_buy":
                base_price = np.random.uniform(300, 3000)
                volume_multiplier = np.random.uniform(1.2, 2.0)
                change_pct = np.random.uniform(1.5, 4.0)
            else:
                base_price = np.random.uniform(500, 5000)
                volume_multiplier = np.random.uniform(1.0, 1.5)
                change_pct = np.random.uniform(0.5, 3.0)
            
            prev_close = base_price / (1 + change_pct/100)
            volume = int(np.random.uniform(100000, 1000000) * volume_multiplier)
            
            stock = {
                'symbol': symbol,
                'nsecode': symbol,
                'close': round(base_price, 2),
                'open': round(prev_close * np.random.uniform(1.001, 1.02), 2),  # Gap up
                'high': round(base_price * np.random.uniform(1.0, 1.03), 2),
                'low': round(prev_close * np.random.uniform(0.995, 1.01), 2),
                'prev_close': round(prev_close, 2),
                'volume': volume,
                'per_chg': round(change_pct, 2),
                'per_chg_prev': round(np.random.uniform(-2, 2), 2),
                'filter_source': f'{theme}_filter_{i%3+1}',
                'market_cap': volume * base_price / 1000000,  # Mock market cap
                'pe_ratio': round(np.random.uniform(15, 35), 2),
                'timestamp': datetime.now().isoformat()
            }
            stocks.append(stock)
        
        return pd.DataFrame(stocks)
    
    def demo_with_mock_data(self):
        """Run demo with mock stock data"""
        print("🎯 MOCK CHARTINK + RECOMMENDATION ENGINE DEMO")
        print("=" * 60)
        
        # Initialize orchestrator
        self.orchestrator = RecommendationOrchestrator()
        
        for theme in ['intraday_buy', 'swing_buy']:
            print(f"\n📊 Analyzing {theme.upper()} Theme")
            print("-" * 40)
            
            # Create mock data
            mock_stocks = self.create_mock_stock_data(theme, 15)
            print(f"✅ Generated {len(mock_stocks)} mock candidates")
            
            print("\n🔍 Top 5 Mock Candidates:")
            for idx, stock in mock_stocks.head(5).iterrows():
                print(f"  {stock['symbol']}: ₹{stock['close']:.1f} "
                      f"(+{stock['per_chg']:.1f}%, Vol: {stock['volume']:,})")
            
            # Get recommendations
            try:
                recommendations = self.orchestrator.get_recommendations_with_chartink_data(
                    stock_data_df=mock_stocks,
                    trading_theme=theme,
                    limit=10
                )
                
                if recommendations['recommendations']:
                    print(f"\n🎯 TOP 10 RECOMMENDATIONS for {theme.upper()}:")
                    print("-" * 50)
                    print(f"{'Rank':<4} {'Symbol':<12} {'Score':<8} {'Price':<10} {'Change%'}")
                    print("-" * 50)
                    
                    for i, rec in enumerate(recommendations['recommendations'], 1):
                        stock_info = mock_stocks[mock_stocks['symbol'] == rec['symbol']].iloc[0]
                        print(f"{i:<4} {rec['symbol']:<12} {rec['score']:<8.1f} "
                              f"₹{stock_info['close']:<9.1f} +{stock_info['per_chg']:.1f}%")
                    
                    # Show metadata
                    metadata = recommendations.get('metadata', {})
                    print(f"\n📈 Analysis Summary:")
                    print(f"  • Algorithms used: {metadata.get('algorithms_used', 0)}")
                    print(f"  • Processing time: {metadata.get('processing_time_seconds', 0):.2f}s")
                    print(f"  • Trading theme: {metadata.get('trading_theme', 'N/A')}")
                    
                else:
                    print("❌ No recommendations generated")
                    
            except Exception as e:
                print(f"❌ Error generating recommendations: {e}")
        
        # Demo algorithm performance
        self.demo_algorithm_performance()
    
    def demo_algorithm_performance(self):
        """Show algorithm performance metrics"""
        print(f"\n📈 ALGORITHM PERFORMANCE METRICS")
        print("=" * 50)
        
        try:
            performance = self.orchestrator.get_algorithm_performance()
            
            if performance:
                print(f"{'Algorithm':<25} {'Accuracy':<10} {'Return':<10} {'Sharpe'}")
                print("-" * 60)
                
                for alg_id, data in performance.items():
                    metadata = data.get('metadata', {})
                    metrics = data.get('performance_metrics', {})
                    
                    if metadata.get('algorithm_type') == 'seed_algorithm':
                        name = metadata.get('name', alg_id)[:24]
                        accuracy = metrics.get('accuracy', 'N/A')
                        returns = metrics.get('return', 'N/A')
                        sharpe = metrics.get('sharpe_ratio', 'N/A')
                        
                        print(f"{name:<25} {accuracy:<10} {returns:<10} {sharpe}")
            else:
                print("No algorithm performance data available")
                
        except Exception as e:
            print(f"Error retrieving performance: {e}")
    
    def demo_filter_comparison(self):
        """Compare different filter performance"""
        print(f"\n⚖️ FILTER PERFORMANCE COMPARISON")
        print("=" * 50)
        
        themes = ['intraday_buy', 'swing_buy', 'long_term_buy']
        
        for theme in themes:
            mock_data = self.create_mock_stock_data(theme, 10)
            
            avg_change = mock_data['per_chg'].mean()
            avg_volume = mock_data['volume'].mean()
            top_gainer = mock_data.loc[mock_data['per_chg'].idxmax()]
            
            print(f"\n🎯 {theme.upper()}:")
            print(f"  • Average change: +{avg_change:.2f}%")
            print(f"  • Average volume: {avg_volume:,.0f}")
            print(f"  • Top gainer: {top_gainer['symbol']} (+{top_gainer['per_chg']:.1f}%)")
    
    def run_complete_demo(self):
        """Run the complete demo"""
        print("🚀 Starting Complete Mock Demo...")
        
        self.demo_with_mock_data()
        self.demo_filter_comparison()
        
        print(f"\n✅ DEMO COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("🎯 What was demonstrated:")
        print("  • Multi-theme stock analysis (intraday, swing)")
        print("  • Multi-algorithm scoring and ranking")
        print("  • Performance metrics tracking")
        print("  • Filter comparison analysis")
        print("  • Real-time recommendation generation")
        print(f"\n🚀 System is ready for integration with live Chartink data!")


def main():
    """Run the mock demo"""
    demo = MockChartinkDemo()
    demo.run_complete_demo()


if __name__ == "__main__":
    main() 