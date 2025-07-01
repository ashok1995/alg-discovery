from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
from datetime import datetime, timedelta

# Import local modules
from .database import get_db, engine
from .models import Base, PriceData, FundamentalData
from .schemas import PriceDataCreate, PriceDataResponse, FundamentalDataResponse
from .services.market_data_service import MarketDataService
from .core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="AlgoDiscovery Market Data Service",
    description="Service for managing market data including price and fundamental data",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
market_data_service = MarketDataService()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "healthy", "service": "market_data", "timestamp": datetime.utcnow()}

@app.get("/api/v1/market/price/{symbol}")
async def get_price_data(
    symbol: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
) -> List[PriceDataResponse]:
    """Get price data for a symbol"""
    try:
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
            
        data = await market_data_service.get_price_data(
            db=db,
            symbol=symbol,
            start_date=start_date,
            end_date=end_date
        )
        return data
    except Exception as e:
        logger.error(f"Error fetching price data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/market/fundamental/{symbol}")
async def get_fundamental_data(
    symbol: str,
    db: Session = Depends(get_db)
) -> FundamentalDataResponse:
    """Get fundamental data for a symbol"""
    try:
        data = await market_data_service.get_fundamental_data(
            db=db,
            symbol=symbol
        )
        return data
    except Exception as e:
        logger.error(f"Error fetching fundamental data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/market/price/update")
async def update_price_data(
    data: List[PriceDataCreate],
    db: Session = Depends(get_db)
):
    """Update price data for multiple symbols"""
    try:
        await market_data_service.update_price_data(db=db, data=data)
        return {"status": "success", "message": f"Updated {len(data)} price records"}
    except Exception as e:
        logger.error(f"Error updating price data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 