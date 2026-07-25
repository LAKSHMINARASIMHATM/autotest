"""Monitoring endpoints — real-time system health, DB pool stats, and pipeline activity."""

from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user_id
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/monitoring", tags=["monitoring"])

_start_time = time.time()


@router.get("/health", summary="Real-time system health snapshot")
async def get_system_health(
    _user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    """Return CPU, RAM, uptime, DB collection counts, and recent pipeline activity."""

    # ── Process / host metrics via psutil (optional, safe fallback) ──────────
    cpu_pct: float = 0.0
    ram_used_mb: float = 0.0
    ram_total_mb: float = 0.0

    try:
        import psutil  # type: ignore[import-not-found]
        cpu_pct = psutil.cpu_percent(interval=0.2)
        vm = psutil.virtual_memory()
        ram_used_mb = round(vm.used / 1024 / 1024, 1)
        ram_total_mb = round(vm.total / 1024 / 1024, 1)
    except Exception:
        pass  # psutil not installed — return zeros

    uptime_s = int(time.time() - _start_time)

    # ── DB collection counts ──────────────────────────────────────────────────
    db_stats: dict[str, Any] = {}
    try:
        from app.core.database import get_database
        db = get_database()
        for col in ["projects", "test_cases", "bug_reports", "patches", "api_keys", "audit_logs"]:
            db_stats[col] = await db[col].count_documents({})
    except Exception as exc:
        logger.warning("monitoring_db_stats_failed", error=str(exc))

    # ── Recent pipeline sessions ───────────────────────────────────────────────
    from app.api.v1.endpoints.agents import _sessions  # in-memory store

    recent_sessions = []
    for sid, info in list(_sessions.items())[-20:]:
        recent_sessions.append({
            "session_id": sid,
            "project_id": info.get("project_id", ""),
            "status": info.get("status", ""),
            "agents_run": info.get("agents_run", []),
            "test_cases_generated": info.get("test_cases_generated", 0),
            "bugs_found": info.get("bugs_found", 0),
            "patches_generated": info.get("patches_generated", 0),
        })

    # ── Neo4j basic connectivity ──────────────────────────────────────────────
    neo4j_status = "unknown"
    neo4j_nodes = 0
    try:
        from app.knowledge.graph.neo4j_service import Neo4jService
        result = await Neo4jService.execute_query("MATCH (n) RETURN count(n) AS cnt")
        neo4j_nodes = result[0]["cnt"] if result else 0
        neo4j_status = "connected"
    except Exception as exc:
        neo4j_status = f"error: {str(exc)[:80]}"


    return {
        "uptime_seconds": uptime_s,
        "host": {
            "cpu_pct": cpu_pct,
            "ram_used_mb": ram_used_mb,
            "ram_total_mb": ram_total_mb,
            "ram_pct": round(ram_used_mb / ram_total_mb * 100, 1) if ram_total_mb else 0,
        },
        "database": {
            "mongodb": db_stats,
            "neo4j_status": neo4j_status,
            "neo4j_nodes": neo4j_nodes,
        },
        "pipeline": {
            "total_sessions": len(_sessions),
            "recent_sessions": list(reversed(recent_sessions)),
        },
    }
