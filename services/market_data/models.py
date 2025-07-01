from sqlalchemy import Column, String, DateTime, Numeric, Integer, BigInteger, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from .database import Base

class PriceData(Base):
    """Model for storing price data"""
    __tablename__ = "price_data"
    __table_args__ = {"schema": "market_data"}

    symbol = Column(String(10), primary_key=True)
    timestamp = Column(DateTime, primary_key=True)
    open = Column(Numeric(10, 2), nullable=False)
    high = Column(Numeric(10, 2), nullable=False)
    low = Column(Numeric(10, 2), nullable=False)
    close = Column(Numeric(10, 2), nullable=False)
    volume = Column(BigInteger, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<PriceData(symbol='{self.symbol}', timestamp='{self.timestamp}')>"

class FundamentalData(Base):
    """Model for storing fundamental data"""
    __tablename__ = "fundamental_data"
    __table_args__ = {"schema": "market_data"}

    symbol = Column(String(10), primary_key=True)
    date = Column(DateTime, primary_key=True)
    pe_ratio = Column(Numeric(10, 2))
    pb_ratio = Column(Numeric(10, 2))
    roe = Column(Numeric(10, 2))
    debt_to_equity = Column(Numeric(10, 2))
    market_cap = Column(Numeric(20, 2))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<FundamentalData(symbol='{self.symbol}', date='{self.date}')>"

class MarketDataUpdateLog(Base):
    """Model for logging market data updates"""
    __tablename__ = "market_data_update_log"
    __table_args__ = {"schema": "market_data"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    update_type = Column(String(50), nullable=False)  # 'price' or 'fundamental'
    symbol = Column(String(10), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    status = Column(String(20), nullable=False)  # 'success' or 'error'
    error_message = Column(String(500))
    created_at = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<MarketDataUpdateLog(symbol='{self.symbol}', update_type='{self.update_type}')>" 