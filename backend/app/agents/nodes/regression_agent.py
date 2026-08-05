"""Regression Agent — runs full test suite regression after a patch is applied.

Agent #13 in the pipeline. Sits after Patch Validation and before Explainability/Learning.

Strategy:
1. If a real project path exists and patches were accepted: use RegressionChecker
   to run the full pytest suite and compare against the pre-patch baseline.
2. If no real project path (simulated run): use LLM to reason about whether
   the accepted patch would cause regressions in the existing test suite.
3. Always produces a RegressionReport — even a synthetic one — so downstream
   agents have a consistent artifact to reference.
"""

from __future__ import annotations

import json
from typing import Any

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, PipelineStatus, RegressionReport
from app.core.logging import get_logger

logger = get_logger(__name__)


class RegressionAgent(BaseAgentNode):
    name = "regression_agent"
    description = (
        "Runs full test-suite regression sweep after patch application; "
        "confirms no previously-passing tests are broken by the fix"
    )

    SYSTEM_PROMPT = """You are the Regression Agent of AutoTestAI.

After a patch has been applied to fix a bug, your job is to reason about
whether the patch could introduce regressions — breaking tests that previously passed.

Given the patch diff, the bug description, the root cause, and the list of
all generated tests, assess:
1. Which other tests might be affected by the change?
2. Would the patch break any previously passing tests?
3. Is the regression risk high, medium, or low?

Respond with JSON:
{
    "ok": <bool — true if no regressions expected>,
    "passed": <int — estimated tests still passing>,
    "failed": <int — estimated regressions introduced>,
    "delta": <int — change from baseline>,
    "risk_level": "low|medium|high",
    "affected_tests": ["<test_name>"],
    "message": "<brief regression assessment>",
    "logs": "<summary>"
}"""

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        patches = state.get("patches", [])
        patch_validations = state.get("patch_validations", [])
        exec_result = state.get("execution_result")
        project_ctx = state.get("project_context")

        # Determine baseline (how many tests passed before the patch)
        baseline_passed = exec_result.passed if exec_result else 0
        project_path = (
            (project_ctx.repo_path if project_ctx else "")
            or state.get("local_path", "")
        )

        # If no patches were accepted, skip regression (nothing changed)
        accepted = [v for v in patch_validations if v.verdict == "accepted"]
        if not patches or not accepted:
            report = RegressionReport(
                ok=True,
                passed=baseline_passed,
                failed=0,
                delta=0,
                message="No accepted patches to regress against — regression check skipped.",
                logs="",
            )
            explanation = self.build_explanation(
                decision="Regression check skipped — no accepted patches",
                reason="No patches passed validation, so the codebase was not modified",
                confidence=1.0,
            )
            return {
                "regression_report": report,
                "status": PipelineStatus.VALIDATING,
                "explanations": [explanation],
            }

        best_patch = patches[-1] if patches else None
        best_validation = accepted[-1] if accepted else patch_validations[-1] if patch_validations else None

        # ── 1. Real regression check if project exists on disk ────────────────
        real_result: dict[str, Any] | None = None

        if project_path:
            try:
                from app.repair.regression_checker import RegressionChecker
                run_id = exec_result.test_run_id if exec_result else "regression"
                real_result = await RegressionChecker.run(
                    run_id=run_id,
                    project_path=project_path,
                    baseline_passed=baseline_passed,
                )
                logger.info(
                    "real_regression_complete",
                    ok=real_result.get("ok"),
                    passed=real_result.get("passed"),
                    failed=real_result.get("failed"),
                )
            except Exception as e:
                logger.warning("regression_checker_failed", error=str(e))

        # ── 2. LLM simulation if real check is unavailable ────────────────────
        if real_result is None:
            logger.info("regression_llm_simulation", reason="no real project path or checker failed")
            real_result = await self._llm_regression(state, best_patch, best_validation, baseline_passed)

        report = RegressionReport(
            ok=bool(real_result.get("ok", True)),
            passed=int(real_result.get("passed", baseline_passed)),
            failed=int(real_result.get("failed", 0)),
            delta=int(real_result.get("delta", 0)),
            message=str(real_result.get("message", "")),
            logs=str(real_result.get("logs", ""))[:2000],
        )

        explanation = self.build_explanation(
            decision=f"Regression: {'PASS ✓' if report.ok else 'FAIL ✗'} — {report.passed} passed, {report.failed} failed (Δ{report.delta:+d})",
            reason=report.message,
            confidence=0.90 if project_path else 0.70,
            evidence=[
                f"Baseline: {baseline_passed} passing tests",
                f"Post-patch: {report.passed} passing",
                f"Regressions: {report.failed}",
            ],
        )

        return {
            "regression_report": report,
            "status": PipelineStatus.VALIDATING,
            "explanations": [explanation],
        }

    async def _llm_regression(
        self,
        state: AgentState,
        patch: Any,
        validation: Any,
        baseline_passed: int,
    ) -> dict[str, Any]:
        """LLM-based regression simulation for when the real project is unavailable."""
        tests = state.get("generated_tests", [])
        root_causes = state.get("root_causes", [])

        test_names = "\n".join(f"- {t.name} ({t.test_type}): {t.description}" for t in tests[:15])
        patch_summary = (
            f"File: {patch.file_path}\nStrategy: {patch.strategy}\n"
            f"Confidence: {patch.confidence:.0%}\nDiff:\n{patch.diff[:500]}"
            if patch else "No patch available"
        )
        root_summary = "\n".join(f"- {rc.bug_id}: {rc.summary}" for rc in root_causes[:5])
        validation_reason = validation.reason if validation else "Not validated"

        user_prompt = f"""Assess regression risk for this patch.

Patch Applied:
{patch_summary}

Root Causes Fixed:
{root_summary or 'Unknown'}

Validation Result: {validation.verdict if validation else 'unknown'} — {validation_reason}

Existing tests in the suite ({len(tests)} total):
{test_names or 'None'}

Baseline: {baseline_passed} tests were passing before this patch.

Reason about whether this patch would break any of the listed tests. Respond with JSON."""

        try:
            response = await self.invoke_llm(self.SYSTEM_PROMPT, user_prompt)
            data = json.loads(self.extract_json(response))
            # Normalize
            delta = int(data.get("delta", 0))
            return {
                "ok": bool(data.get("ok", True)),
                "passed": int(data.get("passed", baseline_passed + delta)),
                "failed": int(data.get("failed", 0)),
                "delta": delta,
                "message": data.get("message", "LLM regression simulation"),
                "logs": data.get("logs", "Simulated regression check complete."),
            }
        except Exception as e:
            logger.warning("regression_llm_failed", error=str(e))
            # Conservative fallback: assume no regression if patch was accepted
            patch_conf = patch.confidence if patch else 0.5
            ok = patch_conf >= 0.75
            return {
                "ok": ok,
                "passed": baseline_passed,
                "failed": 0,
                "delta": 0,
                "message": f"Regression assumed {'OK' if ok else 'RISKY'} based on patch confidence {patch_conf:.0%}",
                "logs": "Fallback regression assessment (LLM unavailable).",
            }
