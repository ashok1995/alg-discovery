"""
Router for intraday trading settings.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict

from ...config_utils import load_intraday_config
from utils.api_logger import APILogger

logger = APILogger(__name__, service="intraday")
router = APIRouter()

@router.get("/{action}")
async def get_intraday_settings(action: str):
    """Get intraday trading settings for buy or sell."""
    try:
        if action.lower() not in ["buy", "sell"]:
            raise HTTPException(status_code=400, detail="Action must be 'buy' or 'sell'")
            
        config = load_intraday_config(is_buy=(action.lower() == "buy"))
        settings = config.get("intraday_settings", {})
        
        if not settings:
            raise HTTPException(status_code=404, detail="Intraday settings not found")
            
        return {
            "settings": {
                "max_trades_per_day": settings.get("max_trades_per_day", 5),
                "min_profit_target": settings.get("min_profit_target", 0.5),
                "max_loss_per_trade": settings.get("max_loss_per_trade", 0.3),
                "trading_start_time": settings.get("trading_start_time", "09:15"),
                "trading_end_time": settings.get("trading_end_time", "15:15"),
                "cooldown_period": settings.get("cooldown_period", 15),
                "risk_level": settings.get("risk_level", "moderate")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting intraday settings for {action}: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 