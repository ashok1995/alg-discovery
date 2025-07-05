"""
ChartInk Service Patch for HTTP 419 Error Fix
Apply this patch to services that use ChartInk
"""

import logging
logger = logging.getLogger(__name__)

# Import the enhanced client
try:
    from api.data.chartink import enhanced_get_chartink_scans, enhanced_check_chartink_connectivity
    
    # Replace the original functions
    import api.data.chartink as chartink_module
    chartink_module.get_chartink_scans = enhanced_get_chartink_scans
    chartink_module.check_chartink_connectivity = enhanced_check_chartink_connectivity
    
    logger.info("✅ ChartInk service patched with HTTP 419 fix")
    
except ImportError as e:
    logger.warning(f"⚠️ Could not apply ChartInk patch: {e}")
