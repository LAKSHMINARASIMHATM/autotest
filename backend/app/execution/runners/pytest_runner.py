"""PyTest runner — installs deps, runs pytest with coverage and JUnit XML output."""

from __future__ import annotations

import json
from typing import Any

from app.execution.sandbox import DockerSandbox, SandboxResult
from app.core.logging import get_logger

logger = get_logger(__name__)

PYTEST_SETUP_COMMANDS = [
    ["pip", "install", "--quiet", "pytest", "pytest-cov", "pytest-asyncio", "httpx"],
]


class PytestRunner:
    """Runs a pytest suite inside a DockerSandbox and returns structured results."""

    @classmethod
    async def run(
        cls,
        run_id: str,
        project_path: str,
        test_files: list[str],
        extra_deps: list[str] | None = None,
    ) -> dict[str, Any]:
        """Execute pytest tests inside an ephemeral container.

        Args:
            run_id: Unique test run identifier.
            project_path: Local path to the project root.
            test_files: List of relative test file paths to run.
            extra_deps: Additional pip packages to install before tests.

        Returns:
            Dict with keys: passed, failed, errors, coverage, logs, junit_xml.
        """
        async with DockerSandbox(
            framework="pytest",
            project_path=project_path,
            run_id=run_id,
        ) as sb:
            # Copy project into container
            await sb.copy_to(project_path, "/workspace")

            # Install dependencies
            for cmd in PYTEST_SETUP_COMMANDS:
                await sb.exec(cmd)

            if extra_deps:
                await sb.exec(["pip", "install", "--quiet"] + extra_deps)

            # Build test file arguments
            test_args = test_files if test_files else ["."]

            # Run pytest with JUnit XML + coverage
            pytest_cmd = [
                "python", "-m", "pytest",
                "--tb=short",
                "--quiet",
                "--json-report",
                "--json-report-file=/tmp/report.json",
                f"--junitxml=/tmp/junit.xml",
                "--cov=.",
                "--cov-report=xml:/tmp/coverage.xml",
                "--cov-report=term-missing",
            ] + test_args

            result: SandboxResult = await sb.exec(pytest_cmd)
            logs = result.stdout + "\n" + result.stderr

            # Parse JSON report for structured results
            report_result = await sb.exec(["cat", "/tmp/report.json"])
            summary = cls._parse_json_report(report_result.stdout)
            summary["logs"] = logs
            summary["exit_code"] = result.exit_code

            logger.info(
                "pytest_run_complete",
                run_id=run_id,
                passed=summary.get("passed", 0),
                failed=summary.get("failed", 0),
            )
            return summary

    @classmethod
    def _parse_json_report(cls, json_str: str) -> dict[str, Any]:
        """Parse pytest-json-report output into a structured dict."""
        try:
            data = json.loads(json_str)
            summary = data.get("summary", {})
            return {
                "passed": summary.get("passed", 0),
                "failed": summary.get("failed", 0),
                "errors": summary.get("error", 0),
                "total": summary.get("total", 0),
                "duration_ms": round(data.get("duration", 0) * 1000, 2),
                "failures": [
                    {
                        "node_id": t.get("nodeid", ""),
                        "outcome": t.get("outcome", ""),
                        "longrepr": t.get("call", {}).get("longrepr", ""),
                    }
                    for t in data.get("tests", [])
                    if t.get("outcome") in ("failed", "error")
                ],
            }
        except (json.JSONDecodeError, KeyError):
            return {"passed": 0, "failed": 0, "errors": 0, "total": 0, "failures": []}
