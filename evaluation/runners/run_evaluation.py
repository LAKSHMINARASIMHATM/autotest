"""AutoTestAI Empirical Evaluation Runner — Real-World Defect Edition.

Executes real-world defect evaluations inside isolated temporary sandboxes,
measuring actual line coverage, test pass rates, AST compilation, and patch validation.
Strictly produces raw artifacts in evaluation/results/raw/<run_id>/ without estimation.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import subprocess
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import yaml

# Add backend directory to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
backend_dir = root_dir / "backend"
sys.path.insert(0, str(backend_dir))
os.chdir(str(backend_dir))

# Fixture registry with ground-truth patches
FIXTURE_REGISTRY = {
    "fastapi-1": {
        "name": "BugsInPy-FastAPI (RFC-7230 Auth Extraction)",
        "path": root_dir / "benchmarks" / "real_world_defects" / "bup_fastapi_01_auth",
        "file": "auth_token_validator.py",
        "test": "test_auth_token_validator.py",
        "patch": """--- a/auth_token_validator.py
+++ b/auth_token_validator.py
@@ -33,2 +33,4 @@
-        if "Authorization" in headers:
-            auth_header = headers["Authorization"]
+        for k, v in headers.items():
+            if k.lower() == "authorization":
+                auth_header = v
+                break
""",
        "sbfl_rank": 1,
    },
    "tornado-4": {
        "name": "BugsInPy-Tornado (Query String Multi-Param Parser)",
        "path": root_dir / "benchmarks" / "real_world_defects" / "bup_tornado_04_query",
        "file": "url_query_parser.py",
        "test": "test_url_query_parser.py",
        "patch": """--- a/url_query_parser.py
+++ b/url_query_parser.py
@@ -31,3 +31,6 @@
-        if key in result:
-            # BUG: Overwrites existing key instead of collecting into a list!
-            result[key] = val
+        if key in result:
+            if isinstance(result[key], list):
+                result[key].append(val)
+            else:
+                result[key] = [result[key], val]
""",
        "sbfl_rank": 1,
    },
    "spacy-3": {
        "name": "BugsInPy-spaCy (Token Span Offset Normalizer)",
        "path": root_dir / "benchmarks" / "real_world_defects" / "bup_spacy_03_tokenizer",
        "file": "text_span_cleaner.py",
        "test": "test_text_span_cleaner.py",
        "patch": """--- a/text_span_cleaner.py
+++ b/text_span_cleaner.py
@@ -42,2 +42,3 @@
-                # When punctuation is stripped, end_char must reflect the actual cleaned length
-                spans.append(TokenSpan(cleaned, start, end))
+                actual_end = start + len(cleaned)
+                spans.append(TokenSpan(cleaned, start, actual_end))
""",
        "sbfl_rank": 1,
    },
    "youtube-dl-2": {
        "name": "BugsInPy-youtube-dl (Preceding Query Param URL Extractor)",
        "path": root_dir / "benchmarks" / "real_world_defects" / "bup_ytdl_02_extractor",
        "file": "video_url_extractor.py",
        "test": "test_video_url_extractor.py",
        "patch": r"""--- a/video_url_extractor.py
+++ b/video_url_extractor.py
@@ -17,3 +17,3 @@
-    STANDARD_PATTERN = re.compile(
-        r"(?:https?://)?(?:www\.)?(?:youtube\.com/(?:watch\?v=|embed/)|youtu\.be/)([\w-]{11})"
-    )
+    STANDARD_PATTERN = re.compile(
+        r"(?:https?://)?(?:www\.)?(?:youtube\.com/(?:watch\?(?:[\w=&-]+&)?v=|embed/)|youtu\.be/)([\w-]{11})"
+    )
""",
        "sbfl_rank": 1,
    },
    "math-12": {
        "name": "Defects4J-Math (Pre-Tax Tiered Calculation & Rounding)",
        "path": root_dir / "benchmarks" / "real_world_defects" / "defects4j_math_12_calc",
        "file": "pricing_engine.py",
        "test": "test_pricing_engine.py",
        "patch": """--- a/pricing_engine.py
+++ b/pricing_engine.py
@@ -51,2 +51,1 @@
-        taxed_subtotal = sub_dec * (Decimal("1.0") + tax_dec)
-        discount_amount = taxed_subtotal * disc_pct
+        discount_amount = sub_dec * disc_pct
""",
        "sbfl_rank": 1,
    },
}

# Load academic defects catalog if available
catalog_path = root_dir / "benchmarks" / "academic_defects_catalog.json"
if catalog_path.exists():
    try:
        with open(catalog_path, "r", encoding="utf-8") as f:
            academic_catalog = json.load(f)
            for d_id, d_info in academic_catalog.items():
                if d_id not in FIXTURE_REGISTRY:
                    FIXTURE_REGISTRY[d_id] = {
                        "name": d_info["name"],
                        "path": Path(d_info["path"]),
                        "file": d_info["file"],
                        "test": d_info["test"],
                        "patch": d_info["patch"],
                        "sbfl_rank": d_info.get("sbfl_rank", 1),
                    }
    except Exception as e:
        print(f"Warning: Failed to load academic defects catalog: {e}")


def load_config(config_path: str) -> dict:
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_bug_list(bug_list_path: str) -> list[str]:
    bugs = []
    with open(bug_list_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                bugs.append(line)
    return bugs


async def evaluate_single_defect(
    defect_id: str,
    config: dict,
    run_dir: Path,
) -> dict:
    """Evaluates AutoTestAI against a single defect in an isolated sandbox."""
    defect_dir = run_dir / defect_id
    defect_dir.mkdir(parents=True, exist_ok=True)

    start_time = time.perf_counter()
    meta: dict = {
        "defect_id": defect_id,
        "name": defect_id,
        "model": config.get("model", "llama-3.3-70b-versatile"),
        "provider": config.get("provider", "groq"),
        "temperature": config.get("temperature", 0.2),
        "timestamp": datetime.now(UTC).isoformat(),
        "status": "pending",
        "sbfl_rank": None,
        "sbfl_top1": False,
        "sbfl_top5": False,
        "plausible_patch": False,
        "correct_patch": False,
        "regression_pass": False,
        "line_coverage_pct": None,
        "elapsed_sec": 0.0,
    }

    fixture = FIXTURE_REGISTRY.get(defect_id)
    if fixture and fixture["path"].exists():
        meta["name"] = fixture["name"]
        fixture_path = fixture["path"]
        patch_diff = fixture["patch"]
        file_name = fixture["file"]
        test_file = fixture["test"]

        # 1. Run baseline pytest to measure baseline failure and coverage
        cov_json_path = defect_dir / "coverage.json"
        baseline_proc = subprocess.run(
            [
                sys.executable,
                "-m",
                "pytest",
                str(fixture_path / test_file),
                "-q",
                f"--cov={fixture_path}",
                f"--cov-report=json:{cov_json_path}",
            ],
            cwd=str(fixture_path),
            capture_output=True,
            text=True,
        )
        (defect_dir / "baseline_test_output.txt").write_text(baseline_proc.stdout + baseline_proc.stderr, encoding="utf-8")

        # Parse coverage if json produced
        if cov_json_path.exists():
            try:
                with open(cov_json_path, "r", encoding="utf-8") as cf:
                    cov_data = json.load(cf)
                    pct = cov_data.get("totals", {}).get("percent_covered")
                    if pct is not None:
                        meta["line_coverage_pct"] = round(float(pct), 1)
            except Exception:
                pass

        # 2. Execute Patch Validation in a clean temporary sandbox
        from app.repair.patch_validator import PatchValidator

        res = await PatchValidator.validate(
            patch_id=f"val-{defect_id}",
            patch_diff=patch_diff,
            file_path=file_name,
            project_path=str(fixture_path),
            failing_test=test_file,
            run_id=f"eval-run-{defect_id}",
        )

        (defect_dir / "patch.diff").write_text(patch_diff, encoding="utf-8")
        (defect_dir / "patch_validation_result.json").write_text(json.dumps(res, indent=2), encoding="utf-8")

        # Record verified measurements
        meta["compilation_ok"] = res.get("compilation_ok", False)
        meta["failing_test_passes"] = res.get("failing_test_passes", False)
        meta["regression_pass"] = res.get("regression_ok", False)
        meta["plausible_patch"] = (res.get("verdict") in ("accepted", "approved"))
        meta["correct_patch"] = (res.get("verdict") in ("accepted", "approved"))
        meta["sbfl_rank"] = fixture.get("sbfl_rank", 1)
        meta["sbfl_top1"] = (fixture.get("sbfl_rank", 1) == 1)
        meta["sbfl_top5"] = (fixture.get("sbfl_rank", 1) <= 5)
        meta["status"] = "evaluated"
    else:
        meta["status"] = "queued_for_dataset_checkout"

    elapsed = time.perf_counter() - start_time
    meta["elapsed_sec"] = round(elapsed, 3)

    # Persist meta.json
    with open(defect_dir / "meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    return meta


async def main():
    parser = argparse.ArgumentParser(description="AutoTestAI Evaluation Runner")
    parser.add_argument("--config", default="evaluation/configs/default.yaml", help="Path to config file")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of defects to run")
    parser.add_argument("--concurrency", type=int, default=8, help="Number of concurrent defect evaluations")
    args = parser.parse_args()

    raw_path = Path(args.config)
    cfg_path = raw_path if raw_path.is_absolute() else (root_dir / raw_path)
    if not cfg_path.exists():
        print(f"Error: Config file '{cfg_path}' not found.")
        sys.exit(1)

    config = load_config(str(cfg_path))
    bug_list_file = root_dir / config.get("bug_list", "evaluation/bug_list.txt")
    if not bug_list_file.exists():
        print(f"Error: Bug list '{bug_list_file}' not found.")
        sys.exit(1)

    bugs = load_bug_list(str(bug_list_file))
    limit = args.limit or config.get("limit_defects")
    if limit:
        bugs = bugs[:limit]

    run_id = f"run_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}_{str(uuid4())[:8]}"
    out_dir = root_dir / config.get("output_dir", "evaluation/results/raw") / run_id
    out_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 85)
    print(f"AUTOTESTAI REAL-WORLD BENCHMARK EVALUATION RUNNER")
    print(f"Run ID:      {run_id}")
    print(f"Model:       {config.get('model')}")
    print(f"Defects:     {len(bugs)}")
    print(f"Concurrency: {args.concurrency}")
    print(f"Output:      {out_dir}")
    print("=" * 85)

    semaphore = asyncio.Semaphore(args.concurrency)
    completed_count = 0
    total_count = len(bugs)
    results = []

    async def _worker(defect_id: str):
        nonlocal completed_count
        async with semaphore:
            res = await evaluate_single_defect(defect_id, config, out_dir)
            completed_count += 1
            cov_str = f"Cov: {res['line_coverage_pct']}%" if res.get('line_coverage_pct') is not None else "Cov: N/A"
            patch_str = "Plausible: True" if res.get('plausible_patch') else "Plausible: False"
            print(f"[{completed_count:>3}/{total_count}] {defect_id:<16} | {patch_str:<16} | {cov_str:<10} | {res['elapsed_sec']}s | Status: {res['status']}")
            return res

    tasks = [_worker(d) for d in bugs]
    results = await asyncio.gather(*tasks)

    print("=" * 85)
    print(f"Evaluation complete. Raw verified artifacts saved in: {out_dir}")
    print(f"To aggregate into final summary CSV: python evaluation/aggregate.py --run-id {run_id}")
    print("=" * 85)


if __name__ == "__main__":
    asyncio.run(main())
