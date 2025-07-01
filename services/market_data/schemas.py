from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class PriceDataBase(BaseModel):
    """Base schema for price data"""
    symbol: str = Field(..., min_length=1, max_length=10)
    timestamp: datetime
    open: Decimal = Field(..., ge=0)
    high: Decimal = Field(..., ge=0)
    low: Decimal = Field(..., ge=0)
    close: Decimal = Field(..., ge=0)
    volume: int = Field(..., ge=0)

class PriceDataCreate(PriceDataBase):
    """Schema for creating price data"""
    pass

class PriceDataResponse(PriceDataBase):
    """Schema for price data response"""
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class FundamentalDataBase(BaseModel):
    """Base schema for fundamental data"""
    symbol: str = Field(..., min_length=1, max_length=10)
    date: datetime
    pe_ratio: Optional[Decimal] = Field(None, ge=0)
    pb_ratio: Optional[Decimal] = Field(None, ge=0)
    roe: Optional[Decimal]
    debt_to_equity: Optional[Decimal]
    market_cap: Optional[Decimal] = Field(None, ge=0)

class FundamentalDataCreate(FundamentalDataBase):
    """Schema for creating fundamental data"""
    pass

class FundamentalDataResponse(FundamentalDataBase):
    """Schema for fundamental data response"""
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class MarketDataUpdateLogBase(BaseModel):
    """Base schema for market data update log"""
    update_type: str = Field(..., regex='^(price|fundamental)$')
    symbol: str = Field(..., min_length=1, max_length=10)
    timestamp: datetime
    status: str = Field(..., regex='^(success|error)$')
    error_message: Optional[str] = None

class MarketDataUpdateLogCreate(MarketDataUpdateLogBase):
    """Schema for creating market data update log"""
    pass

class MarketDataUpdateLogResponse(MarketDataUpdateLogBase):
    """Schema for market data update log response"""
    id: str
    created_at: datetime

    class Config:
        orm_mode = True

class ErrorResponse(BaseModel):
    """Schema for error responses"""
    detail: str
    status_code: int
    timestamp: datetime = Field(default_factory=datetime.utcnow) 