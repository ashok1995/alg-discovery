"""
Router for market conditions and trading restrictions.
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime

from ...config_utils import load_intraday_config
from utils.api_logger import APILogger

logger = APILogger(__name__, service="intraday")
router = APIRouter()

@router.get("/conditions")
async def get_market_conditions():
    """Get current market conditions and trading restrictions."""
    try:
        # Load both buy and sell configs to check conditions
        buy_config = load_intraday_config(is_buy=True)
        sell_config = load_intraday_config(is_buy=False)
        
        buy_conditions = buy_config.get("market_conditions", {})
        sell_conditions = sell_config.get("market_conditions", {})
        
        return {
            "market_status": {
                "volatility": buy_conditions.get("volatility", "normal"),
                "trend": buy_conditions.get("trend", "neutral"),
                "volume": buy_conditions.get("volume", "normal")
            },
            "trading_restrictions": {
                "buy": {
                    "allowed": buy_conditions.get("trading_allowed", True),
                    "restrictions": buy_conditions.get("restrictions", [])
                },
                "sell": {
                    "allowed": sell_conditions.get("trading_allowed", True),
                    "restrictions": sell_conditions.get("restrictions", [])
                }
            },
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting market conditions: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 