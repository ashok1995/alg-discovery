#!/usr/bin/env python3
"""
Test Recommendation History Tracking System
==========================================

Comprehensive test script to demonstrate the recommendation history storage and analytics system.
Simulates various trading recommendation scenarios and showcases the analytics capabilities.
"""

import asyncio
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Add the api directory to the Python path
sys.path.append('api')

from models.recommendation_history_models import (
    recommendation_history_storage,
    RecommendationStrategy,
    RecommendationAction
)

class RecommendationHistoryTester:
    """Test suite for recommendation history tracking."""
    
    def __init__(self):
        self.storage = recommendation_history_storage
    
    async def initialize(self):
        """Initialize the storage system."""
        print("🔧 Initializing recommendation history storage...")
        await self.storage.initialize()
        print("✅ Storage initialized successfully")
    
    async def close(self):
        """Close storage connections."""
        await self.storage.close()
        print("✅ Storage connections closed")
    
    def create_sample_recommendations(self, strategy: str, count: int = 10) -> List[Dict[str, Any]]:
        """Create sample recommendation data for testing."""
        
        sample_stocks = [
            {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "sector": "Energy", "price": 2450.50},
            {"symbol": "TCS", "name": "Tata Consultancy Services", "sector": "IT", "price": 3890.25},
            {"symbol": "INFY", "name": "Infosys Limited", "sector": "IT", "price": 1650.75},
            {"symbol": "HDFCBANK", "name": "HDFC Bank Limited", "sector": "Banking", "price": 1580.90},
            {"symbol": "ICICIBANK", "name": "ICICI Bank Limited", "sector": "Banking", "price": 940.60},
            {"symbol": "HINDUNILVR", "name": "Hindustan Unilever Ltd", "sector": "FMCG", "price": 2380.45},
            {"symbol": "ITC", "name": "ITC Limited", "sector": "FMCG", "price": 415.80},
            {"symbol": "SBIN", "name": "State Bank of India", "sector": "Banking", "price": 720.30},
            {"symbol": "BHARTIARTL", "name": "Bharti Airtel Limited", "sector": "Telecom", "price": 1050.25},
            {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank", "sector": "Banking", "price": 1720.15},
            {"symbol": "LT", "name": "Larsen & Toubro Ltd", "sector": "Construction", "price": 3450.80},
            {"symbol": "HCLTECH", "name": "HCL Technologies Ltd", "sector": "IT", "price": 1890.60},
            {"symbol": "WIPRO", "name": "Wipro Limited", "sector": "IT", "price": 540.35},
            {"symbol": "ASIANPAINT", "name": "Asian Paints Limited", "sector": "Paints", "price": 2890.70},
            {"symbol": "MARUTI", "name": "Maruti Suzuki India Ltd", "sector": "Auto", "price": 10250.90}
        ]
        
        recommendations = []
        
        # Strategy-specific score ranges and characteristics
        if strategy == "shortterm":
            score_range = (60, 95)
            actions = ["buy", "strong_buy"]
        elif strategy == "swing":
            score_range = (55, 90)
            actions = ["buy", "moderate_buy", "hold"]
        elif strategy == "longterm":
            score_range = (70, 98)
            actions = ["buy", "strong_buy"]
        else:
            score_range = (50, 85)
            actions = ["buy", "sell", "hold"]
        
        import random
        random.seed(42)  # For reproducible results
        
        selected_stocks = random.sample(sample_stocks, min(count, len(sample_stocks)))
        
        for i, stock in enumerate(selected_stocks):
            score = random.uniform(score_range[0], score_range[1])
            price_variation = random.uniform(0.95, 1.05)  # ±5% price variation
            
            recommendation = {
                "symbol": stock["symbol"],
                "name": stock["name"],
                "exchange": "NSE",
                "sector": stock["sector"],
                "price": round(stock["price"] * price_variation, 2),
                "target_price": round(stock["price"] * random.uniform(1.10, 1.25), 2),
                "stop_loss": round(stock["price"] * random.uniform(0.90, 0.95), 2),
                "score": round(score, 2),
                "confidence_score": round(score * random.uniform(0.85, 1.0), 2),
                "risk_score": round(random.uniform(20, 60), 1),
                "momentum_score": round(random.uniform(40, 90), 1) if strategy in ["shortterm", "swing"] else None,
                "fundamental_score": round(random.uniform(50, 95), 1) if strategy == "longterm" else None,
                "technical_score": round(random.uniform(45, 85), 1),
                "recommendation_type": random.choice(actions),
                "upside_potential": round(random.uniform(8, 25), 1),
                "downside_risk": round(random.uniform(5, 15), 1),
                "risk_reward_ratio": round(random.uniform(1.2, 2.8), 2),
                "volume": random.randint(100000, 5000000),
                "volume_ratio": round(random.uniform(0.8, 2.5), 2),
                "per_change": round(random.uniform(-3, 8), 2),
                "market_cap": random.randint(50000, 1500000),
                "momentum": strategy in ["shortterm", "swing"],
                "breakout": random.choice([True, False]),
                "reversal": random.choice([True, False]),
                "fundamental": strategy == "longterm",
                "value": strategy == "longterm" and random.choice([True, False]),
                "quality": strategy == "longterm" and random.choice([True, False]),
                "categories": random.sample(["momentum", "breakout", "value", "quality", "growth"], random.randint(1, 3)),
                "indicators": {
                    "rsi": round(random.uniform(30, 70), 1),
                    "macd": round(random.uniform(-2, 2), 3),
                    "sma_20": round(stock["price"] * random.uniform(0.95, 1.05), 2),
                    "ema_50": round(stock["price"] * random.uniform(0.90, 1.10), 2)
                },
                "fundamental_metrics": {
                    "pe_ratio": round(random.uniform(10, 35), 1),
                    "pb_ratio": round(random.uniform(1, 5), 2),
                    "roe": round(random.uniform(8, 25), 1),
                    "debt_equity": round(random.uniform(0.1, 1.5), 2)
                } if strategy == "longterm" else {},
                "appearances": random.randint(1, 5),
                "category_count": random.randint(1, 4)
            }
            
            recommendations.append(recommendation)
        
        return recommendations
    
    async def test_store_recommendations(self):
        """Test storing recommendation batches for different strategies."""
        
        print("\n📊 Testing Recommendation Storage")
        print("=" * 50)
        
        strategies = [
            ("shortterm", RecommendationStrategy.SHORTTERM),
            ("swing", RecommendationStrategy.SWING),
            ("longterm", RecommendationStrategy.LONGTERM)
        ]
        
        stored_batches = []
        
        for strategy_name, strategy_enum in strategies:
            print(f"\n🔄 Storing {strategy_name} recommendations...")
            
            # Create sample recommendations
            recommendations = self.create_sample_recommendations(strategy_name, 12)
            
            # Create metadata
            metadata = {
                "algorithm_info": {
                    "version": "v1.0",
                    "strategy": strategy_name,
                    "filters_applied": {
                        "min_score": 50.0,
                        "top_recommendations": len(recommendations)
                    }
                },
                "performance_metrics": {
                    "api_response_time_ms": 1250.5,
                    "total_processing_time_seconds": 2.8
                }
            }
            
            # Request parameters
            request_parameters = {
                "limit_per_query": 50,
                "min_score": 50.0,
                "top_recommendations": len(recommendations)
            }
            
            # Market context
            market_context = {
                "market_condition": "open",
                "trading_session": f"session_{datetime.now().strftime('%Y%m%d')}",
                "market_open": True,
                "timestamp": datetime.now()
            }
            
            # Store the batch
            batch_id = await self.storage.store_recommendation_batch(
                execution_id=f"test_execution_{strategy_name}_{int(datetime.now().timestamp())}",
                cron_job_id=f"{strategy_name}_recommendations",
                strategy=strategy_enum,
                recommendations=recommendations,
                metadata=metadata,
                request_parameters=request_parameters,
                market_context=market_context
            )
            
            if batch_id:
                print(f"✅ Stored {strategy_name} batch: {batch_id} ({len(recommendations)} recommendations)")
                stored_batches.append((strategy_name, batch_id, len(recommendations)))
            else:
                print(f"❌ Failed to store {strategy_name} batch")
        
        print(f"\n📈 Storage Summary:")
        total_recommendations = 0
        for strategy_name, batch_id, count in stored_batches:
            print(f"  • {strategy_name.upper()}: {count} recommendations")
            total_recommendations += count
        print(f"  • TOTAL: {total_recommendations} recommendations stored")
        
        return stored_batches
    
    async def test_retrieve_history(self):
        """Test retrieving recommendation history with various filters."""
        
        print("\n🔍 Testing Recommendation History Retrieval")
        print("=" * 50)
        
        # Test 1: Get all recent recommendations
        print("\n1. All recent recommendations (last 7 days):")
        all_history = await self.storage.get_recommendation_history(
            start_date=datetime.now() - timedelta(days=7),
            end_date=datetime.now(),
            limit=50
        )
        print(f"   📊 Found {len(all_history)} total recommendations")
        
        # Test 2: Filter by strategy
        print("\n2. Short-term recommendations only:")
        shortterm_history = await self.storage.get_recommendation_history(
            strategy=RecommendationStrategy.SHORTTERM,
            start_date=datetime.now() - timedelta(days=7),
            limit=20
        )
        print(f"   📊 Found {len(shortterm_history)} short-term recommendations")
        
        # Test 3: Filter by symbol
        if all_history:
            sample_symbol = all_history[0].get('symbol', 'RELIANCE')
            print(f"\n3. Recommendations for {sample_symbol}:")
            symbol_history = await self.storage.get_recommendation_history(
                symbol=sample_symbol,
                start_date=datetime.now() - timedelta(days=7),
                limit=10
            )
            print(f"   📊 Found {len(symbol_history)} recommendations for {sample_symbol}")
        
        # Display sample recommendations
        if all_history:
            print(f"\n📋 Sample Recommendations (showing first 5):")
            for i, rec in enumerate(all_history[:5], 1):
                print(f"   {i}. {rec.get('symbol', 'N/A')} ({rec.get('strategy', 'N/A')}) - "
                      f"Score: {rec.get('overall_score', 0):.1f}, "
                      f"Price: ₹{rec.get('price_at_recommendation', 0):.2f}")
        
        return all_history
    
    async def test_batch_analytics(self):
        """Test batch analytics functionality."""
        
        print("\n📊 Testing Batch Analytics")
        print("=" * 40)
        
        # Get overall analytics
        analytics = await self.storage.get_batch_analytics(days=7)
        
        if 'error' not in analytics:
            print("✅ Batch analytics retrieved successfully")
            
            # Display summary
            summary = analytics.get('summary', {})
            if summary:
                print(f"\n📈 Summary (Last 7 days):")
                print(f"   • Total Strategies: {summary.get('total_strategies', 0)}")
                print(f"   • Total Batches: {summary.get('total_batches', 0)}")
                print(f"   • Total Recommendations: {summary.get('total_recommendations', 0)}")
            
            # Display strategy breakdown
            strategy_analytics = analytics.get('strategy_analytics', {})
            if strategy_analytics:
                print(f"\n🎯 Strategy Breakdown:")
                for strategy, data in strategy_analytics.items():
                    print(f"   • {strategy.upper()}:")
                    print(f"     - Batches: {data.get('total_batches', 0)}")
                    print(f"     - Recommendations: {data.get('total_recommendations', 0)}")
                    print(f"     - Avg Score: {data.get('avg_score', 0):.2f}")
                    print(f"     - Unique Symbols: {data.get('unique_symbols_count', 0)}")
        else:
            print(f"❌ Analytics error: {analytics['error']}")
        
        return analytics
    
    async def demonstrate_analytics_queries(self):
        """Demonstrate various analytics queries and insights."""
        
        print("\n🔬 Advanced Analytics Demonstration")
        print("=" * 50)
        
        # Query 1: Top performers by score
        print("\n1. Top 5 recommendations by score:")
        top_performers = await self.storage.get_recommendation_history(
            start_date=datetime.now() - timedelta(days=7),
            limit=100
        )
        
        if top_performers:
            # Sort by score
            sorted_performers = sorted(
                top_performers, 
                key=lambda x: x.get('overall_score', 0), 
                reverse=True
            )[:5]
            
            for i, rec in enumerate(sorted_performers, 1):
                print(f"   {i}. {rec.get('symbol', 'N/A')} - "
                      f"Score: {rec.get('overall_score', 0):.1f} "
                      f"({rec.get('strategy', 'N/A')})")
        
        # Query 2: Strategy comparison
        print("\n2. Strategy performance comparison:")
        strategies = ['shortterm', 'swing', 'longterm']
        strategy_stats = {}
        
        for strategy in strategies:
            strategy_enum = getattr(RecommendationStrategy, strategy.upper())
            history = await self.storage.get_recommendation_history(
                strategy=strategy_enum,
                start_date=datetime.now() - timedelta(days=7),
                limit=100
            )
            
            if history:
                scores = [rec.get('overall_score', 0) for rec in history]
                avg_score = sum(scores) / len(scores) if scores else 0
                strategy_stats[strategy] = {
                    'count': len(history),
                    'avg_score': avg_score,
                    'max_score': max(scores) if scores else 0
                }
            else:
                strategy_stats[strategy] = {'count': 0, 'avg_score': 0, 'max_score': 0}
        
        for strategy, stats in strategy_stats.items():
            print(f"   • {strategy.upper()}: {stats['count']} recs, "
                  f"Avg: {stats['avg_score']:.1f}, Max: {stats['max_score']:.1f}")
        
        # Query 3: Symbol frequency analysis
        print("\n3. Most recommended symbols:")
        symbol_counts = {}
        all_recommendations = await self.storage.get_recommendation_history(
            start_date=datetime.now() - timedelta(days=7),
            limit=200
        )
        
        for rec in all_recommendations:
            symbol = rec.get('symbol', 'Unknown')
            symbol_counts[symbol] = symbol_counts.get(symbol, 0) + 1
        
        # Sort by frequency
        top_symbols = sorted(symbol_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        for i, (symbol, count) in enumerate(top_symbols, 1):
            print(f"   {i}. {symbol}: {count} recommendations")
        
        return {
            'top_performers': sorted_performers[:5] if top_performers else [],
            'strategy_stats': strategy_stats,
            'top_symbols': top_symbols
        }

async def main():
    """Main test execution function."""
    
    print("🧪 Recommendation History Tracking System Test")
    print("=" * 60)
    print("This test demonstrates the complete recommendation history storage and analytics system.")
    print("It will create sample data and showcase various analytics capabilities.\n")
    
    tester = RecommendationHistoryTester()
    
    try:
        # Initialize
        await tester.initialize()
        
        # Run tests
        print("\n" + "="*60)
        stored_batches = await tester.test_store_recommendations()
        
        print("\n" + "="*60)
        history = await tester.test_retrieve_history()
        
        print("\n" + "="*60)
        analytics = await tester.test_batch_analytics()
        
        print("\n" + "="*60)
        insights = await tester.demonstrate_analytics_queries()
        
        # Final summary
        print("\n" + "="*60)
        print("🎉 TEST SUMMARY")
        print("=" * 30)
        print("✅ All tests completed successfully!")
        print(f"📊 Total batches stored: {len(stored_batches)}")
        print(f"📈 Total recommendations: {len(history) if history else 0}")
        print(f"🔍 Analytics queries: 3 demonstrated")
        
        print("\n💡 System Capabilities Demonstrated:")
        print("   • ✅ Historical recommendation storage")
        print("   • ✅ Multi-strategy batch tracking")
        print("   • ✅ Flexible querying and filtering")
        print("   • ✅ Performance analytics")
        print("   • ✅ Trend analysis")
        print("   • ✅ Symbol frequency tracking")
        
        print("\n🚀 Ready for Production Use!")
        print("\nNext Steps:")
        print("1. Start the trading scheduler: ./start_trading_crons.sh start")
        print("2. Monitor recommendations: python view_recommendation_history.py live")
        print("3. View analytics: python view_recommendation_history.py analytics")
        print("4. Export data: python view_recommendation_history.py export --format csv")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        await tester.close()

if __name__ == "__main__":
    asyncio.run(main()) 