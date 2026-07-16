"""Execution API endpoints — trigger test runs and query results."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import get_current_user_id
from app.execution.runners.pytest_runner import PytestRunner
from app.execution.runners.playwright_runner import PlaywrightRunner
from app.execution.runners.newman_runner import NewmanRunner
from app.execution.result_parser import ResultParser
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/execution", tags=["execution"])


class ExecuteTestsRequest(BaseModel):
    project_id: str = Field(..., description="Project identifier")
    project_path: str = Field(..., description="Path to project root on execution host")
    test_files: list[str] = Field(default_factory=list, description="Relative test file paths")
    framework: str = Field("pytest", description="Test runner: pytest | playwright | newman")
    collection_path: str = Field("", description="Collection path (Newman only)")


class ExecutionResultResponse(BaseModel):
    run_id: str
    framework: str
    passed: int
    failed: int
    errors: int
    total: int
    duration_ms: float
    coverage_pct: float
    failures: list[dict[str, Any]]
    logs: str


@router.post(
    "/run",
    response_model=ExecutionResultResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def execute_tests(
    payload: ExecuteTestsRequest,
    _user_id: str = Depends(get_current_user_id),
) -> Any:
    """Triggers a sandboxed test run and returns the execution results."""
    run_id = str(uuid4())[:8]

    try:
        if payload.framework == "pytest":
            result = await PytestRunner.run(
                run_id=run_id,
                project_path=payload.project_path,
                test_files=payload.test_files,
            )
        elif payload.framework == "playwright":
            result = await PlaywrightRunner.run(
                run_id=run_id,
                project_path=payload.project_path,
                test_files=payload.test_files,
            )
        elif payload.framework == "newman":
            result = await NewmanRunner.run(
                run_id=run_id,
                collection_path=payload.collection_path or payload.project_path,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported framework: {payload.framework}",
            )
    except Exception as e:
        logger.exception("execution_endpoint_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test execution failed: {e}",
        )

    return ExecutionResultResponse(
        run_id=run_id,
        framework=payload.framework,
        passed=result.get("passed", 0),
        failed=result.get("failed", 0),
        errors=result.get("errors", 0),
        total=result.get("total", 0),
        duration_ms=result.get("duration_ms", 0.0),
        coverage_pct=result.get("coverage", 0.0),
        failures=result.get("failures", []),
        logs=result.get("logs", ""),
    )
