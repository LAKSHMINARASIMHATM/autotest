"""Newman runner — executes Postman/Newman API test collections inside a container or local sandbox."""

from __future__ import annotations

import json
import time
import shutil
from typing import Any

from app.core.logging import get_logger
from app.execution.sandbox import DockerSandbox, SandboxResult

logger = get_logger(__name__)


class NewmanRunner:
    """Runs Postman API collections via Newman inside an isolated sandbox."""

    @classmethod
    async def run(
        cls,
        run_id: str,
        collection_path: str,
        environment_path: str | None = None,
        base_url: str = "http://localhost:8000",
    ) -> dict[str, Any]:
        """Execute a Postman collection using Newman."""
        async with DockerSandbox(
            framework="newman",
            project_path=collection_path,
            run_id=run_id,
        ) as sb:
            collection_file = collection_path.split("/")[-1].split("\\")[-1]
            reporter_args = ["--reporters", "json", "--reporter-json-export", "newman_report.json"]

            # Prefer npx newman if newman binary isn't directly in PATH
            if not shutil.which("newman") and shutil.which("npx"):
                cmd_prefix = ["npx", "-y", "newman"]
            else:
                cmd_prefix = ["newman"]

            cmd = cmd_prefix + [
                "run",
                collection_file if collection_file.endswith(".json") else ".",
                "--color", "off",
                "--env-var", f"baseUrl={base_url}",
            ] + reporter_args

            start_time = time.time()
            result: SandboxResult = await sb.exec(cmd)
            exec_duration_ms = round((time.time() - start_time) * 1000, 2)
            logs = result.stdout + "\n" + result.stderr

            report_result = await sb.exec(["cat", "newman_report.json"])
            summary = cls._parse_report(report_result.stdout)

            if not summary.get("duration_ms"):
                summary["duration_ms"] = exec_duration_ms

            summary["logs"] = logs
            summary["exit_code"] = result.exit_code

            logger.info("newman_run_complete", run_id=run_id, passed=summary.get("passed", 0), failed=summary.get("failed", 0))
            return summary

    @classmethod
    def _parse_report(cls, json_str: str) -> dict[str, Any]:
        try:
            data = json.loads(json_str)
            stats = data.get("run", {}).get("stats", {})
            assertions = stats.get("assertions", {})
            total = assertions.get("total", 0)
            failed = assertions.get("failed", 0)
            passed = max(0, total - failed)
            return {
                "passed": passed,
                "failed": failed,
                "errors": 0,
                "total": total,
                "duration_ms": round(data.get("run", {}).get("timings", {}).get("completed", 0), 2),
                "failures": [
                    {
                        "name": f.get("source", {}).get("name", ""),
                        "message": f.get("error", {}).get("message", ""),
                    }
                    for exec_item in data.get("run", {}).get("executions", [])
                    for f in exec_item.get("assertions", [])
                    if f.get("error")
                ],
            }
        except (json.JSONDecodeError, KeyError):
            return {"passed": 0, "failed": 0, "errors": 0, "total": 0, "failures": []}

