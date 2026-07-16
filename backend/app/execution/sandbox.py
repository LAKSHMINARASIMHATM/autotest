"""Docker Sandbox — creates ephemeral containers for isolated test execution.

Lifecycle:
1. `prepare()` — pull image, create named container, copy project + test files
2. `run_command()` — exec inside the container, stream stdout/stderr
3. `copy_artifacts()` — extract coverage.xml, junit.xml, screenshots
4. `cleanup()` — force-remove the container

Uses the Docker SDK for Python (docker package), which controls a remote or
local Docker daemon via the DOCKER_HOST env variable — no hardcoded socket path.
"""

from __future__ import annotations

import asyncio
import tarfile
import io
import os
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.core.logging import get_logger

logger = get_logger(__name__)

# Default images per test framework
RUNNER_IMAGES: dict[str, str] = {
    "pytest":     "python:3.12-slim",
    "junit":      "eclipse-temurin:21-jdk-alpine",
    "playwright": "mcr.microsoft.com/playwright/python:v1.48.0-jammy",
    "newman":     "postman/newman:alpine",
}


class SandboxResult:
    """Holds raw stdout/stderr and exit code from a container exec."""

    def __init__(self, stdout: str, stderr: str, exit_code: int) -> None:
        self.stdout = stdout
        self.stderr = stderr
        self.exit_code = exit_code
        self.success = exit_code == 0


class DockerSandbox:
    """Manages the full lifecycle of an ephemeral Docker test execution container.

    Designed to be used as an async context manager:

        async with DockerSandbox(framework="pytest", project_path=path) as sb:
            result = await sb.run_tests(test_files)
    """

    def __init__(
        self,
        framework: str = "pytest",
        project_path: str = "",
        run_id: str | None = None,
        timeout_seconds: int = 300,
    ) -> None:
        self.framework = framework
        self.project_path = project_path
        self.run_id = run_id or str(uuid4())[:8]
        self.timeout_seconds = timeout_seconds
        self.container_name = f"autotest-run-{self.run_id}"
        self._client: Any = None
        self._container: Any = None

    async def __aenter__(self) -> "DockerSandbox":
        await self._prepare()
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self._cleanup()

    async def _get_client(self) -> Any:
        """Lazily import and return the Docker SDK client.

        Reads DOCKER_HOST from environment so it can target a remote daemon.
        """
        if self._client is None:
            import docker  # type: ignore[import]
            self._client = await asyncio.get_event_loop().run_in_executor(
                None, docker.from_env
            )
        return self._client

    async def _prepare(self) -> None:
        """Pull image (if needed) and create the container."""
        client = await self._get_client()
        image = RUNNER_IMAGES.get(self.framework, "python:3.12-slim")

        logger.info("sandbox_pulling_image", image=image, run_id=self.run_id)
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: client.images.pull(image),
        )

        logger.info("sandbox_creating_container", name=self.container_name)
        self._container = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: client.containers.create(
                image=image,
                name=self.container_name,
                working_dir="/workspace",
                mem_limit="512m",
                nano_cpus=1_000_000_000,  # 1 vCPU
                network_mode="none",       # no outbound network in sandbox
                detach=True,
                tty=False,
            ),
        )
        # Start the container
        await asyncio.get_event_loop().run_in_executor(None, self._container.start)

    async def exec(self, command: list[str]) -> SandboxResult:
        """Execute a command inside the running container and return its output."""
        if self._container is None:
            raise RuntimeError("Sandbox not prepared. Use async with DockerSandbox().")

        logger.info("sandbox_exec", command=command, run_id=self.run_id)

        result = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self._container.exec_run(
                    command,
                    stdout=True,
                    stderr=True,
                    demux=True,
                ),
            ),
            timeout=self.timeout_seconds,
        )
        exit_code = result.exit_code
        stdout_bytes, stderr_bytes = result.output or (b"", b"")
        stdout = (stdout_bytes or b"").decode("utf-8", errors="replace")
        stderr = (stderr_bytes or b"").decode("utf-8", errors="replace")

        return SandboxResult(stdout=stdout, stderr=stderr, exit_code=exit_code)

    async def copy_to(self, local_path: str, container_path: str = "/workspace") -> None:
        """Copy a local directory into the container workspace."""
        if self._container is None:
            raise RuntimeError("Sandbox not started.")

        src = Path(local_path)
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w") as tar:
            tar.add(str(src), arcname=src.name)
        buf.seek(0)

        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: self._container.put_archive(container_path, buf),
        )

    async def copy_from(self, container_path: str, local_dest: str) -> None:
        """Copy a file from the container to the local filesystem."""
        if self._container is None:
            raise RuntimeError("Sandbox not started.")

        bits, _ = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: self._container.get_archive(container_path),
        )
        buf = io.BytesIO(b"".join(bits))
        dest = Path(local_dest)
        dest.mkdir(parents=True, exist_ok=True)
        with tarfile.open(fileobj=buf, mode="r") as tar:
            tar.extractall(path=str(dest))

    async def _cleanup(self) -> None:
        """Force-remove the container to release resources."""
        if self._container is not None:
            try:
                await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self._container.remove(force=True),
                )
                logger.info("sandbox_cleaned_up", run_id=self.run_id)
            except Exception as e:
                logger.warning("sandbox_cleanup_failed", error=str(e), run_id=self.run_id)
