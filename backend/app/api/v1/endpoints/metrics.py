"""Metrics & XAI API endpoints — dashboard analytics and explainability traces."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user_id
from app.evaluation.metrics_service import MetricsService
from app.evaluation.xai_service import XAIService

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/dashboard/{project_id}")
async def get_dashboard_metrics(
    project_id: str,
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Return all KPI tiles for the project dashboard."""
    return await MetricsService.get_dashboard_metrics(project_id)


@router.get("/coverage/{project_id}")
async def get_coverage_trend(
    project_id: str,
    limit: int = Query(10, ge=1, le=50),
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Return coverage % over the last N runs for the trend chart."""
    return await MetricsService.get_coverage_trend(project_id, limit)


@router.get("/bugs/{project_id}/severity")
async def get_bug_severity_distribution(
    project_id: str,
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Return bug count distribution by severity (critical/high/medium/low)."""
    return await MetricsService.get_bug_severity_distribution(project_id)


@router.get("/patches/{project_id}/strategies")
async def get_patch_strategy_breakdown(
    project_id: str,
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Return patch count per repair strategy."""
    return await MetricsService.get_patch_strategy_breakdown(project_id)


@router.get("/xai/trace/{session_id}")
async def get_xai_trace(
    session_id: str,
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Return the full XAI reasoning trace for an agent pipeline session."""
    return await XAIService.get_session_trace(session_id)


@router.get("/xai/confidence/{session_id}")
async def get_agent_confidence(
    session_id: str,
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Return per-agent confidence scores for visualization."""
    return await XAIService.get_agent_confidence_scores(session_id)
