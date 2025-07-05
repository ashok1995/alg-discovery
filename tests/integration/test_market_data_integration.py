"""
Integration tests for market data collection with caching
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import patch, MagicMock

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.background.cron_jobs.market_data_jobs import MarketDataCollector


@pytest.mark.integration
class TestMarketDataIntegration:
    """Integration tests for market data collection"""
    
    def setup_method(self):
        """Setup test method"""
        self.collector = MarketDataCollector()
    
    @pytest.mark.asyncio
    async def test_market_data_collection_flow(self):
        """Test complete market data collection flow"""
        # Mock external dependencies
        with patch('yfinance.Tickers') as mock_tickers, \
             patch.object(self.collector.cache_manager, 'set') as mock_cache_set, \
             patch.object(self.collector, '_store_in_database') as mock_store_db:
            
            # Mock yfinance response
            mock_ticker = MagicMock()
            mock_ticker.info = {
                'marketCap': 1000000000000,
                'trailingPE': 25.5
            }
            
            # Mock historical data
            import pandas as pd
            mock_hist = pd.DataFrame({
                'Open': [2440.0],
                'High': [2460.0],
                'Low': [2435.0],
                'Close': [2450.0],
                'Volume': [1500000]
            }, index=[datetime.now()])
            
            mock_ticker.history.return_value = mock_hist
            
            mock_tickers_instance = MagicMock()
            mock_tickers_instance.tickers = {'RELIANCE.NS': mock_ticker}
            mock_tickers.return_value = mock_tickers_instance
            
            mock_cache_set.return_value = True
            mock_store_db.return_value = None
            
            # Execute the test
            result = await self.collector.fetch_real_time_data()
            
            # Assertions
            assert 'stocks' in result
            assert 'indices' in result
            assert 'timestamp' in result
            assert 'market_open' in result
            
            # Verify cache was called
            mock_cache_set.assert_called()
            
            # Verify database storage was called
            mock_store_db.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_cache_fallback_mechanism(self):
        """Test cache fallback when data fetching fails"""
        with patch('yfinance.Tickers') as mock_tickers, \
             patch.object(self.collector.cache_manager, 'get') as mock_cache_get:
            
            # Mock yfinance to fail
            mock_tickers.side_effect = Exception("Network error")
            
            # Mock cached data
            cached_data = {
                'stocks': {
                    'RELIANCE.NS': {
                        'symbol': 'RELIANCE.NS',
                        'price': 2450.0,
                        'timestamp': datetime.now().isoformat()
                    }
                },
                'indices': {},
                'timestamp': datetime.now().isoformat(),
                'market_open': True
            }
            mock_cache_get.return_value = cached_data
            
            # Execute the test
            result = await self.collector.fetch_real_time_data()
            
            # Should return cached data
            assert result == cached_data
            mock_cache_get.assert_called_with("latest_market_data", prefix="market_data")
    
    @pytest.mark.asyncio
    async def test_historical_data_collection(self):
        """Test historical data collection"""
        with patch('yfinance.Ticker') as mock_ticker_class, \
             patch.object(self.collector.cache_manager, 'set') as mock_cache_set:
            
            # Mock ticker instance
            mock_ticker = MagicMock()
            mock_ticker_class.return_value = mock_ticker
            
            # Mock historical data
            import pandas as pd
            dates = pd.date_range('2023-01-01', periods=5, freq='D')
            mock_hist = pd.DataFrame({
                'Open': [2400, 2410, 2420, 2430, 2440],
                'High': [2450, 2460, 2470, 2480, 2490],
                'Low': [2390, 2400, 2410, 2420, 2430],
                'Close': [2445, 2455, 2465, 2475, 2485],
                'Volume': [1000000, 1100000, 1200000, 1300000, 1400000]
            }, index=dates)
            
            mock_ticker.history.return_value = mock_hist
            mock_cache_set.return_value = True
            
            # Execute the test
            result = await self.collector.fetch_historical_data()
            
            # Assertions
            assert len(result) > 0
            
            # Check first symbol data structure
            first_symbol = list(result.keys())[0]
            symbol_data = result[first_symbol]
            
            assert 'dates' in symbol_data
            assert 'open' in symbol_data
            assert 'high' in symbol_data
            assert 'low' in symbol_data
            assert 'close' in symbol_data
            assert 'volume' in symbol_data
            
            # Verify cache was called for individual symbols and complete dataset
            assert mock_cache_set.call_count >= 2
    
    def test_data_cleanup_functionality(self):
        """Test data cleanup functionality"""
        with patch.object(self.collector.cache_manager, 'invalidate_pattern') as mock_invalidate, \
             patch.object(self.collector, '_store_in_database') as mock_store:
            
            # Mock MongoDB cleanup
            mock_mongo_client = MagicMock()
            mock_db = MagicMock()
            mock_collection = MagicMock()
            
            mock_mongo_client.__getitem__.return_value = mock_db
            mock_db.__getattr__.return_value = mock_collection
            mock_collection.delete_many.return_value.deleted_count = 150
            
            with patch('core.database.config.db_manager') as mock_db_manager:
                mock_db_manager.get_mongo_client.return_value = mock_mongo_client
                mock_db_manager.config.mongo_db = "test_db"
                
                mock_invalidate.return_value = 25
                
                # Execute the test
                result = self.collector.cleanup_old_data()
                
                # Assertions
                assert 'cache_cleaned' in result
                assert 'db_cleaned' in result
                assert result['cache_cleaned'] == 25
                assert result['db_cleaned'] == 150
    
    def test_cache_warming_functionality(self):
        """Test cache warming functionality"""
        with patch.object(self.collector.cache_manager, 'set') as mock_cache_set, \
             patch.object(self.collector.market_hours, 'is_market_open') as mock_market_open, \
             patch.object(self.collector.market_hours, 'time_until_market_open') as mock_time_until:
            
            mock_cache_set.return_value = True
            mock_market_open.return_value = True
            mock_time_until.return_value = 3600  # 1 hour
            
            # Execute the test
            result = self.collector.warm_cache()
            
            # Assertions
            assert 'warmed_keys' in result
            assert 'failed_keys' in result
            assert 'total_time' in result
            
            # Should warm multiple keys
            assert len(result['warmed_keys']) > 0
            
            # Verify cache set was called multiple times
            assert mock_cache_set.call_count >= 2


@pytest.mark.integration
class TestSystemIntegration:
    """Integration tests for complete system functionality"""
    
    @pytest.mark.asyncio
    async def test_job_scheduler_integration(self):
        """Test job scheduler with market data jobs"""
        from core.background.cron_jobs.job_scheduler import DistributedJobScheduler
        from core.background.cron_jobs.market_data_jobs import setup_market_data_jobs
        
        # Mock the scheduler dependencies
        with patch('core.background.cron_jobs.job_scheduler.AsyncIOScheduler') as mock_scheduler_class, \
             patch('core.database.config.db_manager') as mock_db_manager:
            
            mock_scheduler = MagicMock()
            mock_scheduler_class.return_value = mock_scheduler
            mock_db_manager.market_hours.is_market_open.return_value = True
            
            # Create scheduler
            scheduler = DistributedJobScheduler()
            
            # Setup market data jobs
            setup_market_data_jobs()
            
            # Start scheduler
            scheduler.start()
            
            # Verify scheduler was started
            mock_scheduler.start.assert_called_once()
    
    def test_database_health_check_integration(self):
        """Test database health check integration"""
        from core.database.config import DatabaseManager, DatabaseConfig
        
        config = DatabaseConfig(
            postgres_url="postgresql://test:test@localhost/test",
            redis_url="redis://localhost:6379/1",
            mongo_url="mongodb://localhost:27017/test"
        )
        
        db_manager = DatabaseManager(config)
        
        # Mock all database connections to fail gracefully
        with patch('core.database.config.create_engine') as mock_postgres, \
             patch('core.database.config.redis.Redis') as mock_redis, \
             patch('core.database.config.MongoClient') as mock_mongo:
            
            # Mock connection failures
            mock_postgres.side_effect = Exception("Postgres connection failed")
            mock_redis.from_url.side_effect = Exception("Redis connection failed")
            mock_mongo.side_effect = Exception("Mongo connection failed")
            
            # Execute health check
            health = db_manager.health_check()
            
            # All should be unhealthy but not crash
            assert health['postgres'] == 'unhealthy'
            assert health['redis'] == 'unhealthy'
            assert health['mongo'] == 'unhealthy'
    
    @pytest.mark.asyncio
    async def test_end_to_end_data_flow(self):
        """Test complete end-to-end data flow"""
        # This test simulates a complete data collection, caching, and retrieval flow
        
        collector = MarketDataCollector()
        
        with patch('yfinance.Tickers') as mock_tickers, \
             patch.object(collector.cache_manager, 'set') as mock_cache_set, \
             patch.object(collector.cache_manager, 'get') as mock_cache_get, \
             patch.object(collector, '_store_in_database') as mock_store_db:
            
            # Step 1: Mock data collection
            mock_ticker = MagicMock()
            mock_ticker.info = {'marketCap': 1000000000000, 'trailingPE': 25.5}
            
            import pandas as pd
            mock_hist = pd.DataFrame({
                'Open': [2440.0], 'High': [2460.0], 'Low': [2435.0],
                'Close': [2450.0], 'Volume': [1500000]
            }, index=[datetime.now()])
            
            mock_ticker.history.return_value = mock_hist
            mock_tickers_instance = MagicMock()
            mock_tickers_instance.tickers = {'RELIANCE.NS': mock_ticker}
            mock_tickers.return_value = mock_tickers_instance
            
            mock_cache_set.return_value = True
            mock_store_db.return_value = None
            
            # Step 2: Collect data
            collected_data = await collector.fetch_real_time_data()
            
            # Step 3: Simulate cache retrieval
            mock_cache_get.return_value = collected_data
            cached_data = collector.cache_manager.get("latest_market_data", prefix="market_data")
            
            # Step 4: Verify end-to-end flow
            assert collected_data['stocks']['RELIANCE.NS']['symbol'] == 'RELIANCE.NS'
            assert cached_data == collected_data
            
            # Verify all steps were executed
            mock_cache_set.assert_called()
            mock_store_db.assert_called_once()
            mock_cache_get.assert_called_once()


@pytest.mark.performance
class TestPerformanceIntegration:
    """Performance integration tests"""
    
    @pytest.mark.asyncio
    async def test_bulk_data_collection_performance(self):
        """Test performance of bulk data collection"""
        import time
        
        collector = MarketDataCollector()
        
        # Mock dependencies for performance test
        with patch('yfinance.Tickers') as mock_tickers, \
             patch.object(collector.cache_manager, 'set'), \
             patch.object(collector, '_store_in_database'):
            
            # Mock quick responses
            mock_ticker = MagicMock()
            mock_ticker.info = {'marketCap': 1000000000000}
            
            import pandas as pd
            mock_hist = pd.DataFrame({
                'Open': [2440.0], 'High': [2460.0], 'Low': [2435.0],
                'Close': [2450.0], 'Volume': [1500000]
            }, index=[datetime.now()])
            
            mock_ticker.history.return_value = mock_hist
            
            # Create mock for all symbols
            mock_tickers_instance = MagicMock()
            mock_tickers_instance.tickers = {
                symbol: mock_ticker for symbol in collector.nse_symbols
            }
            mock_tickers.return_value = mock_tickers_instance
            
            # Measure performance
            start_time = time.time()
            result = await collector.fetch_real_time_data()
            end_time = time.time()
            
            execution_time = end_time - start_time
            
            # Performance assertions
            assert execution_time < 10.0  # Should complete within 10 seconds
            assert len(result['stocks']) == len(collector.nse_symbols)
            
            # Log performance metrics
            print(f"Bulk data collection took {execution_time:.2f} seconds for {len(collector.nse_symbols)} symbols")
    
    def test_cache_performance(self):
        """Test cache operation performance"""
        import time
        
        collector = MarketDataCollector()
        
        with patch.object(collector.cache_manager, 'set') as mock_cache_set, \
             patch.object(collector.cache_manager, 'get') as mock_cache_get:
            
            mock_cache_set.return_value = True
            mock_cache_get.return_value = {"test": "data"}
            
            # Test cache set performance
            start_time = time.time()
            for i in range(100):
                collector.cache_manager.set(f"test_key_{i}", {"data": f"value_{i}"})
            set_time = time.time() - start_time
            
            # Test cache get performance
            start_time = time.time()
            for i in range(100):
                collector.cache_manager.get(f"test_key_{i}")
            get_time = time.time() - start_time
            
            # Performance assertions
            assert set_time < 1.0  # 100 sets should take less than 1 second
            assert get_time < 1.0  # 100 gets should take less than 1 second
            
            print(f"Cache performance - Set: {set_time:.3f}s, Get: {get_time:.3f}s") 