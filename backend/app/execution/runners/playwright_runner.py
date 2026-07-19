"""Playwright runner — headless browser test execution for UI tests."""

from __future__ import annotations

import json
from typing import Any

from app.core.logging import get_logger
from app.execution.sandbox import DockerSandbox, SandboxResult

logger = get_logger(__name__)


class PlaywrightRunner:
    """Runs Playwright Python test suites inside the official Playwright Docker image."""

    @classmethod
    async def run(
        cls,
        run_id: str,
        project_path: str,
        test_files: list[str],
        base_url: str = "http://localhost:3000",
    ) -> dict[str, Any]:
        """Execute Playwright tests inside an isolated container.

        Args:
            run_id: Unique test run identifier.
            project_path: Local path to project root.
            test_files: Relative paths to test files.
            base_url: Application base URL for the browser to target.

        Returns:
            Structured result dict with passed, failed, logs, screenshots.
        """
        async with DockerSandbox(
            framework="playwright",
            project_path=project_path,
            run_id=run_id,
        ) as sb:
            await sb.copy_to(project_path, "/workspace")

            # Install playwright python bindings + browsers
            await sb.exec(["pip", "install", "--quiet", "playwright", "pytest-playwright"])
            await sb.exec(["python", "-m", "playwright", "install", "--with-deps", "chromium"])

            test_args = test_files if test_files else ["."]
            cmd = [
                "python", "-m", "pytest",
                "--tb=short",
                "--json-report",
                "--json-report-file=pw_report.json",
                f"--base-url={base_url}",
            ] + test_args

            result: SandboxResult = await sb.exec(cmd)
            logs = result.stdout + "\n" + result.stderr

            report_result = await sb.exec(["cat", "pw_report.json"])
            summary = cls._parse_report(report_result.stdout)
            summary["logs"] = logs

            logger.info("playwright_run_complete", run_id=run_id)
            return summary

    @classmethod
    def _parse_report(cls, json_str: str) -> dict[str, Any]:
        try:
            data = json.loads(json_str)
            s = data.get("summary", {})
            return {
                "passed": s.get("passed", 0),
                "failed": s.get("failed", 0),
                "errors": s.get("error", 0),
                "total": s.get("total", 0),
                "duration_ms": round(data.get("duration", 0) * 1000, 2),
                "failures": [
                    {"node_id": t.get("nodeid", ""), "longrepr": t.get("call", {}).get("longrepr", "")}
                    for t in data.get("tests", [])
                    if t.get("outcome") in ("failed", "error")
                ],
            }
        except (json.JSONDecodeError, KeyError):
            return {"passed": 0, "failed": 0, "errors": 0, "total": 0, "failures": []}
