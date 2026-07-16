"""Patch Validator — applies each candidate patch in an isolated sandbox and runs the failing test.

Validation steps per patch:
  1. Apply the unified diff to the project files inside a fresh container.
  2. Verify the file parses without syntax errors (python -m py_compile).
  3. Re-run only the originally failing test.
  4. Accept the patch if the test passes; reject otherwise.
"""

from __future__ import annotations

import subprocess
import tempfile
import os
from pathlib import Path
from typing import Any

from app.execution.sandbox import DockerSandbox
from app.core.logging import get_logger

logger = get_logger(__name__)


class PatchValidator:
    """Applies candidate patches and validates them in an isolated Docker sandbox."""

    @classmethod
    async def validate(
        cls,
        patch_id: str,
        patch_diff: str,
        file_path: str,
        project_path: str,
        failing_test: str,
        run_id: str,
    ) -> dict[str, Any]:
        """Apply patch and run the failing test inside an ephemeral sandbox.

        Args:
            patch_id: Unique patch identifier.
            patch_diff: Unified diff string.
            file_path: Relative path of the patched file.
            project_path: Root path of the project.
            failing_test: The failing test node ID (e.g. tests/test_auth.py::test_login).
            run_id: Parent run identifier for correlation.

        Returns:
            PatchValidation-compatible dict with verdict, compilation_ok, etc.
        """
        result: dict[str, Any] = {
            "patch_id": patch_id,
            "compilation_ok": False,
            "failing_test_passes": False,
            "regression_ok": False,
            "coverage_maintained": True,  # assumed unless regression fails
            "verdict": "rejected",
            "reason": "",
        }

        try:
            async with DockerSandbox(
                framework="pytest",
                project_path=project_path,
                run_id=f"{run_id}-val-{patch_id}",
            ) as sb:
                # 1. Copy project into container
                await sb.copy_to(project_path, "/workspace")

                # 2. Write the patch file into the container
                patch_write_cmd = [
                    "sh", "-c",
                    f"cat > /tmp/patch.diff << 'PATCHEOF'\n{patch_diff}\nPATCHEOF"
                ]
                await sb.exec(patch_write_cmd)

                # 3. Apply the patch
                apply_result = await sb.exec(["patch", "-p1", "-i", "/tmp/patch.diff", "--directory", "/workspace"])
                if apply_result.exit_code != 0:
                    result["reason"] = f"Patch failed to apply: {apply_result.stderr}"
                    return result

                # 4. Verify compilation
                compile_result = await sb.exec([
                    "python", "-m", "py_compile",
                    f"/workspace/{file_path}",
                ])
                result["compilation_ok"] = compile_result.exit_code == 0
                if not result["compilation_ok"]:
                    result["reason"] = f"Syntax error after patch: {compile_result.stderr}"
                    return result

                # 5. Install deps and run the originally failing test
                await sb.exec(["pip", "install", "--quiet", "pytest", "pytest-cov"])
                test_result = await sb.exec([
                    "python", "-m", "pytest",
                    failing_test,
                    "--tb=short",
                    "-q",
                ])
                result["failing_test_passes"] = test_result.exit_code == 0

                if result["failing_test_passes"]:
                    result["verdict"] = "accepted"
                    result["reason"] = "Patched code compiles and the previously failing test now passes."
                else:
                    result["reason"] = f"Test still fails after patch:\n{test_result.stdout[:500]}"

                # 6. Quick regression check — run the full suite (non-blocking verdict)
                regression = await sb.exec([
                    "python", "-m", "pytest",
                    "--tb=no", "-q", "--ignore", failing_test.split("::")[0],
                ])
                result["regression_ok"] = regression.exit_code == 0
                if not result["regression_ok"] and result["verdict"] == "accepted":
                    result["verdict"] = "rejected"
                    result["reason"] = "Patch causes regression in other tests."

        except Exception as e:
            logger.exception("patch_validation_error", patch_id=patch_id, error=str(e))
            result["reason"] = f"Validation error: {e}"

        logger.info("patch_validated", patch_id=patch_id, verdict=result["verdict"])
        return result
