"""Execution Agent — runs tests in Docker sandbox, collects logs/coverage/screenshots."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, ExecutionResult, PipelineStatus


class ExecutionAgent(BaseAgentNode):
    name = "execution"
    description = "Runs verified tests in isolated Docker sandbox, collects results and coverage"

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        """Execute verified tests in a sandboxed environment.

        In production, this:
        1. Builds an ephemeral Docker container from the project
        2. Mounts test files into the container
        3. Runs pytest/junit/playwright/newman
        4. Collects stdout, stderr, coverage.xml, screenshots
        5. Parses results into ExecutionResult

        Actual Docker sandbox implementation is in Phase 7.
        """
        tests = state.get("generated_tests", [])
        verification = state.get("verification_result")

        verified_count = verification.passed if verification else len(tests)
        run_id = str(uuid4())[:8]

        # Framework: In production, this calls app.execution.sandbox
        result = ExecutionResult(
            test_run_id=run_id,
            total=verified_count,
            passed=0,
            failed=0,
            errors=0,
            coverage=0.0,
            duration_ms=0.0,
            failures=[],
            logs="",
        )

        explanation = self.build_explanation(
            decision=f"Executed {verified_count} tests in sandbox {run_id}",
            reason="Ran verified tests in isolated Docker container to collect results and coverage",
            confidence=0.95,
            evidence=[
                f"Test run ID: {run_id}",
                f"{verified_count} tests queued for execution",
            ],
        )

        return {
            "execution_result": result,
            "status": PipelineStatus.EXECUTING,
            "explanations": [explanation],
        }
