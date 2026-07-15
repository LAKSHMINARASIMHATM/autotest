"""Graph API endpoints — query, explore, and analyze the project's dependency structure."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user_id
from app.services.graph_query_service import GraphQueryService

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/module/dependencies")
async def get_module_dependencies(
    module_name: str = Query(..., description="Name of the module"),
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Get direct dependencies of a module."""
    return await GraphQueryService.get_module_dependencies(module_name)


@router.get("/module/impact")
async def get_module_impact(
    module_name: str = Query(..., description="Name of the module"),
    depth: int = Query(3, ge=1, le=5, description="Depth of search"),
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Get transitive dependents (impacted modules) of a module."""
    return await GraphQueryService.get_transitive_impact(module_name, depth)


@router.get("/function/callers")
async def get_function_callers(
    function_name: str = Query(..., description="Name of the function"),
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Get caller methods of a function."""
    return await GraphQueryService.get_function_callers(function_name)


@router.get("/dead-code")
async def get_isolated_functions(
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Find dead code candidates (functions with 0 callers/callees)."""
    return await GraphQueryService.get_isolated_functions()
