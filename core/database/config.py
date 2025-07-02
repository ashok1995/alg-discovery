"""
Distributed Database Configuration
Supports PostgreSQL, Redis, and MongoDB with intelligent market-hours caching
"""

import os
import asyncio
from datetime import datetime, time
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
import pytz
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
import redis
import motor.motor_asyncio
from pymongo import MongoClient
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DatabaseConfig:
    """Database configuration settings"""
    
    # PostgreSQL (Primary Database)
    postgres_host: str = os.getenv("POSTGRES_HOST", "localhost")
    postgres_port: int = int(os.getenv("POSTGRES_PORT", "5432"))
    postgres_user: str = os.getenv("POSTGRES_USER", "algodiscovery")
    postgres_password: str = os.getenv("POSTGRES_PASSWORD", "algodiscovery")
    postgres_db: str = os.getenv("POSTGRES_DB", "algodiscovery")
    
    # Redis (Cache Layer)
    redis_host: str = os.getenv("REDIS_HOST", "localhost")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    redis_db: int = int(os.getenv("REDIS_DB", "0"))
    redis_password: Optional[str] = os.getenv("REDIS_PASSWORD", None)
    
    # MongoDB (Fallback Storage)
    mongo_host: str = os.getenv("MONGO_HOST", "localhost")
    mongo_port: int = int(os.getenv("MONGO_PORT", "27017"))
    mongo_user: Optional[str] = os.getenv("MONGO_USER", None)
    mongo_password: Optional[str] = os.getenv("MONGO_PASSWORD", None)
    mongo_db: str = os.getenv("MONGO_DB", "algodiscovery_fallback")
    
    # Cache settings
    cache_ttl_default: int = int(os.getenv("CACHE_TTL_DEFAULT", "300"))  # 5 minutes
    cache_ttl_market_hours: int = int(os.getenv("CACHE_TTL_MARKET_HOURS", "30"))  # 30 seconds
    cache_ttl_after_hours: int = int(os.getenv("CACHE_TTL_AFTER_HOURS", "3600"))  # 1 hour


class MarketHours:
    """Market hours detection and cache management"""
    
    def __init__(self):
        self.ist_timezone = pytz.timezone('Asia/Kolkata')
        self.market_open = time(9, 15)  # 9:15 AM IST
        self.market_close = time(15, 30)  # 3:30 PM IST
        
    def is_market_open(self) -> bool:
        """Check if market is currently open"""
        now = datetime.now(self.ist_timezone)
        current_time = now.time()
        
        # Check if it's a weekday (Monday=0, Sunday=6)
        is_weekday = now.weekday() < 5
        
        # Check if current time is within market hours
        is_trading_hours = self.market_open <= current_time <= self.market_close
        
        return is_weekday and is_trading_hours
    
    def get_cache_ttl(self, config: DatabaseConfig) -> int:
        """Get appropriate cache TTL based on market hours"""
        if self.is_market_open():
            return config.cache_ttl_market_hours
        else:
            return config.cache_ttl_after_hours
    
    def time_until_market_open(self) -> int:
        """Get seconds until market opens"""
        now = datetime.now(self.ist_timezone)
        
        # If it's weekend, calculate time to next Monday
        if now.weekday() >= 5:  # Saturday or Sunday
            days_ahead = 7 - now.weekday()
            next_market_day = now.replace(
                hour=self.market_open.hour,
                minute=self.market_open.minute,
                second=0,
                microsecond=0
            ) + datetime.timedelta(days=days_ahead)
        else:
            # If market is closed today, check if it will open today or tomorrow
            market_open_today = now.replace(
                hour=self.market_open.hour,
                minute=self.market_open.minute,
                second=0,
                microsecond=0
            )
            
            if now.time() > self.market_close:
                # Market closed for today, next open is tomorrow
                next_market_day = market_open_today + datetime.timedelta(days=1)
            else:
                # Market will open today
                next_market_day = market_open_today
        
        return int((next_market_day - now).total_seconds())


class DatabaseManager:
    """Centralized database management for all database types"""
    
    def __init__(self, config: DatabaseConfig = None):
        self.config = config or DatabaseConfig()
        self.market_hours = MarketHours()
        
        # Database connections
        self._postgres_engine = None
        self._postgres_session = None
        self._redis_client = None
        self._mongo_client = None
        self._mongo_async_client = None
        
        # Base class for SQLAlchemy models
        self.Base = declarative_base()
        
    @property
    def postgres_url(self) -> str:
        """Get PostgreSQL connection URL"""
        return (f"postgresql://{self.config.postgres_user}:"
                f"{self.config.postgres_password}@"
                f"{self.config.postgres_host}:"
                f"{self.config.postgres_port}/"
                f"{self.config.postgres_db}")
    
    @property
    def mongo_url(self) -> str:
        """Get MongoDB connection URL"""
        if self.config.mongo_user and self.config.mongo_password:
            return (f"mongodb://{self.config.mongo_user}:"
                   f"{self.config.mongo_password}@"
                   f"{self.config.mongo_host}:"
                   f"{self.config.mongo_port}/"
                   f"{self.config.mongo_db}")
        else:
            return f"mongodb://{self.config.mongo_host}:{self.config.mongo_port}/"
    
    def get_postgres_engine(self):
        """Get or create PostgreSQL engine"""
        if self._postgres_engine is None:
            self._postgres_engine = create_engine(
                self.postgres_url,
                poolclass=QueuePool,
                pool_size=10,
                max_overflow=20,
                pool_timeout=30,
                pool_recycle=1800,
                echo=False  # Set to True for SQL query logging
            )
        return self._postgres_engine
    
    def get_postgres_session(self):
        """Get PostgreSQL session factory"""
        if self._postgres_session is None:
            engine = self.get_postgres_engine()
            self._postgres_session = sessionmaker(
                autocommit=False, 
                autoflush=False, 
                bind=engine
            )
        return self._postgres_session
    
    def get_redis_client(self) -> redis.Redis:
        """Get or create Redis client"""
        if self._redis_client is None:
            self._redis_client = redis.Redis(
                host=self.config.redis_host,
                port=self.config.redis_port,
                db=self.config.redis_db,
                password=self.config.redis_password,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
        return self._redis_client
    
    def get_mongo_client(self) -> MongoClient:
        """Get or create MongoDB client"""
        if self._mongo_client is None:
            self._mongo_client = MongoClient(
                self.mongo_url,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=5000
            )
        return self._mongo_client
    
    def get_mongo_async_client(self):
        """Get or create async MongoDB client"""
        if self._mongo_async_client is None:
            self._mongo_async_client = motor.motor_asyncio.AsyncIOMotorClient(
                self.mongo_url,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=5000
            )
        return self._mongo_async_client
    
    def health_check(self) -> Dict[str, bool]:
        """Check health of all database connections"""
        health = {}
        
        # PostgreSQL health check
        try:
            engine = self.get_postgres_engine()
            with engine.connect() as conn:
                conn.execute("SELECT 1")
            health['postgresql'] = True
        except Exception as e:
            logger.error(f"PostgreSQL health check failed: {e}")
            health['postgresql'] = False
        
        # Redis health check
        try:
            redis_client = self.get_redis_client()
            redis_client.ping()
            health['redis'] = True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            health['redis'] = False
        
        # MongoDB health check
        try:
            mongo_client = self.get_mongo_client()
            mongo_client.admin.command('ping')
            health['mongodb'] = True
        except Exception as e:
            logger.error(f"MongoDB health check failed: {e}")
            health['mongodb'] = False
        
        return health
    
    def close_connections(self):
        """Close all database connections"""
        if self._postgres_engine:
            self._postgres_engine.dispose()
        
        if self._redis_client:
            self._redis_client.close()
        
        if self._mongo_client:
            self._mongo_client.close()
        
        if self._mongo_async_client:
            self._mongo_async_client.close()


# Global database manager instance
db_manager = DatabaseManager()

# Dependency functions for FastAPI
def get_db():
    """Dependency for getting PostgreSQL database session"""
    SessionLocal = db_manager.get_postgres_session()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_db_async():
    """Async dependency for getting PostgreSQL database session"""
    SessionLocal = db_manager.get_postgres_session()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_redis():
    """Dependency for getting Redis client"""
    return db_manager.get_redis_client()

def get_mongo():
    """Dependency for getting MongoDB client"""
    return db_manager.get_mongo_client()

async def get_mongo_async():
    """Dependency for getting async MongoDB client"""
    return db_manager.get_mongo_async_client() 