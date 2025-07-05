#!/usr/bin/env python
"""scripts/init_db.py

Creates all tables defined in SQLAlchemy models across the project.  Run once
when setting up a new environment.

Usage::

    python scripts/init_db.py
"""
from common.db import Base, get_sync_engine

engine = get_sync_engine()
print("Creating database schema …")
Base.metadata.create_all(engine)
print("✅ Done.") 