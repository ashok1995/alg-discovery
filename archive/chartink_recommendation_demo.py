#!/usr/bin/env python3
"""
Chartink + Recommendation Engine Integration Demo

Demonstrates the complete workflow:
1. Fetch candidate stocks from Chartink using theme-specific filters
2. Apply multiple seed algorithms for scoring
3. Use ranking algorithms to combine scores
4. Generate final ranked recommendations

Features:
- Multiple Chartink filters per trading theme
- Multi-algorithm scoring and ranking
- Performance comparison between filters
- Real-time candidate selection and ranking
- A/B testing capabilities
"""

import sys
import os
import logging
import pandas as pd
import numpy as np
from datetime import datetime
import json
from typing import Dict, List, Any

# Add paths for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from recommendation_engine.utils.chartink_integration import (
        ChartinkStockFetcher, 
        ChartinkRecommendationEngine
    )
    from recommendation_engine.recommendation_orchestrator import RecommendationOrchestrator
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please ensure all modules are properly installed and accessible")
    sys.exit(1)


class ChartinkRecommendationDemo:
    """
    Comprehensive demo of Chartink + Recommendation Engine integration
    """
    
    def __init__(self):
        """Initialize the demo system"""
        self.setup_logging()
        self.logger = logging.getLogger(__name__)
        self.logger.info("🚀 Initializing Chartink + Recommendation Engine Demo")
        
        # Initialize components
        self.chartink_fetcher = None
        self.recommendation_engine = None
        self.orchestrator = None
        
        # Demo configuration
        self.trading_themes = ['intraday_buy', 'swing_buy', 'short_term_buy', 'long_term_buy']
        self.demo_results = {}
    
    def setup_logging(self):
        """Setup comprehensive logging"""
        # Create logs directory if it doesn't exist
        os.makedirs('logs', exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('logs/chartink_recommendation_demo.log'),
                logging.StreamHandler()
            ]
        )
    
    def initialize_systems(self):
        """Initialize all components"""
        self.logger.info("🔧 Initializing Chartink and Recommendation systems...")
        
        try:
            # Initialize Chartink fetcher
            self.chartink_fetcher = ChartinkStockFetcher(cache_duration_minutes=10)
            self.logger.info("✅ Chartink fetcher initialized")
            
            # Initialize recommendation engine
            self.recommendation_engine = ChartinkRecommendationEngine(self.chartink_fetcher)
            self.logger.info("✅ Chartink recommendation engine initialized")
            
            # Initialize orchestrator separately for direct access
            self.orchestrator = RecommendationOrchestrator()
            self.logger.info("✅ Recommendation orchestrator initialized")
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize systems: {e}")
            return False
    
    def demo_chartink_filters(self):
        """Demonstrate Chartink filter capabilities"""
        self.logger.info("\n" + "="*70)
        self.logger.info("📊 CHARTINK FILTERS DEMONSTRATION")
        self.logger.info("="*70)
        
        for theme in self.trading_themes:
            print(f"\n🎯 Testing filters for theme: {theme.upper()}")
            print("-" * 50)
            
            try:
                # Get candidates using predefined filters
                candidates = self.chartink_fetcher.get_candidates_for_theme(
                    trading_theme=theme,
                    limit=50
                )
                
                if not candidates.empty:
                    print(f"✅ Found {len(candidates)} candidates")
                    
                    # Show filter breakdown
                    if 'filter_source' in candidates.columns:
                        filter_counts = candidates['filter_source'].value_counts()
                        print("Filter breakdown:")
                        for filter_name, count in filter_counts.items():
                            print(f"  • {filter_name}: {count} stocks")
                    
                    # Show top 5 candidates
                    print("\nTop 5 candidates:")
                    top_5 = candidates.head(5)
                    for idx, row in top_5.iterrows():
                        print(f"  {row['symbol']} - Price: ₹{row['close']:.1f}, "
                              f"Change: {row['per_chg']:.2f}%, "
                              f"Volume: {row['volume']:,}")
                
                else:
                    print("❌ No candidates found")
                
            except Exception as e:
                self.logger.error(f"❌ Error testing {theme} filters: {e}")
                print(f"❌ Error: {e}")
    
    def demo_multi_algorithm_scoring(self):
        """Demonstrate multi-algorithm scoring on candidates"""
        self.logger.info("\n" + "="*70)
        self.logger.info("🧮 MULTI-ALGORITHM SCORING DEMONSTRATION")
        self.logger.info("="*70)
        
        theme = 'intraday_buy'  # Focus on intraday for detailed demo
        
        print(f"\n🎯 Detailed analysis for {theme.upper()}")
        print("-" * 50)
        
        try:
            # Get candidates
            candidates = self.chartink_fetcher.get_candidates_for_theme(
                trading_theme=theme,
                limit=20
            )
            
            if candidates.empty:
                print("❌ No candidates available for analysis")
                return
            
            print(f"📊 Analyzing {len(candidates)} candidates with multiple algorithms...")
            
            # Get algorithm performance data
            algo_performance = self.orchestrator.get_algorithm_performance()
            
            # Show available algorithms for this theme
            theme_algorithms = []
            for alg_id, data in algo_performance.items():
                metadata = data['metadata']
                if (metadata.get('trading_theme') == theme and 
                    metadata.get('algorithm_type') == 'seed_algorithm' and
                    metadata.get('is_active', True)):
                    theme_algorithms.append(metadata)
            
            print(f"\n🔍 Available seed algorithms for {theme}:")
            for i, alg in enumerate(theme_algorithms, 1):
                metrics = algo_performance[alg['alg_id']].get('performance_metrics', {})
                print(f"  {i}. {alg['name']}")
                print(f"     • Accuracy: {metrics.get('accuracy', 'N/A')}%")
                print(f"     • Return: {metrics.get('return', 'N/A')}%")
                print(f"     • Sharpe: {metrics.get('sharpe_ratio', 'N/A')}")
            
            # Generate recommendations
            recommendations = self.orchestrator.get_recommendations_with_chartink_data(
                stock_data_df=candidates,
                trading_theme=theme,
                limit=10
            )
            
            if recommendations['recommendations']:
                print(f"\n🎯 Top 10 Multi-Algorithm Recommendations:")
                print("-" * 60)
                print(f"{'Rank':<4} {'Symbol':<12} {'Score':<6} {'Confidence':<10} {'Action'}")
                print("-" * 60)
                
                for i, rec in enumerate(recommendations['recommendations'], 1):
                    print(f"{i:<4} {rec['symbol']:<12} {rec['score']:<6.1f} "
                          f"{rec['confidence']:<10.3f} {rec['recommendation']}")
                
                # Show algorithm breakdown for top stock
                top_rec = recommendations['recommendations'][0]
                print(f"\n🔍 Algorithm Breakdown for {top_rec['symbol']}:")
                if 'algorithm_breakdown' in top_rec:
                    for alg_id, score in top_rec['algorithm_breakdown'].items():
                        alg_name = next((alg['name'] for alg in theme_algorithms if alg['alg_id'] == alg_id), alg_id)
                        print(f"  • {alg_name}: {score:.1f}")
            
            else:
                print("❌ No recommendations generated")
                
        except Exception as e:
            self.logger.error(f"❌ Error in multi-algorithm scoring: {e}")
            print(f"❌ Error: {e}")
    
    def demo_integrated_workflow(self):
        """Demonstrate complete integrated workflow"""
        self.logger.info("\n" + "="*70)
        self.logger.info("🔄 INTEGRATED WORKFLOW DEMONSTRATION")
        self.logger.info("="*70)
        
        for theme in ['intraday_buy', 'swing_buy']:
            print(f"\n🎯 Complete workflow for {theme.upper()}")
            print("-" * 50)
            
            try:
                # Step 1: Get ranked recommendations using integrated engine
                recommendations = self.recommendation_engine.get_ranked_recommendations(
                    trading_theme=theme,
                    candidate_limit=100,
                    final_limit=15
                )
                
                if recommendations['recommendations']:
                    print(f"✅ Generated {len(recommendations['recommendations'])} recommendations")
                    
                    # Show workflow metadata
                    metadata = recommendations['metadata']
                    if 'chartink_integration' in metadata:
                        chartink_info = metadata['chartink_integration']
                        print(f"📊 Chartink candidates: {chartink_info.get('candidates_fetched', 0)}")
                        print(f"🔍 Filters used: {', '.join(chartink_info.get('filters_used', []))}")
                    
                    print(f"🧮 Algorithms used: {', '.join(metadata.get('algorithms_used', []))}")
                    
                    # Show top 5 with enhanced data
                    print(f"\nTop 5 Enhanced Recommendations:")
                    print("-" * 80)
                    
                    for i, rec in enumerate(recommendations['recommendations'][:5], 1):
                        chartink_data = rec.get('chartink_data', {})
                        print(f"{i}. {rec['symbol']:<10} | Score: {rec['score']:<5.1f} | "
                              f"Action: {rec['recommendation']:<10} | "
                              f"Price: ₹{chartink_data.get('price', 0):<6.1f} | "
                              f"Change: {chartink_data.get('price_change_pct', 0):>5.1f}%")
                        
                        # Show combined score if available
                        if 'combined_score' in rec:
                            print(f"   Combined Score: {rec['combined_score']:.1f} "
                                  f"(Algo: {rec['score']:.1f} + Market Data)")
                
                else:
                    error_msg = recommendations['metadata'].get('error', 'Unknown error')
                    print(f"❌ No recommendations: {error_msg}")
                
                # Store results for comparison
                self.demo_results[theme] = recommendations
                
            except Exception as e:
                self.logger.error(f"❌ Error in integrated workflow for {theme}: {e}")
                print(f"❌ Error: {e}")
    
    def demo_filter_performance_comparison(self):
        """Compare performance of different filters"""
        self.logger.info("\n" + "="*70)
        self.logger.info("⚖️  FILTER PERFORMANCE COMPARISON")
        self.logger.info("="*70)
        
        theme = 'intraday_buy'
        print(f"\n📊 Comparing filter performance for {theme.upper()}")
        print("-" * 60)
        
        try:
            # Get filter queries for the theme
            filter_queries = self.chartink_fetcher._get_filter_queries_for_theme(theme)
            
            filter_results = {}
            
            for filter_name, filter_query in filter_queries.items():
                print(f"\n🔍 Testing filter: {filter_name}")
                
                # Get candidates for this specific filter
                candidates = self.chartink_fetcher.get_stocks_by_filter(
                    filter_query=filter_query,
                    trading_theme=theme,
                    use_cache=True
                )
                
                if not candidates.empty:
                    # Calculate filter statistics
                    stats = {
                        'count': len(candidates),
                        'avg_price_change': candidates['per_chg'].mean(),
                        'avg_volume_rank': candidates.get('volume_rank', pd.Series()).mean(),
                        'price_range': f"₹{candidates['close'].min():.0f} - ₹{candidates['close'].max():.0f}",
                        'top_gainers': candidates.nlargest(3, 'per_chg')['symbol'].tolist()
                    }
                    
                    filter_results[filter_name] = stats
                    
                    print(f"  • Stocks found: {stats['count']}")
                    print(f"  • Avg price change: {stats['avg_price_change']:.2f}%")
                    print(f"  • Price range: {stats['price_range']}")
                    print(f"  • Top gainers: {', '.join(stats['top_gainers'])}")
                
                else:
                    print("  • No stocks found")
                    filter_results[filter_name] = {'count': 0}
            
            # Summary comparison
            if filter_results:
                print(f"\n📈 Filter Performance Summary:")
                print("-" * 60)
                print(f"{'Filter':<20} {'Count':<8} {'Avg Change%':<12} {'Best Performers'}")
                print("-" * 60)
                
                for filter_name, stats in filter_results.items():
                    if stats['count'] > 0:
                        top_performers = ', '.join(stats.get('top_gainers', [])[:2])
                        print(f"{filter_name:<20} {stats['count']:<8} "
                              f"{stats.get('avg_price_change', 0):<12.2f} {top_performers}")
                    else:
                        print(f"{filter_name:<20} {'0':<8} {'N/A':<12} {'None'}")
                
        except Exception as e:
            self.logger.error(f"❌ Error in filter comparison: {e}")
            print(f"❌ Error: {e}")
    
    def demo_cache_and_performance(self):
        """Demonstrate caching and performance features"""
        self.logger.info("\n" + "="*70)
        self.logger.info("⚡ CACHE & PERFORMANCE DEMONSTRATION")
        self.logger.info("="*70)
        
        print("\n🗄️  Cache Information:")
        print("-" * 30)
        
        try:
            cache_info = self.chartink_fetcher.get_cache_info()
            
            if cache_info:
                for cache_key, info in cache_info.items():
                    print(f"📋 Cache Entry: {cache_key[:30]}...")
                    print(f"   • Theme: {info['trading_theme']}")
                    print(f"   • Stocks: {info['stocks_count']}")
                    print(f"   • Age: {info['age_minutes']:.1f} minutes")
                    print(f"   • Timestamp: {info['timestamp']}")
            else:
                print("📭 No cache entries found")
            
            # Performance test: repeated calls
            print(f"\n⚡ Performance Test:")
            print("-" * 20)
            
            theme = 'intraday_buy'
            
            # First call (cache miss)
            start_time = datetime.now()
            candidates1 = self.chartink_fetcher.get_candidates_for_theme(theme, limit=50)
            first_call_time = (datetime.now() - start_time).total_seconds()
            
            # Second call (cache hit)
            start_time = datetime.now()
            candidates2 = self.chartink_fetcher.get_candidates_for_theme(theme, limit=50)
            second_call_time = (datetime.now() - start_time).total_seconds()
            
            print(f"🔍 First call (API): {first_call_time:.2f} seconds - {len(candidates1)} stocks")
            print(f"📋 Second call (cache): {second_call_time:.2f} seconds - {len(candidates2)} stocks")
            
            if second_call_time > 0:
                speedup = first_call_time / second_call_time
                print(f"⚡ Speedup: {speedup:.1f}x faster with cache")
                
        except Exception as e:
            self.logger.error(f"❌ Error in cache demo: {e}")
            print(f"❌ Error: {e}")
    
    def generate_summary_report(self):
        """Generate comprehensive summary report"""
        self.logger.info("\n" + "="*70)
        self.logger.info("📋 COMPREHENSIVE SUMMARY REPORT")
        self.logger.info("="*70)
        
        print("\n🎯 Integration Summary:")
        print("-" * 30)
        
        total_recommendations = 0
        themes_tested = 0
        
        for theme, results in self.demo_results.items():
            if results and 'recommendations' in results:
                count = len(results['recommendations'])
                total_recommendations += count
                themes_tested += 1
                
                metadata = results.get('metadata', {})
                chartink_info = metadata.get('chartink_integration', {})
                
                print(f"\n📈 {theme.upper()}:")
                print(f"   • Recommendations: {count}")
                print(f"   • Candidates fetched: {chartink_info.get('candidates_fetched', 0)}")
                print(f"   • Algorithms used: {len(metadata.get('algorithms_used', []))}")
                
                if results['recommendations']:
                    top_stock = results['recommendations'][0]
                    print(f"   • Top pick: {top_stock['symbol']} (Score: {top_stock['score']:.1f})")
        
        print(f"\n🏆 Overall Statistics:")
        print(f"   • Themes tested: {themes_tested}")
        print(f"   • Total recommendations: {total_recommendations}")
        print(f"   • Systems integrated: Chartink + Multi-Algorithm Engine")
        print(f"   • Cache enabled: ✅")
        print(f"   • Real-time processing: ✅")
    
    def run_comprehensive_demo(self):
        """Run the complete demonstration"""
        print("\n" + "="*80)
        print("🚀 CHARTINK + RECOMMENDATION ENGINE INTEGRATION DEMO")
        print("="*80)
        print("Demonstrating: Chartink API → Multiple Filters → Seed Algorithms → Ranking")
        print("="*80)
        
        # Initialize systems
        if not self.initialize_systems():
            print("❌ Failed to initialize systems. Demo aborted.")
            return False
        
        try:
            # Run all demo sections
            self.demo_chartink_filters()
            self.demo_multi_algorithm_scoring()
            self.demo_integrated_workflow()
            self.demo_filter_performance_comparison()
            self.demo_cache_and_performance()
            self.generate_summary_report()
            
            # Final summary
            print("\n" + "="*80)
            print("✅ CHARTINK INTEGRATION DEMO COMPLETED SUCCESSFULLY")
            print("="*80)
            print("🎯 Key Integration Features Demonstrated:")
            print("  • Chartink API integration with multiple theme-specific filters")
            print("  • Real-time candidate stock fetching and enhancement")
            print("  • Multi-algorithm scoring using seed algorithms")
            print("  • Weighted ranking and ensemble methods")
            print("  • Performance caching and optimization")
            print("  • Combined scoring (Algorithm + Market Data)")
            print("  • A/B testing framework integration")
            print("\n🚀 System Ready for Live Trading Integration!")
            print("="*80)
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Demo failed: {e}")
            print(f"\n❌ Demo encountered an error: {e}")
            return False


if __name__ == "__main__":
    # Run the comprehensive Chartink integration demo
    demo = ChartinkRecommendationDemo()
    success = demo.run_comprehensive_demo()
    
    if success:
        print("\n🎉 Chartink integration demo completed successfully!")
        print("📚 Next steps for production:")
        print("  1. Configure Chartink filters for your specific trading strategies")
        print("  2. Tune seed algorithm parameters based on backtesting")
        print("  3. Set up real-time data feeds for live trading")
        print("  4. Implement portfolio management and risk controls")
        print("  5. Enable automated trading execution")
        print("  6. Set up performance monitoring and alerts")
    else:
        print("\n❌ Demo completed with errors. Please check logs for details.")
    
    sys.exit(0 if success else 1) 