#!/usr/bin/env python3
"""
Recommendation Engine Demo

Comprehensive demonstration of the modular recommendation engine with:
- Dynamic algorithm loading
- Multi-theme recommendations
- A/B testing simulation
- Performance analytics
- Integration with existing trading system

Features:
- Live algorithm performance comparison
- Theme-based recommendation generation
- A/B test results analysis
- Self-learning capabilities demonstration
- Integration with dynamic stock selector
"""

import json
import logging
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any
import sys
import os

# Add recommendation_engine to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from recommendation_engine.recommendation_orchestrator import RecommendationOrchestrator
    from dynamic_stock_selector import DynamicStockSelector
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please ensure all modules are properly installed and accessible")
    sys.exit(1)


class RecommendationEngineDemo:
    """
    Comprehensive demo of the recommendation engine system.
    """
    
    def __init__(self):
        """Initialize the demo system."""
        self.setup_logging()
        
        self.logger = logging.getLogger(__name__)
        self.logger.info("🚀 Initializing Recommendation Engine Demo")
        
        # Initialize components
        self.orchestrator = None
        self.stock_selector = None
        
        # Demo data
        self.sample_symbols = [
            'SATIN', 'RTNPOWER', 'VINCOFE', 'RELIANCE', 'TCS', 'INFY', 'HDFCBANK',
            'ICICIBANK', 'BAJFINANCE', 'KOTAKBANK', 'ASIANPAINT', 'MARUTI',
            'HINDUNILVR', 'NESTLEIND', 'ITC', 'LT', 'WIPRO', 'TECHM', 'TITAN',
            'AXISBANK', 'ULTRACEMCO', 'POWERGRID', 'NTPC', 'COALINDIA'
        ]
        
        self.trading_themes = [
            'intraday_buy', 'swing_buy', 'short_term_buy', 'long_term_buy'
        ]
    
    def setup_logging(self):
        """Setup comprehensive logging."""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('logs/recommendation_engine_demo.log'),
                logging.StreamHandler()
            ]
        )
    
    def initialize_systems(self):
        """Initialize the recommendation engine and related systems."""
        self.logger.info("🔧 Initializing recommendation engine...")
        
        try:
            # Initialize recommendation orchestrator
            self.orchestrator = RecommendationOrchestrator()
            self.logger.info("✅ Recommendation orchestrator initialized")
            
            # Initialize dynamic stock selector for integration
            self.stock_selector = DynamicStockSelector()
            self.logger.info("✅ Dynamic stock selector initialized")
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize systems: {e}")
            return False
    
    def demo_algorithm_loading(self):
        """Demonstrate dynamic algorithm loading and versioning."""
        self.logger.info("\n" + "="*60)
        self.logger.info("🧪 ALGORITHM LOADING & VERSIONING DEMO")
        self.logger.info("="*60)
        
        # Get algorithm performance data
        performance_data = self.orchestrator.get_algorithm_performance()
        
        print("\n📊 Loaded Algorithms:")
        print("-" * 50)
        
        for alg_id, data in performance_data.items():
            metadata = data['metadata']
            metrics = data.get('performance_metrics', {})
            
            print(f"\n🔹 {metadata['name']} (v{metadata['version']})")
            print(f"   Theme: {metadata['trading_theme']}")
            print(f"   Type: {metadata['algorithm_type']}")
            print(f"   Status: {'✅ Loaded' if data['is_loaded'] else '❌ Not Loaded'}")
            
            if metrics:
                print(f"   Performance:")
                print(f"     • Accuracy: {metrics.get('accuracy', 'N/A')}%")
                print(f"     • Return: {metrics.get('return', 'N/A')}%")
                print(f"     • Sharpe Ratio: {metrics.get('sharpe_ratio', 'N/A')}")
                print(f"     • Max Drawdown: {metrics.get('max_drawdown', 'N/A')}%")
    
    def demo_multi_theme_recommendations(self):
        """Demonstrate recommendations across different trading themes."""
        self.logger.info("\n" + "="*60)
        self.logger.info("🎯 MULTI-THEME RECOMMENDATIONS DEMO")
        self.logger.info("="*60)
        
        # Test symbols (use top stocks from stock selector if available)
        test_symbols = self.sample_symbols[:15]
        
        for theme in self.trading_themes:
            print(f"\n📈 Theme: {theme.upper()}")
            print("-" * 40)
            
            try:
                recommendations = self.orchestrator.get_recommendations(
                    symbols=test_symbols,
                    trading_theme=theme,
                    limit=5
                )
                
                if recommendations['recommendations']:
                    print("Top 5 Recommendations:")
                    for i, rec in enumerate(recommendations['recommendations'], 1):
                        print(f"{i}. {rec['symbol']} - Score: {rec['score']:.1f} "
                              f"({rec['recommendation']}) - Confidence: {rec['confidence']}")
                else:
                    print("❌ No recommendations generated")
                
                # Show metadata
                metadata = recommendations['metadata']
                print(f"\nMetadata:")
                print(f"  • Algorithms used: {', '.join(metadata.get('algorithms_used', []))}")
                print(f"  • Symbols analyzed: {metadata.get('total_symbols_analyzed', 0)}")
                print(f"  • Timestamp: {metadata.get('timestamp', 'N/A')}")
                
            except Exception as e:
                self.logger.error(f"❌ Error generating {theme} recommendations: {e}")
    
    def demo_ab_testing(self):
        """Demonstrate A/B testing capabilities."""
        self.logger.info("\n" + "="*60)
        self.logger.info("🧪 A/B TESTING DEMO")
        self.logger.info("="*60)
        
        # Simulate A/B test comparison
        test_symbols = self.sample_symbols[:10]
        
        print("🔄 Running A/B Test: Momentum v1.0 vs v2.0")
        print("-" * 50)
        
        # Simulate multiple recommendation runs
        results_a = []
        results_b = []
        
        for i in range(5):
            print(f"📊 Test Run {i+1}/5")
            
            # Get recommendations (simulating A/B split)
            recommendations = self.orchestrator.get_recommendations(
                symbols=test_symbols,
                trading_theme='intraday_buy',
                limit=10
            )
            
            if recommendations['recommendations']:
                avg_score = np.mean([r['score'] for r in recommendations['recommendations']])
                avg_confidence = np.mean([r['confidence'] for r in recommendations['recommendations']])
                
                # Simulate A/B split
                if i % 2 == 0:
                    results_a.append({'avg_score': avg_score, 'avg_confidence': avg_confidence})
                else:
                    results_b.append({'avg_score': avg_score, 'avg_confidence': avg_confidence})
        
        # Analyze results
        if results_a and results_b:
            avg_score_a = np.mean([r['avg_score'] for r in results_a])
            avg_score_b = np.mean([r['avg_score'] for r in results_b])
            avg_conf_a = np.mean([r['avg_confidence'] for r in results_a])
            avg_conf_b = np.mean([r['avg_confidence'] for r in results_b])
            
            print(f"\n📈 A/B Test Results:")
            print(f"Algorithm A (v1.0): Score: {avg_score_a:.2f}, Confidence: {avg_conf_a:.3f}")
            print(f"Algorithm B (v2.0): Score: {avg_score_b:.2f}, Confidence: {avg_conf_b:.3f}")
            
            winner = "Algorithm B" if avg_score_b > avg_score_a else "Algorithm A"
            improvement = abs(avg_score_b - avg_score_a) / max(avg_score_a, avg_score_b) * 100
            print(f"🏆 Winner: {winner} (Improvement: {improvement:.1f}%)")
    
    def demo_integration_with_stock_selector(self):
        """Demonstrate integration with existing dynamic stock selector."""
        self.logger.info("\n" + "="*60)
        self.logger.info("🔗 INTEGRATION WITH STOCK SELECTOR DEMO")
        self.logger.info("="*60)
        
        try:
            print("🔄 Getting top stocks from dynamic selector...")
            
            # Get top stocks from stock selector
            if hasattr(self.stock_selector, 'get_top_stocks'):
                top_stocks = self.stock_selector.get_top_stocks(limit=20)
                
                if top_stocks:
                    symbols = [stock['symbol'] for stock in top_stocks[:15]]
                    print(f"✅ Retrieved {len(symbols)} symbols from stock selector")
                    
                    # Generate recommendations for these symbols
                    recommendations = self.orchestrator.get_recommendations(
                        symbols=symbols,
                        trading_theme='intraday_buy',
                        limit=10
                    )
                    
                    print("\n🎯 Enhanced Recommendations (Stock Selector + Recommendation Engine):")
                    print("-" * 70)
                    
                    if recommendations['recommendations']:
                        for i, rec in enumerate(recommendations['recommendations'], 1):
                            # Find original stock selector score
                            original_stock = next((s for s in top_stocks if s['symbol'] == rec['symbol']), None)
                            selector_score = original_stock['score'] if original_stock else 'N/A'
                            
                            print(f"{i:2d}. {rec['symbol']:10s} | "
                                  f"Selector: {selector_score:5.1f} | "
                                  f"Recommendation: {rec['score']:5.1f} | "
                                  f"Combined: {rec['recommendation']:10s} | "
                                  f"Confidence: {rec['confidence']:.3f}")
                    
                    # Show algorithm breakdown for top recommendation
                    if recommendations['recommendations']:
                        top_rec = recommendations['recommendations'][0]
                        print(f"\n🔍 Algorithm Breakdown for {top_rec['symbol']}:")
                        for alg_id, score in top_rec['algorithm_breakdown'].items():
                            print(f"  • {alg_id}: {score:.1f}")
                
                else:
                    print("❌ No stocks retrieved from selector")
                    
            else:
                print("❌ Stock selector doesn't have get_top_stocks method")
                
        except Exception as e:
            self.logger.error(f"❌ Integration demo error: {e}")
            print("⚠️  Using fallback symbols for demo...")
            
            # Fallback to sample symbols
            recommendations = self.orchestrator.get_recommendations(
                symbols=self.sample_symbols[:10],
                trading_theme='intraday_buy',
                limit=5
            )
            
            if recommendations['recommendations']:
                print("\n🎯 Fallback Recommendations:")
                for i, rec in enumerate(recommendations['recommendations'], 1):
                    print(f"{i}. {rec['symbol']} - Score: {rec['score']:.1f} ({rec['recommendation']})")
    
    def demo_performance_analytics(self):
        """Demonstrate performance analytics and monitoring."""
        self.logger.info("\n" + "="*60)
        self.logger.info("📊 PERFORMANCE ANALYTICS DEMO")
        self.logger.info("="*60)
        
        print("📈 Algorithm Performance Comparison:")
        print("-" * 50)
        
        performance_data = self.orchestrator.get_algorithm_performance()
        
        # Create performance summary
        algorithm_summary = []
        
        for alg_id, data in performance_data.items():
            if data['metadata'].get('algorithm_type') == 'seed_algorithm':
                metrics = data.get('performance_metrics', {})
                algorithm_summary.append({
                    'name': data['metadata']['name'],
                    'theme': data['metadata']['trading_theme'],
                    'accuracy': metrics.get('accuracy', 0),
                    'return': metrics.get('return', 0),
                    'sharpe_ratio': metrics.get('sharpe_ratio', 0),
                    'max_drawdown': metrics.get('max_drawdown', 0)
                })
        
        # Sort by return
        algorithm_summary.sort(key=lambda x: x['return'], reverse=True)
        
        print(f"{'Algorithm':<25} {'Theme':<15} {'Return':<8} {'Accuracy':<9} {'Sharpe':<8} {'MaxDD':<8}")
        print("-" * 80)
        
        for alg in algorithm_summary:
            print(f"{alg['name']:<25} {alg['theme']:<15} {alg['return']:>6.1f}% "
                  f"{alg['accuracy']:>7.1f}% {alg['sharpe_ratio']:>6.2f} {alg['max_drawdown']:>6.1f}%")
    
    def demo_self_learning_simulation(self):
        """Simulate self-learning capabilities."""
        self.logger.info("\n" + "="*60)
        self.logger.info("🧠 SELF-LEARNING SIMULATION DEMO")
        self.logger.info("="*60)
        
        print("🔄 Simulating algorithm performance updates...")
        
        # Simulate performance feedback for different algorithms
        performance_updates = [
            {
                'alg_id': 'momentum_intraday_v1',
                'metrics': {
                    'accuracy': 74.2,  # Improved
                    'return': 8.8,     # Improved
                    'sharpe_ratio': 1.48,
                    'sample_size': 175
                }
            },
            {
                'alg_id': 'volume_surge_intraday_v1',
                'metrics': {
                    'accuracy': 69.5,  # Slightly improved
                    'return': 7.6,     # Improved
                    'sharpe_ratio': 1.32,
                    'sample_size': 150
                }
            }
        ]
        
        for update in performance_updates:
            print(f"📊 Updating performance for {update['alg_id']}")
            self.orchestrator.update_algorithm_performance(
                update['alg_id'], 
                update['metrics']
            )
            print(f"   ✅ New accuracy: {update['metrics']['accuracy']}%")
            print(f"   ✅ New return: {update['metrics']['return']}%")
        
        print("\n🔄 Generating recommendations with updated performance...")
        
        # Generate new recommendations
        recommendations = self.orchestrator.get_recommendations(
            symbols=self.sample_symbols[:10],
            trading_theme='intraday_buy',
            limit=5
        )
        
        if recommendations['recommendations']:
            print("\n🎯 Updated Recommendations:")
            for i, rec in enumerate(recommendations['recommendations'], 1):
                print(f"{i}. {rec['symbol']} - Score: {rec['score']:.1f} "
                      f"({rec['recommendation']}) - Confidence: {rec['confidence']}")
    
    def run_comprehensive_demo(self):
        """Run the complete demonstration."""
        print("\n" + "="*80)
        print("🚀 RECOMMENDATION ENGINE COMPREHENSIVE DEMO")
        print("="*80)
        print("Showcasing modular, self-learning trading recommendation system")
        print("with versioning, A/B testing, and integration capabilities")
        print("="*80)
        
        # Initialize systems
        if not self.initialize_systems():
            print("❌ Failed to initialize systems. Demo aborted.")
            return False
        
        try:
            # Run all demo sections
            self.demo_algorithm_loading()
            self.demo_multi_theme_recommendations()
            self.demo_ab_testing()
            self.demo_integration_with_stock_selector()
            self.demo_performance_analytics()
            self.demo_self_learning_simulation()
            
            # Final summary
            print("\n" + "="*80)
            print("✅ DEMO COMPLETED SUCCESSFULLY")
            print("="*80)
            print("🎯 Key Features Demonstrated:")
            print("  • Dynamic algorithm loading and versioning")
            print("  • Multi-theme recommendation generation")
            print("  • A/B testing framework")
            print("  • Integration with existing trading systems")
            print("  • Performance analytics and monitoring")
            print("  • Self-learning and adaptation capabilities")
            print("\n🚀 System Ready for Production Integration!")
            print("="*80)
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Demo failed: {e}")
            print(f"\n❌ Demo encountered an error: {e}")
            return False


if __name__ == "__main__":
    # Run the comprehensive demo
    demo = RecommendationEngineDemo()
    success = demo.run_comprehensive_demo()
    
    if success:
        print("\n🎉 Demo completed successfully!")
        print("📚 Next steps:")
        print("  1. Review algorithm configurations in recommendation_engine/config/")
        print("  2. Add new seed algorithms for different trading themes")
        print("  3. Implement real market data integration")
        print("  4. Setup production A/B testing framework")
        print("  5. Enable continuous learning from trading results")
    else:
        print("\n❌ Demo completed with errors. Please check logs for details.")
    
    sys.exit(0 if success else 1) 