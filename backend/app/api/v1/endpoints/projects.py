"""Project endpoints — CRUD + GitHub import + agent pipeline trigger."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, UploadFile, File, Form
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
    from beanie import PydanticObjectId

    from app.agents.github_import import cleanup_clone
    from app.agents.llm_factory import get_best_llm
    from app.agents.orchestrator import build_agent_graph
    from app.agents.state import PipelineStatus
    from app.core.logging import get_logger
    from app.models.project import Project

    log = get_logger(__name__)
    session_id = str(uuid4())

    try:
        project = await Project.get(PydanticObjectId(project_id))
        if not project:
            log.error("project_not_found_background", project_id=project_id)
            return

        llm = get_best_llm()
        graph = build_agent_graph(llm).compile()

        initial_state = {
            "project_id": project_id,
            "session_id": session_id,
            "iteration": 0,
            "max_iterations": 2,
            "status": PipelineStatus.PLANNING,
            "messages": [],
            "repo_url": project.repo_url,
            "language": project.language,
            "framework": project.framework,
            "local_path": local_path or project.local_path or "",
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
        final_state = await graph.ainvoke(initial_state)
        log.info("pipeline_complete", project_id=project_id, session_id=session_id)

        # ── Persist results ───────────────────────────────────────────────────
        from app.api.v1.endpoints.agents import _save_test_cases, _save_bugs, _save_patches

        tests_saved = await _save_test_cases(project, final_state.get("generated_tests", []))
        bugs_saved = await _save_bugs(
            project,
            final_state.get("bug_localizations", []),
            final_state.get("root_causes", []),
            final_state.get("patches", []),
            local_path or project.local_path or ""
        )
        patches_saved = await _save_patches(project, final_state.get("patches", []))

        project.total_test_cases = (project.total_test_cases or 0) + tests_saved
        project.total_bugs_found = (project.total_bugs_found or 0) + bugs_saved
        project.total_patches_applied = (project.total_patches_applied or 0) + patches_saved
        await project.save()
        log.info("pipeline_results_saved", tests=tests_saved, bugs=bugs_saved, patches=patches_saved)

    except Exception as e:
        log.exception("pipeline_background_error", error=str(e))
    finally:
        cleanup_clone(local_path)


async def _analyze_file_with_hf(path: str, content: str) -> dict[str, Any] | None:
    """Analyze a single code file using Hugging Face LLM to extract structure & docstrings."""
    from app.agents.llm_factory import get_huggingface_llm
    from langchain_core.messages import HumanMessage
    from app.core.logging import get_logger
    import json

    if not content:
        return None

    log = get_logger(__name__)
    try:
        llm = get_huggingface_llm()
        prompt = f"""
You are an expert code analyst. Analyze the following code file named "{path}".
Extract the structural information of this code file as a valid JSON object. Do not include markdown code block formatting (like ```json). Return ONLY the raw JSON string.

The JSON schema must be:
{{
  "docstring": "High-level summary/description of this module/file",
  "classes": [
    {{
      "name": "ClassName",
      "docstring": "Description of the class",
      "methods": [
        {{
          "name": "method_name",
          "signature": "def method_name(self, ...)",
          "docstring": "Description of the method"
        }}
      ]
    }}
  ],
  "functions": [
    {{
      "name": "function_name",
      "signature": "def function_name(...)",
      "docstring": "Description of the function"
    }}
  ]
}}

Code:
{content[:8000]}
"""
        messages = [HumanMessage(content=prompt)]
        response = await llm.ainvoke(messages)
        resp_text = response.content.strip()

        # Clean any markdown code blocks
        if resp_text.startswith("```"):
            lines = resp_text.splitlines()
            if lines[0].startswith("```json") or lines[0] == "```":
                lines = lines[1:]
            if lines and lines[-1] == "```":
                lines = lines[:-1]
            resp_text = "\n".join(lines).strip()

        # Extra cleaning to ensure we only get a JSON structure
        start_idx = resp_text.find("{")
        end_idx = resp_text.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            resp_text = resp_text[start_idx:end_idx + 1]

        data = json.loads(resp_text)
        return data
    except Exception as e:
        log.warning("huggingface_file_analysis_failed", path=path, error=str(e))
        return None


async def ingest_project_structure_background(project_id: str, summary: Any) -> None:
    """Ingests the project's codebase structure into Neo4j (and MongoDB CodeEntity/SourceFile)."""
    from app.knowledge.graph.graph_builder import GraphBuilder
    from app.knowledge.graph.neo4j_service import Neo4jService
    from app.core.logging import get_logger
    from app.models.source_file import SourceFile
    from app.models.code_entity import CodeEntity, EntityType
    from beanie import PydanticObjectId

    log = get_logger(__name__)
    log.info("ingest_structure_background_start", project_id=project_id)
    
    p_id = PydanticObjectId(project_id)
    
    # 1. First run LLM analyses in sequence for files to respect rate limits
    llm_analyses = {}
    for f in summary.files:
        llm_analysis = await _analyze_file_with_hf(f.path, f.content)
        if llm_analysis:
            llm_analyses[f.path] = llm_analysis

    # 2. Save SourceFiles and CodeEntities to MongoDB for robust fallback
    try:
        # Clear existing to avoid duplicates if re-ingesting
        await SourceFile.find(SourceFile.project_id == p_id).delete()
        await CodeEntity.find(CodeEntity.project_id == p_id).delete()
        
        for f in summary.files:
            llm_analysis = llm_analyses.get(f.path)
            
            # Map LLM info
            cls_docstrings = {}
            func_docstrings = {}
            
            if llm_analysis:
                for cls_data in llm_analysis.get("classes", []):
                    c_name = cls_data.get("name")
                    if c_name:
                        cls_docstrings[c_name] = cls_data.get("docstring", "")
                for fn_data in llm_analysis.get("functions", []):
                    f_name = fn_data.get("name")
                    if f_name:
                        func_docstrings[f_name] = fn_data.get("docstring", "")

            sf = SourceFile(
                project_id=p_id,
                module_name=f.path.replace("/", ".").replace(".py", ""),
                path=f.path,
                language=f.language,
                line_count=len(f.content.splitlines()) if f.content else 0,
                is_indexed=True
            )
            await sf.insert()
            
            # Save classes
            for cls_name in f.classes:
                ce = CodeEntity(
                    project_id=p_id,
                    file_id=sf.id,
                    entity_type=EntityType.CLASS,
                    name=cls_name,
                    qualified_name=f"{sf.module_name}.{cls_name}",
                    docstring=cls_docstrings.get(cls_name, "")
                )
                await ce.insert()
                
            # Save functions
            for fn_name in f.functions:
                ce = CodeEntity(
                    project_id=p_id,
                    file_id=sf.id,
                    entity_type=EntityType.FUNCTION,
                    name=fn_name,
                    qualified_name=f"{sf.module_name}.{fn_name}",
                    docstring=func_docstrings.get(fn_name, "")
                )
                await ce.insert()
                
        log.info("mongodb_structure_ingested", project_id=project_id)
    except Exception as mongo_err:
        log.exception("mongodb_structure_ingest_failed", error=str(mongo_err))

    # 3. Ingest into Neo4j
    try:
        # Convert RepoSummary to GraphBuilder analysis format
        modules_data = []
        for f in summary.files:
            mod_name = f.path.replace("/", ".").replace(".py", "")
            llm_analysis = llm_analyses.get(f.path)
            
            cls_docstrings = {}
            func_docstrings = {}
            func_signatures = {}
            
            if llm_analysis:
                for cls_data in llm_analysis.get("classes", []):
                    c_name = cls_data.get("name")
                    if c_name:
                        cls_docstrings[c_name] = cls_data.get("docstring", "")
                                
                for fn_data in llm_analysis.get("functions", []):
                    f_name = fn_data.get("name")
                    if f_name:
                        func_docstrings[f_name] = fn_data.get("docstring", "")
                        func_signatures[f_name] = fn_data.get("signature", "")

            classes_list = []
            for cls_name in f.classes:
                methods_list = []
                if llm_analysis:
                    for cls_data in llm_analysis.get("classes", []):
                        if cls_data.get("name") == cls_name:
                            for m_data in cls_data.get("methods", []):
                                m_name = m_data.get("name")
                                if m_name:
                                    methods_list.append({
                                        "name": m_name,
                                        "signature": m_data.get("signature") or f"{m_name}()",
                                        "docstring": m_data.get("docstring") or ""
                                    })
                                    
                classes_list.append({
                    "name": cls_name,
                    "docstring": cls_docstrings.get(cls_name, ""),
                    "methods": methods_list
                })

            functions_list = []
            for fn_name in f.functions:
                functions_list.append({
                    "name": fn_name,
                    "signature": func_signatures.get(fn_name) or f"{fn_name}()",
                    "docstring": func_docstrings.get(fn_name, "")
                })

            modules_data.append({
                "name": mod_name,
                "file_path": f.path,
                "classes": classes_list,
                "functions": functions_list
            })
            
        # Extract dependencies from imports
        dependencies = []
        for f in summary.files:
            from_mod = f.path.replace("/", ".").replace(".py", "")
            for imp in f.imports:
                for other_f in summary.files:
                    to_mod = other_f.path.replace("/", ".").replace(".py", "")
                    if to_mod != from_mod and (to_mod.split(".")[-1] in imp or other_f.path.replace(".py", "") in imp):
                        dependencies.append({"from": from_mod, "to": to_mod})

        analysis = {
            "name": summary.repo_url.rstrip("/").split("/")[-1] if summary.repo_url else "Project",
            "modules": modules_data,
            "dependencies": dependencies,
            "calls": []
        }
        
        await GraphBuilder.ingest_project_structure(project_id, analysis)
        
        # Link existing APIs
        for ep in summary.api_endpoints:
            ep_query = """
            MATCH (p:Project {id: $project_id})
            MERGE (e:API {method: $method, path: $path})
            MERGE (p)-[:EXPOSES_API]->(e)
            """
            await Neo4jService.execute_query(ep_query, {
                "project_id": project_id,
                "method": ep.get("method", "GET"),
                "path": ep.get("path", "")
            })
            
        log.info("neo4j_structure_ingested", project_id=project_id)
    except Exception as neo4j_err:
        log.exception("neo4j_structure_ingest_failed", error=str(neo4j_err))


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

    # Schedule knowledge graph structure ingestion in the background
    background_tasks.add_task(
        ingest_project_structure_background,
        project.id,
        summary,
    )

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


@router.post(
    "/import/zip",
    response_model=GitHubImportResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Import project from ZIP file",
    description="Upload a ZIP file containing project code, scan its structure, and optionally run the AI agent pipeline.",
)
async def import_from_zip(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    name: str = Form(""),
    repo_url: str = Form(""),
    description: str = Form(""),
    auto_run_agents: bool = Form(True),
    user_id: str = Depends(get_current_user_id),
) -> GitHubImportResponse:
    import zipfile
    import os
    import shutil
    from pathlib import Path
    from uuid import uuid4
    from beanie import PydanticObjectId
    from app.models.project import Project
    from app.agents.github_import import scan_directory

    # Ensure file is a zip
    if not file.filename.endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only ZIP files are supported.",
        )

    # 1. Create project in MongoDB to get project ID
    proj_name = name or file.filename.rsplit(".", 1)[0]
    proj_desc = description or f"Uploaded ZIP file: {file.filename}"
    
    create_req = ProjectCreateRequest(
        name=proj_name,
        description=proj_desc,
        repo_url=repo_url or f"file://{file.filename}",
        language="python",  # placeholder, updated after scan
        framework="",
        branch="main",
        config={},
    )
    project = await ProjectService.create(create_req, owner_id=user_id)

    # 2. Setup persistent directories
    project_dir = Path("data/projects").resolve() / str(project.id)
    project_dir.mkdir(parents=True, exist_ok=True)
    zip_path = project_dir / "project.zip"
    src_dir = project_dir / "src"
    src_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Save ZIP file
        with open(zip_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Extract ZIP
        with zipfile.ZipFile(zip_path) as z:
            z.extractall(src_dir)

        # Collapse single root folder if present
        subdirs = [d for d in os.listdir(src_dir) if os.path.isdir(src_dir / d)]
        all_items = os.listdir(src_dir)
        if len(all_items) == 1 and len(subdirs) == 1:
            subdir_path = src_dir / subdirs[0]
            for item in os.listdir(subdir_path):
                shutil.move(str(subdir_path / item), str(src_dir))
            os.rmdir(subdir_path)

        # Scan directory
        summary = scan_directory(str(src_dir), repo_url=repo_url or f"file://{file.filename}")

    except Exception as e:
        # Cleanup project from DB and filesystem on failure
        db_proj = await Project.get(PydanticObjectId(project.id))
        if db_proj:
            await db_proj.delete()
        shutil.rmtree(project_dir, ignore_errors=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process ZIP file: {e}",
        )

    # 3. Update project details in MongoDB
    db_project = await Project.get(PydanticObjectId(project.id))
    if db_project:
        db_project.language = summary.language
        db_project.framework = summary.framework
        db_project.total_files = summary.total_files
        db_project.local_path = str(src_dir)
        db_project.config = {
            "total_functions": summary.total_functions,
            "total_classes": summary.total_classes,
        }
        await db_project.save()

    # Schedule knowledge graph structure ingestion in the background
    background_tasks.add_task(
        ingest_project_structure_background,
        project.id,
        summary,
    )

    # 4. Trigger pipeline if requested
    session_id = None
    if auto_run_agents:
        session_id = str(uuid4())
        # Schedule pipeline in background
        background_tasks.add_task(
            _run_pipeline_background,
            project.id,
            str(src_dir),
            summary,
        )

    return GitHubImportResponse(
        project_id=project.id,
        name=proj_name,
        repo_url=repo_url or f"file://{file.filename}",
        language=summary.language,
        framework=summary.framework,
        total_files=summary.total_files,
        total_functions=summary.total_functions,
        total_classes=summary.total_classes,
        api_endpoints=summary.api_endpoints,
        session_id=session_id,
        pipeline_status="pipeline_running" if auto_run_agents else "imported",
    )



# ── Sub-resource endpoints ───────────────────────────────────────────────────

@router.get("/{project_id}/test-cases")
async def get_project_test_cases(
    project_id: str,
    _user_id: str = Depends(get_current_user_id),
):
    """Retrieve all test cases for a project."""
    from beanie import PydanticObjectId

    from app.models.test_case import TestCase
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
    from beanie import PydanticObjectId

    from app.models.bug_report import BugReport
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
    from beanie import PydanticObjectId

    from app.models.patch import Patch
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


def chunk_file_content(content: str, max_chunk_lines: int = 150, overlap_lines: int = 20) -> list[tuple[int, str]]:
    """Split file content into overlapping chunks, returning a list of (start_line_num, numbered_chunk_text)."""
    lines = content.splitlines()
    if len(lines) <= max_chunk_lines:
        numbered = "\n".join(f"{i+1:3d} | {line}" for i, line in enumerate(lines))
        return [(1, numbered)]

    chunks = []
    i = 0
    while i < len(lines):
        end = min(i + max_chunk_lines, len(lines))
        chunk_lines = lines[i:end]
        numbered_lines = []
        for idx, line in enumerate(chunk_lines):
            line_num = i + idx + 1
            numbered_lines.append(f"{line_num:3d} | {line}")
        numbered_text = "\n".join(numbered_lines)
        chunks.append((i + 1, numbered_text))
        if end == len(lines):
            break
        i += (max_chunk_lines - overlap_lines)
    return chunks


async def run_huggingface_bug_scan(project_id: str) -> None:
    from app.core.logging import get_logger
    from app.models.project import Project
    from app.models.bug_report import BugReport, BugSeverity, BugStatus
    from app.agents.llm_factory import get_huggingface_llm
    from beanie import PydanticObjectId
    from langchain_core.messages import SystemMessage, HumanMessage
    import os
    import json
    import re

    log = get_logger(__name__)
    log.info("hf_scan_started", project_id=project_id)

    try:
        project = await Project.get(PydanticObjectId(project_id))
        if not project:
            log.error("hf_scan_project_not_found", project_id=project_id)
            return

        project_path = project.local_path
        if not project_path or not os.path.exists(project_path):
            log.error("hf_scan_invalid_local_path", path=project_path)
            return

        # Get Hugging Face LLM
        try:
            llm = get_huggingface_llm()
        except Exception as llm_err:
            log.error("hf_scan_llm_init_failed", error=str(llm_err))
            return

        bugs_found_count = 0

        # Run Ruff linter first
        import subprocess
        try:
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
            ruff_exe = os.path.join(backend_dir, ".venv", "Scripts", "ruff.exe")
            if not os.path.exists(ruff_exe):
                ruff_exe = "ruff"
            
            proc = subprocess.run(
                [ruff_exe, "check", "--format", "json", project_path],
                capture_output=True,
                text=True,
                check=False
            )
            
            if proc.stdout:
                lint_issues = json.loads(proc.stdout)
                for issue in lint_issues:
                    filename = issue.get("filename", "")
                    rel_path = os.path.relpath(filename, project_path).replace("\\", "/")
                    
                    code = issue.get("code", "")
                    msg = issue.get("message", "")
                    row = issue.get("location", {}).get("row", 1)
                    
                    severity = BugSeverity.MEDIUM
                    if code.startswith("E9") or code == "F821":
                        severity = BugSeverity.CRITICAL if code == "E999" else BugSeverity.HIGH
                    elif code.startswith("W") or code.startswith("I") or code.startswith("D"):
                        severity = BugSeverity.LOW
                        
                    # Find snippet
                    snippet = ""
                    try:
                        with open(filename, "r", encoding="utf-8") as f:
                            file_lines = f.read().splitlines()
                            if 0 <= row - 1 < len(file_lines):
                                start = max(0, row - 4)
                                end = min(len(file_lines), row + 4)
                                snippet_lines = []
                                for idx in range(start, end):
                                    prefix = "-> " if idx + 1 == row else "   "
                                    snippet_lines.append(f"{idx + 1:3d} {prefix}{file_lines[idx]}")
                                snippet = "\n".join(snippet_lines)
                    except Exception:
                        pass
                        
                    # Insert bug report
                    bug_report = BugReport(
                        project_id=project.id,
                        test_result_id=None,
                        severity=severity,
                        status=BugStatus.LOCALIZED,
                        file_path=rel_path,
                        class_name="",
                        method_name="module-level",
                        line_number=row,
                        confidence=1.0,
                        root_cause_summary=f"[{code}] {msg}",
                        dependency_impact=[],
                        requirement_violated="",
                        explanation={
                            "code_snippet": snippet,
                            "fix_suggestion": f"Resolve linter issue {code}: {msg}.",
                            "scan_type": "ruff_static_lint"
                        }
                    )
                    await bug_report.insert()
                    bugs_found_count += 1
                    
        except Exception as ruff_err:
            log.warning("ruff_lint_scan_failed", error=str(ruff_err))

        # Find all Python files in the directory
        code_files = []
        for root, dirs, files in os.walk(project_path):
            if any(ignored in root for ignored in [".git", ".venv", "__pycache__", "node_modules", "dist", "build"]):
                continue
            for file in files:
                if file.endswith(".py"):
                    code_files.append(os.path.join(root, file))

        log.info("hf_scan_found_files", count=len(code_files))

        system_prompt = """You are a senior static code analysis agent.
Scan the provided source code chunk and identify any logical bugs, security vulnerabilities, syntax errors, coding standard violations, or hidden edge cases (even small ones like wrong variable name references, off-by-one errors, or incorrect comparisons).
Each line is prefixed with its actual line number in the format `line_number | code`.

Respond ONLY with a JSON array in the following format:
[
    {
        "method_name": "<method/function name where bug exists>",
        "line_number": <the actual line number from the line prefix, as integer>,
        "severity": "critical|high|medium|low",
        "confidence": <float between 0.0 and 1.0>,
        "root_cause": "<detailed root cause analysis explanation of the bug>",
        "code_snippet": "<the exact buggy line or snippet>",
        "fix_suggestion": "<how to fix it>"
    }
]
If no bugs are found, respond with an empty JSON array: []"""
        # Scan code files (up to 15 files to keep runtimes reasonable)
        for full_file_path in code_files[:15]:
            rel_path = os.path.relpath(full_file_path, project_path).replace("\\", "/")
            try:
                with open(full_file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                chunks = chunk_file_content(content)
                for start_line, chunk_text in chunks:
                    user_prompt = f"File Path: {rel_path}\n\n=== SOURCE CODE CHUNK (Starting on line {start_line}) ===\n{chunk_text}\n\nScan this chunk and report any bugs in JSON format."

                    # Call HuggingFace
                    response = await llm.ainvoke([
                        SystemMessage(content=system_prompt),
                        HumanMessage(content=user_prompt)
                    ])

                    resp_text = response.content
                    if isinstance(resp_text, list):
                        resp_text = "".join(str(part) for part in resp_text)
                    resp_text = resp_text.strip()

                    # Extract JSON array
                    json_match = re.search(r"\[\s*\{.*\}\s*\]", resp_text, re.DOTALL)
                    raw_json = json_match.group(0) if json_match else resp_text

                    try:
                        detected_bugs = json.loads(raw_json)
                        if not isinstance(detected_bugs, list):
                            detected_bugs = [detected_bugs]
                    except Exception:
                        detected_bugs = []

                    for bug_data in detected_bugs:
                        if not isinstance(bug_data, dict):
                            continue

                        sev_str = str(bug_data.get("severity", "medium")).upper()
                        sev = getattr(BugSeverity, sev_str, BugSeverity.MEDIUM)

                        # Extract line number and snippet
                        line_num = int(bug_data.get("line_number") or 1)
                        snippet = bug_data.get("code_snippet", "")
                        if not snippet:
                            lines = content.splitlines()
                            start = max(0, line_num - 5)
                            end = min(len(lines), line_num + 5)
                            snippet_lines = []
                            for idx in range(start, end):
                                prefix = "-> " if idx + 1 == line_num else "   "
                                snippet_lines.append(f"{idx + 1:3d} {prefix}{lines[idx]}")
                            snippet = "\n".join(snippet_lines)

                        bug_report = BugReport(
                            project_id=project.id,
                            test_result_id=None,
                            severity=sev,
                            status=BugStatus.LOCALIZED,
                            file_path=rel_path,
                            class_name="",
                            method_name=bug_data.get("method_name") or "unknown",
                            line_number=line_num,
                            confidence=float(bug_data.get("confidence") or 0.85),
                            root_cause_summary=bug_data.get("root_cause") or "Static codebase scan defect detected.",
                            dependency_impact=[],
                            requirement_violated="",
                            explanation={
                                "code_snippet": snippet,
                                "fix_suggestion": bug_data.get("fix_suggestion") or "Please check this code block.",
                                "scan_type": "hugging_face_static_scan"
                            }
                        )
                        await bug_report.insert()
                        bugs_found_count += 1

            except Exception as file_err:
                log.warning("hf_scan_file_failed", file=rel_path, error=str(file_err))

        project.total_bugs_found = (project.total_bugs_found or 0) + bugs_found_count
        await project.save()
        log.info("hf_scan_complete", project_id=project_id, bugs_found=bugs_found_count)

    except Exception as e:
        log.exception("hf_scan_error", error=str(e))


@router.post("/{project_id}/scan-bugs")
async def trigger_huggingface_scan(
    project_id: str,
    background_tasks: BackgroundTasks,
    _user_id: str = Depends(get_current_user_id),
):
    """Trigger static bug scanning on every file using Hugging Face LLM in the background."""
    background_tasks.add_task(run_huggingface_bug_scan, project_id)
    return {"status": "scanning", "message": "Hugging Face static bug scan started in background."}
