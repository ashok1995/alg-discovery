# Reuse shared DB utilities
from common.db import Base, get_sync_engine, get_sync_session_factory

import os
from dotenv import load_dotenv

# sqlalchemy imports retained for typing only
from sqlalchemy.orm import Session  # noqa: F401

# Load environment variables
load_dotenv()

# Database configuration
POSTGRES_USER = os.getenv("POSTGRES_USER", "algodiscovery")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "algodiscovery")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "algodiscovery")

# Create database URL
SQLALCHEMY_DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# Use shared sync engine & session factory
engine = get_sync_engine()
SessionLocal = get_sync_session_factory()

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_db_async():
    """Async dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 