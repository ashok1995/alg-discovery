#!/usr/bin/env python3
"""
Legacy wrapper for Intraday SELL Server
--------------------------------------

This file remains as the entry-point referenced by Supervisor (``uvicorn intraday_sell_server:app``).
Rather than duplicating logic, it simply re-exports the fully-featured implementation
located at ``alg_discovery.api.v1.routes.intraday_sell_server``.

Keeping this wrapper avoids changes to Supervisor configs while allowing the SELL API
to benefit from the new variant & combination endpoints.
"""

from __future__ import annotations

import os
import sys
from importlib import import_module
from pathlib import Path

# Ensure ``src`` is on PYTHONPATH so the refactored package can be imported when
# Supervisor launches this legacy entry-point.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_PATH = PROJECT_ROOT / "src"
if str(SRC_PATH) not in sys.path:
    sys.path.insert(0, str(SRC_PATH))

# Import the upgraded app
module_path = "alg_discovery.api.v1.routes.intraday_sell_server"
app = import_module(module_path).app  # noqa: F401 