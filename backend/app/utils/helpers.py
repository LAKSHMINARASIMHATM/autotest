"""General utility and helper functions for AutoTestAI."""

from __future__ import annotations

import functools
import json
import time
from collections.abc import Callable
from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)


def time_execution(func: Callable[..., Any]) -> Callable[..., Any]:
    """Decorator to measure and log the execution time of a function."""
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        start_time = time.perf_counter()
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            end_time = time.perf_counter()
            execution_time = (end_time - start_time) * 1000
            logger.debug("function_execution_time", function=func.__name__, duration_ms=execution_time)
    return wrapper


def safe_json_loads(text: str, default: Any = None) -> Any:
    """Safely loads JSON from string with fallback in case of parse errors."""
    if not text:
        return default or {}
    try:
        # Strip code block markdown if present
        clean_text = text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        elif clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        return json.loads(clean_text.strip())
    except json.JSONDecodeError as e:
        logger.error("json_load_failed", error=str(e), text=text[:200])
        return default or {}
