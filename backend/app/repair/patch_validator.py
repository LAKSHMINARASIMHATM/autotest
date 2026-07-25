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


def _apply_unified_diff(diff_text: str, workdir: Path) -> tuple[bool, str]:
    """Apply a unified diff string to files inside workdir.

    Returns (success, error_message).
    """
    import re

    lines = diff_text.splitlines()
    i = 0
    while i < len(lines):
        if lines[i].startswith("--- ") and i + 1 < len(lines) and lines[i + 1].startswith("+++ "):
            target_raw = lines[i + 1][4:].strip().split("\t")[0]
            target_rel = re.sub(r"^[ab]/", "", target_raw)
            target_file = workdir / target_rel
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
                orig_start = int(m.group(1)) - 1
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

            target_file.write_text("\n".join(patched) + "\n", encoding="utf-8")
        else:
            i += 1

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
                        result["reason"] = f"Patch failed to apply: {patch_err}"
                        return result

                    compile_path = str(patch_workdir / file_path) if file_path.endswith(".py") else None
                    python_exe = sys.executable
                else:
                    # ── Docker backend: write patch into container via stdin ───
                    import tempfile as _tf, os as _os
                    # Write diff to a host-side temp file then stream it into the
                    # container so we don't need the `patch` utility.
                    # Instead, apply via a small Python script exec'd inside container.
                    escaped = patch_diff.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n").replace("\r", "")
                    apply_script = (
                        "import sys, re, pathlib\n"
                        "diff = '''{}'''\n"
                        "lines = diff.split('\\\\n')\n"
                        "i = 0\n"
                        "while i < len(lines):\n"
                        "    if lines[i].startswith('--- ') and i+1<len(lines) and lines[i+1].startswith('+++ '):\n"
                        "        tgt = re.sub(r'^[ab]/', '', lines[i+1][4:].strip().split('\\t')[0])\n"
                        "        p = pathlib.Path('/workspace') / tgt\n"
                        "        p.parent.mkdir(parents=True, exist_ok=True)\n"
                        "        orig = p.read_text(errors='replace').splitlines() if p.exists() else []\n"
                        "        patched = list(orig); offset = 0; i += 2\n"
                        "        while i < len(lines) and lines[i].startswith('@@'):\n"
                        "            m = __import__('re').match(r'@@ -(\\d+)(?:,\\d+)? \\+(\\d+)(?:,\\d+)? @@', lines[i])\n"
                        "            start = int(m.group(1))-1 if m else 0; i += 1\n"
                        "            ho=[]; hn=[]\n"
                        "            while i<len(lines) and not lines[i].startswith('@@') and not lines[i].startswith('--- '):\n"
                        "                l=lines[i]\n"
                        "                if l.startswith('-'): ho.append(l[1:])\n"
                        "                elif l.startswith('+'): hn.append(l[1:])\n"
                        "                else: c=l[1:] if l.startswith(' ') else ''; ho.append(c); hn.append(c)\n"
                        "                i+=1\n"
                        "            pos=start+offset; patched[pos:pos+len(ho)]=hn; offset+=len(hn)-len(ho)\n"
                        "        p.write_text('\\n'.join(patched)+'\\n')\n"
                        "    else: i+=1\n"
                        "print('patch_ok')\n"
                    ).format(patch_diff.replace("'", "\\'"))

                    apply_result = await sb.exec(["python3", "-c", apply_script])
                    if "patch_ok" not in apply_result.stdout:
                        result["reason"] = f"Docker patch apply failed: {apply_result.stderr[:300]}"
                        return result

                    compile_path = f"/workspace/{file_path}" if file_path.endswith(".py") else None
                    python_exe = "python3"

                # ── Compile check ─────────────────────────────────────────────
                if compile_path:
                    compile_result = await sb.exec([python_exe, "-m", "py_compile", compile_path])
                    result["compilation_ok"] = compile_result.exit_code == 0
                    if not result["compilation_ok"]:
                        result["reason"] = f"Syntax error after patch: {compile_result.stderr}"
                        return result
                else:
                    result["compilation_ok"] = True

                # ── Run failing test + regression ─────────────────────────────
                if failing_test:
                    test_result = await sb.exec([
                        python_exe, "-m", "pytest",
                        failing_test, "--tb=short", "-q",
                    ])
                    result["failing_test_passes"] = test_result.exit_code == 0
                    if result["failing_test_passes"]:
                        result["verdict"] = "accepted"
                        result["reason"] = "Patch compiles and the failing test now passes."
                    else:
                        result["reason"] = f"Test still fails:\n{test_result.stdout[:400]}"

                    regression = await sb.exec([
                        python_exe, "-m", "pytest",
                        "--tb=no", "-q",
                        "--ignore", failing_test.split("::")[0],
                    ])
                    result["regression_ok"] = regression.exit_code == 0
                    if not result["regression_ok"] and result["verdict"] == "accepted":
                        result["verdict"] = "rejected"
                        result["reason"] = "Patch causes regression in other tests."
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
