"""Playwright runner — headless browser test execution for UI tests."""

from __future__ import annotations

import json
import sys
import time
import re
from typing import Any

from app.core.logging import get_logger
from app.execution.sandbox import DockerSandbox, SandboxResult

logger = get_logger(__name__)


class PlaywrightRunner:
    """Runs Playwright Python test suites inside an isolated sandbox."""

    @classmethod
    async def run(
        cls,
        run_id: str,
        project_path: str,
        test_files: list[str],
        base_url: str = "http://localhost:3000",
    ) -> dict[str, Any]:
        """Execute Playwright tests inside an isolated sandbox."""
        async with DockerSandbox(
            framework="playwright",
            project_path=project_path,
            run_id=run_id,
        ) as sb:
            # Install playwright python bindings
            await sb.exec([sys.executable, "-m", "pip", "install", "--quiet", "playwright", "pytest-playwright", "pytest-json-report"])

            test_args = test_files if test_files else ["."]
            cmd = [
                sys.executable, "-m", "pytest",
                "--tb=short",
                "-v",
                "--ignore=data",
                "-o", "python_classes=TestCheck*",
                "--json-report",
                "--json-report-file=pw_report.json",
                f"--base-url={base_url}",
            ] + test_args

            start_time = time.time()
            result: SandboxResult = await sb.exec(cmd)
            exec_duration_ms = round((time.time() - start_time) * 1000, 2)
            logs = result.stdout + "\n" + result.stderr

            report_result = await sb.exec(["cat", "pw_report.json"])
            summary = cls._parse_report(report_result.stdout)

            # Fallback regex parsing if JSON report returned 0 total
            if summary.get("total", 0) == 0:
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

            if not summary.get("duration_ms"):
                summary["duration_ms"] = exec_duration_ms

            summary["logs"] = logs
            summary["exit_code"] = result.exit_code

            logger.info("playwright_run_complete", run_id=run_id, passed=summary.get("passed", 0), failed=summary.get("failed", 0))
            return summary

    @classmethod
    def _parse_report(cls, json_str: str) -> dict[str, Any]:
        try:
            data = json.loads(json_str)
            s = data.get("summary", {})
            passed = s.get("passed", 0)
            failed = s.get("failed", 0)
            errors = s.get("error", 0)
            total = s.get("total", 0) or (passed + failed + errors)
            return {
                "passed": passed,
                "failed": failed,
                "errors": errors,
                "total": total,
                "duration_ms": round(data.get("duration", 0) * 1000, 2),
                "failures": [
                    {"node_id": t.get("nodeid", ""), "longrepr": t.get("call", {}).get("longrepr", "")}
                    for t in data.get("tests", [])
                    if t.get("outcome") in ("failed", "error")
                ],
            }
        except (json.JSONDecodeError, KeyError):
            return {"passed": 0, "failed": 0, "errors": 0, "total": 0, "failures": []}

