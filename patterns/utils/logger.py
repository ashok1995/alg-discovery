# Deprecated local logger utility – delegates to global utils.get_logger
from utils import get_logger  # noqa: F401

__all__ = ["get_logger"] 