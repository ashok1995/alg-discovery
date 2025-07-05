"""alg_discovery.recommendation
Wrapper package that re-exports the legacy recommendation_engine modules so existing code keeps working 
while we complete the migration.
"""

import sys

# Public exports
from .recommendation_orchestrator import RecommendationOrchestrator
from .config.algorithm_registry import AlgorithmRegistry  # noqa: F401
from .utils.version_manager import VersionManager  # noqa: F401
from .utils.ab_testing import ABTestingFramework  # noqa: F401
from .utils.performance_tracker import PerformanceTracker  # noqa: F401

__all__ = [
    "RecommendationOrchestrator",
    "AlgorithmRegistry",
    "VersionManager",
    "ABTestingFramework",
    "PerformanceTracker",
]

# ---------------------------------------------------------------------------
# Back-compatibility shim.
# Any legacy import like `import recommendation_engine` should still work even
# after the physical move. We register this package instance under the old
# name inside sys.modules so the import machinery finds it.
# ---------------------------------------------------------------------------

sys.modules.setdefault("recommendation_engine", sys.modules[__name__])

# Also expose immediate subpackages so dotted imports keep functioning.
for _sub in [
    "config",
    "utils",
    "ranking_algorithms",
    "seed_algorithms",
]:
    full_new = f"{__name__}.{_sub}"
    try:
        sys.modules[f"recommendation_engine.{_sub}"] = sys.modules[full_new]
    except KeyError:
        # Submodule not imported yet; that's fine – import machinery will
        # fill it later when it gets loaded.
        pass 