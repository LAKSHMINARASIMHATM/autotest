"""Newman runner — executes Postman/Newman API test collections inside a container."""

from __future__ import annotations

import json
from typing import Any

from app.core.logging import get_logger
from app.execution.sandbox import DockerSandbox, SandboxResult

logger = get_logger(__name__)


class NewmanRunner:
    """Runs Postman API collections via Newman inside the official Newman Docker image."""

    @classmethod
    async def run(
        cls,
        run_id: str,
        collection_path: str,
        environment_path: str | None = None,
        base_url: str = "http://localhost:8000",
    ) -> dict[str, Any]:
        """Execute a Postman collection using Newman.

        Args:
            run_id: Unique test run identifier.
            collection_path: Local path to the .json collection file.
            environment_path: Optional Postman environment .json file.
            base_url: Override base URL for the collection.

        Returns:
            Structured result with passed, failed, assertions, duration, logs.
        """
        async with DockerSandbox(
            framework="newman",
            project_path=collection_path,
            run_id=run_id,
        ) as sb:
            await sb.copy_to(collection_path, "/etc/newman")

            env_args: list[str] = []
            if environment_path:
                await sb.copy_to(environment_path, "/etc/newman")
                env_args = ["--environment", f"/etc/newman/{environment_path.split('/')[-1]}"]

            collection_file = collection_path.split("/")[-1]
            reporter_args = ["--reporters", "json", "--reporter-json-export", "newman_report.json"]

            cmd = [
                "newman", "run",
                f"/etc/newman/{collection_file}",
                "--color", "off",
                "--env-var", f"baseUrl={base_url}",
            ] + env_args + reporter_args

            result: SandboxResult = await sb.exec(cmd)
            logs = result.stdout + "\n" + result.stderr

            report_result = await sb.exec(["cat", "newman_report.json"])
            summary = cls._parse_report(report_result.stdout)
            summary["logs"] = logs

            logger.info("newman_run_complete", run_id=run_id)
            return summary

    @classmethod
    def _parse_report(cls, json_str: str) -> dict[str, Any]:
        try:
            data = json.loads(json_str)
            stats = data.get("run", {}).get("stats", {})
            assertions = stats.get("assertions", {})
            return {
                "passed": assertions.get("total", 0) - assertions.get("failed", 0),
                "failed": assertions.get("failed", 0),
                "total": assertions.get("total", 0),
                "duration_ms": data.get("run", {}).get("timings", {}).get("completed", 0),
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
            return {"passed": 0, "failed": 0, "total": 0, "failures": []}
