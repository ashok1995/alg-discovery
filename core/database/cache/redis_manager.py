"""
Intelligent Redis Cache Manager
Market-hours aware caching with fallback mechanisms
"""

import json
import pickle
import hashlib
from datetime import datetime, timedelta
from typing import Any, Optional, Union, Dict, List
import redis
from common.db import db_manager, DatabaseConfig
import logging

logger = logging.getLogger(__name__)

class RedisManager:
    """Enhanced Redis cache manager with market intelligence"""
    
    def __init__(self, redis_client: redis.Redis = None):
        self.redis_client = redis_client or db_manager.get_redis_client()
        self.market_hours = db_manager.market_hours
        self.config = db_manager.config
        
    def _generate_key(self, prefix: str, identifier: str) -> str:
        """Generate consistent cache key"""
        key = f"{prefix}:{identifier}"
        # Hash long keys to prevent Redis key length issues
        if len(key) > 200:
            key = f"{prefix}:{hashlib.md5(identifier.encode()).hexdigest()}"
        return key
    
    def _serialize_data(self, data: Any) -> bytes:
        """Serialize data for Redis storage"""
        try:
            # Try JSON first (faster and more readable)
            return json.dumps(data, default=str).encode('utf-8')
        except (TypeError, ValueError):
            # Fallback to pickle for complex objects
            return pickle.dumps(data)
    
    def _deserialize_data(self, data: bytes) -> Any:
        """Deserialize data from Redis"""
        try:
            # Try JSON first
            return json.loads(data.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            # Fallback to pickle
            return pickle.loads(data)
    
    def get_market_aware_ttl(self, base_ttl: Optional[int] = None) -> int:
        """Get TTL based on market hours"""
        if base_ttl:
            return base_ttl
        return self.market_hours.get_cache_ttl(self.config)
    
    def set(self, 
            key: str, 
            value: Any, 
            ttl: Optional[int] = None,
            prefix: str = "cache") -> bool:
        """Set cache value with market-aware TTL"""
        try:
            cache_key = self._generate_key(prefix, key)
            serialized_data = self._serialize_data(value)
            ttl = self.get_market_aware_ttl(ttl)
            
            # Add metadata
            metadata = {
                'data': serialized_data,
                'timestamp': datetime.utcnow().isoformat(),
                'market_open': self.market_hours.is_market_open(),
                'ttl': ttl
            }
            
            result = self.redis_client.setex(
                cache_key, 
                ttl, 
                self._serialize_data(metadata)
            )
            
            logger.debug(f"Cache SET: {cache_key} (TTL: {ttl}s)")
            return result
            
        except Exception as e:
            logger.error(f"Redis SET error for key {key}: {e}")
            return False
    
    def get(self, key: str, prefix: str = "cache") -> Optional[Any]:
        """Get cache value with metadata"""
        try:
            cache_key = self._generate_key(prefix, key)
            cached_data = self.redis_client.get(cache_key)
            
            if cached_data is None:
                logger.debug(f"Cache MISS: {cache_key}")
                return None
            
            metadata = self._deserialize_data(cached_data)
            
            # Check if it's old format (backward compatibility)
            if not isinstance(metadata, dict) or 'data' not in metadata:
                logger.debug(f"Cache HIT (legacy): {cache_key}")
                return metadata
            
            # Extract actual data
            data = self._deserialize_data(metadata['data'])
            logger.debug(f"Cache HIT: {cache_key}")
            return data
            
        except Exception as e:
            logger.error(f"Redis GET error for key {key}: {e}")
            return None
    
    def delete(self, key: str, prefix: str = "cache") -> bool:
        """Delete cache entry"""
        try:
            cache_key = self._generate_key(prefix, key)
            result = self.redis_client.delete(cache_key)
            logger.debug(f"Cache DELETE: {cache_key}")
            return bool(result)
        except Exception as e:
            logger.error(f"Redis DELETE error for key {key}: {e}")
            return False
    
    def exists(self, key: str, prefix: str = "cache") -> bool:
        """Check if key exists in cache"""
        try:
            cache_key = self._generate_key(prefix, key)
            return bool(self.redis_client.exists(cache_key))
        except Exception as e:
            logger.error(f"Redis EXISTS error for key {key}: {e}")
            return False
    
    def get_with_fallback(self, 
                         key: str, 
                         fallback_func,
                         ttl: Optional[int] = None,
                         prefix: str = "cache",
                         force_refresh: bool = False) -> Any:
        """Get from cache or execute fallback function"""
        
        if not force_refresh:
            cached_value = self.get(key, prefix)
            if cached_value is not None:
                return cached_value
        
        try:
            # Execute fallback function
            fresh_data = fallback_func()
            
            # Cache the result
            self.set(key, fresh_data, ttl, prefix)
            
            logger.debug(f"Cache populated from fallback: {key}")
            return fresh_data
            
        except Exception as e:
            logger.error(f"Fallback function error for key {key}: {e}")
            # Try to return stale cache if available
            return self.get(key, prefix)
    
    def bulk_set(self, 
                 data_dict: Dict[str, Any], 
                 ttl: Optional[int] = None,
                 prefix: str = "cache") -> Dict[str, bool]:
        """Set multiple cache entries"""
        results = {}
        pipe = self.redis_client.pipeline()
        
        ttl = self.get_market_aware_ttl(ttl)
        
        try:
            for key, value in data_dict.items():
                cache_key = self._generate_key(prefix, key)
                serialized_data = self._serialize_data(value)
                
                metadata = {
                    'data': serialized_data,
                    'timestamp': datetime.utcnow().isoformat(),
                    'market_open': self.market_hours.is_market_open(),
                    'ttl': ttl
                }
                
                pipe.setex(cache_key, ttl, self._serialize_data(metadata))
                results[key] = True
            
            pipe.execute()
            logger.debug(f"Bulk cache SET: {len(data_dict)} keys")
            
        except Exception as e:
            logger.error(f"Redis bulk SET error: {e}")
            for key in data_dict.keys():
                results[key] = False
        
        return results
    
    def bulk_get(self, 
                 keys: List[str], 
                 prefix: str = "cache") -> Dict[str, Any]:
        """Get multiple cache entries"""
        results = {}
        
        try:
            cache_keys = [self._generate_key(prefix, key) for key in keys]
            cached_values = self.redis_client.mget(cache_keys)
            
            for i, (key, cached_data) in enumerate(zip(keys, cached_values)):
                if cached_data is not None:
                    try:
                        metadata = self._deserialize_data(cached_data)
                        
                        # Handle legacy format
                        if isinstance(metadata, dict) and 'data' in metadata:
                            results[key] = self._deserialize_data(metadata['data'])
                        else:
                            results[key] = metadata
                            
                    except Exception as e:
                        logger.error(f"Error deserializing cache key {key}: {e}")
                        results[key] = None
                else:
                    results[key] = None
            
            logger.debug(f"Bulk cache GET: {len(keys)} keys")
            
        except Exception as e:
            logger.error(f"Redis bulk GET error: {e}")
            for key in keys:
                results[key] = None
        
        return results
    
    def invalidate_pattern(self, pattern: str, prefix: str = "cache") -> int:
        """Invalidate all keys matching a pattern"""
        try:
            pattern_key = self._generate_key(prefix, pattern)
            keys = self.redis_client.keys(pattern_key)
            
            if keys:
                deleted = self.redis_client.delete(*keys)
                logger.info(f"Invalidated {deleted} keys matching pattern: {pattern}")
                return deleted
            
            return 0
            
        except Exception as e:
            logger.error(f"Redis pattern invalidation error: {e}")
            return 0
    
    def warm_cache(self, warming_functions: Dict[str, callable]) -> Dict[str, bool]:
        """Warm cache with predefined functions"""
        results = {}
        
        logger.info("Starting cache warming process...")
        
        for key, func in warming_functions.items():
            try:
                logger.debug(f"Warming cache for: {key}")
                data = func()
                results[key] = self.set(key, data)
            except Exception as e:
                logger.error(f"Cache warming failed for {key}: {e}")
                results[key] = False
        
        successful = sum(results.values())
        logger.info(f"Cache warming completed: {successful}/{len(warming_functions)} successful")
        
        return results
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            info = self.redis_client.info()
            
            stats = {
                'redis_version': info.get('redis_version', 'unknown'),
                'used_memory': info.get('used_memory_human', 'unknown'),
                'connected_clients': info.get('connected_clients', 0),
                'total_commands_processed': info.get('total_commands_processed', 0),
                'instantaneous_ops_per_sec': info.get('instantaneous_ops_per_sec', 0),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'market_open': self.market_hours.is_market_open(),
                'current_ttl': self.get_market_aware_ttl(),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Calculate hit ratio
            hits = stats['keyspace_hits']
            misses = stats['keyspace_misses']
            if hits + misses > 0:
                stats['hit_ratio'] = hits / (hits + misses)
            else:
                stats['hit_ratio'] = 0.0
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {'error': str(e)}
    
    def cleanup_expired(self) -> int:
        """Clean up expired keys (useful for debugging)"""
        try:
            # This is mainly for monitoring - Redis handles expiration automatically
            info = self.redis_client.info()
            return info.get('expired_keys', 0)
        except Exception as e:
            logger.error(f"Error getting expired keys count: {e}")
            return 0


# Global cache manager instance
cache_manager = RedisManager()

# Convenience functions
def cache_set(key: str, value: Any, ttl: Optional[int] = None, prefix: str = "cache") -> bool:
    """Convenience function for setting cache"""
    return cache_manager.set(key, value, ttl, prefix)

def cache_get(key: str, prefix: str = "cache") -> Optional[Any]:
    """Convenience function for getting cache"""
    return cache_manager.get(key, prefix)

def cache_delete(key: str, prefix: str = "cache") -> bool:
    """Convenience function for deleting cache"""
    return cache_manager.delete(key, prefix)

def cache_get_with_fallback(key: str, 
                           fallback_func,
                           ttl: Optional[int] = None,
                           prefix: str = "cache",
                           force_refresh: bool = False) -> Any:
    """Convenience function for cache with fallback"""
    return cache_manager.get_with_fallback(key, fallback_func, ttl, prefix, force_refresh) 