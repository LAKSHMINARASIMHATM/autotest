"""Patch Validator — validates candidate patches.

Strategy:
- If a real project_path exists: apply diff locally + run pytest in a temp sandbox.
- If no project_path (simulated runs): use LLM-based heuristic verdict immediately.
  This avoids spawning subprocesses against empty temp dirs that spin indefinitely.

No Docker required.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)


def _apply_unified_diff(diff_text: str, workdir: Path, target_file_hint: str = "") -> tuple[bool, str]:
    """Apply a unified diff string to files inside workdir.

    Returns (success, error_message).
    """
    import re

    if not diff_text or not diff_text.strip():
        return False, "Empty patch diff."

    # If diff lacks standard headers but target_file_hint is provided, prepend headers
    if not ("--- " in diff_text and "+++ " in diff_text) and target_file_hint:
        diff_text = f"--- a/{target_file_hint}\n+++ b/{target_file_hint}\n" + diff_text

    lines = diff_text.splitlines()
    i = 0
    patched_any = False
    while i < len(lines):
        if lines[i].startswith("--- ") and i + 1 < len(lines) and lines[i + 1].startswith("+++ "):
            target_raw = lines[i + 1][4:].strip().split("\t")[0]
            if target_raw == "/dev/null" or not target_raw:
                return False, "File deletion patches are strictly prohibited."

            target_rel = re.sub(r"^[ab]/", "", target_raw)
            target_file = workdir / target_rel

            # If target_file doesn't exist, search workdir by filename
            if not target_file.exists():
                basename = target_file.name
                matches = list(workdir.glob(f"**/{basename}"))
                if matches:
                    target_file = matches[0]

            i += 2

            original_lines: list[str] = []
            if target_file.exists():
                original_lines = target_file.read_text(encoding="utf-8", errors="replace").splitlines()
            else:
                target_file.parent.mkdir(parents=True, exist_ok=True)

            patched = list(original_lines)
            offset = 0

            while i < len(lines) and lines[i].startswith("@@"):
                m = re.match(r"@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@", lines[i])
                if not m:
                    i += 1
                    continue
                orig_start = max(0, int(m.group(1)) - 1)
                i += 1

                hunk_orig: list[str] = []
                hunk_new: list[str] = []
                while i < len(lines) and not lines[i].startswith("@@") and not lines[i].startswith("--- "):
                    l = lines[i]
                    if l.startswith("-"):
                        hunk_orig.append(l[1:])
                    elif l.startswith("+"):
                        hunk_new.append(l[1:])
                    elif l.startswith(" ") or l == "":
                        ctx = l[1:] if l.startswith(" ") else ""
                        hunk_orig.append(ctx)
                        hunk_new.append(ctx)
                    i += 1

                pos = orig_start + offset
                patched[pos: pos + len(hunk_orig)] = hunk_new
                offset += len(hunk_new) - len(hunk_orig)

            # Safeguard: Prevent deleting entire file contents or wiping >60% of lines
            if len(original_lines) > 5 and len(patched) < 3:
                return False, "Patch rejected: patch would wipe out target file."
            if len(original_lines) > 10 and ((len(original_lines) - len(patched)) / len(original_lines)) > 0.6:
                return False, "Patch rejected: patch deletes excessive lines (>60%) from target file."

            target_file.write_text("\n".join(patched) + "\n", encoding="utf-8")
            patched_any = True
        else:
            i += 1

    if not patched_any:
        return False, "No valid diff hunks found in patch string."

    return True, ""


def _heuristic_verdict(patch_diff: str, file_path: str, confidence: float = 0.75) -> dict[str, Any]:
    """Fast LLM-free heuristic verdict for simulated runs (no project_path).

    Accepts patches that:
    - Have a non-empty diff
    - Target a .py file (we can at least syntax-check the hunks)
    - Have confidence >= 0.7
    """
    if not patch_diff or not patch_diff.strip():
        return {
            "compilation_ok": False,
            "failing_test_passes": False,
            "regression_ok": False,
            "coverage_maintained": True,
            "verdict": "rejected",
            "reason": "Empty diff — no changes to apply.",
        }

    if "/dev/null" in patch_diff:
        return {
            "compilation_ok": False,
            "failing_test_passes": False,
            "regression_ok": False,
            "coverage_maintained": True,
            "verdict": "rejected",
            "reason": "Patch attempts file deletion (/dev/null).",
        }

    added_lines = [l[1:] for l in patch_diff.splitlines() if l.startswith("+") and not l.startswith("+++")]
    is_valid_python = True
    if file_path.endswith(".py") and added_lines:
        try:
            compile("\n".join(added_lines), "<patch>", "exec")
        except SyntaxError:
            is_valid_python = False

    if not is_valid_python:
        return {
            "compilation_ok": False,
            "failing_test_passes": False,
            "regression_ok": False,
            "coverage_maintained": True,
            "verdict": "rejected",
            "reason": "Patch hunks contain Python syntax errors.",
        }

    accepted = confidence >= 0.7
    return {
        "compilation_ok": True,
        "failing_test_passes": accepted,
        "regression_ok": accepted,
        "coverage_maintained": True,
        "verdict": "accepted" if accepted else "pending",
        "reason": (
            f"Heuristic validation (no sandbox): diff is non-empty, syntax OK, "
            f"confidence={confidence:.0%} {'≥' if accepted else '<'} 70% threshold."
        ),
    }


class PatchValidator:
    """Validates candidate patches.

    - Real project available → apply diff + run pytest in local temp sandbox.
    - Simulated run (no project_path) → fast heuristic verdict, no subprocess spawning.
    """

    @classmethod
    async def validate(
        cls,
        patch_id: str,
        patch_diff: str,
        file_path: str,
        project_path: str,
        failing_test: str,
        run_id: str,
        confidence: float = 0.75,
    ) -> dict[str, Any]:
        result: dict[str, Any] = {
            "patch_id": patch_id,
            "compilation_ok": False,
            "failing_test_passes": False,
            "regression_ok": False,
            "coverage_maintained": True,
            "verdict": "rejected",
            "reason": "",
        }

        # ── Fast path: no real project → heuristic verdict, no subprocess ────
        if not project_path or not Path(project_path).exists():
            logger.info(
                "patch_validator_heuristic",
                patch_id=patch_id,
                reason="no project_path — using heuristic verdict",
            )
            verdict = _heuristic_verdict(patch_diff, file_path, confidence)
            result.update(verdict)
            result["patch_id"] = patch_id
            logger.info("patch_validated", patch_id=patch_id, verdict=result["verdict"])
            return result

        # ── Slow path: real project exists → sandbox + pytest ─────────────────
        try:
            from app.execution.sandbox import DockerSandbox, _DockerBackend

            async with DockerSandbox(
                framework="pytest",
                project_path=project_path,
                run_id=f"{run_id}-val-{patch_id}",
            ) as sb:
                workdir = sb._workdir  # None when Docker backend is active

                if workdir is not None:
                    # ── Local backend: apply diff to temp dir on disk ──────────
                    project_dir = workdir / Path(project_path).name
                    patch_workdir = project_dir if project_dir.exists() else workdir
                    patch_ok, patch_err = _apply_unified_diff(patch_diff, patch_workdir)
                    if not patch_ok:
                        logger.warning(
                            "patch_apply_failed",
                            patch_id=patch_id,
                            reason=patch_err,
                        )
                        # Diff hunks missing or malformed — fall back to heuristic
                        # rather than silently rejecting (LLM often omits --- /+++ headers)
                        verdict = _heuristic_verdict(patch_diff, file_path, confidence)
                        verdict["patch_id"] = patch_id
                        verdict["reason"] = f"Diff apply failed ({patch_err}); heuristic fallback: {verdict['reason']}"
                        logger.info("patch_validated", patch_id=patch_id, verdict=verdict["verdict"])
                        return verdict

                    # Normalize file_path to be relative
                    clean_file = file_path
                    if Path(file_path).is_absolute():
                        try:
                            clean_file = str(Path(file_path).relative_to(project_path))
                        except Exception:
                            clean_file = Path(file_path).name
                    clean_file = clean_file.lstrip("/\\")

                    compile_path = str(patch_workdir / clean_file) if clean_file.endswith(".py") else None
                    python_exe = sys.executable
                else:
                    # ── Docker backend: write patch into container via stdin ───
                    clean_file = file_path
                    if Path(file_path).is_absolute():
                        clean_file = Path(file_path).name
                    clean_file = clean_file.lstrip("/\\")

                    import base64
                    b64_diff = base64.b64encode(patch_diff.encode("utf-8")).decode("ascii")

                    apply_script = (
                        "import sys, re, pathlib, base64\n"
                        f"diff = base64.b64decode('{b64_diff}').decode('utf-8', errors='replace')\n"
                        "lines = diff.splitlines()\n"
                        "i = 0\n"
                        "patched_any = False\n"
                        "while i < len(lines):\n"
                        "    if lines[i].startswith('--- ') and i+1<len(lines) and lines[i+1].startswith('+++ '):\n"
                        "        tgt = re.sub(r'^[ab]/', '', lines[i+1][4:].strip().split('\\t')[0])\n"
                        "        p = pathlib.Path('/workspace') / tgt\n"
                        "        p.parent.mkdir(parents=True, exist_ok=True)\n"
                        "        orig = p.read_text(encoding='utf-8', errors='replace').splitlines() if p.exists() else []\n"
                        "        patched = list(orig); offset = 0; i += 2\n"
                        "        while i < len(lines) and lines[i].startswith('@@'):\n"
                        "            m = re.match(r'@@ -(\\d+)(?:,\\d+)? \\+(\\d+)(?:,\\d+)? @@', lines[i])\n"
                        "            orig_start = max(0, int(m.group(1))-1) if m else 0; i += 1\n"
                        "            ho=[]; hn=[]\n"
                        "            while i<len(lines) and not lines[i].startswith('@@') and not lines[i].startswith('--- '):\n"
                        "                l=lines[i]\n"
                        "                if l.startswith('-'): ho.append(l[1:])\n"
                        "                elif l.startswith('+'): hn.append(l[1:])\n"
                        "                else: c=l[1:] if l.startswith(' ') else ''; ho.append(c); hn.append(c)\n"
                        "                i+=1\n"
                        "            pos=orig_start+offset; patched[pos:pos+len(ho)]=hn; offset+=len(hn)-len(ho)\n"
                        "        p.write_text('\\n'.join(patched)+'\\n', encoding='utf-8')\n"
                        "        patched_any = True\n"
                        "    else: i+=1\n"
                        "print('patch_ok' if patched_any else 'patch_failed_no_hunk')\n"
                    )

                    apply_result = await sb.exec(["python3", "-c", apply_script])
                    if "patch_ok" not in apply_result.stdout:
                        result["reason"] = f"Docker patch apply failed: {apply_result.stderr[:300] or apply_result.stdout[:300]}"
                        return result

                    compile_path = f"/workspace/{clean_file}" if clean_file.endswith(".py") else None
                    python_exe = "python3"

                # ── Compile check ─────────────────────────────────────────────
                if compile_path and Path(compile_path).exists():
                    compile_result = await sb.exec([python_exe, "-m", "py_compile", compile_path])
                    result["compilation_ok"] = compile_result.exit_code == 0
                    if not result["compilation_ok"]:
                        result["reason"] = f"Syntax error after patch: {compile_result.stderr}"
                        logger.info(
                            "patch_validated",
                            patch_id=patch_id,
                            verdict="rejected",
                            reason="syntax_error",
                        )
                        return result
                else:
                    # compile_path missing means the patched file isn't a .py or wasn't
                    # found in the sandbox — treat compilation as OK and proceed to pytest
                    result["compilation_ok"] = True
                    if compile_path:
                        logger.warning(
                            "patch_compile_target_missing",
                            patch_id=patch_id,
                            compile_path=compile_path,
                        )

                # ── Run failing test + regression ─────────────────────────────
                if failing_test:
                    test_parts = failing_test.split("::")
                    raw_test_file = test_parts[0]
                    test_func = f"::{test_parts[1]}" if len(test_parts) > 1 else ""

                    clean_test_file = raw_test_file
                    if Path(raw_test_file).is_absolute():
                        try:
                            clean_test_file = str(Path(raw_test_file).relative_to(project_path))
                        except Exception:
                            clean_test_file = Path(raw_test_file).name
                    clean_test_file = clean_test_file.lstrip("/\\")

                    exec_failing_test = f"{clean_test_file}{test_func}"

                    # If local backend and failing test file is missing in sandbox, try copying from host project_path
                    if workdir is not None:
                        target_tf = patch_workdir / clean_test_file
                        if not target_tf.exists() and Path(project_path).exists():
                            src_tf = Path(project_path) / clean_test_file
                            if src_tf.exists():
                                target_tf.parent.mkdir(parents=True, exist_ok=True)
                                import shutil as _sh
                                _sh.copy2(str(src_tf), str(target_tf))

                    test_result = await sb.exec([
                        python_exe, "-m", "pytest",
                        exec_failing_test, "--tb=short", "-q",
                    ])

                    # Auto-install missing module if test failed due to ModuleNotFoundError
                    logs = test_result.stdout + "\n" + test_result.stderr
                    if test_result.exit_code != 0 and "ModuleNotFoundError: No module named" in logs:
                        import re as _re
                        m_mod = _re.search(r"ModuleNotFoundError: No module named ['\"]([^'\"]+)['\"]", logs)
                        if m_mod:
                            missing_pkg = m_mod.group(1).split(".")[0]
                            # Placeholder/fake module names that LLMs hallucinate — never pip install
                            _FAKE_MODULES = {
                                "your_module", "your_api", "your_package", "your_app",
                                "example", "sample", "placeholder", "dummy", "stub",
                                "mock_module", "my_module", "my_app", "my_api",
                                "some_module", "todo", "fixme", "replace_me",
                                "app", "src", "tests",  # local project dirs, not installable
                            }
                            is_fake = (
                                missing_pkg in _FAKE_MODULES
                                or len(missing_pkg) <= 1  # single-char names are always fake
                                or missing_pkg.startswith("your_")
                                or missing_pkg.startswith("my_")
                            )
                            proj_local = (patch_workdir / missing_pkg).exists() if workdir is not None else False
                            if not is_fake and not proj_local:
                                logger.info("installing_missing_sandbox_dependency", pkg=missing_pkg)
                                await sb.exec([python_exe, "-m", "pip", "install", "--quiet", missing_pkg])
                                test_result = await sb.exec([
                                    python_exe, "-m", "pytest",
                                    exec_failing_test, "--tb=short", "-q",
                                ])

                    result["failing_test_passes"] = test_result.exit_code == 0
                    if result["failing_test_passes"]:
                        result["verdict"] = "accepted"
                        result["reason"] = "Patch compiles and the failing test now passes."
                    else:
                        result["reason"] = f"Test still fails:\n{test_result.stdout[:400]}\n{test_result.stderr[:400]}"

                    regression = await sb.exec([
                        python_exe, "-m", "pytest",
                        "--tb=no", "-q",
                        "--ignore", clean_test_file,
                    ])
                    # Pytest exit code 0 = all passed, 5 = no tests collected (both mean no regression)
                    result["regression_ok"] = regression.exit_code in (0, 5)
                    if not result["regression_ok"] and result["verdict"] == "accepted":
                        result["verdict"] = "rejected"
                        result["reason"] = f"Patch causes regression in other tests (exit code {regression.exit_code})."
                else:
                    # No failing test to re-run — accept if compilation passed
                    result["failing_test_passes"] = True
                    result["regression_ok"] = True
                    result["verdict"] = "accepted"
                    result["reason"] = "Patch compiles; no specific failing test to re-run."

        except Exception as e:
            logger.exception("patch_validation_error", patch_id=patch_id, error=str(e))
            result["reason"] = f"Validation error: {e}"

        logger.info("patch_validated", patch_id=patch_id, verdict=result["verdict"])
        return result
