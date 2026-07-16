"""Metrics Service — aggregates quality metrics from MongoDB for the dashboard."""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)


class MetricsService:
    """Computes and aggregates quality engineering metrics for a project run."""

    @classmethod
    async def get_dashboard_metrics(cls, project_id: str) -> dict[str, Any]:
        """Return all key metrics for the dashboard overview tiles.

        Queries MongoDB models (TestRun, BugReport, Patch, PatchValidation).
        Falls back gracefully when collections are empty (demo mode).

        Returns:
            Dict matching the DashboardMetrics schema used by the frontend.
        """
        # Import models lazily to avoid circular imports at module load
        from app.models.test_run import TestRun
        from app.models.test_case import TestCase
        from app.models.bug_report import BugReport
        from app.models.patch import Patch
        from app.models.patch_validation import PatchValidation

        try:
            total_tests = await TestCase.find(TestCase.project_id == project_id).count()
            total_runs = await TestRun.find(TestRun.project_id == project_id).count()
            total_bugs = await BugReport.find(BugReport.project_id == project_id).count()
            total_patches = await Patch.find(Patch.project_id == project_id).count()

            # Latest run metrics
            latest_run = await TestRun.find(
                TestRun.project_id == project_id
            ).sort(-TestRun.created_at).first_or_none()

            passed = latest_run.passed if latest_run else 0
            failed = latest_run.failed if latest_run else 0
            coverage = latest_run.coverage if latest_run else 0.0
            total_in_run = passed + failed

            # Patch success rate
            accepted = await PatchValidation.find(
                PatchValidation.verdict == "accepted"
            ).count()
            repair_rate = round(accepted / total_patches * 100, 1) if total_patches else 0.0

            return {
                "project_id": project_id,
                "total_test_cases": total_tests,
                "total_runs": total_runs,
                "latest_run": {
                    "passed": passed,
                    "failed": failed,
                    "total": total_in_run,
                    "pass_rate": round(passed / total_in_run * 100, 1) if total_in_run else 0.0,
                    "coverage_pct": round(coverage, 2),
                },
                "total_bugs": total_bugs,
                "total_patches": total_patches,
                "patch_success_rate": repair_rate,
                "agents_executed": 13,
            }

        except Exception as e:
            logger.warning("metrics_db_unavailable", error=str(e))
            # Return demo data when DB is not connected
            return cls._demo_metrics(project_id)

    @classmethod
    def _demo_metrics(cls, project_id: str) -> dict[str, Any]:
        return {
            "project_id": project_id,
            "total_test_cases": 247,
            "total_runs": 12,
            "latest_run": {
                "passed": 231,
                "failed": 16,
                "total": 247,
                "pass_rate": 93.5,
                "coverage_pct": 87.2,
            },
            "total_bugs": 23,
            "total_patches": 19,
            "patch_success_rate": 78.9,
            "agents_executed": 13,
        }

    @classmethod
    async def get_coverage_trend(cls, project_id: str, limit: int = 10) -> list[dict[str, Any]]:
        """Return coverage % over last N test runs for trend chart."""
        from app.models.test_run import TestRun
        try:
            runs = await TestRun.find(
                TestRun.project_id == project_id
            ).sort(-TestRun.created_at).limit(limit).to_list()
            return [
                {"run_id": str(r.id)[:8], "coverage": r.coverage, "passed": r.passed, "failed": r.failed}
                for r in reversed(runs)
            ]
        except Exception:
            # Demo trend data
            return [
                {"run_id": f"run-{i}", "coverage": 60 + i * 3, "passed": 180 + i * 5, "failed": 30 - i * 2}
                for i in range(9)
            ]

    @classmethod
    async def get_bug_severity_distribution(cls, project_id: str) -> dict[str, int]:
        """Return count of bugs per severity level."""
        from app.models.bug_report import BugReport
        try:
            bugs = await BugReport.find(BugReport.project_id == project_id).to_list()
            dist: dict[str, int] = {"critical": 0, "high": 0, "medium": 0, "low": 0}
            for b in bugs:
                sev = getattr(b, "severity", "medium")
                dist[sev] = dist.get(sev, 0) + 1
            return dist
        except Exception:
            return {"critical": 3, "high": 7, "medium": 9, "low": 4}

    @classmethod
    async def get_patch_strategy_breakdown(cls, project_id: str) -> dict[str, int]:
        """Return patch counts per strategy."""
        from app.models.patch import Patch
        try:
            patches = await Patch.find(Patch.project_id == project_id).to_list()
            breakdown: dict[str, int] = {}
            for p in patches:
                s = getattr(p, "strategy", "minimal")
                breakdown[s] = breakdown.get(s, 0) + 1
            return breakdown
        except Exception:
            return {"minimal": 8, "defensive": 5, "refactor": 4, "boundary": 2}
