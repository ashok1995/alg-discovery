#!/usr/bin/env python3
"""
Miscellaneous API Server
=======================

Dedicated FastAPI server for miscellaneous endpoints including:
- Algorithm variant selection
- Configuration management
- Default combinations
- Page-specific variant combinations
"""

import json
import os
from typing import Dict, List, Optional, Union
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from enum import Enum

# Add API logger
from utils.api_logger import APILogger
logger = APILogger(__name__, service="misc")

class AlgorithmVariant(BaseModel):
    """Model for algorithm variant details."""
    name: str
    description: str
    query: str
    weight: float
    expected_results: int

class PageType(str, Enum):
    """Supported page types for variant selection."""
    LONG_TERM = "long-term"
    SWING = "swing"
    SHORT_TERM = "short-term"
    INTRADAY_BUY = "intraday-buy"
    INTRADAY_SELL = "intraday-sell"
    CUSTOM = "custom"

class VariantResponse(BaseModel):
    """Response model for variant selection options."""
    fundamental: Dict[str, AlgorithmVariant]
    momentum: Dict[str, AlgorithmVariant]
    value: Dict[str, AlgorithmVariant]
    quality: Dict[str, AlgorithmVariant]
    default_combination: Dict[str, str]
    page_specific_weights: Optional[Dict[str, float]] = None

class SelectedCombination(BaseModel):
    """Model for selected algorithm combination."""
    fundamental: str
    momentum: str
    value: str
    quality: str
    page_type: Optional[PageType] = None

class IntradayVariantResponse(BaseModel):
    """Response model for intraday variant selection options."""
    momentum: Dict[str, AlgorithmVariant]
    reversal: Dict[str, AlgorithmVariant]
    technical: Dict[str, AlgorithmVariant]
    volume: Dict[str, AlgorithmVariant]
    default_combination: Optional[Dict[str, str]] = None
    page_specific_weights: Optional[Dict[str, float]] = None

class IntradaySelectedCombination(BaseModel):
    """Model for selected intraday algorithm combination."""
    momentum: str
    reversal: str
    technical: str
    volume: str

def load_config(config_name: str = "long_term_config.json") -> dict:
    """Load a configuration file."""
    config_path = os.path.join(os.path.dirname(__file__), 'config', config_name)
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load config {config_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load {config_name} configuration")

def load_intraday_config(is_buy: bool = True) -> dict:
    """Load intraday configuration file."""
    config_name = "intraday_buy_config.json" if is_buy else "intraday_sell_config.json"
    config_path = os.path.join(os.path.dirname(__file__), '..', 'shared', 'config', config_name)
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load {config_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load {config_name} configuration")

# Create FastAPI app
app = FastAPI(
    title="Algorithm Discovery Miscellaneous API",
    description="API for algorithm variant selection and configuration management",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "misc-api",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/misc/variants/{page_type}", response_model=Union[VariantResponse, IntradayVariantResponse])
async def get_algorithm_variants(page_type: PageType):
    """
    Get all available algorithm variants and default combination for a specific page type.
    
    Args:
        page_type: Type of page requesting variants
    
    Returns:
        - All variants for each category
        - Default combination for the page type
        - Page-specific weights
    """
    try:
        # Handle intraday buy/sell separately
        if page_type in [PageType.INTRADAY_BUY, PageType.INTRADAY_SELL]:
            config = load_intraday_config(is_buy=(page_type == PageType.INTRADAY_BUY))
            variants = config["sub_algorithm_variants"]
            
            # Map variant categories to standardized names
            variant_mapping = {
                "momentum": "momentum_buy" if page_type == PageType.INTRADAY_BUY else "momentum_sell",
                "reversal": "reversal_buy" if page_type == PageType.INTRADAY_BUY else "reversal_sell",
                "technical": "technical_buy" if page_type == PageType.INTRADAY_BUY else "technical_sell",
                "volume": "volume_buy" if page_type == PageType.INTRADAY_BUY else "volume_sell"
            }
            
            # Transform variants to match the model
            transformed_variants = {
                category: {
                    k: AlgorithmVariant(
                        name=v["name"],
                        description=v.get("description", ""),
                        query=v["query"],
                        weight=float(v["weight"]),
                        expected_results=v.get("expected_results", 0)
                    )
                    for k, v in variants[variant_name].items()
                }
                for category, variant_name in variant_mapping.items()
            }
            
            # Get default combination if available
            default_combo = None
            if "current_version" in config and "algorithms" in config:
                current_version = config["current_version"]
                if current_version in config["algorithms"]:
                    default_combo = config["algorithms"][current_version].get("sub_algorithm_config")
            
            # Get page-specific weights
            weights = None
            if "scoring_criteria" in config:
                weights = {
                    "momentum": config["scoring_criteria"].get("momentum_weight", 0.25),
                    "reversal": config["scoring_criteria"].get("reversal_weight", 0.25),
                    "technical": config["scoring_criteria"].get("technical_weight", 0.25),
                    "volume": config["scoring_criteria"].get("volume_weight", 0.25)
                }
            
            return IntradayVariantResponse(
                momentum=transformed_variants["momentum"],
                reversal=transformed_variants["reversal"],
                technical=transformed_variants["technical"],
                volume=transformed_variants["volume"],
                default_combination=default_combo,
                page_specific_weights=weights
            )
        
        # Handle other page types with existing logic
        config = load_config()
        
        # Load page-specific configuration
        page_config_map = {
            PageType.LONG_TERM: "long_term_config.json",
            PageType.SWING: "swing_config.json",
            PageType.SHORT_TERM: "short_term_config.json",
            PageType.CUSTOM: "custom_config.json"
        }
        
        try:
            page_config = load_config(page_config_map[page_type])
            variants = {**config["sub_algorithm_variants"], **page_config.get("sub_algorithm_variants", {})}
            default_combo = page_config["algorithms"][page_config["current_version"]]["sub_algorithm_config"]
            page_weights = page_config.get("category_weights", None)
        except Exception:
            logger.warning(f"Using base config for {page_type}")
            variants = config["sub_algorithm_variants"]
            default_combo = config["algorithms"][config["current_version"]]["sub_algorithm_config"]
            page_weights = None
        
        return VariantResponse(
            fundamental=variants["fundamental"],
            momentum=variants["momentum"],
            value=variants["value"],
            quality=variants["quality"],
            default_combination=default_combo,
            page_specific_weights=page_weights
        )
    except Exception as e:
        logger.error(f"Error getting variants for {page_type}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/misc/algorithms/{page_type}")
async def get_algorithm_versions(page_type: PageType):
    """
    Get all algorithm versions with their configurations for a specific page type.
    
    Args:
        page_type: Type of page requesting algorithm versions
    
    Returns:
        - List of all algorithm versions and their details for the page type
        - Current active version
    """
    try:
        page_config_map = {
            PageType.LONG_TERM: "long_term_config.json",
            PageType.SWING: "swing_config.json",
            PageType.SHORT_TERM: "short_term_config.json",
            PageType.INTRADAY: "intraday_config.json",
            PageType.CUSTOM: "custom_config.json"
        }
        
        try:
            config = load_config(page_config_map[page_type])
        except Exception:
            # Fallback to base config
            config = load_config()
            
        return {
            "current_version": config["current_version"],
            "algorithms": config["algorithms"]
        }
    except Exception as e:
        logger.error(f"Error getting algorithm versions for {page_type}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/misc/validate-combination/{page_type}")
async def validate_combination(
    page_type: PageType,
    combination: Union[SelectedCombination, IntradaySelectedCombination]
):
    """
    Validate a selected combination of algorithm variants for a specific page type.
    
    Args:
        page_type: Type of page requesting validation
        combination: Selected variant versions for each category
    
    Returns:
        - Validation result
        - Expected performance metrics
        - Page-specific weights if available
    """
    try:
        # Handle intraday buy/sell separately
        if page_type in [PageType.INTRADAY_BUY, PageType.INTRADAY_SELL]:
            config = load_intraday_config(is_buy=(page_type == PageType.INTRADAY_BUY))
            variants = config["sub_algorithm_variants"]
            
            # Validate each selection exists
            errors = []
            variant_mapping = {
                "momentum": "momentum_buy" if page_type == PageType.INTRADAY_BUY else "momentum_sell",
                "reversal": "reversal_buy" if page_type == PageType.INTRADAY_BUY else "reversal_sell",
                "technical": "technical_buy" if page_type == PageType.INTRADAY_BUY else "technical_sell",
                "volume": "volume_buy" if page_type == PageType.INTRADAY_BUY else "volume_sell"
            }
            
            for category, variant_name in variant_mapping.items():
                selected = getattr(combination, category)
                if selected not in variants[variant_name]:
                    errors.append(f"Invalid {category} variant: {selected}")
            
            if errors:
                raise HTTPException(status_code=400, detail={"errors": errors})
            
            # Get weights from scoring criteria
            weights = {
                "momentum": config.get("scoring_criteria", {}).get("momentum_weight", 0.25),
                "reversal": config.get("scoring_criteria", {}).get("reversal_weight", 0.25),
                "technical": config.get("scoring_criteria", {}).get("technical_weight", 0.25),
                "volume": config.get("scoring_criteria", {}).get("volume_weight", 0.25)
            }
            
            # Calculate expected metrics
            expected_results = {}
            for category, variant_name in variant_mapping.items():
                selected = getattr(combination, category)
                variant_data = variants[variant_name][selected]
                expected_results[category] = int(variant_data.get("expected_results", 20) * variant_data["weight"])
            
            return {
                "valid": True,
                "expected_metrics": {
                    "total_expected_results": sum(expected_results.values()) // 4,  # Average
                    "category_results": expected_results
                },
                "weights": weights,
                "page_specific_adjustments": bool(config.get("intraday_settings", {}))
            }
        
        # Handle other page types with existing logic
        # Load appropriate configuration
        page_config_map = {
            PageType.LONG_TERM: "long_term_config.json",
            PageType.SWING: "swing_config.json",
            PageType.SHORT_TERM: "short_term_config.json",
            PageType.INTRADAY: "intraday_config.json",
            PageType.CUSTOM: "custom_config.json"
        }
        
        try:
            config = load_config(page_config_map[page_type])
        except Exception:
            config = load_config()  # Fallback to base config
            
        variants = config["sub_algorithm_variants"]
        
        # Validate each selection exists
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
            
        # Get page-specific weights if available
        weights = config.get("category_weights", {
            "fundamental": variants["fundamental"][combination.fundamental]["weight"],
            "momentum": variants["momentum"][combination.momentum]["weight"],
            "value": variants["value"][combination.value]["weight"],
            "quality": variants["quality"][combination.quality]["weight"]
        })
        
        # Calculate expected metrics
        expected_results = {
            "fundamental": variants["fundamental"][combination.fundamental]["expected_results"],
            "momentum": variants["momentum"][combination.momentum]["expected_results"],
            "value": variants["value"][combination.value]["expected_results"],
            "quality": variants["quality"][combination.quality]["expected_results"]
        }
        
        # Apply page-specific adjustments if available
        adjustments = config.get("page_adjustments", {})
        for category in expected_results:
            if category in adjustments:
                expected_results[category] = int(expected_results[category] * adjustments[category])
        
        return {
            "valid": True,
            "expected_metrics": {
                "total_expected_results": sum(expected_results.values()) // 4,  # Average
                "category_results": expected_results
            },
            "weights": weights,
            "page_specific_adjustments": bool(adjustments)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating combination for {page_type}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006) 