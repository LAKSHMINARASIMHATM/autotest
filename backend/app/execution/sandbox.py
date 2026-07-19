"""Local Subprocess Sandbox — runs tests in an isolated temp directory.

Replaces the Docker-based sandbox for environments without Docker.

Lifecycle:
1. `__aenter__` — create a temp workspace directory, copy project files in
2. `exec()` — run commands as subprocesses inside the temp workspace
3. `__aexit__` — remove the temp directory
"""

from __future__ import annotations

import asyncio
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.core.logging import get_logger

logger = get_logger(__name__)


class SandboxResult:
    """Holds raw stdout/stderr and exit code from a subprocess exec."""

    def __init__(self, stdout: str, stderr: str, exit_code: int) -> None:
        self.stdout = stdout
        self.stderr = stderr
        self.exit_code = exit_code
        self.success = exit_code == 0


class DockerSandbox:
    """Local subprocess sandbox that mimics the DockerSandbox interface.

    Runs commands in an isolated temp directory instead of a Docker container.
    Drop-in replacement — callers use the same async context manager API.

        async with DockerSandbox(framework="pytest", project_path=path) as sb:
            result = await sb.exec(["pytest", "tests/"])
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
        self._workdir: Path | None = None

    async def __aenter__(self) -> DockerSandbox:
        await self._prepare()
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self._cleanup()

    async def _prepare(self) -> None:
        """Create the temp workspace and copy project files into it."""
        tmp = await asyncio.get_event_loop().run_in_executor(
            None, lambda: tempfile.mkdtemp(prefix=f"autotest-{self.run_id}-")
        )
        self._workdir = Path(tmp)

        def ignore_git(directory: str, contents: list[str]) -> list[str]:
            """Ignore .git directories and other common temporary files."""
            return [
                c
                for c in contents
                if c == ".git"
                or c.startswith("__pycache__")
                or c.endswith(".pyc")
            ]

        if self.project_path and Path(self.project_path).exists():
            src = Path(self.project_path)
            dest = self._workdir / src.name
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: shutil.copytree(str(src), str(dest), ignore=ignore_git)
            )
            logger.info(
                "sandbox_project_copied",
                src=str(src),
                dest=str(dest),
                run_id=self.run_id,
            )
        else:
            logger.info(
                "sandbox_ready_empty",
                workdir=str(self._workdir),
                run_id=self.run_id,
            )

    async def exec(self, command: list[str]) -> SandboxResult:
        """Execute a command inside the sandbox working directory."""
        if self._workdir is None:
            raise RuntimeError("Sandbox not prepared. Use async with DockerSandbox().")

        logger.info("sandbox_exec", command=command, run_id=self.run_id)

        # Determine cwd: run inside the copied project folder if it exists
        exec_cwd = self._workdir
        if self.project_path:
            nested = self._workdir / Path(self.project_path).name
            if nested.exists() and nested.is_dir():
                exec_cwd = nested

        # Pure Python fallback for "cat" on Windows
        if command and command[0] == "cat" and len(command) > 1:
            file_to_read = command[1]
            try:
                cleaned_path = file_to_read.lstrip("/")
                if cleaned_path.startswith("tmp/"):
                    cleaned_path = cleaned_path[4:]
                
                # Check relative to resolved exec_cwd first, then fallback to self._workdir
                resolved_path = exec_cwd / cleaned_path
                if not resolved_path.exists():
                    resolved_path = self._workdir / cleaned_path
                
                if resolved_path.exists() and resolved_path.is_file():
                    content = resolved_path.read_text(encoding="utf-8", errors="replace")
                    return SandboxResult(stdout=content, stderr="", exit_code=0)
                else:
                    return SandboxResult(stdout="", stderr=f"cat: {file_to_read}: No such file or directory", exit_code=1)
            except Exception as e:
                return SandboxResult(stdout="", stderr=str(e), exit_code=1)

        def _run() -> subprocess.CompletedProcess:
            return subprocess.run(
                command,
                cwd=str(exec_cwd),
                capture_output=True,
                text=True,
                timeout=self.timeout_seconds,
            )

        try:
            proc = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(None, _run),
                timeout=self.timeout_seconds + 5,
            )
            return SandboxResult(
                stdout=proc.stdout,
                stderr=proc.stderr,
                exit_code=proc.returncode,
            )
        except subprocess.TimeoutExpired:
            logger.warning("sandbox_exec_timeout", command=command, run_id=self.run_id)
            return SandboxResult(stdout="", stderr="Execution timed out.", exit_code=1)
        except FileNotFoundError as e:
            logger.warning("sandbox_exec_not_found", command=command, error=str(e), run_id=self.run_id)
            return SandboxResult(stdout="", stderr=str(e), exit_code=1)

    async def copy_to(self, local_path: str, container_path: str = "/workspace") -> None:
        """Copy a local directory into the sandbox workspace (container_path ignored)."""
        src = Path(local_path)
        if not src.exists():
            logger.warning("sandbox_copy_to_missing_src", src=str(src), run_id=self.run_id)
            return

        dest = self._workdir / src.name if self._workdir else Path(local_path)
        if dest != src:
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: shutil.copytree(str(src), str(dest), dirs_exist_ok=True),
            )
            logger.info("sandbox_copy_to", src=str(src), dest=str(dest), run_id=self.run_id)

    async def copy_from(self, container_path: str, local_dest: str) -> None:
        """Copy a file/dir from sandbox workspace to a local destination."""
        src = self._workdir / container_path.lstrip("/") if self._workdir else Path(container_path)
        dest = Path(local_dest)
        dest.mkdir(parents=True, exist_ok=True)
        if src.exists():
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: shutil.copy2(str(src), str(dest)) if src.is_file()
                else shutil.copytree(str(src), str(dest / src.name), dirs_exist_ok=True),
            )

    async def _cleanup(self) -> None:
        """Remove the temp workspace directory."""
        if self._workdir is not None and self._workdir.exists():
            try:
                await asyncio.get_event_loop().run_in_executor(
                    None, lambda: shutil.rmtree(str(self._workdir), ignore_errors=True)
                )
                logger.info("sandbox_cleaned_up", run_id=self.run_id)
            except Exception as e:
                logger.warning("sandbox_cleanup_failed", error=str(e), run_id=self.run_id)
