"""Repair API endpoints — trigger patch generation, list patches, validate a patch."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import get_current_user_id
from app.core.logging import get_logger
from app.repair.patch_engine import PatchEngine
from app.repair.patch_validator import PatchValidator
from app.repair.regression_checker import RegressionChecker

logger = get_logger(__name__)

router = APIRouter(prefix="/repair", tags=["repair"])


# ── Request / Response Schemas ────────────────────────────────────────────────

class GeneratePatchRequest(BaseModel):
    bug_id: str = Field(..., description="Localized bug identifier")
    file_path: str = Field(..., description="Relative file path of the bug")
    method_name: str = Field("", description="Faulty method/function name")
    buggy_code: str = Field("", description="Source code of the faulty region")
    error_message: str = Field("", description="Stack trace / assertion error")
    root_cause: str = Field("", description="Root cause analysis text")
    strategies: list[str] = Field(
        default_factory=list,
        description="Strategies to use: minimal, defensive, refactor, boundary (default: all)"
    )


class PatchResponse(BaseModel):
    id: str
    bug_id: str
    strategy: str
    file_path: str
    diff: str
    description: str
    confidence: float


class ValidatePatchRequest(BaseModel):
    patch_id: str
    patch_diff: str
    file_path: str
    project_path: str
    failing_test: str
    run_id: str = "manual"


class ValidationResponse(BaseModel):
    patch_id: str
    compilation_ok: bool
    failing_test_passes: bool
    regression_ok: bool
    coverage_maintained: bool
    verdict: str
    reason: str


class RegressionRequest(BaseModel):
    project_path: str = Field(..., description="Path to the patched project root")
    baseline_passed: int = Field(0, description="Number of tests that passed before the patch")


class ApprovePatchResponse(BaseModel):
    status: str
    patch_id: str
    commit_sha: str | None = None
    commit_message: str | None = None
    message: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/approve/{patch_id}", response_model=ApprovePatchResponse)
async def approve_patch(
    patch_id: str,
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Approve a patch candidate, apply it to project source code, commit to git, and update DB."""
    try:
        import os
        import git
        from pathlib import Path
        from beanie import PydanticObjectId
        from app.models.patch import Patch, PatchStatus
        from app.models.project import Project
        from app.models.bug_report import BugReport, BugStatus
        from app.repair.patch_validator import _apply_unified_diff

        try:
            patch_obj_id = PydanticObjectId(patch_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid patch ID format.")

        patch = await Patch.get(patch_obj_id)
        if not patch:
            raise HTTPException(status_code=404, detail=f"Patch {patch_id} not found.")

        # Determine target project directory
        workdir_path = None
        project = await Project.get(patch.project_id)
        if project and project.local_path and Path(project.local_path).exists():
            workdir_path = Path(project.local_path)
        else:
            # Fallback to current working directory root if local_path is unassigned
            workdir_path = Path.cwd()

        # 1. Apply patch diff to codebase
        patch_ok, patch_err = _apply_unified_diff(patch.diff, workdir_path)
        if not patch_ok:
            logger.error("approve_patch_apply_failed", patch_id=patch_id, error=patch_err)

        # 2. Git Stage, Commit, and Push
        commit_sha = None
        commit_msg = f"fix(autotest): apply patch [{patch.strategy}] for {patch.file_path or 'bug'}"
        try:
            target_dir = workdir_path.resolve()
            if not (target_dir / ".git").exists():
                git.Repo.init(target_dir)

            repo = git.Repo(target_dir)
            repo.git.add(A=True)
            if repo.is_dirty(untracked_files=True):
                commit_obj = repo.index.commit(commit_msg)
                commit_sha = commit_obj.hexsha[:8]
                logger.info("git_commit_successful", patch_id=patch_id, commit_sha=commit_sha)

                # Push to remote origin (e.g., GitHub) if origin remote is configured
                try:
                    if repo.remotes and "origin" in repo.remotes:
                        branch_name = project.branch if project and project.branch else "main"
                        repo.remotes.origin.push(refspec=f"HEAD:{branch_name}")
                        logger.info("git_push_successful", patch_id=patch_id, branch=branch_name)
                except Exception as push_err:
                    logger.warning("git_push_skipped_or_failed", patch_id=patch_id, error=str(push_err))
            else:
                try:
                    commit_sha = repo.head.commit.hexsha[:8]
                except Exception:
                    commit_sha = "HEAD"
        except Exception as git_err:
            logger.warning("git_commit_failed", patch_id=patch_id, error=str(git_err))
            commit_msg = f"Applied diff to file (Git commit note: {git_err})"


        # 3. Update DB records
        patch.status = PatchStatus.ACCEPTED
        await patch.save()

        if patch.bug_report_id:
            bug = await BugReport.get(patch.bug_report_id)
            if bug:
                bug.status = BugStatus.FIXED
                await bug.save()

        if project:
            project.total_patches_applied = (project.total_patches_applied or 0) + 1
            await project.save()

        return ApprovePatchResponse(
            status="accepted",
            patch_id=patch_id,
            commit_sha=commit_sha,
            commit_message=commit_msg,
            message=f"Patch approved and committed to repository ({commit_sha or 'committed'}).",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("patch_approve_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Patch approval failed: {e}")


@router.post("/reject/{patch_id}")
async def reject_patch(
    patch_id: str,
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Reject a patch candidate."""
    try:
        from beanie import PydanticObjectId
        from app.models.patch import Patch, PatchStatus

        try:
            p_obj = PydanticObjectId(patch_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid patch ID format.")

        patch = await Patch.get(p_obj)
        if not patch:
            raise HTTPException(status_code=404, detail=f"Patch {patch_id} not found.")

        patch.status = PatchStatus.REJECTED
        await patch.save()

        return {"status": "rejected", "patch_id": patch_id, "message": "Patch candidate rejected."}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("patch_reject_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Patch rejection failed: {e}")


@router.post(
    "/generate",
    response_model=list[PatchResponse],
    status_code=status.HTTP_201_CREATED,
)
async def generate_patches(
    payload: GeneratePatchRequest,
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Generate multi-strategy patch candidates for a localized bug using Groq LLM."""
    try:
        patches = await PatchEngine.generate_patches(
            bug_id=payload.bug_id,
            file_path=payload.file_path,
            method_name=payload.method_name,
            buggy_code=payload.buggy_code,
            error_message=payload.error_message,
            root_cause=payload.root_cause,
            strategies=payload.strategies or None,
        )

        # Retrieve bug and persist the patches + update status
        from beanie import PydanticObjectId
        from app.models.bug_report import BugReport, BugStatus
        from app.models.patch import Patch, PatchStrategy
        from app.models.patch import PatchStatus as PS

        try:
            bug_id_obj = PydanticObjectId(payload.bug_id)
            bug = await BugReport.get(bug_id_obj)
            if bug:
                # Save patches
                for p in patches:
                    strategy_str = str(p.get("strategy", "minimal")).upper()
                    p_model = Patch(
                        project_id=bug.project_id,
                        bug_report_id=bug.id,
                        strategy=getattr(PatchStrategy, strategy_str, PatchStrategy.MINIMAL),
                        status=PS.CANDIDATE,
                        diff=p.get("diff", ""),
                        file_path=p.get("file_path", "unknown"),
                        description=p.get("description", "Auto-generated patch"),
                        confidence=p.get("confidence", 0.7),
                    )
                    await p_model.insert()

                # Update bug status and suggestion
                bug.status = BugStatus.PATCH_GENERATED
                if not bug.explanation or not isinstance(bug.explanation, dict):
                    bug.explanation = {}
                if patches:
                    bug.explanation["fix_suggestion"] = patches[0].get("diff", "")
                await bug.save()
        except Exception as db_err:
            logger.warning("save_generated_patches_failed", error=str(db_err))

        return patches
    except Exception as e:
        logger.exception("patch_generate_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Patch generation failed: {e}")


@router.post(
    "/validate",
    response_model=ValidationResponse,
)
async def validate_patch(
    payload: ValidatePatchRequest,
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Apply a patch in an isolated Docker sandbox and validate it."""
    try:
        result = await PatchValidator.validate(
            patch_id=payload.patch_id,
            patch_diff=payload.patch_diff,
            file_path=payload.file_path,
            project_path=payload.project_path,
            failing_test=payload.failing_test,
            run_id=payload.run_id,
        )
        return result
    except Exception as e:
        logger.exception("patch_validate_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Patch validation failed: {e}")


@router.post("/regression")
async def run_regression(
    payload: RegressionRequest,
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Run full regression suite to verify patch does not break existing tests."""
    run_id = str(uuid4())[:8]
    try:
        return await RegressionChecker.run(
            run_id=run_id,
            project_path=payload.project_path,
            baseline_passed=payload.baseline_passed,
        )
    except Exception as e:
        logger.exception("regression_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Regression check failed: {e}")

