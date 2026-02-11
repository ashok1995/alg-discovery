"""
Algorithm operations router.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

from ...models import PageType
from ...config_utils import load_config, load_intraday_config
from utils.api_logger import APILogger

logger = APILogger(__name__, service="algorithm")
router = APIRouter()

@router.get("/{page_type}")
async def get_algorithms(page_type: PageType):
    """Get all available algorithms for a specific page type."""
    try:
        if page_type in [PageType.INTRADAY_BUY, PageType.INTRADAY_SELL]:
            config = load_intraday_config(is_buy=(page_type == PageType.INTRADAY_BUY))
            algorithms = config.get("algorithms", {})
            
            result = []
            for alg_name, alg_data in algorithms.items():
                if (page_type == PageType.INTRADAY_BUY and "buy" in alg_name.lower()) or \
                   (page_type == PageType.INTRADAY_SELL and "sell" in alg_name.lower()):
                    result.append({
                        "name": alg_name,
                        "version": alg_data.get("version", "1.0.0"),
                        "description": alg_data.get("description", ""),
                        "status": alg_data.get("status", "active"),
                        "performance_metrics": alg_data.get("performance_metrics", {}),
                        "created_date": alg_data.get("created_date", ""),
                        "last_updated": alg_data.get("last_updated", "")
                    })
            
            return {
                "algorithms": result,
                "current_version": config.get("current_version", "1.0.0"),
                "current_algorithm": config.get("current_algorithm", "")
            }
        
        page_config_map = {
            PageType.LONG_TERM: "long_term_config.json",
            PageType.SWING: "swing_config.json",
            PageType.SHORT_TERM: "short_term_config.json",
            PageType.CUSTOM: "custom_config.json"
        }
        
        try:
            config = load_config(page_config_map[page_type])
        except Exception:
            config = load_config()
        
        algorithms = config.get("algorithms", {})
        result = []
        for alg_name, alg_data in algorithms.items():
            result.append({
                "name": alg_name,
                "version": alg_data.get("version", "1.0.0"),
                "description": alg_data.get("description", ""),
                "status": alg_data.get("status", "active"),
                "performance_metrics": alg_data.get("performance_metrics", {}),
                "created_date": alg_data.get("created_date", ""),
                "last_updated": alg_data.get("last_updated", "")
            })
        
        return {
            "algorithms": result,
            "current_version": config.get("current_version", "1.0.0"),
            "current_algorithm": config.get("current_algorithm", "")
        }
        
    except Exception as e:
        logger.error(f"Error getting algorithms for {page_type}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{page_type}/performance")
async def get_algorithm_performance(
    page_type: PageType,
    algorithm_name: Optional[str] = None,
    version: Optional[str] = None
):
    """Get performance metrics for algorithms."""
    try:
        if page_type in [PageType.INTRADAY_BUY, PageType.INTRADAY_SELL]:
            config = load_intraday_config(is_buy=(page_type == PageType.INTRADAY_BUY))
        else:
            page_config_map = {
                PageType.LONG_TERM: "long_term_config.json",
                PageType.SWING: "swing_config.json",
                PageType.SHORT_TERM: "short_term_config.json",
                PageType.CUSTOM: "custom_config.json"
            }
            try:
                config = load_config(page_config_map[page_type])
            except Exception:
                config = load_config()
        
        algorithms = config.get("algorithms", {})
        
        if algorithm_name and version:
            for alg_name, alg_data in algorithms.items():
                if alg_name == algorithm_name and alg_data.get("version") == version:
                    return {
                        "algorithm": alg_name,
                        "version": version,
                        "metrics": alg_data.get("performance_metrics", {})
                    }
            raise HTTPException(status_code=404, detail="Algorithm version not found")
        
        elif algorithm_name:
            versions = []
            for alg_name, alg_data in algorithms.items():
                if alg_name == algorithm_name:
                    versions.append({
                        "version": alg_data.get("version", "1.0.0"),
                        "metrics": alg_data.get("performance_metrics", {})
                    })
            if not versions:
                raise HTTPException(status_code=404, detail="Algorithm not found")
            return {
                "algorithm": algorithm_name,
                "versions": versions
            }
        
        else:
            summary = []
            for alg_name, alg_data in algorithms.items():
                summary.append({
                    "algorithm": alg_name,
                    "version": alg_data.get("version", "1.0.0"),
                    "metrics": alg_data.get("performance_metrics", {})
                })
            return {"algorithms": summary}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting algorithm performance for {page_type}: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 