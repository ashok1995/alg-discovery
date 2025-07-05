#!/usr/bin/env python3
"""
AlgoDiscovery Chartink Integration Example

This example demonstrates how to use the enhanced AlgoDiscovery API with Chartink integration
for dynamic stock discovery across different market themes and trading strategies.

Features demonstrated:
- Dynamic stock discovery via Chartink themes
- Multiple theme testing and comparison
- Real-time recommendation filtering
- Performance analysis across themes
- Trading strategy customization
"""

import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from algodiscovery_client import AlgoDiscoveryClient


class ChartinkThemeAnalyzer:
    """Analyzer for comparing different Chartink themes and their performance"""
    
    def __init__(self, base_url: str = "http://localhost:8888"):
        """Initialize the analyzer with AlgoDiscovery client"""
        self.client = AlgoDiscoveryClient(base_url=base_url)
        self.themes = [
            "intraday_buy", "breakout_stocks", "volume_leaders", 
            "momentum_stocks", "reversal_candidates", "gap_up_stocks", 
            "high_beta_stocks"
        ]
        
    def test_single_theme(self, theme: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Test a single Chartink theme with specified parameters"""
        print(f"\n🎯 Testing theme: {theme}")
        print("-" * 50)
        
        try:
            # Get recommendations for the theme
            result = self.client.get_intraday_buy(
                limit=kwargs.get('limit', 10),
                enable_ranking=kwargs.get('enable_ranking', True),
                confidence_threshold=kwargs.get('confidence_threshold', 50.0),
                strength_threshold=kwargs.get('strength_threshold', 50.0),
                chartink_theme=theme
            )
            
            if not result:
                print(f"❌ No response from API for theme: {theme}")
                return None
                
            # Extract metrics
            recs = result.get('recommendations', [])
            market_conditions = result.get('market_conditions', {})
            
            if not recs:
                print(f"📭 No recommendations found for theme: {theme}")
                return {
                    'theme': theme,
                    'total_recommendations': 0,
                    'avg_confidence': 0,
                    'avg_strength': 0,
                    'high_confidence_count': 0,
                    'recommendations': []
                }
            
            # Calculate analytics
            avg_confidence = sum(r['confidence'] for r in recs) / len(recs)
            avg_strength = sum(r['strength'] for r in recs) / len(recs)
            high_conf_count = len([r for r in recs if r['confidence'] >= 75.0])
            
            # Display results
            print(f"📊 Results for {theme}:")
            print(f"  Total recommendations: {len(recs)}")
            print(f"  Average confidence: {avg_confidence:.1f}%")
            print(f"  Average strength: {avg_strength:.1f}%")
            print(f"  High confidence (75%+): {high_conf_count}")
            print(f"  Chartink source: {result.get('chartink_theme', 'Unknown')}")
            
            # Show top 3 recommendations
            print(f"\n🔥 Top 3 recommendations:")
            for i, rec in enumerate(recs[:3], 1):
                print(f"  {i}. {rec['symbol']}: {rec['confidence']:.1f}% confidence, "
                      f"₹{rec['entry_price']:.2f} → ₹{rec['target_price']:.2f}")
            
            return {
                'theme': theme,
                'total_recommendations': len(recs),
                'avg_confidence': avg_confidence,
                'avg_strength': avg_strength,
                'high_confidence_count': high_conf_count,
                'recommendations': recs,
                'market_conditions': market_conditions,
                'raw_response': result
            }
            
        except Exception as e:
            print(f"🚨 Error testing theme {theme}: {str(e)}")
            return None
    
    def compare_all_themes(self, **kwargs) -> Dict[str, Any]:
        """Compare performance across all available Chartink themes"""
        print("🚀 Comparing all Chartink themes for dynamic stock discovery...")
        print("=" * 70)
        
        results = {}
        summary_stats = []
        
        for theme in self.themes:
            result = self.test_single_theme(theme, **kwargs)
            if result:
                results[theme] = result
                summary_stats.append({
                    'theme': theme,
                    'total_recs': result['total_recommendations'],
                    'avg_confidence': result['avg_confidence'],
                    'high_conf_count': result['high_confidence_count']
                })
            
            # Small delay between requests
            time.sleep(0.5)
        
        # Display comparison summary
        print("\n" + "=" * 70)
        print("📈 THEME COMPARISON SUMMARY")
        print("=" * 70)
        
        # Sort by total recommendations
        summary_stats.sort(key=lambda x: x['total_recs'], reverse=True)
        
        print(f"{'Theme':<20} {'Total':<8} {'Avg Conf':<10} {'High Conf':<10}")
        print("-" * 50)
        
        for stat in summary_stats:
            print(f"{stat['theme']:<20} {stat['total_recs']:<8} "
                  f"{stat['avg_confidence']:<10.1f} {stat['high_conf_count']:<10}")
        
        # Find best performing themes
        if summary_stats:
            best_volume = max(summary_stats, key=lambda x: x['total_recs'])
            best_quality = max(summary_stats, key=lambda x: x['avg_confidence'])
            
            print(f"\n🏆 Best volume: {best_volume['theme']} ({best_volume['total_recs']} recommendations)")
            print(f"🎯 Best quality: {best_quality['theme']} ({best_quality['avg_confidence']:.1f}% avg confidence)")
        
        return {
            'individual_results': results,
            'summary_stats': summary_stats,
            'timestamp': datetime.now().isoformat()
        }
    
    def get_themed_portfolio(self, themes: List[str], limit_per_theme: int = 5) -> Dict[str, Any]:
        """Create a diversified portfolio using multiple Chartink themes"""
        print(f"🎨 Creating diversified portfolio from themes: {', '.join(themes)}")
        print("-" * 60)
        
        portfolio = {
            'themes_used': themes,
            'total_recommendations': 0,
            'recommendations_by_theme': {},
            'combined_recommendations': [],
            'portfolio_stats': {}
        }
        
        all_recs = []
        
        for theme in themes:
            print(f"\n📡 Fetching from theme: {theme}")
            
            result = self.client.get_intraday_buy(
                limit=limit_per_theme,
                enable_ranking=True,
                confidence_threshold=50.0,
                strength_threshold=50.0,
                chartink_theme=theme
            )
            
            if result and result.get('recommendations'):
                recs = result['recommendations']
                portfolio['recommendations_by_theme'][theme] = recs
                
                # Add theme info to each recommendation
                for rec in recs:
                    rec['source_theme'] = theme
                    all_recs.append(rec)
                
                print(f"  ✅ Added {len(recs)} recommendations from {theme}")
            else:
                print(f"  ❌ No recommendations from {theme}")
        
        # Remove duplicates (same symbol from different themes)
        seen_symbols = set()
        unique_recs = []
        
        for rec in all_recs:
            if rec['symbol'] not in seen_symbols:
                unique_recs.append(rec)
                seen_symbols.add(rec['symbol'])
        
        # Sort by confidence
        unique_recs.sort(key=lambda x: x['confidence'], reverse=True)
        
        portfolio['combined_recommendations'] = unique_recs
        portfolio['total_recommendations'] = len(unique_recs)
        
        # Calculate portfolio statistics
        if unique_recs:
            avg_confidence = sum(r['confidence'] for r in unique_recs) / len(unique_recs)
            avg_strength = sum(r['strength'] for r in unique_recs) / len(unique_recs)
            high_conf_count = len([r for r in unique_recs if r['confidence'] >= 75.0])
            
            portfolio['portfolio_stats'] = {
                'avg_confidence': avg_confidence,
                'avg_strength': avg_strength,
                'high_confidence_count': high_conf_count,
                'unique_symbols': len(seen_symbols),
                'themes_contributed': len([t for t in themes if t in portfolio['recommendations_by_theme']])
            }
            
            print(f"\n📊 Portfolio Summary:")
            print(f"  Total unique recommendations: {len(unique_recs)}")
            print(f"  Average confidence: {avg_confidence:.1f}%")
            print(f"  High confidence signals: {high_conf_count}")
            print(f"  Themes that contributed: {portfolio['portfolio_stats']['themes_contributed']}")
            
            print(f"\n🔥 Top 5 portfolio recommendations:")
            for i, rec in enumerate(unique_recs[:5], 1):
                print(f"  {i}. {rec['symbol']} ({rec['source_theme']}): "
                      f"{rec['confidence']:.1f}% confidence")
        
        return portfolio


def main():
    """Main demonstration function"""
    print("🚀 AlgoDiscovery Chartink Integration Demo")
    print("=" * 50)
    
    # Initialize analyzer
    analyzer = ChartinkThemeAnalyzer()
    
    # Test 1: Single theme analysis
    print("\n📋 TEST 1: Single Theme Analysis")
    breakout_result = analyzer.test_single_theme(
        "breakout_stocks",
        limit=8,
        confidence_threshold=50.0,
        strength_threshold=50.0
    )
    
    # Test 2: Compare all themes
    print("\n📋 TEST 2: All Themes Comparison")
    comparison = analyzer.compare_all_themes(
        limit=5,
        confidence_threshold=50.0,
        strength_threshold=50.0
    )
    
    # Test 3: Multi-theme portfolio
    print("\n📋 TEST 3: Multi-Theme Portfolio")
    portfolio = analyzer.get_themed_portfolio(
        themes=["breakout_stocks", "volume_leaders", "momentum_stocks"],
        limit_per_theme=4
    )
    
    # Test 4: Morning gap trading setup
    print("\n📋 TEST 4: Morning Gap Trading Setup")
    gap_trading_result = analyzer.test_single_theme(
        "gap_up_stocks",
        limit=10,
        confidence_threshold=50.0,
        strength_threshold=50.0
    )
    
    # Summary
    print("\n" + "=" * 50)
    print("✅ Chartink Integration Demo Complete!")
    print("=" * 50)
    print("\nKey Features Demonstrated:")
    print("- ✅ Dynamic stock discovery via Chartink themes")
    print("- ✅ Multi-theme performance comparison")
    print("- ✅ Diversified portfolio creation")
    print("- ✅ Strategy-specific theme selection")
    print("- ✅ Real-time filtering and ranking")
    
    # Save results to file
    results_file = f"chartink_demo_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    demo_results = {
        'single_theme_test': breakout_result,
        'all_themes_comparison': comparison,
        'multi_theme_portfolio': portfolio,
        'gap_trading_test': gap_trading_result,
        'timestamp': datetime.now().isoformat()
    }
    
    try:
        with open(results_file, 'w') as f:
            json.dump(demo_results, f, indent=2, default=str)
        print(f"\n📁 Results saved to: {results_file}")
    except Exception as e:
        print(f"⚠️ Could not save results: {e}")


if __name__ == "__main__":
    main() 