"""
Validation router for algorithm combinations.
"""

from fastapi import APIRouter, HTTPException
from typing import Union

from ...models import PageType, SelectedCombination, IntradaySelectedCombination
from ...config_utils import load_config, load_intraday_config
from utils.api_logger import APILogger

logger = APILogger(__name__, service="validation")
router = APIRouter()

@router.post("/{page_type}")
async def validate_combination(
    page_type: PageType,
    combination: Union[SelectedCombination, IntradaySelectedCombination]
):
    """Validate a selected combination of algorithm variants."""
    try:
        if page_type in [PageType.INTRADAY_BUY, PageType.INTRADAY_SELL]:
            config = load_intraday_config(is_buy=(page_type == PageType.INTRADAY_BUY))
            variants = config["sub_algorithm_variants"]
            
            variant_mapping = {
                "momentum": "momentum_buy" if page_type == PageType.INTRADAY_BUY else "momentum_sell",
                "reversal": "reversal_buy" if page_type == PageType.INTRADAY_BUY else "reversal_sell",
                "technical": "technical_buy" if page_type == PageType.INTRADAY_BUY else "technical_sell",
                "volume": "volume_buy" if page_type == PageType.INTRADAY_BUY else "volume_sell"
            }
            
            errors = []
            for category, variant_name in variant_mapping.items():
                selected = getattr(combination, category)
                if selected not in variants[variant_name]:
                    errors.append(f"Invalid {category} variant: {selected}")
            
            if errors:
                raise HTTPException(status_code=400, detail={"errors": errors})
            
            weights = {
                "momentum": config.get("scoring_criteria", {}).get("momentum_weight", 0.25),
                "reversal": config.get("scoring_criteria", {}).get("reversal_weight", 0.25),
                "technical": config.get("scoring_criteria", {}).get("technical_weight", 0.25),
                "volume": config.get("scoring_criteria", {}).get("volume_weight", 0.25)
            }
            
            expected_results = {}
            for category, variant_name in variant_mapping.items():
                selected = getattr(combination, category)
                variant_data = variants[variant_name][selected]
                expected_results[category] = int(variant_data.get("expected_results", 20) * variant_data["weight"])
            
            return {
                "valid": True,
                "expected_metrics": {
                    "total_expected_results": sum(expected_results.values()) // 4,
                    "category_results": expected_results
                },
                "weights": weights,
                "page_specific_adjustments": bool(config.get("intraday_settings", {}))
            }
        
        config = load_config()
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
            
        variants = config["sub_algorithm_variants"]
        
        errors = []
        if combination.fundamental not in variants["fundamental"]:
            errors.append(f"Invalid fundamental variant: {combination.fundamental}")
        if combination.momentum not in variants["momentum"]:
            errors.append(f"Invalid momentum variant: {combination.momentum}")
        if combination.value not in variants["value"]:
            errors.append(f"Invalid value variant: {combination.value}")
        if combination.quality not in variants["quality"]:
            errors.append(f"Invalid quality variant: {combination.quality}")
            
        if errors:
            raise HTTPException(status_code=400, detail={"errors": errors})
            
        expected_results = {
            "fundamental": variants["fundamental"][combination.fundamental]["expected_results"],
            "momentum": variants["momentum"][combination.momentum]["expected_results"],
            "value": variants["value"][combination.value]["expected_results"],
            "quality": variants["quality"][combination.quality]["expected_results"]
        }
        
        weights = config.get("category_weights", {
            "fundamental": variants["fundamental"][combination.fundamental]["weight"],
            "momentum": variants["momentum"][combination.momentum]["weight"],
            "value": variants["value"][combination.value]["weight"],
            "quality": variants["quality"][combination.quality]["weight"]
        })
        
        return {
            "valid": True,
            "expected_metrics": {
                "total_expected_results": sum(expected_results.values()) // 4,
                "category_results": expected_results
            },
            "weights": weights,
            "page_specific_adjustments": bool(config.get("page_adjustments", {}))
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating combination for {page_type}: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 