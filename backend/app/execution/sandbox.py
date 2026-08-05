"""Sandbox — runs tests in isolation using a local temp-directory subprocess.

Docker is opt-in (set AUTOTEST_USE_DOCKER=true) because on Windows the host
Python path (D:\\autotest\\backend\.venv\\Scripts\\python.exe) is a Windows path
that does not exist inside a Linux Docker container, causing OCI exec failures.

Default (and recommended on Windows): local subprocess sandbox.
  - Creates a temp directory, copies project files in, runs commands as
    subprocesses with full stdout/stderr capture.
  - No Docker daemon required.
  - Identical public API to the Docker backend.

Lifecycle:
1. `__aenter__` — create temp workspace, copy project files
2. `exec()` — run commands as subprocesses inside the workspace
3. `__aexit__` — remove the temp directory
"""

from __future__ import annotations

import asyncio
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.core.logging import get_logger

logger = get_logger(__name__)

# Directories to always exclude when copying projects into sandboxes.
# Mirrors the exclusion list used by scan_directory() in github_import.py.
_HEAVY_DIRS = {
    ".git",
    "__pycache__",
    "node_modules",
    ".next",
    "dist",
    "build",
    ".venv",
    "venv",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".tox",
}

# ── Docker configuration & auto-detection ──────────────────────────────────────
# Docker path normalization handles Windows host Python paths automatically.
# Set AUTOTEST_USE_DOCKER=false in .env to explicitly force local subprocess sandbox.
_docker_available: bool | None = None


def _probe_docker() -> bool:
    """Return True if `docker info` exits 0 (daemon is running)."""
    try:
        r = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            timeout=5,
        )
        return r.returncode == 0
    except Exception:
        return False


def _is_docker_enabled_by_env() -> bool:
    val = os.environ.get("AUTOTEST_USE_DOCKER", "").strip().lower()
    return val in ("1", "true", "yes")


async def _is_docker_available() -> bool:
    if not _is_docker_enabled_by_env():
        return False

    global _docker_available
    if _docker_available is None:
        _docker_available = await asyncio.get_running_loop().run_in_executor(
            None, _probe_docker
        )
        logger.info("docker_probe", available=_docker_available)
    return _docker_available


# ── Shared result type ────────────────────────────────────────────────────────


class SandboxResult:
    """Holds raw stdout/stderr and exit code from a sandbox exec."""

    def __init__(self, stdout: str, stderr: str, exit_code: int) -> None:
        self.stdout = stdout
        self.stderr = stderr
        self.exit_code = exit_code
        self.success = exit_code == 0


# ── Docker backend ─────────────────────────────────────────────────────────────


class _DockerBackend:
    """Runs commands inside an ephemeral Docker container.

    Uses `python:3.11-slim` with the project mounted at `/workspace`.
    The container is removed on exit.
    """

    IMAGE = "python:3.11-slim"

    def __init__(self, project_path: str, run_id: str, timeout_seconds: int) -> None:
        self.project_path = project_path
        self.run_id = run_id
        self.timeout_seconds = timeout_seconds
        self._container_id: str | None = None
        # Expose _workdir as None — patch_validator uses sb._workdir to locate
        # the project; for Docker we expose a sentinel so it falls back cleanly.
        self._workdir: Path | None = None

    async def start(self) -> None:
        src = Path(self.project_path) if self.project_path else None
        mount_args: list[str] = []
        if src and src.exists():
            # Bind-mount the project directory read-write into the container
            mount_args = ["-v", f"{src.resolve()}:/workspace"]
            logger.info(
                "sandbox_docker_mount",
                src=str(src),
                run_id=self.run_id,
            )

        cmd = [
            "docker", "run",
            "--rm",          # auto-remove when stopped
            "-d",            # detached — we exec commands into it
            "--name", f"autotest-{self.run_id}",
            "--workdir", "/workspace",
            *mount_args,
            self.IMAGE,
            "tail", "-f", "/dev/null",   # keep container alive
        ]

        def _start() -> str:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if r.returncode != 0:
                raise RuntimeError(f"docker run failed: {r.stderr.strip()}")
            cid = r.stdout.strip()
            # Pre-install pytest and common testing dependencies inside container
            subprocess.run(
                ["docker", "exec", cid, "python3", "-m", "pip", "install", "--quiet",
                 "pytest", "pytest-asyncio", "pytest-cov", "httpx", "requests", "pydantic"],
                capture_output=True,
                timeout=90,
            )
            # If requirements.txt exists in mounted project, install it
            subprocess.run(
                ["docker", "exec", cid, "sh", "-c", "if [ -f /workspace/requirements.txt ]; then python3 -m pip install --quiet -r /workspace/requirements.txt; fi"],
                capture_output=True,
                timeout=120,
            )
            return cid

        self._container_id = await asyncio.get_running_loop().run_in_executor(
            None, _start
        )
        logger.info(
            "sandbox_docker_started",
            container=self._container_id[:12],
            run_id=self.run_id,
        )

    async def exec(self, command: list[str]) -> SandboxResult:
        if not self._container_id:
            raise RuntimeError("Docker container not started.")

        logger.info("sandbox_exec", command=command, run_id=self.run_id)

        docker_cmd = list(command)
        if docker_cmd and (
            docker_cmd[0] == sys.executable
            or docker_cmd[0].endswith(".exe")
            or "\\" in docker_cmd[0]
            or "venv" in docker_cmd[0].lower()
        ):
            docker_cmd[0] = "python3"

        exec_args = [
            "docker", "exec",
            "-e", "PYTHONPATH=/workspace",
            self._container_id,
            *docker_cmd,
        ]

        def _run() -> subprocess.CompletedProcess:
            return subprocess.run(
                exec_args,
                capture_output=True,
                text=True,
                timeout=self.timeout_seconds,
            )

        try:
            proc = await asyncio.wait_for(
                asyncio.get_running_loop().run_in_executor(None, _run),
                timeout=self.timeout_seconds + 5,
            )
            return SandboxResult(
                stdout=proc.stdout,
                stderr=proc.stderr,
                exit_code=proc.returncode,
            )
        except (subprocess.TimeoutExpired, asyncio.TimeoutError):
            logger.warning("sandbox_exec_timeout", command=command, run_id=self.run_id)
            return SandboxResult(stdout="", stderr="Execution timed out.", exit_code=1)
        except Exception as e:
            logger.warning("sandbox_exec_error", command=command, error=str(e), run_id=self.run_id)
            return SandboxResult(stdout="", stderr=str(e), exit_code=1)

    async def stop(self) -> None:
        if not self._container_id:
            return
        def _stop() -> None:
            subprocess.run(
                ["docker", "rm", "-f", self._container_id],
                capture_output=True,
                timeout=15,
            )
        try:
            await asyncio.get_running_loop().run_in_executor(None, _stop)
            logger.info("sandbox_docker_stopped", run_id=self.run_id)
        except Exception as e:
            logger.warning("sandbox_docker_stop_failed", error=str(e), run_id=self.run_id)


# ── Local subprocess backend ───────────────────────────────────────────────────


class _LocalBackend:
    """Runs commands in an isolated local temp directory (no Docker required)."""

    def __init__(self, project_path: str, run_id: str, timeout_seconds: int) -> None:
        self.project_path = project_path
        self.run_id = run_id
        self.timeout_seconds = timeout_seconds
        self._workdir: Path | None = None

    async def start(self) -> None:
        tmp = await asyncio.get_running_loop().run_in_executor(
            None, lambda: tempfile.mkdtemp(prefix=f"autotest-{self.run_id}-")
        )
        self._workdir = Path(tmp)

        def _ignore(directory: str, contents: list[str]) -> list[str]:
            return [
                c for c in contents
                if (
                    c in _HEAVY_DIRS
                    or c.startswith(".")
                    or c.endswith(".pyc")
                )
            ]

        if self.project_path and Path(self.project_path).exists():
            src = Path(self.project_path)
            dest = self._workdir / src.name
            await asyncio.get_running_loop().run_in_executor(
                None, lambda: shutil.copytree(str(src), str(dest), ignore=_ignore)
            )
            logger.info(
                "sandbox_project_copied",
                src=str(src),
                dest=str(dest),
                run_id=self.run_id,
            )
            # Write a conftest.py so local imports resolve during pytest runs
            conftest = dest / "conftest.py"
            if not conftest.exists():
                conftest.write_text(
                    "import sys, pathlib\n"
                    "sys.path.insert(0, str(pathlib.Path(__file__).parent))\n",
                    encoding="utf-8",
                )
        else:
            logger.info("sandbox_ready_empty", workdir=str(self._workdir), run_id=self.run_id)

    async def exec(self, command: list[str]) -> SandboxResult:
        if self._workdir is None:
            raise RuntimeError("Local sandbox not started.")

        logger.info("sandbox_exec", command=command, run_id=self.run_id)

        # Determine cwd: run inside the copied project folder if it exists
        exec_cwd = self._workdir
        if self.project_path:
            nested = self._workdir / Path(self.project_path).name
            if nested.exists() and nested.is_dir():
                exec_cwd = nested

        exec_cmd = list(command)
        if exec_cmd and exec_cmd[0] in ("python", "python3"):
            exec_cmd[0] = sys.executable

        # Pure-Python fallback for "cat" (not available on Windows natively)
        if exec_cmd and exec_cmd[0] == "cat" and len(exec_cmd) > 1:
            file_to_read = exec_cmd[1]
            try:
                target_path = Path(file_to_read)
                resolved: Path | None = None
                if target_path.is_absolute() and target_path.exists() and target_path.is_file():
                    resolved = target_path
                else:
                    cleaned = file_to_read.lstrip("/\\")
                    if cleaned.startswith("tmp/"):
                        cleaned = cleaned[4:]
                    p1 = exec_cwd / cleaned
                    p2 = self._workdir / cleaned
                    if p1.exists() and p1.is_file():
                        resolved = p1
                    elif p2.exists() and p2.is_file():
                        resolved = p2

                if resolved:
                    return SandboxResult(
                        stdout=resolved.read_text(encoding="utf-8", errors="replace"),
                        stderr="",
                        exit_code=0,
                    )
                return SandboxResult(
                    stdout="",
                    stderr=f"cat: {file_to_read}: No such file or directory",
                    exit_code=1,
                )
            except Exception as e:
                return SandboxResult(stdout="", stderr=str(e), exit_code=1)

        def _run() -> subprocess.CompletedProcess:
            env = dict(os.environ)
            existing_ppath = env.get("PYTHONPATH", "")
            ppaths = [str(exec_cwd)]
            if self._workdir and self._workdir != exec_cwd:
                ppaths.append(str(self._workdir))
            if existing_ppath:
                ppaths.append(existing_ppath)
            env["PYTHONPATH"] = os.pathsep.join(ppaths)

            return subprocess.run(
                exec_cmd,
                cwd=str(exec_cwd),
                capture_output=True,
                text=True,
                timeout=self.timeout_seconds,
                env=env,
            )

        try:
            proc = await asyncio.wait_for(
                asyncio.get_running_loop().run_in_executor(None, _run),
                timeout=self.timeout_seconds + 5,
            )
            return SandboxResult(
                stdout=proc.stdout,
                stderr=proc.stderr,
                exit_code=proc.returncode,
            )
        except (subprocess.TimeoutExpired, asyncio.TimeoutError):
            logger.warning("sandbox_exec_timeout", command=command, run_id=self.run_id)
            return SandboxResult(stdout="", stderr="Execution timed out.", exit_code=1)
        except FileNotFoundError as e:
            logger.warning("sandbox_exec_not_found", command=command, error=str(e), run_id=self.run_id)
            return SandboxResult(stdout="", stderr=str(e), exit_code=1)

    async def stop(self) -> None:
        if self._workdir is not None and self._workdir.exists():
            try:
                await asyncio.get_running_loop().run_in_executor(
                    None, lambda: shutil.rmtree(str(self._workdir), ignore_errors=True)
                )
                logger.info("sandbox_cleaned_up", run_id=self.run_id)
            except Exception as e:
                logger.warning("sandbox_cleanup_failed", error=str(e), run_id=self.run_id)


# ── Public facade ──────────────────────────────────────────────────────────────


class DockerSandbox:
    """Docker-first sandbox with automatic local fallback.

    Tries to use a real Docker container (python:3.11-slim) for full isolation.
    If Docker is unavailable, transparently falls back to a local temp-directory
    subprocess sandbox. The async context-manager API is identical either way.

        async with DockerSandbox(framework="pytest", project_path=path) as sb:
            result = await sb.exec(["pytest", "tests/", "-q"])
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
        self._backend: _DockerBackend | _LocalBackend | None = None

    # ── _workdir proxy (used by patch_validator to locate patched files) ──────
    @property
    def _workdir(self) -> Path | None:
        if isinstance(self._backend, _LocalBackend):
            return self._backend._workdir
        return None  # Docker backend: files live inside container

    async def __aenter__(self) -> DockerSandbox:
        if await _is_docker_available():
            backend: _DockerBackend | _LocalBackend = _DockerBackend(
                project_path=self.project_path,
                run_id=self.run_id,
                timeout_seconds=self.timeout_seconds,
            )
            try:
                await backend.start()
                self._backend = backend
                logger.info("sandbox_backend", backend="docker", run_id=self.run_id)
                return self
            except Exception as e:
                logger.warning(
                    "sandbox_docker_fallback",
                    error=str(e),
                    run_id=self.run_id,
                )
                # reset cache so next run probes again
                global _docker_available
                _docker_available = None

        local = _LocalBackend(
            project_path=self.project_path,
            run_id=self.run_id,
            timeout_seconds=self.timeout_seconds,
        )
        await local.start()
        self._backend = local
        logger.info("sandbox_backend", backend="local", run_id=self.run_id)
        return self

    async def __aexit__(self, *args: Any) -> None:
        if self._backend:
            await self._backend.stop()

    async def exec(self, command: list[str]) -> SandboxResult:
        """Execute a command inside the sandbox."""
        if self._backend is None:
            raise RuntimeError("Sandbox not prepared. Use async with DockerSandbox().")
        return await self._backend.exec(command)

    async def copy_to(self, local_path: str, container_path: str = "/workspace") -> None:
        """Copy a local directory into the sandbox workspace."""
        if isinstance(self._backend, _DockerBackend):
            # Files are already bind-mounted; no copy needed
            return
        # Local backend
        src = Path(local_path)
        if not src.exists():
            logger.warning("sandbox_copy_to_missing_src", src=str(src), run_id=self.run_id)
            return
        workdir = self._backend._workdir if self._backend else None  # type: ignore[union-attr]
        dest = workdir / src.name if workdir else Path(local_path)
        if dest != src:
            await asyncio.get_running_loop().run_in_executor(
                None,
                lambda: shutil.copytree(str(src), str(dest), dirs_exist_ok=True),
            )
            logger.info("sandbox_copy_to", src=str(src), dest=str(dest), run_id=self.run_id)

    async def copy_from(self, container_path: str, local_dest: str) -> None:
        """Copy a file/dir from sandbox workspace to a local destination."""
        if isinstance(self._backend, _DockerBackend):
            # Use `docker cp` to extract from the container
            cid = self._backend._container_id
            if not cid:
                return
            dest = Path(local_dest)
            dest.mkdir(parents=True, exist_ok=True)
            def _cp() -> None:
                subprocess.run(
                    ["docker", "cp", f"{cid}:{container_path}", str(dest)],
                    capture_output=True,
                    timeout=30,
                )
            await asyncio.get_running_loop().run_in_executor(None, _cp)
            return

        # Local backend
        workdir = self._backend._workdir if self._backend else None  # type: ignore[union-attr]
        src = workdir / container_path.lstrip("/") if workdir else Path(container_path)
        dest = Path(local_dest)
        dest.mkdir(parents=True, exist_ok=True)
        if src.exists():
            await asyncio.get_running_loop().run_in_executor(
                None,
                lambda: shutil.copy2(str(src), str(dest)) if src.is_file()
                else shutil.copytree(str(src), str(dest / src.name), dirs_exist_ok=True),
            )
