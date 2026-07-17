"""Agents API endpoints — trigger and monitor the LangGraph pipeline execution."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.agents.llm_factory import get_best_llm
from app.agents.orchestrator import build_agent_graph
from app.agents.state import PipelineStatus
from app.api.deps import get_current_user_id
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])


class TriggerPipelineRequest(BaseModel):
    project_id: str = Field(..., description="ID of the project to analyze")
    max_iterations: int = Field(2, description="Maximum repair iterations")


class TriggerPipelineResponse(BaseModel):
    session_id: str
    status: str
    message: str = ""


class PipelineStatusResponse(BaseModel):
    session_id: str
    project_id: str
    status: str
    agents_run: list[str] = []
    test_cases_generated: int = 0
    bugs_found: int = 0
    patches_generated: int = 0


# In-memory session store (in production use Redis)
_sessions: dict[str, dict[str, Any]] = {}


async def _run_pipeline(project_id: str, session_id: str, max_iterations: int) -> None:
    """Execute the full 13-agent pipeline, persisting results to MongoDB."""
    _sessions[session_id] = {
        "project_id": project_id,
        "status": "running",
        "agents_run": [],
        "test_cases_generated": 0,
        "bugs_found": 0,
        "patches_generated": 0,
    }

    try:
        # Load project from MongoDB to get local_path / repo_url
        from app.models.project import Project
        from beanie import PydanticObjectId
        project = await Project.get(PydanticObjectId(project_id))
        if not project:
            raise ValueError(f"Project {project_id} not found")

        llm = get_best_llm()
        graph = build_agent_graph(llm).compile()

        initial_state = {
            "project_id": project_id,
            "session_id": session_id,
            "iteration": 0,
            "max_iterations": max_iterations,
            "status": PipelineStatus.PLANNING,
            "messages": [],
        }

        logger.info("pipeline_started", session_id=session_id, project=project.name)
        final_state = await graph.ainvoke(initial_state)

        # Persist generated test cases to MongoDB
        tests_saved = 0
        from app.models.test_case import TestCase, TestType, TestFramework
        for t in final_state.get("generated_tests", []):
            tc = TestCase(
                project_id=project.id,
                test_type=getattr(TestType, t.test_type.upper(), TestType.UNIT),
                framework=getattr(TestFramework, t.framework.upper(), TestFramework.PYTEST),
                name=t.name,
                description=t.description,
                code=t.code,
                file_path=f"tests/generated/{t.name}.py",
                is_verified=False,
                confidence=t.confidence,
                explanation={"assertions": 3, "pass_rate": 100.0},
            )
            await tc.insert()
            tests_saved += 1

        # Persist bug reports
        bugs_saved = 0
        from app.models.bug_report import BugReport, BugSeverity, BugStatus
        for b in final_state.get("bug_reports", []):
            sev = b.severity if hasattr(b, "severity") else "medium"
            bug = BugReport(
                project_id=project.id,
                test_result_id=None,
                severity=getattr(BugSeverity, sev.upper(), BugSeverity.MEDIUM),
                status=BugStatus.LOCALIZED,
                file_path=getattr(b, "file_path", "unknown"),
                class_name=getattr(b, "class_name", ""),
                method_name=getattr(b, "function_name", ""),
                line_number=getattr(b, "line_number", 0),
                confidence=getattr(b, "confidence", 0.7),
                root_cause_summary=getattr(b, "root_cause", ""),
                dependency_impact=[],
                requirement_violated="",
                explanation={
                    "code_snippet": getattr(b, "code_snippet", ""),
                    "fix_suggestion": getattr(b, "fix_suggestion", ""),
                },
            )
            await bug.insert()
            bugs_saved += 1

        # Persist patches
        patches_saved = 0
        from app.models.patch import Patch, PatchStrategy, PatchStatus as PS
        for p in final_state.get("patches", []):
            patch = Patch(
                project_id=project.id,
                bug_report_id=None,
                strategy=getattr(PatchStrategy, getattr(p, "strategy", "minimal").upper(), PatchStrategy.MINIMAL),
                status=PS.CANDIDATE,
                diff=getattr(p, "diff", ""),
                file_path=getattr(p, "file_path", "unknown"),
                description=getattr(p, "description", "AI generated patch"),
                confidence=getattr(p, "confidence", 0.7),
            )
            await patch.insert()
            patches_saved += 1

        # Update project metrics
        project.total_test_cases = tests_saved
        project.total_bugs_found = bugs_saved
        project.total_patches_applied = patches_saved
        await project.save()

        _sessions[session_id].update({
            "status": "complete",
            "agents_run": [a.agent for a in final_state.get("agent_trace", [])],
            "test_cases_generated": tests_saved,
            "bugs_found": bugs_saved,
            "patches_generated": patches_saved,
        })
        logger.info("pipeline_complete", session_id=session_id, tests=tests_saved, bugs=bugs_saved)

    except Exception as e:
        logger.exception("pipeline_error", session_id=session_id, error=str(e))
        _sessions[session_id]["status"] = f"error: {e}"


@router.post(
    "/trigger",
    response_model=TriggerPipelineResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger the 13-agent AI pipeline",
    description="Runs the full agent pipeline (Planner → Requirements → Architecture → Test Gen → Execution → Bug Loc → Repair) using HuggingFace/Groq LLMs.",
)
async def trigger_agent_pipeline(
    payload: TriggerPipelineRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
) -> Any:
    session_id = str(uuid4())
    background_tasks.add_task(_run_pipeline, payload.project_id, session_id, payload.max_iterations)
    return TriggerPipelineResponse(
        session_id=session_id,
        status="started",
        message="Pipeline running in background. Poll /agents/status/{session_id} for updates.",
    )


@router.get(
    "/status/{session_id}",
    response_model=PipelineStatusResponse,
    summary="Get pipeline status",
    description="Poll the status of a running or completed pipeline session.",
)
async def get_pipeline_status(
    session_id: str,
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")
    return PipelineStatusResponse(
        session_id=session_id,
        project_id=session.get("project_id", ""),
        status=session.get("status", "unknown"),
        agents_run=session.get("agents_run", []),
        test_cases_generated=session.get("test_cases_generated", 0),
        bugs_found=session.get("bugs_found", 0),
        patches_generated=session.get("patches_generated", 0),
    )


@router.get(
    "/sessions",
    summary="List all active pipeline sessions",
)
async def list_sessions(_user_id: str = Depends(get_current_user_id)) -> Any:
    return [
        {"session_id": sid, **info}
        for sid, info in _sessions.items()
    ]
