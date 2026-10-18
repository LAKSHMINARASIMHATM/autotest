# AutoTestAI: Empirical Evaluation Harness

This directory contains the reproducible experimental evaluation harness for **AutoTestAI**.

## Directory Layout

```
evaluation/
├── README.md                  # This reproduction guide
├── LIMITATIONS.md             # Threats to validity & contamination analysis
├── bug_list.txt               # Fixed, pre-selected defect list (BugsInPy)
├── configs/
│   ├── default.yaml           # Default experimental configuration
│   └── smoke.yaml             # Fast 2-defect configuration for testing
├── runners/
│   └── run_evaluation.py      # Main experimental execution driver
├── results/
│   └── raw/                   # Per-run raw artifacts (logs, diffs, metrics)
│       └── <run_id>/
│           └── <bug_id>/
│               ├── meta.json
│               ├── patch.diff
│               └── test_output.txt
└── aggregate.py               # Reads ONLY raw/ artifacts to build summary tables
```

## Execution Protocol

### 1. Smoke Check (2 Defects)
```bash
python -m evaluation.runners.run_evaluation --config evaluation/configs/smoke.yaml
```

### 2. Full BugsInPy Evaluation
```bash
python -m evaluation.runners.run_evaluation --config evaluation/configs/default.yaml
```

### 3. Generate Authoritative Tables
```bash
python evaluation/aggregate.py
```
*Note: `aggregate.py` strictly refuses to generate numbers if no backing raw execution logs exist.*
