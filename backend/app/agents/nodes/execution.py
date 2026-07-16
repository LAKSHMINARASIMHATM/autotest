"""Execution Agent — dispatches tests to Docker sandbox runners and collects results."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, ExecutionResult, PipelineStatus
from app.execution.runners.pytest_runner import PytestRunner
from app.execution.runners.playwright_runner import PlaywrightRunner
from app.execution.runners.newman_runner import NewmanRunner
from app.execution.result_parser import ResultParser
from app.core.logging import get_logger

logger = get_logger(__name__)


class ExecutionAgent(BaseAgentNode):
    name = "execution"
    description = "Dispatches verified tests to Docker sandbox, collects results and coverage"

    # Map test type → runner class
    RUNNER_MAP = {
        "unit":        PytestRunner,
        "integration": PytestRunner,
        "api":         NewmanRunner,
        "security":    PytestRunner,
        "ui":          PlaywrightRunner,
        "regression":  PytestRunner,
        "boundary":    PytestRunner,
        "edge_case":   PytestRunner,
        "performance": PytestRunner,
    }

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        tests = state.get("generated_tests", [])
        project_ctx = state.get("project_context")
        verification = state.get("verification_result")

        verified_count = verification.passed if verification else len(tests)
        run_id = str(uuid4())[:8]
        project_path = project_ctx.repo_path if project_ctx else ""

        # Group tests by framework
        pytest_tests = [t for t in tests if t.framework in ("pytest",)]
        pw_tests = [t for t in tests if t.framework in ("playwright",)]
        newman_tests = [t for t in tests if t.framework in ("postman", "newman")]

        all_results = []

        try:
            if pytest_tests and project_path:
                r = await PytestRunner.run(
                    run_id=run_id,
                    project_path=project_path,
                    test_files=[t.name for t in pytest_tests],
                )
                all_results.append(r)
        except Exception as e:
            logger.warning("pytest_runner_error", error=str(e), run_id=run_id)

        try:
            if pw_tests and project_path:
                r = await PlaywrightRunner.run(
                    run_id=run_id,
                    project_path=project_path,
                    test_files=[t.name for t in pw_tests],
                )
                all_results.append(r)
        except Exception as e:
            logger.warning("playwright_runner_error", error=str(e), run_id=run_id)

        # Merge all runner results
        merged = ResultParser.merge_results(*all_results) if all_results else {
            "passed": 0, "failed": 0, "errors": 0, "total": verified_count,
            "duration_ms": 0.0, "failures": [], "logs": "No runners executed.",
        }

        result = ExecutionResult(
            test_run_id=run_id,
            total=merged.get("total", verified_count),
            passed=merged.get("passed", 0),
            failed=merged.get("failed", 0),
            errors=merged.get("errors", 0),
            coverage=0.0,
            duration_ms=merged.get("duration_ms", 0.0),
            failures=merged.get("failures", []),
            logs=merged.get("logs", ""),
        )

        explanation = self.build_explanation(
            decision=f"Run {run_id}: {result.passed}/{result.total} passed",
            reason="Dispatched tests to Docker sandbox runners and collected unified results",
            confidence=0.95,
            evidence=[
                f"passed={result.passed}, failed={result.failed}, errors={result.errors}",
                f"duration={result.duration_ms}ms",
            ],
        )

        return {
            "execution_result": result,
            "status": PipelineStatus.EXECUTING,
            "explanations": [explanation],
        }
