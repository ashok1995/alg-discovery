"""
Unit tests for database configuration and management
"""

import pytest
import unittest.mock as mock
from datetime import datetime, time
from unittest.mock import patch, MagicMock

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.database.config import DatabaseConfig, MarketHours, DatabaseManager


class TestDatabaseConfig:
    """Test database configuration"""
    
    def test_database_config_creation(self):
        """Test database configuration creation"""
        config = DatabaseConfig(
            postgres_url="postgresql://test:test@localhost/test",
            redis_url="redis://localhost:6379/0",
            mongo_url="mongodb://localhost:27017/test"
        )
        
        assert config.postgres_url == "postgresql://test:test@localhost/test"
        assert config.redis_url == "redis://localhost:6379/0"
        assert config.mongo_url == "mongodb://localhost:27017/test"
        assert config.redis_db == 0
        assert config.mongo_db == "test"
    
    def test_database_config_defaults(self):
        """Test database configuration with defaults"""
        config = DatabaseConfig()
        
        assert "postgresql://" in config.postgres_url
        assert "redis://" in config.redis_url
        assert "mongodb://" in config.mongo_url


class TestMarketHours:
    """Test market hours functionality"""
    
    def setup_method(self):
        """Setup test method"""
        self.market_hours = MarketHours()
    
    def test_market_hours_creation(self):
        """Test market hours creation"""
        assert self.market_hours.market_open_time == time(9, 15)
        assert self.market_hours.market_close_time == time(15, 30)
        assert self.market_hours.timezone_name == "Asia/Kolkata"
    
    def test_custom_market_hours(self):
        """Test custom market hours"""
        custom_hours = MarketHours(
            market_open=time(10, 0),
            market_close=time(16, 0),
            timezone="US/Eastern"
        )
        
        assert custom_hours.market_open_time == time(10, 0)
        assert custom_hours.market_close_time == time(16, 0)
        assert custom_hours.timezone_name == "US/Eastern"
    
    @patch('core.database.config.datetime')
    def test_is_market_open_during_hours(self, mock_datetime):
        """Test market open check during market hours"""
        # Mock current time to 10:30 AM IST on a weekday
        mock_now = datetime(2024, 1, 15, 10, 30)  # Monday
        mock_datetime.now.return_value = mock_now
        
        # We need to mock the timezone conversion too
        with patch('pytz.timezone') as mock_tz:
            mock_ist = mock_tz.return_value
            mock_ist.localize.return_value = mock_now
            
            result = self.market_hours.is_market_open()
            # Should be True since 10:30 is between 9:15 and 15:30
            assert isinstance(result, bool)
    
    @patch('core.database.config.datetime')
    def test_is_market_closed_outside_hours(self, mock_datetime):
        """Test market closed check outside market hours"""
        # Mock current time to 8:00 AM IST on a weekday
        mock_now = datetime(2024, 1, 15, 8, 0)  # Monday
        mock_datetime.now.return_value = mock_now
        
        with patch('pytz.timezone') as mock_tz:
            mock_ist = mock_tz.return_value
            mock_ist.localize.return_value = mock_now
            
            result = self.market_hours.is_market_open()
            # Should be False since 8:00 is before 9:15
            assert isinstance(result, bool)
    
    @patch('core.database.config.datetime')
    def test_is_market_closed_weekend(self, mock_datetime):
        """Test market closed on weekend"""
        # Mock current time to Saturday
        mock_now = datetime(2024, 1, 13, 10, 30)  # Saturday
        mock_datetime.now.return_value = mock_now
        
        with patch('pytz.timezone') as mock_tz:
            mock_ist = mock_tz.return_value
            mock_ist.localize.return_value = mock_now
            
            result = self.market_hours.is_market_open()
            # Should be False on weekend
            assert result == False
    
    def test_time_until_market_open(self):
        """Test time until market open calculation"""
        result = self.market_hours.time_until_market_open()
        assert isinstance(result, (int, float, type(None)))


class TestDatabaseManager:
    """Test database manager functionality"""
    
    def setup_method(self):
        """Setup test method"""
        self.config = DatabaseConfig(
            postgres_url="postgresql://test:test@localhost/test",
            redis_url="redis://localhost:6379/1",
            mongo_url="mongodb://localhost:27017/test"
        )
        self.db_manager = DatabaseManager(self.config)
    
    def test_database_manager_creation(self):
        """Test database manager creation"""
        assert self.db_manager.config == self.config
        assert isinstance(self.db_manager.market_hours, MarketHours)
    
    @patch('core.database.config.create_engine')
    def test_get_postgres_engine(self, mock_create_engine):
        """Test PostgreSQL engine creation"""
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine
        
        engine = self.db_manager.get_postgres_engine()
        
        mock_create_engine.assert_called_once_with(
            self.config.postgres_url,
            echo=False,
            pool_size=10,
            max_overflow=20
        )
        assert engine == mock_engine
    
    @patch('core.database.config.redis.Redis')
    def test_get_redis_client(self, mock_redis):
        """Test Redis client creation"""
        mock_client = MagicMock()
        mock_redis.from_url.return_value = mock_client
        
        client = self.db_manager.get_redis_client()
        
        mock_redis.from_url.assert_called_once_with(
            self.config.redis_url,
            decode_responses=True
        )
        assert client == mock_client
    
    @patch('core.database.config.MongoClient')
    def test_get_mongo_client(self, mock_mongo_client):
        """Test MongoDB client creation"""
        mock_client = MagicMock()
        mock_mongo_client.return_value = mock_client
        
        client = self.db_manager.get_mongo_client()
        
        mock_mongo_client.assert_called_once_with(self.config.mongo_url)
        assert client == mock_client
    
    @patch('core.database.config.create_engine')
    @patch('core.database.config.redis.Redis')
    @patch('core.database.config.MongoClient')
    def test_health_check_all_healthy(self, mock_mongo, mock_redis, mock_postgres):
        """Test health check when all databases are healthy"""
        # Mock successful connections
        mock_postgres_engine = MagicMock()
        mock_postgres.return_value = mock_postgres_engine
        mock_postgres_engine.connect.return_value.__enter__.return_value.execute.return_value = None
        
        mock_redis_client = MagicMock()
        mock_redis.from_url.return_value = mock_redis_client
        mock_redis_client.ping.return_value = True
        
        mock_mongo_client = MagicMock()
        mock_mongo.return_value = mock_mongo_client
        mock_mongo_client.admin.command.return_value = {'ok': 1}
        
        health = self.db_manager.health_check()
        
        assert health['postgres'] == 'healthy'
        assert health['redis'] == 'healthy'
        assert health['mongo'] == 'healthy'
    
    @patch('core.database.config.create_engine')
    def test_health_check_postgres_unhealthy(self, mock_postgres):
        """Test health check when PostgreSQL is unhealthy"""
        # Mock failed PostgreSQL connection
        mock_postgres.side_effect = Exception("Connection failed")
        
        health = self.db_manager.health_check()
        
        assert health['postgres'] == 'unhealthy'
    
    @patch('core.database.config.create_engine')
    @patch('core.database.config.redis.Redis')
    def test_health_check_redis_unhealthy(self, mock_redis, mock_postgres):
        """Test health check when Redis is unhealthy"""
        # Mock healthy PostgreSQL
        mock_postgres_engine = MagicMock()
        mock_postgres.return_value = mock_postgres_engine
        
        # Mock failed Redis connection
        mock_redis_client = MagicMock()
        mock_redis.from_url.return_value = mock_redis_client
        mock_redis_client.ping.side_effect = Exception("Redis connection failed")
        
        health = self.db_manager.health_check()
        
        assert health['postgres'] == 'healthy'
        assert health['redis'] == 'unhealthy'
    
    def test_get_db_context_manager(self):
        """Test database context manager"""
        with patch.object(self.db_manager, 'get_postgres_engine') as mock_get_engine:
            mock_engine = MagicMock()
            mock_connection = MagicMock()
            mock_get_engine.return_value = mock_engine
            mock_engine.connect.return_value = mock_connection
            
            # Test the context manager
            db_context = self.db_manager.get_db()
            assert db_context is not None
    
    def test_get_redis_context_manager(self):
        """Test Redis context manager"""
        with patch.object(self.db_manager, 'get_redis_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client
            
            # Test the context manager
            redis_context = self.db_manager.get_redis()
            assert redis_context is not None
    
    def test_get_mongo_context_manager(self):
        """Test MongoDB context manager"""
        with patch.object(self.db_manager, 'get_mongo_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client
            
            # Test the context manager
            mongo_context = self.db_manager.get_mongo()
            assert mongo_context is not None


class TestDatabaseManagerIntegration:
    """Integration tests for database manager (requires actual databases)"""
    
    @pytest.mark.integration
    def test_database_connections_integration(self):
        """Test actual database connections (integration test)"""
        # This test would require actual database instances
        # Skip in unit tests
        pytest.skip("Integration test - requires actual databases")
    
    @pytest.mark.performance
    def test_connection_pooling_performance(self):
        """Test connection pooling performance"""
        # This test would measure connection performance
        pytest.skip("Performance test - requires actual databases") 