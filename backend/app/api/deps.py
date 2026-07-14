"""API dependency injection functions.

These are reusable FastAPI dependencies for request-scoped
services like current user extraction and pagination.
"""

from fastapi import Depends, Query

from app.core.security import TokenPayload, get_current_user_payload
from app.schemas.common import PaginationParams


async def get_current_user_id(
    payload: TokenPayload = Depends(get_current_user_payload),
) -> str:
    """Extract the current user's ID from the JWT payload."""
    return payload.sub


def get_pagination(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
) -> PaginationParams:
    """Extract pagination parameters from query string."""
    return PaginationParams(page=page, page_size=page_size)
