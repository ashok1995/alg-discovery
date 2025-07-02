"""
Unit tests for Redis cache manager
"""

import pytest
import json
import pickle
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock, call

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.database.cache.redis_manager import RedisManager


class TestRedisManager:
    """Test Redis cache manager functionality"""
    
    def setup_method(self):
        """Setup test method"""
        with patch('core.database.cache.redis_manager.db_manager') as mock_db_manager:
            mock_db_manager.get_redis_client.return_value = MagicMock()
            mock_db_manager.market_hours.is_market_open.return_value = True
            
            self.redis_manager = RedisManager()
            self.mock_redis = self.redis_manager.redis_client
    
    def test_redis_manager_creation(self):
        """Test Redis manager creation"""
        assert self.redis_manager is not None
        assert self.redis_manager.redis_client is not None
    
    def test_generate_key_normal(self):
        """Test key generation for normal keys"""
        key = self.redis_manager._generate_key("test_key", "test_prefix")
        assert key == "test_prefix:test_key"
    
    def test_generate_key_long(self):
        """Test key generation for long keys (should be hashed)"""
        long_key = "a" * 300  # Longer than 250 characters
        key = self.redis_manager._generate_key(long_key, "test_prefix")
        
        # Should be hashed
        assert key.startswith("test_prefix:")
        assert len(key) < len(f"test_prefix:{long_key}")
        assert key != f"test_prefix:{long_key}"
    
    def test_serialize_data_json(self):
        """Test JSON serialization"""
        data = {"test": "value", "number": 123}
        serialized = self.redis_manager._serialize_data(data)
        
        # Should be JSON string
        assert isinstance(serialized, str)
        assert json.loads(serialized) == data
    
    def test_serialize_data_complex(self):
        """Test pickle serialization for complex data"""
        data = {"datetime": datetime.now()}
        serialized = self.redis_manager._serialize_data(data)
        
        # Should be bytes (pickle)
        assert isinstance(serialized, bytes)
    
    def test_deserialize_data_json(self):
        """Test JSON deserialization"""
        original_data = {"test": "value", "number": 123}
        serialized = json.dumps(original_data)
        
        deserialized = self.redis_manager._deserialize_data(serialized)
        assert deserialized == original_data
    
    def test_deserialize_data_pickle(self):
        """Test pickle deserialization"""
        original_data = {"datetime": datetime.now()}
        serialized = pickle.dumps(original_data)
        
        deserialized = self.redis_manager._deserialize_data(serialized)
        assert deserialized == original_data
    
    @patch('core.database.cache.redis_manager.db_manager')
    def test_get_market_aware_ttl_market_open(self, mock_db_manager):
        """Test TTL calculation when market is open"""
        mock_db_manager.market_hours.is_market_open.return_value = True
        
        ttl = self.redis_manager.get_market_aware_ttl()
        assert ttl == 300  # Default market hours TTL
    
    @patch('core.database.cache.redis_manager.db_manager')
    def test_get_market_aware_ttl_market_closed(self, mock_db_manager):
        """Test TTL calculation when market is closed"""
        mock_db_manager.market_hours.is_market_open.return_value = False
        
        ttl = self.redis_manager.get_market_aware_ttl()
        assert ttl == 3600  # Default off-hours TTL
    
    def test_set_success(self):
        """Test successful cache set operation"""
        self.mock_redis.setex.return_value = True
        
        result = self.redis_manager.set("test_key", {"data": "value"}, ttl=300, prefix="test")
        
        assert result is True
        self.mock_redis.setex.assert_called_once()
        
        # Verify the call arguments
        call_args = self.mock_redis.setex.call_args
        assert call_args[0][0] == "test:test_key"  # key
        assert call_args[0][1] == 300  # ttl
        # Data should be serialized
        assert isinstance(call_args[0][2], str)
    
    def test_set_failure(self):
        """Test cache set operation failure"""
        self.mock_redis.setex.side_effect = Exception("Redis error")
        
        result = self.redis_manager.set("test_key", {"data": "value"})
        assert result is False
    
    def test_get_success(self):
        """Test successful cache get operation"""
        test_data = {"test": "value"}
        serialized_data = json.dumps(test_data)
        self.mock_redis.get.return_value = serialized_data
        
        result = self.redis_manager.get("test_key", prefix="test")
        
        assert result == test_data
        self.mock_redis.get.assert_called_once_with("test:test_key")
    
    def test_get_not_found(self):
        """Test cache get when key not found"""
        self.mock_redis.get.return_value = None
        
        result = self.redis_manager.get("nonexistent_key")
        assert result is None
    
    def test_get_failure(self):
        """Test cache get operation failure"""
        self.mock_redis.get.side_effect = Exception("Redis error")
        
        result = self.redis_manager.get("test_key")
        assert result is None
    
    def test_delete_success(self):
        """Test successful cache delete operation"""
        self.mock_redis.delete.return_value = 1
        
        result = self.redis_manager.delete("test_key", prefix="test")
        
        assert result is True
        self.mock_redis.delete.assert_called_once_with("test:test_key")
    
    def test_delete_not_found(self):
        """Test cache delete when key not found"""
        self.mock_redis.delete.return_value = 0
        
        result = self.redis_manager.delete("nonexistent_key")
        assert result is False
    
    def test_exists_true(self):
        """Test cache exists when key exists"""
        self.mock_redis.exists.return_value = 1
        
        result = self.redis_manager.exists("test_key", prefix="test")
        
        assert result is True
        self.mock_redis.exists.assert_called_once_with("test:test_key")
    
    def test_exists_false(self):
        """Test cache exists when key doesn't exist"""
        self.mock_redis.exists.return_value = 0
        
        result = self.redis_manager.exists("nonexistent_key")
        assert result is False
    
    def test_get_with_fallback_cache_hit(self):
        """Test get with fallback when cache hit"""
        cached_data = {"cached": "value"}
        serialized_data = json.dumps(cached_data)
        self.mock_redis.get.return_value = serialized_data
        
        fallback_func = MagicMock(return_value={"fallback": "value"})
        
        result = self.redis_manager.get_with_fallback(
            "test_key",
            fallback_func,
            prefix="test"
        )
        
        assert result == cached_data
        fallback_func.assert_not_called()
    
    def test_get_with_fallback_cache_miss(self):
        """Test get with fallback when cache miss"""
        self.mock_redis.get.return_value = None
        self.mock_redis.setex.return_value = True
        
        fallback_data = {"fallback": "value"}
        fallback_func = MagicMock(return_value=fallback_data)
        
        result = self.redis_manager.get_with_fallback(
            "test_key",
            fallback_func,
            ttl=300,
            prefix="test"
        )
        
        assert result == fallback_data
        fallback_func.assert_called_once()
        
        # Should cache the fallback result
        self.mock_redis.setex.assert_called_once()
    
    def test_bulk_set(self):
        """Test bulk cache set operation"""
        data_dict = {
            "key1": {"data": "value1"},
            "key2": {"data": "value2"}
        }
        
        # Mock pipeline
        mock_pipeline = MagicMock()
        self.mock_redis.pipeline.return_value = mock_pipeline
        mock_pipeline.execute.return_value = [True, True]
        
        result = self.redis_manager.bulk_set(data_dict, ttl=300, prefix="test")
        
        assert result == {"key1": True, "key2": True}
        
        # Should use pipeline
        self.mock_redis.pipeline.assert_called_once()
        mock_pipeline.execute.assert_called_once()
    
    def test_bulk_get(self):
        """Test bulk cache get operation"""
        keys = ["key1", "key2"]
        
        # Mock mget response
        cached_data = [
            json.dumps({"data": "value1"}),
            json.dumps({"data": "value2"})
        ]
        self.mock_redis.mget.return_value = cached_data
        
        result = self.redis_manager.bulk_get(keys, prefix="test")
        
        expected = {
            "key1": {"data": "value1"},
            "key2": {"data": "value2"}
        }
        assert result == expected
        
        # Should call mget with prefixed keys
        expected_keys = ["test:key1", "test:key2"]
        self.mock_redis.mget.assert_called_once_with(expected_keys)
    
    def test_invalidate_pattern(self):
        """Test pattern-based cache invalidation"""
        # Mock scan_iter to return matching keys
        matching_keys = ["test:pattern_key1", "test:pattern_key2"]
        self.mock_redis.scan_iter.return_value = matching_keys
        
        # Mock delete to return number of deleted keys
        self.mock_redis.delete.return_value = len(matching_keys)
        
        result = self.redis_manager.invalidate_pattern("test:pattern_*")
        
        assert result == 2
        self.mock_redis.scan_iter.assert_called_once_with(match="test:pattern_*")
        self.mock_redis.delete.assert_called_once_with(*matching_keys)
    
    def test_warm_cache(self):
        """Test cache warming functionality"""
        warm_functions = {
            "key1": lambda: {"warm": "data1"},
            "key2": lambda: {"warm": "data2"}
        }
        
        self.mock_redis.setex.return_value = True
        
        result = self.redis_manager.warm_cache(warm_functions, ttl=300, prefix="warm")
        
        assert result == {"key1": True, "key2": True}
        
        # Should set both keys
        assert self.mock_redis.setex.call_count == 2
    
    def test_get_cache_stats(self):
        """Test cache statistics retrieval"""
        # Mock Redis info response
        mock_info = {
            'used_memory': 1024000,
            'used_memory_human': '1.02M',
            'keyspace_hits': 1000,
            'keyspace_misses': 200,
            'connected_clients': 5
        }
        self.mock_redis.info.return_value = mock_info
        
        # Mock dbsize
        self.mock_redis.dbsize.return_value = 150
        
        stats = self.redis_manager.get_cache_stats()
        
        assert stats['memory_usage'] == 1024000
        assert stats['memory_usage_human'] == '1.02M'
        assert stats['total_keys'] == 150
        assert stats['hit_rate'] == 1000 / (1000 + 200)  # 0.833...
        assert stats['connected_clients'] == 5
    
    def test_cleanup_expired(self):
        """Test cleanup of expired keys"""
        # Mock scan_iter to return some keys
        all_keys = ["key1", "key2", "key3"]
        self.mock_redis.scan_iter.return_value = all_keys
        
        # Mock ttl responses: key1 expired (-2), key2 active (300), key3 no expiry (-1)
        self.mock_redis.ttl.side_effect = [-2, 300, -1]
        
        # Mock delete
        self.mock_redis.delete.return_value = 1
        
        result = self.redis_manager.cleanup_expired()
        
        # Should only delete key1 (expired)
        assert result == 1
        self.mock_redis.delete.assert_called_once_with("key1")


class TestRedisCacheConvenienceFunctions:
    """Test convenience functions for Redis cache"""
    
    @patch('core.database.cache.redis_manager.cache_manager')
    def test_cache_set_function(self, mock_cache_manager):
        """Test cache_set convenience function"""
        from core.database.cache.redis_manager import cache_set
        
        mock_cache_manager.set.return_value = True
        
        result = cache_set("test_key", {"data": "value"}, ttl=300, prefix="test")
        
        assert result is True
        mock_cache_manager.set.assert_called_once_with(
            "test_key", {"data": "value"}, ttl=300, prefix="test"
        )
    
    @patch('core.database.cache.redis_manager.cache_manager')
    def test_cache_get_function(self, mock_cache_manager):
        """Test cache_get convenience function"""
        from core.database.cache.redis_manager import cache_get
        
        test_data = {"data": "value"}
        mock_cache_manager.get.return_value = test_data
        
        result = cache_get("test_key", prefix="test")
        
        assert result == test_data
        mock_cache_manager.get.assert_called_once_with("test_key", prefix="test")
    
    @patch('core.database.cache.redis_manager.cache_manager')
    def test_cache_delete_function(self, mock_cache_manager):
        """Test cache_delete convenience function"""
        from core.database.cache.redis_manager import cache_delete
        
        mock_cache_manager.delete.return_value = True
        
        result = cache_delete("test_key", prefix="test")
        
        assert result is True
        mock_cache_manager.delete.assert_called_once_with("test_key", prefix="test")
    
    @patch('core.database.cache.redis_manager.cache_manager')
    def test_cache_get_with_fallback_function(self, mock_cache_manager):
        """Test cache_get_with_fallback convenience function"""
        from core.database.cache.redis_manager import cache_get_with_fallback
        
        test_data = {"data": "value"}
        mock_cache_manager.get_with_fallback.return_value = test_data
        
        fallback_func = lambda: {"fallback": "data"}
        result = cache_get_with_fallback("test_key", fallback_func, ttl=300)
        
        assert result == test_data
        mock_cache_manager.get_with_fallback.assert_called_once_with(
            "test_key", fallback_func, ttl=300, prefix=None
        ) 