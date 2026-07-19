"""Regression Checker — runs the full test suite after a patch to detect regressions.

Executes the complete pytest suite in a clean sandbox and compares
pass/fail counts against a pre-repair baseline snapshot.
"""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.execution.runners.pytest_runner import PytestRunner

logger = get_logger(__name__)


class RegressionChecker:
    """Full regression sweep runner — validates that a patch does not break passing tests."""

    @classmethod
    async def run(
        cls,
        run_id: str,
        project_path: str,
        baseline_passed: int,
    ) -> dict[str, Any]:
        """Run the full test suite and compare against a baseline.

        Args:
            run_id: Current repair run ID.
            project_path: Path to the (patched) project root.
            baseline_passed: Number of tests that passed before the patch.

        Returns:
            Dict with: ok (bool), passed, failed, delta, message.
        """
        result = await PytestRunner.run(
            run_id=f"{run_id}-regression",
            project_path=project_path,
            test_files=["."],
        )

        passed = result.get("passed", 0)
        failed = result.get("failed", 0)
        delta = passed - baseline_passed

        ok = failed == 0 and passed >= baseline_passed

        msg = (
            f"Regression OK — {passed} passed (Δ{delta:+d})"
            if ok else
            f"Regression FAILED — {failed} tests now fail, {passed} pass (Δ{delta:+d})"
        )

        logger.info(
            "regression_check_complete",
            run_id=run_id,
            ok=ok,
            passed=passed,
            failed=failed,
            delta=delta,
        )

        return {
            "ok": ok,
            "passed": passed,
            "failed": failed,
            "delta": delta,
            "message": msg,
            "logs": result.get("logs", ""),
        }
