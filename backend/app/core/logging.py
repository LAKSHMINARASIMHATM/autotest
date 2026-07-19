"""Structured logging configuration using structlog.

Produces JSON logs in production and human-readable colored logs in development.
Every log entry includes a correlation_id for distributed tracing.
"""

import logging
import sys
from contextvars import ContextVar
from typing import Any
from uuid import uuid4

import structlog

from app.core.config import get_settings

# Context variable for request correlation
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")


def set_correlation_id(cid: str | None = None) -> str:
    """Set the correlation ID for the current async context.

    Args:
        cid: Correlation ID to set. Generates a UUID if not provided.

    Returns:
        The active correlation ID.
    """
    value = cid or uuid4().hex[:16]
    correlation_id_var.set(value)
    return value


def _add_correlation_id(
    logger: Any,
    method_name: str,
    event_dict: Any,
) -> Any:
    """Structlog processor that injects the correlation_id into every log event."""
    cid = correlation_id_var.get("")
    if cid:
        event_dict["correlation_id"] = cid
    return event_dict


def _add_app_context(
    logger: Any,
    method_name: str,
    event_dict: Any,
) -> Any:
    """Structlog processor that injects app name and version."""
    settings = get_settings()
    event_dict["app"] = settings.APP_NAME
    event_dict["version"] = settings.APP_VERSION
    return event_dict


def setup_logging() -> None:
    """Configure structlog and stdlib logging.

    Call once at application startup. Produces:
    - JSON output in production (machine-parseable)
    - Colored console output in development (human-readable)
    """
    settings = get_settings()
    is_prod = settings.is_production

    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        _add_correlation_id,
        _add_app_context,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    renderer: Any
    if is_prod:
        renderer = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(settings.LOG_LEVEL)

    # Silence noisy libraries
    for noisy in ("uvicorn.access", "motor", "httpcore", "httpx"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Get a named structured logger instance."""
    return structlog.get_logger(name)
