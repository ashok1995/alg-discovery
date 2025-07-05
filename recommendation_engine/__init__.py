"""Legacy package shim.

This remains at the original import path so that third-party code that still
does `import recommendation_engine` continues to function after the package
was moved to `alg_discovery.recommendation`.

All public symbols are re-exported from the new location.
"""

from importlib import import_module

_new_pkg = import_module("alg_discovery.recommendation")

# Re-export every public attribute defined in the new package.
globals().update({k: getattr(_new_pkg, k) for k in getattr(_new_pkg, "__all__", [])})

# Additionally expose the module object under the same public names so that
# `import recommendation_engine.config` continues to work.
import sys

for _sub in [
    "config",
    "utils",
    "ranking_algorithms",
    "seed_algorithms",
]:
    try:
        sys.modules[f"recommendation_engine.{_sub}"] = import_module(f"alg_discovery.recommendation.{_sub}")
    except ModuleNotFoundError:
        # Submodule may not exist yet; ignore for now.
        pass

__all__ = getattr(_new_pkg, "__all__", [])
__version__ = getattr(_new_pkg, "__version__", "1.0.0")
__author__ = "Algo Discovery Team" 