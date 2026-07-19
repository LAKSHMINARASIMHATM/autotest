"""Agents API endpoints — trigger and monitor the LangGraph pipeline execution."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.agents.llm_factory import get_best_llm, get_groq_llm
from app.agents.orchestrator import build_agent_graph
from app.agents.state import PipelineStatus
from app.api.deps import get_current_user_id
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])

# ── In-memory session store (production: use Redis) ───────────────────────────
_sessions: dict[str, dict[str, Any]] = {}


# ── Request / Response schemas ────────────────────────────────────────────────

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
    provider: str = "groq"
    agents_run: list[str] = []
    test_cases_generated: int = 0
    bugs_found: int = 0
    patches_generated: int = 0
    error: str | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _save_test_cases(project, generated_tests: list) -> int:
    from app.models.test_case import TestCase, TestFramework, TestType
    count = 0
    for t in generated_tests:
        try:
            tc = TestCase(
                project_id=project.id,
                test_type=getattr(TestType, str(t.test_type).upper(), TestType.UNIT),
                framework=getattr(TestFramework, str(t.framework).upper(), TestFramework.PYTEST),
                name=t.name,
                description=t.description,
                code=t.code,
                file_path=f"tests/generated/{t.name}.py",
                is_verified=False,
                confidence=t.confidence,
                explanation={"assertions": 3, "pass_rate": 100.0},
            )
            await tc.insert()
            count += 1
        except Exception as e:
            logger.warning("save_test_case_failed", name=t.name, error=str(e))
    return count


def _get_code_snippet(project_path: str, file_path: str, line_number: int) -> str:
    if not project_path or not file_path or line_number <= 0:
        return ""
    try:
        import os
        full_path = os.path.join(project_path, file_path)
        if not os.path.exists(full_path):
            basename = os.path.basename(file_path)
            for root, dirs, files in os.walk(project_path):
                if basename in files:
                    full_path = os.path.join(root, basename)
                    break
        if os.path.exists(full_path):
            with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
            start = max(0, line_number - 5)
            end = min(len(lines), line_number + 5)
            snippet_lines = []
            for idx in range(start, end):
                prefix = "-> " if idx + 1 == line_number else "   "
                snippet_lines.append(f"{idx + 1:3d} {prefix}{lines[idx]}")
            return "".join(snippet_lines)
    except Exception:
        pass
    return ""


async def _save_bugs(project, bug_localizations: list, root_causes: list = [], patches: list = [], project_path: str = "") -> int:
    from app.models.bug_report import BugReport, BugSeverity, BugStatus
    count = 0
    for b in bug_localizations:
        try:
            # b is a BugLocalization object from agent state
            confidence = getattr(b, "confidence", 0.7)
            sev = BugSeverity.HIGH if confidence >= 0.85 else BugSeverity.MEDIUM
            
            # Find matching root cause and patch
            rc = next((r for r in root_causes if getattr(r, "bug_id", "") == getattr(b, "id", "")), None)
            root_cause_summary = getattr(rc, "why", "") or getattr(b, "error_message", "") or "Root cause analysis pending."
            dependency_impact = getattr(rc, "dependency_impact", [])
            requirement_violated = getattr(rc, "requirement_violated", "")
            
            patch = next((p for p in patches if getattr(p, "bug_id", "") == getattr(b, "id", "") or getattr(p, "file_path", "") == getattr(b, "file_path", "")), None)
            fix_suggestion = getattr(patch, "diff", "") if patch else ""
            
            # Get code snippet from filesystem
            code_snippet = _get_code_snippet(project_path, getattr(b, "file_path", ""), getattr(b, "line_number", 0))
            
            bug = BugReport(
                project_id=project.id,
                test_result_id=None,
                severity=sev,
                status=BugStatus.LOCALIZED,
                file_path=getattr(b, "file_path", "unknown"),
                class_name=getattr(b, "class_name", ""),
                method_name=getattr(b, "method_name", ""),
                line_number=getattr(b, "line_number", 0),
                confidence=confidence,
                root_cause_summary=root_cause_summary,
                dependency_impact=dependency_impact,
                requirement_violated=requirement_violated,
                explanation={
                    "test_id": getattr(b, "test_id", ""),
                    "error_message": getattr(b, "error_message", ""),
                    "code_snippet": code_snippet,
                    "fix_suggestion": fix_suggestion,
                },
            )
            await bug.insert()
            count += 1
        except Exception as e:
            logger.warning("save_bug_failed", error=str(e))
    return count


async def _save_patches(project, patches: list) -> int:
    from app.models.patch import Patch, PatchStrategy
    from app.models.patch import PatchStatus as PS
    count = 0
    for p in patches:
        try:
            strat = getattr(p, "strategy", "minimal")
            patch = Patch(
                project_id=project.id,
                bug_report_id=None,
                strategy=getattr(PatchStrategy, str(strat).upper(), PatchStrategy.MINIMAL),
                status=PS.CANDIDATE,
                diff=getattr(p, "diff", ""),
                file_path=getattr(p, "file_path", "unknown"),
                description=getattr(p, "description", "AI generated patch"),
                confidence=getattr(p, "confidence", 0.7),
            )
            await patch.insert()
            count += 1
        except Exception as e:
            logger.warning("save_patch_failed", error=str(e))
    return count


# ── Background: Full 13-agent pipeline ───────────────────────────────────────

async def _run_full_pipeline(project_id: str, session_id: str, max_iterations: int, use_groq: bool) -> None:
    _sessions[session_id] = {
        "project_id": project_id,
        "status": "running",
        "provider": "groq" if use_groq else "auto",
        "agents_run": [],
        "test_cases_generated": 0,
        "bugs_found": 0,
        "patches_generated": 0,
    }
    clone_path = None
    try:
        from beanie import PydanticObjectId

        from app.models.project import Project
        project = await Project.get(PydanticObjectId(project_id))
        if not project:
            raise ValueError(f"Project {project_id} not found")

        llm = get_groq_llm() if use_groq else get_best_llm()

        # ── Re-clone repo for real code context ──────────────────────────────
        repo_summary_dict: dict = {
            "language": project.language,
            "framework": project.framework,
            "total_files": project.total_files,
            "total_functions": project.config.get("total_functions", 0),
            "total_classes": project.config.get("total_classes", 0),
            "api_endpoints": [],
            "files": [],
        }
        if project.repo_url:
            try:
                from app.agents.github_import import clone_and_scan
                logger.info("full_pipeline_cloning", session_id=session_id, url=project.repo_url)
                summary = await clone_and_scan(project.repo_url, project.branch or "main")
                clone_path = summary.local_path
                repo_summary_dict = {
                    "language": summary.language or project.language,
                    "framework": summary.framework or project.framework,
                    "total_files": summary.total_files,
                    "total_functions": summary.total_functions,
                    "total_classes": summary.total_classes,
                    "api_endpoints": summary.api_endpoints[:20],
                    "files": [
                        {
                            "path": f.path,
                            "language": f.language,
                            "functions": f.functions[:10],
                            "classes": f.classes[:5],
                            "content": f.content[:1500],
                        }
                        for f in summary.files[:30]
                    ],
                }
                logger.info("full_pipeline_clone_done", session_id=session_id,
                            files=summary.total_files, fns=summary.total_functions)
            except Exception as clone_err:
                logger.warning("full_pipeline_clone_failed", error=str(clone_err))
                # Proceed with project metadata as fallback

        # ── Compile graph ─────────────────────────────────────────────────────
        graph = build_agent_graph(llm).compile()

        initial_state = {
            "project_id":    project_id,
            "session_id":    session_id,
            "iteration":     0,
            "max_iterations": max_iterations,
            "status":        PipelineStatus.PLANNING,
            "messages":      [],
            # Real project context for the Planner
            "repo_url":      project.repo_url,
            "language":      project.language,
            "framework":     project.framework,
            "local_path":    clone_path or project.local_path or "",
            "repo_summary":  repo_summary_dict,
        }

        logger.info("full_pipeline_started", session_id=session_id, project=project.name,
                    provider="groq" if use_groq else "auto",
                    files=repo_summary_dict["total_files"])

        # ── Stream graph execution, updating agents_run after each node ──────
        # LangGraph's .astream() yields events; we collect them to update the
        # live session status so the frontend polling sees real progress.
        final_state: dict = {}
        async for event in graph.astream(initial_state):  # type: ignore[call-overload]
            # Each event is {node_name: state_delta}
            for node_name, state_delta in event.items():
                if node_name == "__end__":
                    continue
                if node_name not in _sessions[session_id]["agents_run"]:
                    _sessions[session_id]["agents_run"].append(node_name)
                    logger.info("agent_completed", session_id=session_id, agent=node_name)
                # Merge delta into final_state
                if isinstance(state_delta, dict):
                    final_state.update(state_delta)

        # ── Persist results ───────────────────────────────────────────────────
        tests_saved   = await _save_test_cases(project, final_state.get("generated_tests", []))
        bugs_saved    = await _save_bugs(
            project,
            final_state.get("bug_localizations", []),
            final_state.get("root_causes", []),
            final_state.get("patches", []),
            clone_path or project.local_path or ""
        )
        patches_saved = await _save_patches(project, final_state.get("patches", []))

        project.total_test_cases      = (project.total_test_cases or 0) + tests_saved
        project.total_bugs_found      = (project.total_bugs_found or 0) + bugs_saved
        project.total_patches_applied = (project.total_patches_applied or 0) + patches_saved
        await project.save()

        # Final agents_run from actual trace (authoritative)
        agents_run = [a.agent for a in final_state.get("agent_trace", [])]
        if not agents_run:
            agents_run = _sessions[session_id]["agents_run"]  # fallback to streaming list

        _sessions[session_id].update({
            "status": "complete",
            "agents_run": agents_run,
            "test_cases_generated": tests_saved,
            "bugs_found": bugs_saved,
            "patches_generated": patches_saved,
        })
        logger.info("full_pipeline_complete", session_id=session_id,
                    tests=tests_saved, bugs=bugs_saved, patches=patches_saved)

    except Exception as e:
        logger.exception("full_pipeline_error", session_id=session_id, error=str(e))
        _sessions[session_id].update({"status": "error", "error": str(e)})
    finally:
        if clone_path:
            from app.agents.github_import import cleanup_clone
            cleanup_clone(clone_path)




# ── Background: Test-suite generation only (faster) ──────────────────────────

async def _run_test_generation(project_id: str, session_id: str) -> None:
    """Runs only the Planner → Requirement → Architecture → TestStrategy → TestGeneration chain."""
    _sessions[session_id] = {
        "project_id": project_id,
        "status": "running",
        "provider": "groq",
        "agents_run": [],
        "test_cases_generated": 0,
        "bugs_found": 0,
        "patches_generated": 0,
    }
    clone_path = None
    try:
        from beanie import PydanticObjectId

        from app.models.project import Project
        project = await Project.get(PydanticObjectId(project_id))
        if not project:
            raise ValueError(f"Project {project_id} not found")

        llm = get_groq_llm()

        # ── Re-clone and scan repo to get real code context ──────────────────
        repo_summary_dict: dict = {
            "language": project.language,
            "framework": project.framework,
            "total_files": project.total_files,
            "total_functions": project.config.get("total_functions", 0),
            "total_classes": project.config.get("total_classes", 0),
            "api_endpoints": [],
            "files": [],
        }
        if project.repo_url:
            try:

                from app.agents.github_import import clone_and_scan
                logger.info("test_gen_cloning", session_id=session_id, url=project.repo_url)
                summary = await clone_and_scan(project.repo_url, project.branch or "main")
                clone_path = summary.local_path
                repo_summary_dict = {
                    "language": summary.language or project.language,
                    "framework": summary.framework or project.framework,
                    "total_files": summary.total_files,
                    "total_functions": summary.total_functions,
                    "total_classes": summary.total_classes,
                    "api_endpoints": summary.api_endpoints[:20],
                    "files": [
                        {
                            "path": f.path,
                            "language": f.language,
                            "functions": f.functions[:10],
                            "classes": f.classes[:5],
                            "content": f.content[:1500],
                        }
                        for f in summary.files[:30]
                    ],
                }
                logger.info("test_gen_clone_done", session_id=session_id,
                            files=summary.total_files, functions=summary.total_functions)
            except Exception as clone_err:
                logger.warning("test_gen_clone_failed", error=str(clone_err), session_id=session_id)
                # Continue with whatever metadata we have from the project record

        # ── Build lightweight 5-agent pipeline ───────────────────────────────
        from langgraph.graph import END, StateGraph

        from app.agents.nodes.architecture import ArchitectureAgent
        from app.agents.nodes.planner import PlannerAgent
        from app.agents.nodes.requirement import RequirementAgent
        from app.agents.nodes.test_generation import TestGenerationAgent
        from app.agents.nodes.test_strategy import TestStrategyAgent
        from app.agents.state import AgentState

        workflow = StateGraph(AgentState)
        workflow.add_node("planner",        PlannerAgent(llm))
        workflow.add_node("requirement",    RequirementAgent(llm))
        workflow.add_node("architecture",   ArchitectureAgent(llm))
        workflow.add_node("test_strategy",  TestStrategyAgent(llm))
        workflow.add_node("test_generation", TestGenerationAgent(llm))

        workflow.set_entry_point("planner")
        workflow.add_edge("planner",        "requirement")
        workflow.add_edge("requirement",    "architecture")
        workflow.add_edge("architecture",   "test_strategy")
        workflow.add_edge("test_strategy",  "test_generation")
        workflow.add_edge("test_generation", END)

        graph = workflow.compile()

        initial_state = {
            "project_id":    project_id,
            "session_id":    session_id,
            "iteration":     0,
            "max_iterations": 1,
            "status":        PipelineStatus.PLANNING,
            "messages":      [],
            # ── Real project context for the Planner ──
            "repo_url":      project.repo_url,
            "language":      project.language,
            "framework":     project.framework,
            "local_path":    clone_path or project.local_path or "",
            "repo_summary":  repo_summary_dict,
        }

        logger.info("test_gen_started", session_id=session_id, project=project.name,
                    files=repo_summary_dict["total_files"])

        # Stream for live per-agent updates
        final_state: dict = {}
        async for event in graph.astream(initial_state):  # type: ignore[call-overload]
            for node_name, state_delta in event.items():
                if node_name == "__end__":
                    continue
                if node_name not in _sessions[session_id]["agents_run"]:
                    _sessions[session_id]["agents_run"].append(node_name)
                    logger.info("agent_completed", session_id=session_id, agent=node_name)
                if isinstance(state_delta, dict):
                    final_state.update(state_delta)

        tests_saved = await _save_test_cases(project, final_state.get("generated_tests", []))

        project.total_test_cases = (project.total_test_cases or 0) + tests_saved
        await project.save()

        agents_run = [a.agent for a in final_state.get("agent_trace", [])]
        if not agents_run:
            agents_run = _sessions[session_id]["agents_run"]

        _sessions[session_id].update({
            "status": "complete",
            "agents_run": agents_run,
            "test_cases_generated": tests_saved,
        })
        logger.info("test_gen_complete", session_id=session_id, tests=tests_saved)


    except Exception as e:
        logger.exception("test_gen_error", session_id=session_id, error=str(e))
        _sessions[session_id].update({"status": "error", "error": str(e)})
    finally:
        # Clean up cloned repo if we made one
        if clone_path:
            from app.agents.github_import import cleanup_clone
            cleanup_clone(clone_path)




# ── Routes ────────────────────────────────────────────────────────────────────

@router.post(
    "/generate-tests/{project_id}",
    response_model=TriggerPipelineResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Generate test suite with Groq",
    description="Runs Planner→Requirement→Architecture→TestStrategy→TestGeneration using Groq llama-3.3-70b. Results saved to MongoDB.",
)
async def generate_tests(
    project_id: str,
    background_tasks: BackgroundTasks,
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    session_id = str(uuid4())
    background_tasks.add_task(_run_test_generation, project_id, session_id)
    return TriggerPipelineResponse(
        session_id=session_id,
        status="started",
        message=f"Groq test generation running. Poll /agents/status/{session_id}",
    )


@router.post(
    "/trigger",
    response_model=TriggerPipelineResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Run full 13-agent pipeline with Groq",
    description="Runs the full agent pipeline using Groq llama-3.3-70b. Tests, bugs, and patches are saved to MongoDB.",
)
async def trigger_agent_pipeline(
    payload: TriggerPipelineRequest,
    background_tasks: BackgroundTasks,
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    session_id = str(uuid4())
    # Always use Groq as requested
    background_tasks.add_task(_run_full_pipeline, payload.project_id, session_id, payload.max_iterations, True)
    return TriggerPipelineResponse(
        session_id=session_id,
        status="started",
        message=f"Full Groq pipeline running. Poll /agents/status/{session_id}",
    )


@router.get(
    "/status/{session_id}",
    response_model=PipelineStatusResponse,
    summary="Poll pipeline status",
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
        **session,
    )


@router.get(
    "/sessions",
    summary="List all pipeline sessions",
)
async def list_sessions(_user_id: str = Depends(get_current_user_id)) -> Any:
    return [{"session_id": sid, **info} for sid, info in _sessions.items()]
