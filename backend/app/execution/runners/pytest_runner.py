"""PyTest runner — installs deps, runs pytest with coverage and JUnit XML output."""

from __future__ import annotations

import sys
import json
import time
import re
from typing import Any

from app.core.logging import get_logger
from app.execution.sandbox import DockerSandbox, SandboxResult
from app.execution.coverage_parser import CoverageParser
from app.execution.result_parser import ResultParser

logger = get_logger(__name__)

PYTEST_SETUP_COMMANDS = [
    [sys.executable, "-m", "pip", "install", "--quiet",
     "pytest", "pytest-cov", "pytest-asyncio", "pytest-json-report", "httpx"],
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
            Dict with keys: passed, failed, errors, total, coverage, duration_ms, logs, exit_code.
        """
        async with DockerSandbox(
            framework="pytest",
            project_path=project_path,
            run_id=run_id,
        ) as sb:
            # Install dependencies
            for cmd in PYTEST_SETUP_COMMANDS:
                await sb.exec(cmd)

            if extra_deps:
                await sb.exec([sys.executable, "-m", "pip", "install", "--quiet"] + extra_deps)

            # Build test file arguments
            test_args = test_files if test_files else ["."]

            pytest_cmd = [
                sys.executable, "-m", "pytest",
                "--tb=short",
                "-v",
                "--json-report",
                "--json-report-file=report.json",
                "--junitxml=junit.xml",
                "--cov=.",
                "--cov-report=xml:coverage.xml",
                "--cov-report=term-missing",
            ] + test_args

            start_time = time.time()
            result: SandboxResult = await sb.exec(pytest_cmd)
            exec_duration_ms = round((time.time() - start_time) * 1000, 2)
            logs = result.stdout + "\n" + result.stderr

            # 1. Parse JSON report for primary structured results
            report_result = await sb.exec(["cat", "report.json"])
            summary = cls._parse_json_report(report_result.stdout)

            # 2. Fallback to JUnit XML or stdout regex if JSON report produced 0 tests
            if summary.get("total", 0) == 0:
                junit_result = await sb.exec(["cat", "junit.xml"])
                junit_summary = ResultParser.from_junit_xml(junit_result.stdout)
                if junit_summary.get("total", 0) > 0:
                    summary.update(junit_summary)
                else:
                    # Regex fallback from terminal logs
                    p_match = re.search(r"(\d+)\s+passed", logs)
                    f_match = re.search(r"(\d+)\s+failed", logs)
                    e_match = re.search(r"(\d+)\s+error", logs)
                    passed = int(p_match.group(1)) if p_match else 0
                    failed = int(f_match.group(1)) if f_match else 0
                    errors = int(e_match.group(1)) if e_match else 0
                    summary["passed"] = passed
                    summary["failed"] = failed
                    summary["errors"] = errors
                    summary["total"] = passed + failed + errors

            # Ensure duration_ms is populated
            if not summary.get("duration_ms"):
                summary["duration_ms"] = exec_duration_ms

            # 3. Extract accurate coverage percentage from coverage.xml
            cov_result = await sb.exec(["cat", "coverage.xml"])
            cov_data = CoverageParser.parse_xml(cov_result.stdout)
            summary["coverage"] = cov_data.get("line_coverage_pct", 0.0)

            summary["logs"] = logs
            summary["exit_code"] = result.exit_code

            logger.info(
                "pytest_run_complete",
                run_id=run_id,
                passed=summary.get("passed", 0),
                failed=summary.get("failed", 0),
                coverage=summary.get("coverage", 0.0),
                duration_ms=summary.get("duration_ms", 0.0),
            )
            return summary

    @classmethod
    def _parse_json_report(cls, json_str: str) -> dict[str, Any]:
        """Parse pytest-json-report output into a structured dict."""
        try:
            data = json.loads(json_str)
            summary = data.get("summary", {})
            passed = summary.get("passed", 0)
            failed = summary.get("failed", 0)
            errors = summary.get("error", 0)
            total = summary.get("total", 0) or (passed + failed + errors)
            return {
                "passed": passed,
                "failed": failed,
                "errors": errors,
                "total": total,
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

