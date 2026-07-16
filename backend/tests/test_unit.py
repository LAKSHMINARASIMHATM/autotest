"""Unit tests for execution parsers — no app import, no DB connection needed."""

from __future__ import annotations


def test_coverage_parser_valid_xml() -> None:
    """CoverageParser should extract line_rate from valid Cobertura XML."""
    from app.execution.coverage_parser import CoverageParser

    xml = """<?xml version="1.0" ?>
    <coverage line-rate="0.85" branch-rate="0.72" version="7.0">
      <packages>
        <package name="app">
          <classes>
            <class filename="app/main.py" line-rate="0.90">
              <lines>
                <line number="1" hits="1"/>
                <line number="2" hits="0"/>
              </lines>
            </class>
          </classes>
        </package>
      </packages>
    </coverage>"""

    result = CoverageParser.parse_xml(xml)
    assert result["line_coverage_pct"] == 85.0
    assert result["branch_coverage_pct"] == 72.0
    assert len(result["files"]) == 1
    assert result["files"][0]["missing_lines"] == [2]


def test_coverage_parser_invalid_xml() -> None:
    """CoverageParser should return zeroes on invalid XML."""
    from app.execution.coverage_parser import CoverageParser

    result = CoverageParser.parse_xml("not xml at all")
    assert result["line_coverage_pct"] == 0.0
    assert result["files"] == []


def test_result_parser_junit_xml() -> None:
    """ResultParser should correctly parse JUnit XML."""
    from app.execution.result_parser import ResultParser

    xml = """<?xml version="1.0"?>
    <testsuite tests="5" failures="1" errors="0" time="2.5">
      <testcase classname="tests.test_auth" name="test_login_valid" time="0.5"/>
      <testcase classname="tests.test_auth" name="test_login_invalid" time="0.3">
        <failure message="AssertionError">Expected 401, got 200</failure>
      </testcase>
      <testcase classname="tests.test_auth" name="test_register" time="0.4"/>
      <testcase classname="tests.test_auth" name="test_refresh" time="0.2"/>
      <testcase classname="tests.test_auth" name="test_logout" time="0.1"/>
    </testsuite>"""

    result = ResultParser.from_junit_xml(xml)
    assert result["total"] == 5
    assert result["failed"] == 1
    assert result["passed"] == 4
    assert len(result["failures"]) == 1
    assert "test_login_invalid" in result["failures"][0]["node_id"]


def test_result_parser_merge() -> None:
    """Merging results from multiple runners should aggregate correctly."""
    from app.execution.result_parser import ResultParser

    r1 = {"passed": 10, "failed": 2, "errors": 0, "total": 12, "duration_ms": 500.0, "failures": [], "logs": ""}
    r2 = {"passed": 5, "failed": 1, "errors": 1, "total": 7, "duration_ms": 300.0, "failures": [], "logs": ""}

    merged = ResultParser.merge_results(r1, r2)
    assert merged["passed"] == 15
    assert merged["failed"] == 3
    assert merged["total"] == 19
    assert merged["duration_ms"] == 800.0


def test_metrics_demo_mode() -> None:
    """MetricsService demo fallback returns valid structure."""
    import os, sys
    # Patch env vars before importing settings
    os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017")
    os.environ.setdefault("GROQ_API_KEY", "gsk_test")
    os.environ.setdefault("NEO4J_PASSWORD", "test")
    os.environ.setdefault("JWT_SECRET", "test-secret")

    from app.evaluation.metrics_service import MetricsService
    result = MetricsService._demo_metrics("test-project")
    assert result["total_test_cases"] > 0
    assert result["total_bugs"] > 0
    assert 0.0 <= result["patch_success_rate"] <= 100.0


def test_patch_engine_confidence() -> None:
    """PatchEngine confidence estimator should return valid scores."""
    import os
    os.environ.setdefault("GROQ_API_KEY", "gsk_test")
    os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017")
    os.environ.setdefault("NEO4J_PASSWORD", "test")
    os.environ.setdefault("JWT_SECRET", "test-secret")

    from app.repair.patch_engine import PatchEngine

    diff_small = "+    if x is None: return\n-    pass"
    conf = PatchEngine._estimate_confidence(diff_small, "minimal")
    assert 0.5 <= conf <= 1.0

    diff_large = "\n".join([f"+    line_{i}" for i in range(50)])
    conf_large = PatchEngine._estimate_confidence(diff_large, "refactor")
    assert conf_large < 0.85  # penalised for large diff
