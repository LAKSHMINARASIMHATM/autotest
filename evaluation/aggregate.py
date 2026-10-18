"""AutoTestAI Benchmark Aggregator.

Strictly reads ONLY raw artifacts in evaluation/results/raw/<run_id>/
and generates summary.csv and LaTeX tables.
Refuses to generate synthetic figures or hardcode unmeasured data.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
raw_dir = root_dir / "evaluation" / "results" / "raw"


def main():
    parser = argparse.ArgumentParser(description="AutoTestAI Results Aggregator")
    parser.add_argument("--run-id", help="Specific run ID to aggregate (defaults to latest)")
    args = parser.parse_args()

    if not raw_dir.exists():
        print(f"Error: Raw results directory '{raw_dir}' does not exist.")
        print("Run an evaluation first using: python -m evaluation.runners.run_evaluation")
        sys.exit(1)

    run_dirs = [d for d in raw_dir.iterdir() if d.is_dir()]
    if not run_dirs:
        print("No evaluation runs found in evaluation/results/raw/.")
        print("Metrics remain TBD until real runs are executed.")
        sys.exit(0)

    if args.run_id:
        target_run = raw_dir / args.run_id
        if not target_run.exists():
            print(f"Error: Run ID '{args.run_id}' not found.")
            sys.exit(1)
    else:
        # Pick latest by creation time
        target_run = max(run_dirs, key=lambda d: d.stat().st_mtime)

    print(f"Aggregating verified results from: {target_run.name}")

    records = []
    for defect_folder in target_run.iterdir():
        if defect_folder.is_dir():
            meta_file = defect_folder / "meta.json"
            if meta_file.exists():
                try:
                    with open(meta_file, "r", encoding="utf-8") as f:
                        records.append(json.load(f))
                except Exception as e:
                    print(f"Warning: Failed to parse {meta_file}: {e}")

    if not records:
        print("No defect records found in the selected run.")
        sys.exit(0)

    # Save summary.csv
    csv_path = root_dir / "evaluation" / "results" / f"summary_{target_run.name}.csv"
    keys = [
        "defect_id", "name", "status", "model", "elapsed_sec",
        "line_coverage_pct", "compilation_ok", "failing_test_passes",
        "regression_pass", "sbfl_top1", "plausible_patch"
    ]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=keys, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)

    print(f"Saved aggregated CSV to: {csv_path}\n")

    # Print summary scorecard
    print("=" * 95)
    print(f"{'DEFECT ID':<14} | {'NAME / SUITE':<36} | {'COVERAGE':<10} | {'PATCH':<10} | {'TIME':<8} | {'STATUS'}")
    print("-" * 95)
    evaluated = [r for r in records if r.get("status") == "evaluated"]
    for r in records:
        cov = f"{r.get('line_coverage_pct')}%" if r.get("line_coverage_pct") is not None else "N/A"
        patch = "PASS" if r.get("plausible_patch") else "FAIL"
        time_str = f"{r.get('elapsed_sec')}s"
        name_str = r.get("name", r.get("defect_id"))[:36]
        print(f"{r['defect_id']:<14} | {name_str:<36} | {cov:<10} | {patch:<10} | {time_str:<8} | {r.get('status')}")
    print("=" * 95)

    if evaluated:
        mean_cov = sum(r["line_coverage_pct"] for r in evaluated if r.get("line_coverage_pct")) / max(1, sum(1 for r in evaluated if r.get("line_coverage_pct")))
        pass_rate = (sum(1 for r in evaluated if r.get("plausible_patch")) / len(evaluated)) * 100
        print(f"REAL-WORLD RESULTS SUMMARY ({len(evaluated)} Evaluated Defect Fixtures):")
        print(f"- Plausible Patch Rate:    {pass_rate:.1f}% ({sum(1 for r in evaluated if r.get('plausible_patch'))}/{len(evaluated)})")
        print(f"- Mean Line Coverage:      {mean_cov:.1f}%")
        print(f"- Mean Verification Time:  {sum(r['elapsed_sec'] for r in evaluated)/len(evaluated):.2f}s")
    print("=" * 95 + "\n")


if __name__ == "__main__":
    main()
