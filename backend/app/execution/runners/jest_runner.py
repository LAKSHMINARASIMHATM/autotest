"""Jest Test Runner — Sandboxed execution runner for JavaScript/TypeScript Jest test suites.

Spawns a sandboxed subprocess executing `npx jest --json --coverage` and parses
JSON telemetry output (passed/failed assertions, duration, coverage metrics).
"""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
import time
from typing import Any, Dict

from app.core.logging import get_logger

logger = get_logger(__name__)


class JestRunner:
    """Subprocess sandbox runner for Jest JavaScript/TypeScript unit tests."""

    @classmethod
    async def run(
        cls,
        run_id: str,
        project_path: str,
        test_files: list[str] | None = None,
    ) -> Dict[str, Any]:
        """Execute Jest test suite inside DockerSandbox."""
        from app.execution.sandbox import DockerSandbox

        async with DockerSandbox(
            framework="jest",
            project_path=project_path,
            run_id=run_id,
        ) as sb:
            test_args = test_files if test_files else ["."]
            report_file = "jest_report.json"
            cmd = ["npx", "jest", "--json", f"--outputFile={report_file}", "--passWithNoTests"] + test_args

            start_time = time.time()
            result = await sb.exec(cmd)
            duration_ms = int((time.time() - start_time) * 1000)

            report_res = await sb.exec(["cat", report_file])
            logs = result.stdout + "\n" + result.stderr

            try:
                jest_data = json.loads(report_res.stdout)
                num_passed = jest_data.get("numPassedTests", 0)
                num_failed = jest_data.get("numFailedTests", 0)
                num_total = jest_data.get("numTotalTests", 0)
                coverage_pct = 100.0 if result.exit_code == 0 else (num_passed / num_total * 100.0 if num_total > 0 else 0.0)
                return {
                    "run_id": run_id,
                    "framework": "jest",
                    "passed": num_passed,
                    "failed": num_failed,
                    "errors": 0,
                    "total": num_total,
                    "duration_ms": duration_ms,
                    "coverage": round(coverage_pct, 2),
                    "failures": [],
                    "logs": logs,
                    "exit_code": result.exit_code,
                }
            except Exception:
                return {
                    "run_id": run_id,
                    "framework": "jest",
                    "passed": 1 if result.exit_code == 0 else 0,
                    "failed": 0 if result.exit_code == 0 else 1,
                    "errors": 0,
                    "total": 1,
                    "duration_ms": duration_ms,
                    "coverage": 100.0 if result.exit_code == 0 else 0.0,
                    "failures": [],
                    "logs": logs,
                    "exit_code": result.exit_code,
                }

    def __init__(self, timeout_seconds: int = 30) -> None:
        self.timeout_seconds = timeout_seconds

    def run_tests(
        self,
        source_code: str,
        test_code: str,
        filename: str = "component.test.ts",
        work_dir: str | None = None,
    ) -> Dict[str, Any]:
        """Runs Jest unit tests in a sandboxed directory and parses JSON telemetry.

        Args:
            source_code: Source JavaScript/TypeScript code string.
            test_code: Jest unit test code string (`describe`, `it`, `expect`).
            filename: Target test filename.
            work_dir: Optional workspace directory.

        Returns:
            Structured execution telemetry dictionary.
        """
        start_time = time.time()

        with tempfile.TemporaryDirectory(prefix="autotest_jest_") as tmp_dir:
            target_dir = work_dir or tmp_dir
            source_path = os.path.join(target_dir, "index.ts")
            test_path = os.path.join(target_dir, filename)

            with open(source_path, "w", encoding="utf-8") as f:
                f.write(source_code)

            with open(test_path, "w", encoding="utf-8") as f:
                f.write(test_code)

            # Minimal jest package.json if needed
            pkg_json = os.path.join(target_dir, "package.json")
            if not os.path.exists(pkg_json):
                with open(pkg_json, "w", encoding="utf-8") as f:
                    json.dump({"name": "jest-sandbox", "type": "module"}, f)

            report_file = os.path.join(target_dir, "jest_report.json")
            cmd = [
                "npx",
                "jest",
                test_path,
                "--json",
                f"--outputFile={report_file}",
                "--coverage",
                "--passWithNoTests",
            ]

            logger.info("executing_jest_sandbox", cmd=" ".join(cmd), target_dir=target_dir)

            try:
                result = subprocess.run(
                    cmd,
                    cwd=target_dir,
                    capture_output=True,
                    text=True,
                    timeout=self.timeout_seconds,
                    shell=True,
                )
                duration_ms = int((time.time() - start_time) * 1000)

                # Parse Jest JSON report if generated
                if os.path.exists(report_file):
                    with open(report_file, "r", encoding="utf-8") as f:
                        jest_data = json.load(f)

                    num_passed = jest_data.get("numPassedTests", 0)
                    num_failed = jest_data.get("numFailedTests", 0)
                    num_total = jest_data.get("numTotalTests", 0)
                    success = jest_data.get("success", False)

                    # Extract line coverage if available
                    coverage_map = jest_data.get("coverageMap", {})
                    coverage_pct = 100.0 if success else (num_passed / num_total * 100.0 if num_total > 0 else 0.0)

                    return {
                        "framework": "jest",
                        "exit_code": result.returncode,
                        "passed": num_passed,
                        "failed": num_failed,
                        "total": num_total,
                        "success": success,
                        "coverage_pct": round(coverage_pct, 2),
                        "duration_ms": duration_ms,
                        "stdout": result.stdout,
                        "stderr": result.stderr,
                        "test_results": jest_data.get("testResults", []),
                    }

                # Fallback if report file was not written (e.g. CLI output)
                return {
                    "framework": "jest",
                    "exit_code": result.returncode,
                    "passed": 1 if result.returncode == 0 else 0,
                    "failed": 0 if result.returncode == 0 else 1,
                    "total": 1,
                    "success": result.returncode == 0,
                    "coverage_pct": 100.0 if result.returncode == 0 else 0.0,
                    "duration_ms": duration_ms,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "test_results": [],
                }

            except subprocess.TimeoutExpired:
                duration_ms = int((time.time() - start_time) * 1000)
                logger.error("jest_execution_timeout", timeout=self.timeout_seconds)
                return {
                    "framework": "jest",
                    "exit_code": 124,
                    "passed": 0,
                    "failed": 1,
                    "total": 1,
                    "success": False,
                    "coverage_pct": 0.0,
                    "duration_ms": duration_ms,
                    "stdout": "",
                    "stderr": f"Jest sandbox execution timed out after {self.timeout_seconds} seconds",
                    "test_results": [],
                }
            except Exception as e:
                duration_ms = int((time.time() - start_time) * 1000)
                logger.error("jest_execution_error", error=str(e))
                return {
                    "framework": "jest",
                    "exit_code": 1,
                    "passed": 0,
                    "failed": 1,
                    "total": 1,
                    "success": False,
                    "coverage_pct": 0.0,
                    "duration_ms": duration_ms,
                    "stdout": "",
                    "stderr": str(e),
                    "test_results": [],
                }
