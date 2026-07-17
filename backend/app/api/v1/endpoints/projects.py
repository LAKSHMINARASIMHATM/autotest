"""Project endpoints — CRUD + GitHub import + agent pipeline trigger."""

from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user_id, get_pagination
from app.core.security import RequireRole, Role
from app.schemas.common import MessageResponse, PaginationParams
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdateRequest,
)
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["Projects"])


# ── Standard CRUD ───────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
    description="Import a software project for autonomous quality engineering.",
    dependencies=[Depends(RequireRole(Role.ADMIN, Role.ENGINEER))],
)
async def create_project(
    request: ProjectCreateRequest,
    user_id: str = Depends(get_current_user_id),
) -> ProjectResponse:
    return await ProjectService.create(request, owner_id=user_id)


@router.get(
    "",
    response_model=ProjectListResponse,
    summary="List projects",
    description="Get paginated list of projects owned by the current user.",
)
async def list_projects(
    user_id: str = Depends(get_current_user_id),
    pagination: PaginationParams = Depends(get_pagination),
) -> ProjectListResponse:
    return await ProjectService.list_projects(
        owner_id=user_id,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Get project details",
    description="Retrieve full details for a specific project.",
)
async def get_project(
    project_id: str,
    _user_id: str = Depends(get_current_user_id),
) -> ProjectResponse:
    return await ProjectService.get_by_id(project_id)


@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Update project",
    description="Update project metadata. Only provided fields are changed.",
    dependencies=[Depends(RequireRole(Role.ADMIN, Role.ENGINEER))],
)
async def update_project(
    project_id: str,
    request: ProjectUpdateRequest,
    user_id: str = Depends(get_current_user_id),
) -> ProjectResponse:
    return await ProjectService.update(project_id, request, user_id)


@router.delete(
    "/{project_id}",
    response_model=MessageResponse,
    summary="Delete project",
    description="Soft-delete a project. Data is retained but hidden.",
    dependencies=[Depends(RequireRole(Role.ADMIN))],
)
async def delete_project(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
) -> MessageResponse:
    await ProjectService.delete(project_id, user_id)
    return MessageResponse(message=f"Project '{project_id}' deleted successfully")


# ── GitHub Import ────────────────────────────────────────────────────────────

class GitHubImportRequest(BaseModel):
    repo_url: str
    name: str = ""
    branch: str = "main"
    language: str = ""
    description: str = ""
    auto_run_agents: bool = True


class GitHubImportResponse(BaseModel):
    project_id: str
    name: str
    repo_url: str
    language: str
    framework: str
    total_files: int
    total_functions: int
    total_classes: int
    api_endpoints: list[dict[str, str]]
    session_id: str | None = None
    pipeline_status: str = "imported"


async def _run_pipeline_background(project_id: str, local_path: str, repo_summary: Any) -> None:
    """Run agent pipeline in background after GitHub import."""
    from uuid import uuid4
    from app.agents.orchestrator import build_agent_graph
    from app.agents.llm_factory import get_best_llm
    from app.agents.state import PipelineStatus
    from app.agents.github_import import cleanup_clone
    from app.core.logging import get_logger

    log = get_logger(__name__)
    session_id = str(uuid4())

    try:
        llm = get_best_llm()
        graph = build_agent_graph(llm).compile()

        initial_state = {
            "project_id": project_id,
            "session_id": session_id,
            "iteration": 0,
            "max_iterations": 2,
            "status": PipelineStatus.PLANNING,
            "messages": [],
            "repo_summary": {
                "total_files": repo_summary.total_files,
                "total_functions": repo_summary.total_functions,
                "total_classes": repo_summary.total_classes,
                "api_endpoints": repo_summary.api_endpoints,
                "language": repo_summary.language,
                "framework": repo_summary.framework,
                "files": [
                    {
                        "path": f.path,
                        "language": f.language,
                        "functions": f.functions[:10],
                        "classes": f.classes[:5],
                        "content": f.content[:1000],
                    }
                    for f in repo_summary.files[:30]
                ],
            },
        }

        log.info("pipeline_started", project_id=project_id, session_id=session_id)
        await graph.ainvoke(initial_state)
        log.info("pipeline_complete", project_id=project_id, session_id=session_id)
    except Exception as e:
        log.exception("pipeline_background_error", error=str(e))
    finally:
        cleanup_clone(local_path)


@router.post(
    "/import/github",
    response_model=GitHubImportResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Import project from GitHub",
    description="Clone a GitHub repo, scan its code structure, create project, and optionally trigger the AI agent pipeline.",
)
async def import_from_github(
    request: GitHubImportRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
) -> GitHubImportResponse:
    from app.agents.github_import import clone_and_scan

    # Clone & scan the repo
    try:
        summary = await clone_and_scan(request.repo_url, request.branch)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to clone repo: {e}",
        )

    # Determine project metadata from scan if not provided
    proj_name = request.name or summary.repo_url.rstrip("/").split("/")[-1]
    lang = request.language or summary.language
    description = request.description or f"Imported from {summary.repo_url}"

    # Create project in MongoDB
    create_req = ProjectCreateRequest(
        name=proj_name,
        description=description,
        repo_url=summary.repo_url,
        language=lang,
        framework=summary.framework,
        branch=request.branch,
        config={
            "total_functions": summary.total_functions,
            "total_classes": summary.total_classes,
        },
    )
    project = await ProjectService.create(create_req, owner_id=user_id)

    session_id = None
    if request.auto_run_agents:
        from uuid import uuid4
        session_id = str(uuid4())
        # Schedule pipeline in background — do not block HTTP response
        background_tasks.add_task(
            _run_pipeline_background,
            project.id,
            summary.local_path,
            summary,
        )

    return GitHubImportResponse(
        project_id=project.id,
        name=project.name,
        repo_url=summary.repo_url,
        language=summary.language,
        framework=summary.framework,
        total_files=summary.total_files,
        total_functions=summary.total_functions,
        total_classes=summary.total_classes,
        api_endpoints=summary.api_endpoints,
        session_id=session_id,
        pipeline_status="pipeline_running" if request.auto_run_agents else "imported",
    )


# ── Sub-resource endpoints ───────────────────────────────────────────────────

@router.get("/{project_id}/test-cases")
async def get_project_test_cases(
    project_id: str,
    _user_id: str = Depends(get_current_user_id),
):
    """Retrieve all test cases for a project."""
    from app.models.test_case import TestCase
    from beanie import PydanticObjectId
    try:
        p_id = PydanticObjectId(project_id)
    except Exception:
        return []
    test_cases = await TestCase.find(TestCase.project_id == p_id).to_list()
    return [
        {
            "id": str(tc.id),
            "name": tc.name,
            "file": tc.file_path,
            "assertions": tc.explanation.get("assertions", 5) if tc.explanation else 5,
            "confidence": tc.confidence,
            "pass_rate": tc.explanation.get("pass_rate", 100.0) if tc.explanation else 100.0,
            "code": tc.code,
            "framework": tc.framework,
        }
        for tc in test_cases
    ]


@router.get("/{project_id}/bugs")
async def get_project_bugs(
    project_id: str,
    _user_id: str = Depends(get_current_user_id),
):
    """Retrieve all localized bugs for a project."""
    from app.models.bug_report import BugReport
    from beanie import PydanticObjectId
    try:
        p_id = PydanticObjectId(project_id)
    except Exception:
        return []
    bugs = await BugReport.find(BugReport.project_id == p_id).to_list()
    return [
        {
            "id": str(b.id),
            "severity": b.severity,
            "file": b.file_path,
            "method": b.method_name,
            "line": b.line_number,
            "confidence": b.confidence,
            "status": b.status,
            "rootCause": b.root_cause_summary,
            "codeSnippet": b.explanation.get("code_snippet", "") if b.explanation else "",
            "fixSuggestion": b.explanation.get("fix_suggestion", "") if b.explanation else "",
        }
        for b in bugs
    ]


@router.get("/{project_id}/patches")
async def get_project_patches(
    project_id: str,
    _user_id: str = Depends(get_current_user_id),
):
    """Retrieve all patches for a project."""
    from app.models.patch import Patch
    from beanie import PydanticObjectId
    try:
        p_id = PydanticObjectId(project_id)
    except Exception:
        return []
    patches = await Patch.find(Patch.project_id == p_id).to_list()
    return [
        {
            "id": str(p.id),
            "bugId": str(p.bug_report_id),
            "strategy": p.strategy,
            "status": p.status,
            "confidence": p.confidence,
            "file": p.file_path,
            "diff": p.diff,
            "timestamp": "Just now",
        }
        for p in patches
    ]
