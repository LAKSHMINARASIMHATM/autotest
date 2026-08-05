"""Unit tests for execution parsers — no app import, no DB connection needed."""

from __future__ import annotations

import pytest


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


def test_metrics_service_exists() -> None:
    """MetricsService class is importable and has get_dashboard_metrics method."""
    import os
    # Patch env vars before importing settings
    os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017")
    os.environ.setdefault("GROQ_API_KEY", "gsk_test")
    os.environ.setdefault("NEO4J_PASSWORD", "test")
    os.environ.setdefault("JWT_SECRET", "test-secret")

    from app.evaluation.metrics_service import MetricsService
    # Verify the class exists and has the expected async method
    assert hasattr(MetricsService, "get_dashboard_metrics"), (
        "MetricsService must expose get_dashboard_metrics classmethod"
    )
    import asyncio
    assert asyncio.iscoroutinefunction(MetricsService.get_dashboard_metrics), (
        "get_dashboard_metrics must be an async method"
    )


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


def test_neo4j_serialization() -> None:
    """Test serialize_neo4j_value converts mock Neo4j objects into serializable dicts."""
    import os
    os.environ.setdefault("GROQ_API_KEY", "gsk_test")
    os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017")
    os.environ.setdefault("NEO4J_PASSWORD", "test")
    os.environ.setdefault("JWT_SECRET", "test-secret")

    from unittest.mock import MagicMock
    from neo4j.graph import Node, Relationship
    from app.knowledge.graph.neo4j_service import serialize_neo4j_value

    node = MagicMock(spec=Node)
    node.element_id = "node-1"
    node.labels = {"Function"}
    node.items.return_value = [("name", "verify_password"), ("signature", "verify_password()")]

    rel = MagicMock(spec=Relationship)
    rel.element_id = "rel-1"
    rel.type = "TESTS"
    rel.start_node = MagicMock(spec=Node)
    rel.start_node.element_id = "node-2"
    rel.end_node = MagicMock(spec=Node)
    rel.end_node.element_id = "node-1"
    rel.items.return_value = [("weight", 0.9)]

    res_node = serialize_neo4j_value(node)
    assert res_node["id"] == "node-1"
    assert "Function" in res_node["labels"]
    assert res_node["properties"]["name"] == "verify_password"

    res_rel = serialize_neo4j_value(rel)
    assert res_rel["id"] == "rel-1"
    assert res_rel["type"] == "TESTS"
    assert res_rel["start_node_id"] == "node-2"
    assert res_rel["end_node_id"] == "node-1"
    assert res_rel["properties"]["weight"] == 0.9


def test_result_parser_junit_xml_has_logs_key() -> None:
    """from_junit_xml must always include 'logs' key — regression for BUG-2."""
    from app.execution.result_parser import ResultParser

    # Valid XML
    xml = """<?xml version="1.0"?>
    <testsuite tests="1" failures="0" errors="0" time="0.1">
      <testcase classname="tests.test_foo" name="test_bar" time="0.1"/>
    </testsuite>"""
    result = ResultParser.from_junit_xml(xml)
    assert "logs" in result, "from_junit_xml must return a 'logs' key"
    assert result["logs"] == ""

    # Invalid XML (parse fallback)
    result_bad = ResultParser.from_junit_xml("not xml")
    assert "logs" in result_bad, "from_junit_xml must include 'logs' even on parse error"


def test_pydantic_schemas_no_class_config() -> None:
    """UserResponse and ProjectResponse should not raise deprecation warnings — regression for BUG-1."""
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter("error")   # Turn any DeprecationWarning into an error
        from app.schemas.auth import UserResponse  # noqa: F401 — import triggers validators
        from app.schemas.project import ProjectResponse  # noqa: F401


# ── New Agent Tests (Agents 3, 8, 13, 14) ─────────────────────────────────────


def test_code_understanding_ast_extraction() -> None:
    """CodeUnderstandingAgent static AST helpers extract symbols and call edges correctly."""
    from app.agents.nodes.code_understanding import (
        _extract_symbols,
        _extract_call_edges,
        _extract_cfg_summary,
    )

    source = """\
def greet(name: str) -> str:
    return f"Hello, {name}"

class Calculator:
    def add(self, a: int, b: int) -> int:
        if a < 0:
            a = 0
        return a + b

    def divide(self, a: int, b: int) -> float:
        if b == 0:
            raise ValueError("Cannot divide by zero")
        return a / b
"""
    symbols = _extract_symbols("calc.py", source)
    assert any("greet" in k for k in symbols), "greet function must be in symbol table"
    assert any("Calculator" in k for k in symbols), "Calculator class must be in symbol table"

    edges = _extract_call_edges("calc.py", source)
    # No cross-function calls in this sample, so just verify no crash
    assert isinstance(edges, list)

    cfg = _extract_cfg_summary("calc.py", source)
    assert any(c["function"] == "add" for c in cfg), "add function must appear in CFG"
    add_cfg = next(c for c in cfg if c["function"] == "add")
    assert add_cfg["branches"] == 1, "add has 1 if-branch"
    divide_cfg = next(c for c in cfg if c["function"] == "divide")
    assert divide_cfg["branches"] == 1, "divide has 1 if-branch"


def test_code_understanding_invalid_syntax() -> None:
    """AST helpers should return empty results on SyntaxError without raising."""
    from app.agents.nodes.code_understanding import (
        _extract_symbols,
        _extract_call_edges,
        _extract_cfg_summary,
    )
    bad_source = "def broken(: -> :"
    assert _extract_symbols("bad.py", bad_source) == {}
    assert _extract_call_edges("bad.py", bad_source) == []
    assert _extract_cfg_summary("bad.py", bad_source) == []


def test_coverage_analyst_parse_xml() -> None:
    """CoverageAnalystAgent can parse real Cobertura XML from execution logs."""
    import re

    from app.execution.coverage_parser import CoverageParser

    xml = """<?xml version="1.0" ?>
    <coverage line-rate="0.78" branch-rate="0.60" version="7.0">
      <packages>
        <package name="app">
          <classes>
            <class filename="app/calculator.py" line-rate="0.80">
              <lines>
                <line number="1" hits="1"/>
                <line number="5" hits="0"/>
                <line number="9" hits="1"/>
              </lines>
            </class>
          </classes>
        </package>
      </packages>
    </coverage>"""

    result = CoverageParser.parse_xml(xml)
    assert result["line_coverage_pct"] == 78.0
    assert result["branch_coverage_pct"] == 60.0
    assert len(result["files"]) == 1
    assert result["files"][0]["missing_lines"] == [5]


def test_agent_state_new_fields() -> None:
    """AgentState now includes code_understanding, coverage_report, regression_report, xai_report."""
    import os
    os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017")
    os.environ.setdefault("GROQ_API_KEY", "gsk_test")
    os.environ.setdefault("NEO4J_PASSWORD", "test")
    os.environ.setdefault("JWT_SECRET", "test-secret")

    from app.agents.state import (
        AgentState,
        CodeUnderstanding,
        CoverageReport,
        RegressionReport,
        XAIReport,
    )

    # Verify new schema models are correctly defined
    cu = CodeUnderstanding(
        symbol_table={"calc.py::add": {"type": "function", "name": "add"}},
        call_graph_edges=[{"caller": "main", "callee": "add", "file": "calc.py"}],
        total_symbols=1,
        total_call_edges=1,
    )
    assert cu.total_symbols == 1
    assert cu.total_call_edges == 1

    cr = CoverageReport(line_coverage_pct=78.5, branch_coverage_pct=60.0, meets_threshold=True)
    assert cr.line_coverage_pct == 78.5
    assert cr.meets_threshold is True

    rr = RegressionReport(ok=True, passed=5, failed=0, delta=0, message="All clear")
    assert rr.ok is True

    xai = XAIReport(session_id="sess-1", total_agents=14, pipeline_confidence=0.87)
    assert xai.total_agents == 14
    assert xai.pipeline_confidence == 0.87

    # Verify AgentState TypedDict has all new keys
    state_keys = AgentState.__annotations__.keys()
    assert "code_understanding" in state_keys
    assert "coverage_report" in state_keys
    assert "regression_report" in state_keys
    assert "xai_report" in state_keys


def test_orchestrator_has_14_nodes() -> None:
    """build_agent_graph must wire exactly 14 agent nodes (plus START/END)."""
    import os
    os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017")
    os.environ.setdefault("GROQ_API_KEY", "gsk_test")
    os.environ.setdefault("NEO4J_PASSWORD", "test")
    os.environ.setdefault("JWT_SECRET", "test-secret")

    from unittest.mock import MagicMock
    from app.agents.orchestrator import build_agent_graph

    # Use a mock LLM so we don't need real API keys
    mock_llm = MagicMock()
    graph = build_agent_graph(llm=mock_llm)

    # LangGraph StateGraph has a `nodes` dict (excluding __start__ / __end__)
    agent_node_names = {
        name for name in graph.nodes
        if not name.startswith("__")
    }

    expected_nodes = {
        "planner",           # Agent 1  — Project Analyst
        "requirement",       # Agent 2  — Requirements Analyst
        "code_understanding",# Agent 3  — Code Understanding
        "architecture",      # Agent 4  — Architecture
        "test_strategy",     # Agent 4b — Test Planner
        "test_generation",   # Agent 5  — Unit Test Generator
        "verification",      # Agent 6  — Verification Agent
        "execution",         # Agent 7  — Execution Agent
        "coverage_analyst",  # Agent 8  — Coverage Analyst
        "bug_localization",  # Agent 9  — Bug Localization
        "root_cause",        # Agent 10 — Root Cause Analyst
        "program_repair",    # Agent 11 — Program Repair
        "patch_validation",  # Agent 12 — Patch Validation
        "regression_agent",  # Agent 13 — Regression Agent
        "explainability",    # Agent 14 — Explainability
        "learning",          # Memory/Learning terminal node
    }

    missing = expected_nodes - agent_node_names
    assert not missing, f"Missing nodes in orchestrator: {missing}"
    assert len(agent_node_names) >= 16, (
        f"Expected at least 16 nodes, got {len(agent_node_names)}: {agent_node_names}"
    )


@pytest.mark.asyncio
async def test_docker_sandbox_local_exec_and_normalization() -> None:
    """DockerSandbox local backend normalizes python executables and sets up execution correctly."""
    import tempfile
    import sys
    from pathlib import Path
    from app.execution.sandbox import DockerSandbox

    with tempfile.TemporaryDirectory(prefix="autotest-test-sb-") as tmp_dir:
        # Create a sample python script in project dir
        script_file = Path(tmp_dir) / "sample.py"
        script_file.write_text("print('hello_sandbox')\n", encoding="utf-8")

        async with DockerSandbox(framework="pytest", project_path=tmp_dir) as sb:
            # 1. Check python command normalization ("python" -> sys.executable)
            res = await sb.exec(["python", "-c", "import sys; print('python_ok')"])
            assert res.exit_code == 0
            assert "python_ok" in res.stdout

            # 2. Check cat fallback for relative file
            res_cat = await sb.exec(["cat", "sample.py"])
            assert res_cat.exit_code == 0
            assert "hello_sandbox" in res_cat.stdout

            # 3. Check cat fallback for non-existent file
            res_no = await sb.exec(["cat", "non_existent.py"])
            assert res_no.exit_code == 1
            assert "No such file" in res_no.stderr


@pytest.mark.asyncio
async def test_patch_validator_relative_paths() -> None:
    """PatchValidator handles diff application and test execution without breaking on relative paths."""
    import tempfile
    from pathlib import Path
    from app.repair.patch_validator import PatchValidator

    with tempfile.TemporaryDirectory(prefix="autotest-patch-val-") as tmp_dir:
        project_path = Path(tmp_dir)
        src_file = project_path / "math_utils.py"
        src_file.write_text("def add(a, b):\n    return a - b  # bug\n", encoding="utf-8")

        test_file = project_path / "tests" / "test_math.py"
        test_file.parent.mkdir(parents=True, exist_ok=True)
        test_file.write_text(
            "import math_utils\n\ndef test_add():\n    assert math_utils.add(2, 3) == 5\n",
            encoding="utf-8",
        )

        patch_diff = (
            "--- a/math_utils.py\n"
            "+++ b/math_utils.py\n"
            "@@ -2,1 +2,1 @@\n"
            "-    return a - b  # bug\n"
            "+    return a + b\n"
        )

        val = await PatchValidator.validate(
            patch_id="p123",
            patch_diff=patch_diff,
            file_path="math_utils.py",
            project_path=str(project_path),
            failing_test="tests/test_math.py::test_add",
            run_id="run-1",
        )

        assert val["compilation_ok"] is True
        assert val["failing_test_passes"] is True
        assert val["verdict"] == "accepted"


def test_apply_unified_diff_hunks() -> None:
    """_apply_unified_diff correctly parses diffs, handles line 0, and returns failure when no hunks exist."""
    import tempfile
    from pathlib import Path
    from app.repair.patch_validator import _apply_unified_diff

    with tempfile.TemporaryDirectory(prefix="autotest-diff-test-") as tmp_dir:
        workdir = Path(tmp_dir)
        target = workdir / "sample.py"
        target.write_text("line1\nline2\nline3\n", encoding="utf-8")

        # Valid diff
        diff = "--- sample.py\n+++ sample.py\n@@ -2,1 +2,1 @@\n-line2\n+line2_fixed\n"
        ok, err = _apply_unified_diff(diff, workdir)
        assert ok is True
        assert "line2_fixed" in target.read_text(encoding="utf-8")

        # Invalid diff (no hunks)
        bad_diff = "This is not a diff format"
        ok_bad, err_bad = _apply_unified_diff(bad_diff, workdir)
        assert ok_bad is False
        assert "No valid diff hunks" in err_bad

        # Deletion diff (/dev/null)
        dev_null_diff = "--- sample.py\n+++ /dev/null\n@@ -1,3 +0,0 @@\n-line1\n-line2_fixed\n-line3\n"
        ok_del, err_del = _apply_unified_diff(dev_null_diff, workdir)
        assert ok_del is False
        assert "strictly prohibited" in err_del


def test_heuristic_verdict_anti_deletion() -> None:
    """_heuristic_verdict rejects patches targeting /dev/null."""
    from app.repair.patch_validator import _heuristic_verdict

    patch = "--- sample.py\n+++ /dev/null\n@@ -1,3 +0,0 @@\n"
    res = _heuristic_verdict(patch, "sample.py")
    assert res["verdict"] == "rejected"
    assert "/dev/null" in res["reason"]




