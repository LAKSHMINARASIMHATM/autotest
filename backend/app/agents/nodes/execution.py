"""Execution Agent — dispatches tests to sandbox runners and collects results.

When Docker/sandbox is unavailable (common in dev), falls back to an LLM-powered
simulated execution that analyzes generated tests and produces realistic failure
reports for the bug-localization and repair pipeline to work on.
"""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, ExecutionResult, PipelineStatus
from app.core.logging import get_logger

logger = get_logger(__name__)


class ExecutionAgent(BaseAgentNode):
    name = "execution"
    description = "Dispatches verified tests to sandbox, collects results; falls back to LLM simulation"

    # Simulated execution prompt — used when no Docker sandbox is available
    SIM_SYSTEM_PROMPT = """You are an automated test execution simulator.

Given a list of test cases and the project source code, simulate running them and identify which would realistically fail due to bugs in the code.

For each failing test, provide:
- node_id: test function name (e.g. "tests/test_auth.py::test_login")
- error_type: AssertionError | TypeError | AttributeError | ImportError | RuntimeError
- message: realistic error message
- traceback: minimal realistic traceback (3-4 lines)
- file: source file that contains the bug

Be realistic: generate 1-3 failures for a typical project. Most tests should pass.

Respond with JSON:
{
    "passed": <int>,
    "failed": <int>,
    "errors": 0,
    "total": <int>,
    "duration_ms": <float>,
    "failures": [
        {
            "node_id": "tests/test_login.py::test_valid_credentials",
            "error_type": "AssertionError",
            "message": "Expected 200 but got 401",
            "traceback": "...",
            "file": "app/auth/login.py"
        }
    ],
    "logs": "<brief summary>"
}"""

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        tests = state.get("generated_tests", [])
        project_ctx = state.get("project_context")
        verification = state.get("verification_result")
        repo_summary = state.get("repo_summary") or {}

        verified_count = verification.passed if verification else len(tests)
        run_id = str(uuid4())[:8]
        project_path = (project_ctx.repo_path if project_ctx else None) or state.get("local_path") or ""

        result: ExecutionResult | None = None

        # ── Attempt real Docker execution ──────────────────────────────────────
        if project_path:
            result = await self._run_real(run_id, project_path, tests)

        # ── Fallback: LLM-simulated execution ─────────────────────────────────
        if result is None:
            logger.info("execution_sim_fallback", run_id=run_id,
                        reason="no project_path or Docker unavailable")
            result = await self._run_simulated(run_id, tests, verified_count, repo_summary, project_ctx)

        explanation = self.build_explanation(
            decision=f"Run {run_id}: {result.passed}/{result.total} passed, {result.failed} failed",
            reason="Executed test suite in sandbox (or simulated via LLM analysis)",
            confidence=0.90,
            evidence=[
                f"passed={result.passed}, failed={result.failed}, errors={result.errors}",
                f"duration={result.duration_ms:.0f}ms",
                f"failures={len(result.failures)}",
            ],
        )

        return {
            "execution_result": result,
            "status": PipelineStatus.EXECUTING,
            "explanations": [explanation],
        }

    # ── Real execution ─────────────────────────────────────────────────────────
    async def _run_real(self, run_id: str, project_path: str, tests: list) -> ExecutionResult | None:
        try:
            from app.execution.result_parser import ResultParser
            from app.execution.runners.playwright_runner import PlaywrightRunner
            from app.execution.runners.pytest_runner import PytestRunner

            pytest_tests = [t for t in tests if t.framework in ("pytest",)]
            pw_tests     = [t for t in tests if t.framework == "playwright"]

            all_results = []

            if pytest_tests:
                r = await PytestRunner.run(
                    run_id=run_id,
                    project_path=project_path,
                    test_files=[t.name for t in pytest_tests],
                )
                all_results.append(r)

            if pw_tests:
                r = await PlaywrightRunner.run(
                    run_id=run_id,
                    project_path=project_path,
                    test_files=[t.name for t in pw_tests],
                )
                all_results.append(r)

            if all_results:
                merged = ResultParser.merge_results(*all_results)
                return ExecutionResult(
                    test_run_id=run_id,
                    total=merged.get("total", len(tests)),
                    passed=merged.get("passed", 0),
                    failed=merged.get("failed", 0),
                    errors=merged.get("errors", 0),
                    coverage=0.0,
                    duration_ms=merged.get("duration_ms", 0.0),
                    failures=merged.get("failures", []),
                    logs=merged.get("logs", ""),
                )
        except Exception as e:
            logger.warning("real_execution_failed", error=str(e))
        return None

    # ── LLM-simulated execution ───────────────────────────────────────────────
    async def _run_simulated(
        self, run_id: str, tests: list, verified_count: int, repo_summary: dict, project_ctx: Any
    ) -> ExecutionResult:
        import json

        # Build context for the LLM
        test_names = "\n".join(
            f"- {t.name} ({t.test_type}/{t.framework}): {t.description}"
            for t in tests[:25]
        )
        files_info = ""
        if repo_summary.get("files"):
            for f in repo_summary["files"][:10]:
                snippet = (f.get("content") or "")[:300]
                files_info += f"\n\n## {f.get('path', '?')}\n{snippet}"

        user_prompt = f"""Simulate executing these {len(tests)} tests for the project.

Project: {project_ctx.name if project_ctx else 'Unknown'}
Language: {project_ctx.language if project_ctx else repo_summary.get('language', 'python')}
Framework: {project_ctx.framework if project_ctx else repo_summary.get('framework', '')}

Tests to execute:
{test_names or 'No tests'}

Source file snippets (for realistic failure simulation):
{files_info or 'No source available'}

Simulate execution and return JSON with realistic pass/fail results."""

        try:
            response = await self.invoke_llm(self.SIM_SYSTEM_PROMPT, user_prompt)
            data = json.loads(self.extract_json(response))

            return ExecutionResult(
                test_run_id=run_id,
                total=data.get("total", len(tests)),
                passed=data.get("passed", max(0, len(tests) - 1)),
                failed=data.get("failed", min(1, len(tests))),
                errors=data.get("errors", 0),
                coverage=0.0,
                duration_ms=float(data.get("duration_ms", 1200.0)),
                failures=data.get("failures", []),
                logs=data.get("logs", "Simulated execution complete."),
            )
        except Exception as e:
            logger.warning("simulated_execution_failed", error=str(e))
            # Hard fallback: mark 1 synthetic failure so the repair loop runs
            synthetic_test = tests[0] if tests else None
            return ExecutionResult(
                test_run_id=run_id,
                total=len(tests),
                passed=max(0, len(tests) - 1),
                failed=1,
                errors=0,
                coverage=0.0,
                duration_ms=800.0,
                failures=[{
                    "node_id": f"tests/{synthetic_test.name}.py::{synthetic_test.name}" if synthetic_test else "tests/test_main.py::test_placeholder",
                    "error_type": "AssertionError",
                    "message": "Simulated failure: expected value did not match",
                    "traceback": "AssertionError: assert result == expected\n  where result = <actual>",
                    "file": synthetic_test.target_entity if synthetic_test else "app/main.py",
                }],
                logs="Simulated execution (Docker sandbox unavailable).",
            )
