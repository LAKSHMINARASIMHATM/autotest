"""Graph API endpoints — query, explore, and analyze the project's dependency structure."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.deps import get_current_user_id
from app.core.logging import get_logger
from app.knowledge.graph.graph_query_service import GraphQueryService

router = APIRouter(prefix="/graph", tags=["graph"])
logger = get_logger(__name__)


# ── Structural queries ────────────────────────────────────────────────────────

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


# ── Project tree ──────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/tree")
async def get_project_graph_tree(
    project_id: str,
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Get the hierarchical tree structure of the project's code entities (from Neo4j or MongoDB)."""
    return await GraphQueryService.get_project_graph_tree(project_id)


# ── Cypher console ────────────────────────────────────────────────────────────

class CypherQueryRequest(BaseModel):
    query: str


async def _mongo_fallback(raw_query: str) -> dict[str, Any]:
    """
    Execute a best-effort MongoDB-backed interpretation of a Cypher query.

    Returns a dict with:
      - rows: list of result dicts
      - source: "mongodb_fallback"
      - note: human-readable explanation
    """
    q = raw_query.upper()
    rows: list[dict[str, Any]] = []
    note = "Executed against MongoDB (Neo4j unavailable)."

    # ── 1. EXPOSES_API  ───────────────────────────────────────────────────────
    if "EXPOSES_API" in q:
        from app.models.project import Project
        projects = await Project.find_all().limit(10).to_list()
        for proj in projects:
            eps: list[dict] = []
            if proj.config and "api_endpoints" in proj.config:
                eps = proj.config["api_endpoints"]
            elif getattr(proj, "api_endpoints", None):
                eps = list(proj.api_endpoints)
            for ep in eps:
                rows.append({
                    "e.method": ep.get("method", "GET"),
                    "e.path": ep.get("path", ""),
                    "_project": proj.name,
                })
        if not rows:
            note = "No API endpoints found. Import a project with REST endpoints first."

    # ── 2. TestCase / TESTS  ──────────────────────────────────────────────────
    elif "TESTS" in q or "TESTCASE" in q or "TEST_CASE" in q:
        from app.models.test_case import TestCase
        test_cases = await TestCase.find_all().limit(20).to_list()
        rows = [
            {
                "t.id": str(tc.id)[:8],
                "t.name": tc.name,
                "m.name": tc.name.removeprefix("test_"),
                "t.framework": tc.framework,
                "t.confidence": tc.confidence,
            }
            for tc in test_cases
        ]
        if not rows:
            note = "No test cases found. Run the agent pipeline to generate tests."

    # ── 3. Bug / LOCALIZED_IN  ────────────────────────────────────────────────
    elif "BUG" in q or "LOCALIZED_IN" in q:
        from app.models.bug_report import BugReport
        bugs = await BugReport.find_all().limit(20).to_list()
        rows = [
            {
                "b.severity": b.severity,
                "b.status": b.status,
                "m.name": b.method_name or "",
                "b.file": b.file_path or "",
                "b.line": b.line_number or 0,
            }
            for b in bugs
        ]
        if not rows:
            note = "No bugs found. Scan the project first."

    # ── 4. Project  ───────────────────────────────────────────────────────────
    elif "PROJECT" in q:
        from app.models.project import Project
        projects = await Project.find_all().limit(20).to_list()
        rows = [
            {
                "p.name": p.name,
                "p.language": p.language,
                "p.status": p.status,
                "p.total_files": p.total_files,
                "p.total_bugs_found": p.total_bugs_found or 0,
                "p.total_test_cases": p.total_test_cases or 0,
            }
            for p in projects
        ]
        if not rows:
            note = "No projects found. Import a project first."

    # ── 5. Module / File / CodeEntity  ───────────────────────────────────────
    elif any(kw in q for kw in ("MODULE", "FILE", "CLASS", "FUNCTION", "CODEENTITY", "ENTITY")):
        from app.models.code_entity import CodeEntity
        entities = await CodeEntity.find_all().limit(30).to_list()
        rows = [
            {
                "e.name": e.name,
                "e.type": e.entity_type,
                "e.qualified_name": e.qualified_name,
            }
            for e in entities
        ]
        if not rows:
            note = "No code entities found. Index the project first."

    # ── 6. Source file list  ──────────────────────────────────────────────────
    elif "SOURCEFILE" in q or "SOURCE_FILE" in q:
        from app.models.source_file import SourceFile
        files = await SourceFile.find_all().limit(30).to_list()
        rows = [
            {
                "f.path": f.path,
                "f.language": f.language,
                "f.line_count": f.line_count,
                "f.is_indexed": f.is_indexed,
            }
            for f in files
        ]
        if not rows:
            note = "No source files found. Import and index a project first."

    # ── 7. Generic fallback — return summary stats  ───────────────────────────
    else:
        from app.models.project import Project
        from app.models.code_entity import CodeEntity
        from app.models.bug_report import BugReport
        from app.models.test_case import TestCase

        projects = await Project.find_all().limit(5).to_list()
        entities = await CodeEntity.find_all().limit(10).to_list()

        if entities:
            rows = [
                {
                    "entity.name": e.name,
                    "entity.type": e.entity_type,
                    "entity.qualified_name": e.qualified_name,
                }
                for e in entities
            ]
            note = (
                "Neo4j is offline — showing MongoDB CodeEntity records. "
                "For full Cypher support, ensure Neo4j is reachable."
            )
        elif projects:
            rows = [
                {
                    "project.name": p.name,
                    "project.language": p.language,
                    "project.total_files": p.total_files,
                    "project.bugs_found": p.total_bugs_found or 0,
                }
                for p in projects
            ]
            note = (
                "Neo4j is offline — showing MongoDB project records. "
                "For full Cypher support, ensure Neo4j is reachable."
            )
        else:
            note = "No data found. Import a project first."

    return {"rows": rows, "source": "mongodb_fallback", "note": note}


@router.post("/query")
async def execute_cypher_query(
    request: CypherQueryRequest,
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """
    Execute an arbitrary Cypher query on the Neo4j Knowledge Graph.

    Response always contains:
      - rows: list of result records
      - source: "neo4j" | "mongodb_fallback"
      - note: (only present on fallback) explanation of what was returned
      - neo4j_error: (only present on fallback) original Neo4j error message
    """
    from app.knowledge.graph.neo4j_service import Neo4jService

    if not request.query.strip():
        return {"rows": [], "source": "neo4j", "error": "Empty query"}

    # 1. Try Neo4j first
    try:
        rows = await Neo4jService.execute_query(request.query)
        return {"rows": rows, "source": "neo4j"}
    except Exception as e:
        neo4j_error = str(e)
        logger.warning("neo4j_query_failed_falling_back_to_mongo", error=neo4j_error)

    # 2. MongoDB fallback
    try:
        result = await _mongo_fallback(request.query)
        result["neo4j_error"] = neo4j_error
        return result
    except Exception as fb_err:
        logger.exception("mongo_fallback_failed", error=str(fb_err))
        return {
            "rows": [],
            "source": "error",
            "neo4j_error": neo4j_error,
            "error": f"Both Neo4j and MongoDB fallback failed: {fb_err}",
        }
