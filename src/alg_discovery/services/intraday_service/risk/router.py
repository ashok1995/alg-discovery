"""
Router for risk management parameters.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

from ...config_utils import load_intraday_config
from utils.api_logger import APILogger

logger = APILogger(__name__, service="intraday")
router = APIRouter()

@router.get("/{action}")
async def get_risk_parameters(
    action: str,
    risk_level: Optional[str] = None
):
    """Get risk management parameters for intraday trading."""
    try:
        if action.lower() not in ["buy", "sell"]:
            raise HTTPException(status_code=400, detail="Action must be 'buy' or 'sell'")
            
        config = load_intraday_config(is_buy=(action.lower() == "buy"))
        risk_params = config.get("risk_management", {})
        
        if not risk_params:
            raise HTTPException(status_code=404, detail="Risk parameters not found")
            
        # Get risk level from settings if not provided
        if not risk_level:
            settings = config.get("intraday_settings", {})
            risk_level = settings.get("risk_level", "moderate")
            
        # Get parameters for specific risk level
        level_params = risk_params.get(risk_level, {})
        if not level_params:
            raise HTTPException(status_code=404, detail=f"Parameters for risk level '{risk_level}' not found")
            
        return {
            "risk_level": risk_level,
            "parameters": {
                "position_size": level_params.get("position_size", 0.1),
                "stop_loss": level_params.get("stop_loss", 0.5),
                "trailing_stop": level_params.get("trailing_stop"),
                "take_profit": level_params.get("take_profit", 1.0),
                "max_holding_time": level_params.get("max_holding_time", 60)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting risk parameters for {action}: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 