#!/usr/bin/env python3
"""
Recommendation Database Models
=============================

Database models for caching trading recommendations from all servers.
Supports MongoDB/SQLite with automatic market timing and refresh logic.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
from dataclasses import dataclass, asdict
from pathlib import Path

import motor.motor_asyncio
from pymongo import MongoClient
from bson import ObjectId

logger = logging.getLogger(__name__)

class RecommendationType(Enum):
    """Types of trading recommendations."""
    SWING = "swing"
    SHORT_TERM = "shortterm"
    LONG_TERM = "longterm"

class MarketStatus(Enum):
    """Market status enumeration."""
    OPEN = "open"
    CLOSED = "closed"
    PRE_MARKET = "pre_market"
    POST_MARKET = "post_market"

@dataclass
class RecommendationRequest:
    """Standard request format for all recommendation types."""
    combination: Optional[Dict[str, str]] = None
    limit_per_query: Optional[int] = 50
    min_score: Optional[float] = 25.0
    top_recommendations: Optional[int] = 20
    refresh: Optional[bool] = False

@dataclass
class RecommendationMetadata:
    """Metadata for cached recommendations."""
    combination_used: Dict[str, str]
    performance_metrics: Dict[str, Any]
    category_breakdown: Dict[str, Any]
    total_recommendations: int
    processing_time_seconds: float
    algorithm_info: Dict[str, Any]
    timestamp: str
    market_status: str
    data_source: str = "ChartInk"

@dataclass
class StockRecommendation:
    """Individual stock recommendation."""
    symbol: str
    name: str
    price: float
    score: float
    per_change: float
    volume: int
    recommendation_type: str
    appearances: int
    category_count: int
    categories: List[str]
    # Type-specific boolean flags
    momentum: bool = False
    breakout: bool = False
    reversal: bool = False
    sector_rotation: bool = False
    fundamental: bool = False
    value: bool = False
    quality: bool = False

@dataclass
class CachedRecommendation:
    """Complete cached recommendation data."""
    recommendation_type: RecommendationType
    request_hash: str
    recommendations: List[StockRecommendation]
    metadata: RecommendationMetadata
    created_at: datetime
    expires_at: datetime
    market_session: str
    is_fresh: bool = True

class RecommendationCache:
    """Database cache manager for trading recommendations."""
    
    def __init__(self, use_mongodb: bool = True, mongodb_url: str = "mongodb://localhost:27017", db_name: str = "trading_cache"):
        self.use_mongodb = use_mongodb
        self.db_name = db_name
        
        if use_mongodb:
            self.client = motor.motor_asyncio.AsyncIOMotorClient(mongodb_url)
            self.db = self.client[db_name]
            self.collection = self.db.recommendations
        else:
            # Fallback to simple file-based cache
            self.cache_dir = Path("api/cache")
            self.cache_dir.mkdir(exist_ok=True)
    
    async def initialize(self):
        """Initialize the cache system"""
        try:
            if self.use_mongodb:
                # Test MongoDB connection
                await self.client.admin.command('ping')
                self.db = self.client[self.db_name]
                self.collection = self.db.recommendations
                logger.info("✅ MongoDB cache initialized")
            else:
                # Ensure cache directory exists for file-based cache
                if not hasattr(self, 'cache_dir'):
                    self.cache_dir = Path("api/cache")
                self.cache_dir.mkdir(parents=True, exist_ok=True)
                logger.info("✅ File-based cache initialized")
                
        except Exception as e:
            logger.warning(f"⚠️ MongoDB initialization failed, using file cache: {e}")
            self.use_mongodb = False
            if not hasattr(self, 'cache_dir'):
                self.cache_dir = Path("api/cache")
            self.cache_dir.mkdir(parents=True, exist_ok=True)

    async def close(self):
        """Close cache connections"""
        try:
            if self.use_mongodb and self.client:
                self.client.close()
                logger.info("✅ MongoDB connection closed")
        except Exception as e:
            logger.warning(f"⚠️ Error closing cache: {e}")

    def _generate_request_hash(self, req_type: RecommendationType, request: RecommendationRequest) -> str:
        """Generate unique hash for request parameters."""
        import hashlib
        request_str = f"{req_type.value}_{request.combination}_{request.limit_per_query}_{request.min_score}_{request.top_recommendations}"
        return hashlib.md5(request_str.encode()).hexdigest()
    
    def _get_market_session(self) -> str:
        """Get current market session identifier."""
        now = datetime.now()
        # Indian market session: 9:15 AM to 3:30 PM IST
        return f"{now.strftime('%Y-%m-%d')}_session"
    
    def _calculate_expiry(self, req_type: RecommendationType) -> datetime:
        """Calculate expiry time based on recommendation type."""
        now = datetime.now()
        
        if req_type == RecommendationType.SWING:
            # Swing: 5 minutes
            return now + timedelta(minutes=5)
        elif req_type == RecommendationType.SHORT_TERM:
            # Short-term: 5 minutes
            return now + timedelta(minutes=5)
        else:  # LONG_TERM
            # Long-term: 30 minutes
            return now + timedelta(minutes=30)
    
    async def get_cached_recommendation(self, req_type: RecommendationType, request: RecommendationRequest) -> Optional[Dict]:
        """Get cached recommendation if valid and not expired."""
        try:
            if request.refresh:
                logger.info(f"🔄 Refresh requested for {req_type.value} - skipping cache")
                return None
            
            request_hash = self._generate_request_hash(req_type, request)
            current_session = self._get_market_session()
            
            if self.use_mongodb:
                doc = await self.collection.find_one({
                    "recommendation_type": req_type.value,
                    "request_hash": request_hash,
                    "market_session": current_session,
                    "expires_at": {"$gt": datetime.now()}
                })
                
                if doc:
                    logger.info(f"✅ Cache hit for {req_type.value} recommendations")
                    cached_rec = self._doc_to_cached_recommendation(doc)
                    return {
                        "status": "success",
                        "recommendations": [rec.__dict__ for rec in cached_rec.recommendations],
                        "metadata": cached_rec.metadata.__dict__,
                        "cached": True
                    }
            else:
                # File-based cache fallback
                cache_file = self.cache_dir / f"{req_type.value}_{request_hash}.json"
                if cache_file.exists():
                    with open(cache_file, 'r') as f:
                        data = json.load(f)
                    
                    expires_at = datetime.fromisoformat(data['expires_at'])
                    if expires_at > datetime.now() and data['market_session'] == current_session:
                        logger.info(f"✅ File cache hit for {req_type.value} recommendations")
                        cached_rec = self._dict_to_cached_recommendation(data)
                        return {
                            "status": "success", 
                            "recommendations": [rec.__dict__ for rec in cached_rec.recommendations],
                            "metadata": cached_rec.metadata.__dict__,
                            "cached": True
                        }
            
            logger.info(f"❌ Cache miss for {req_type.value} recommendations")
            return None
            
        except Exception as e:
            logger.error(f"Error getting cached recommendation: {e}")
            return None
    
    async def store_recommendation(self, req_type: RecommendationType, request: RecommendationRequest, 
                                 recommendations: List[Dict], metadata: Dict) -> bool:
        """Store recommendation in cache."""
        try:
            request_hash = self._generate_request_hash(req_type, request)
            current_session = self._get_market_session()
            expires_at = self._calculate_expiry(req_type)
            
            # Convert recommendations to StockRecommendation objects
            stock_recommendations = []
            for rec in recommendations:
                stock_rec = StockRecommendation(
                    symbol=rec.get('symbol', ''),
                    name=rec.get('name', ''),
                    price=float(rec.get('price', 0)),
                    score=float(rec.get('score', 0)),
                    per_change=float(rec.get('per_change', 0)),
                    volume=int(rec.get('volume', 0)),
                    recommendation_type=rec.get('recommendation_type', ''),
                    appearances=int(rec.get('appearances', 0)),
                    category_count=int(rec.get('category_count', 0)),
                    categories=rec.get('categories', []),
                    momentum=rec.get('momentum', False),
                    breakout=rec.get('breakout', False),
                    reversal=rec.get('reversal', False),
                    sector_rotation=rec.get('sector_rotation', False),
                    fundamental=rec.get('fundamental', False),
                    value=rec.get('value', False),
                    quality=rec.get('quality', False)
                )
                stock_recommendations.append(stock_rec)
            
            # Create metadata object
            rec_metadata = RecommendationMetadata(
                combination_used=metadata.get('combination_used', {}),
                performance_metrics=metadata.get('performance_metrics', {}),
                category_breakdown=metadata.get('category_breakdown', {}),
                total_recommendations=metadata.get('total_recommendations', 0),
                processing_time_seconds=metadata.get('processing_time_seconds', 0),
                algorithm_info=metadata.get('algorithm_info', {}),
                timestamp=metadata.get('timestamp', datetime.now().isoformat()),
                market_status=self._get_current_market_status().value
            )
            
            cached_rec = CachedRecommendation(
                recommendation_type=req_type,
                request_hash=request_hash,
                recommendations=stock_recommendations,
                metadata=rec_metadata,
                created_at=datetime.now(),
                expires_at=expires_at,
                market_session=current_session,
                is_fresh=True
            )
            
            if self.use_mongodb:
                # Store in MongoDB
                doc = self._cached_recommendation_to_doc(cached_rec)
                
                # Upsert (update if exists, insert if not)
                await self.collection.replace_one(
                    {
                        "recommendation_type": req_type.value,
                        "request_hash": request_hash,
                        "market_session": current_session
                    },
                    doc,
                    upsert=True
                )
                
                logger.info(f"✅ Stored {req_type.value} recommendations in MongoDB cache")
            else:
                # Store in file cache
                cache_file = self.cache_dir / f"{req_type.value}_{request_hash}.json"
                with open(cache_file, 'w') as f:
                    json.dump(self._cached_recommendation_to_dict(cached_rec), f, default=str)
                
                logger.info(f"✅ Stored {req_type.value} recommendations in file cache")
            
            return True
            
        except Exception as e:
            logger.error(f"Error storing recommendation: {e}")
            return False
    
    async def cleanup_expired_cache(self):
        """Remove expired cache entries."""
        try:
            if self.use_mongodb:
                result = await self.collection.delete_many({
                    "expires_at": {"$lt": datetime.now()}
                })
                logger.info(f"🧹 Cleaned up {result.deleted_count} expired cache entries")
            else:
                # Clean up file cache
                cleaned = 0
                for cache_file in self.cache_dir.glob("*.json"):
                    try:
                        with open(cache_file, 'r') as f:
                            data = json.load(f)
                        expires_at = datetime.fromisoformat(data['expires_at'])
                        if expires_at < datetime.now():
                            cache_file.unlink()
                            cleaned += 1
                    except Exception:
                        continue
                logger.info(f"🧹 Cleaned up {cleaned} expired file cache entries")
                
        except Exception as e:
            logger.error(f"Error cleaning up cache: {e}")
    
    def _get_current_market_status(self) -> MarketStatus:
        """Get current Indian market status."""
        now = datetime.now()
        hour = now.hour
        minute = now.minute
        weekday = now.weekday()  # 0=Monday, 6=Sunday
        
        # Weekend
        if weekday >= 5:  # Saturday, Sunday
            return MarketStatus.CLOSED
        
        # Market timings (IST): 9:15 AM to 3:30 PM
        market_open_time = 9 * 60 + 15  # 9:15 AM in minutes
        market_close_time = 15 * 60 + 30  # 3:30 PM in minutes
        current_time = hour * 60 + minute
        
        if current_time < market_open_time:
            return MarketStatus.PRE_MARKET
        elif current_time > market_close_time:
            return MarketStatus.POST_MARKET
        else:
            return MarketStatus.OPEN
    
    def _doc_to_cached_recommendation(self, doc: Dict) -> CachedRecommendation:
        """Convert MongoDB document to CachedRecommendation."""
        recommendations = []
        for rec_data in doc.get('recommendations', []):
            rec = StockRecommendation(**rec_data)
            recommendations.append(rec)
        
        metadata_data = doc.get('metadata', {})
        metadata = RecommendationMetadata(**metadata_data)
        
        return CachedRecommendation(
            recommendation_type=RecommendationType(doc['recommendation_type']),
            request_hash=doc['request_hash'],
            recommendations=recommendations,
            metadata=metadata,
            created_at=doc['created_at'],
            expires_at=doc['expires_at'],
            market_session=doc['market_session'],
            is_fresh=doc.get('is_fresh', True)
        )
    
    def _dict_to_cached_recommendation(self, data: Dict) -> CachedRecommendation:
        """Convert dictionary to CachedRecommendation."""
        recommendations = []
        for rec_data in data.get('recommendations', []):
            rec = StockRecommendation(**rec_data)
            recommendations.append(rec)
        
        metadata = RecommendationMetadata(**data.get('metadata', {}))
        
        return CachedRecommendation(
            recommendation_type=RecommendationType(data['recommendation_type']),
            request_hash=data['request_hash'],
            recommendations=recommendations,
            metadata=metadata,
            created_at=datetime.fromisoformat(data['created_at']),
            expires_at=datetime.fromisoformat(data['expires_at']),
            market_session=data['market_session'],
            is_fresh=data.get('is_fresh', True)
        )
    
    def _cached_recommendation_to_doc(self, cached_rec: CachedRecommendation) -> Dict:
        """Convert CachedRecommendation to MongoDB document."""
        return {
            "recommendation_type": cached_rec.recommendation_type.value,
            "request_hash": cached_rec.request_hash,
            "recommendations": [asdict(rec) for rec in cached_rec.recommendations],
            "metadata": asdict(cached_rec.metadata),
            "created_at": cached_rec.created_at,
            "expires_at": cached_rec.expires_at,
            "market_session": cached_rec.market_session,
            "is_fresh": cached_rec.is_fresh
        }
    
    def _cached_recommendation_to_dict(self, cached_rec: CachedRecommendation) -> Dict:
        """Convert CachedRecommendation to dictionary for file storage."""
        return {
            "recommendation_type": cached_rec.recommendation_type.value,
            "request_hash": cached_rec.request_hash,
            "recommendations": [asdict(rec) for rec in cached_rec.recommendations],
            "metadata": asdict(cached_rec.metadata),
            "created_at": cached_rec.created_at.isoformat(),
            "expires_at": cached_rec.expires_at.isoformat(),
            "market_session": cached_rec.market_session,
            "is_fresh": cached_rec.is_fresh
        }

    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics and status."""
        try:
            if self.use_mongodb:
                # MongoDB stats
                total_count = await self.collection.count_documents({})
                expired_count = await self.collection.count_documents({
                    "expires_at": {"$lt": datetime.now()}
                })
                
                return {
                    "connected": True,
                    "type": "mongodb",
                    "total_count": total_count,
                    "expired_count": expired_count,
                    "active_count": total_count - expired_count
                }
            else:
                # File cache stats
                if not hasattr(self, 'cache_dir'):
                    self.cache_dir = Path("api/cache")
                    
                cache_files = list(self.cache_dir.glob("*.json")) if self.cache_dir.exists() else []
                expired_count = 0
                
                for cache_file in cache_files:
                    try:
                        with open(cache_file, 'r') as f:
                            data = json.load(f)
                        expires_at = datetime.fromisoformat(data['expires_at'])
                        if expires_at < datetime.now():
                            expired_count += 1
                    except Exception:
                        continue
                
                return {
                    "connected": True,
                    "type": "file_cache",
                    "total_count": len(cache_files),
                    "expired_count": expired_count,
                    "active_count": len(cache_files) - expired_count,
                    "cache_dir": str(self.cache_dir)
                }
                
        except Exception as e:
            return {
                "connected": False,
                "error": str(e),
                "type": "unknown"
            }

# Global cache instance
recommendation_cache = RecommendationCache() 