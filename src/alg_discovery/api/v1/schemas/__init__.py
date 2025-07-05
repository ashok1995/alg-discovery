import sys
from importlib import import_module

# Expose individual schema modules for convenience.

for _mod in [
    "stock_models",
    "cron_tracking_models",
    "recommendation_models",
    "recommendation_history_models",
]:
    imported = import_module(f"alg_discovery.api.v1.schemas.{_mod}")
    sys.modules.setdefault(f"api.models.{_mod}", imported)

__all__ = [
    "stock_models",
    "cron_tracking_models",
    "recommendation_models",
    "recommendation_history_models",
]
