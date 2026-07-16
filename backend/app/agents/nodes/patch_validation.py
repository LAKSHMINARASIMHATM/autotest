"""Patch Validation Agent — validates candidate patches using PatchValidator sandbox."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, PatchValidation, PipelineStatus
from app.repair.patch_validator import PatchValidator


class PatchValidationAgent(BaseAgentNode):
    name = "patch_validation"
    description = "Validates patches in Docker sandbox: compile → failing test → regression sweep"

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        patches = state.get("patches", [])
        localizations = state.get("bug_localizations", [])
        project_ctx = state.get("project_context")
        execution_result = state.get("execution_result")

        if not patches:
            return {"patch_validations": []}

        project_path = project_ctx.repo_path if project_ctx else ""
        # Use first failing test from execution results, or generic default
        failing_test = ""
        if execution_result and execution_result.failures:
            failing_test = execution_result.failures[0].get("node_id", "")

        validations = []

        for patch in patches:
            raw = await PatchValidator.validate(
                patch_id=patch.id,
                patch_diff=patch.diff,
                file_path=patch.file_path,
                project_path=project_path,
                failing_test=failing_test,
                run_id=execution_result.test_run_id if execution_result else "unknown",
            )

            validation = PatchValidation(
                patch_id=raw["patch_id"],
                compilation_ok=raw["compilation_ok"],
                failing_test_passes=raw["failing_test_passes"],
                regression_ok=raw["regression_ok"],
                coverage_maintained=raw["coverage_maintained"],
                verdict=raw["verdict"],
                reason=raw["reason"],
            )
            validations.append(validation)

            # Stop at first accepted patch
            if validation.verdict == "accepted":
                break

        best = validations[-1] if validations else PatchValidation(verdict="rejected", reason="No patches to validate")

        explanation = self.build_explanation(
            decision=f"Best patch verdict: {best.verdict}",
            reason=best.reason,
            confidence=0.93 if best.verdict == "accepted" else 0.60,
            evidence=[
                f"Compilation: {best.compilation_ok}",
                f"Failing test passes: {best.failing_test_passes}",
                f"Regression OK: {best.regression_ok}",
            ],
        )

        return {
            "patch_validations": validations,
            "status": PipelineStatus.VALIDATING,
            "explanations": [explanation],
        }

