"""API package for Algo Discovery

Contains versioned FastAPI routers and Pydantic schemas.
"""

import sys
from importlib import import_module

__all__ = ["v1"]

# Provide backward-compatibility for legacy imports such as
# `from api.shortterm_server import app` by dynamically forwarding them.

_legacy_server_modules = {
    "shortterm_server": "alg_discovery.api.v1.routes.shortterm_server",
    "swing_server": "alg_discovery.api.v1.routes.swing_server",
    "longterm_server": "alg_discovery.api.v1.routes.longterm_server",
    "intraday_server": "alg_discovery.api.v1.routes.intraday_server",
    "intraday_buy_server": "alg_discovery.api.v1.routes.intraday_buy_server",
    "intraday_sell_server": "alg_discovery.api.v1.routes.intraday_sell_server",
    "dashboard_server": "alg_discovery.api.v1.routes.dashboard_server",
}

for legacy_name, new_fqn in _legacy_server_modules.items():
    try:
        sys.modules[f"api.{legacy_name}"] = import_module(new_fqn)
    except ModuleNotFoundError:
        # routes may be further refactored later; ignore if missing for now.
        pass

# Map `api.models` to new schemas package so existing imports stay valid.
sys.modules.setdefault("api.models", import_module("alg_discovery.api.v1.schemas"))

# Ensure `import api` yields this module when legacy code uses bare name.
sys.modules.setdefault("api", sys.modules[__name__])

sys.modules.setdefault("api.services", import_module("alg_discovery.services"))
sys.modules.setdefault("api.services.intraday_service", import_module("alg_discovery.services.intraday_service"))
