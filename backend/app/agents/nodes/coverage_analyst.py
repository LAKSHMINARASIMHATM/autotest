"""Coverage Analyst Agent — measures line and branch coverage after test execution.

Agent #8 in the pipeline. Sits between the Execution Agent and the conditional
routing decision so that coverage data is always available before bug localization.

Strategy:
1. Try to extract real coverage from pytest-cov Cobertura XML embedded in
   the execution logs.
2. If no XML is present, use the CoverageParser to parse any `.coverage` JSON
   embedded in the execution telemetry.
3. Fallback: ask the LLM to estimate line/branch coverage from the list of
   passing/failing tests and the known source file list.
"""

from __future__ import annotations

import json
import re
from typing import Any

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, CoverageReport, PipelineStatus
from app.core.logging import get_logger
from app.execution.coverage_parser import CoverageParser

logger = get_logger(__name__)


class CoverageAnalystAgent(BaseAgentNode):
    name = "coverage_analyst"
    description = (
        "Measures line/branch coverage from pytest telemetry; "
        "falls back to LLM estimation when coverage XML is unavailable"
    )

    SYSTEM_PROMPT = """You are the Coverage Analyst Agent of AutoTestAI.

Given a list of executed test cases and the project source files, estimate the
code coverage achieved by the test suite.

For each source file, estimate:
- line_rate: fraction of lines executed (0.0-1.0)
- missing_lines: list of line numbers likely NOT covered

Respond with JSON:
{
    "line_coverage_pct": <float 0-100>,
    "branch_coverage_pct": <float 0-100>,
    "files": [
        {
            "filename": "<relative/path/to/file.py>",
            "line_rate": <float 0.0-1.0>,
            "missing_lines": [<int>, ...]
        }
    ],
    "meets_threshold": <bool>,
    "summary": "<brief coverage summary>"
}"""

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        exec_result = state.get("execution_result")
        repo_summary = state.get("repo_summary") or {}
        threshold = 70.0  # default coverage threshold

        # ── 1. Try parsing Cobertura XML from execution logs ──────────────────
        coverage_data: dict[str, Any] | None = None

        if exec_result and exec_result.logs:
            xml_match = re.search(
                r"(<\?xml[^>]*\?>.*?</coverage>)",
                exec_result.logs,
                re.DOTALL,
            )
            if xml_match:
                try:
                    coverage_data = CoverageParser.parse_xml(xml_match.group(1))
                    logger.info(
                        "coverage_xml_parsed",
                        line_pct=coverage_data.get("line_coverage_pct"),
                    )
                except Exception as xml_err:
                    logger.warning("coverage_xml_parse_failed", error=str(xml_err))

        # ── 2. Try JSON-embedded coverage dict in logs ────────────────────────
        if coverage_data is None and exec_result and exec_result.logs:
            json_match = re.search(r'"line_coverage_pct"\s*:\s*([\d.]+)', exec_result.logs)
            if json_match:
                try:
                    # Try to recover a coverage JSON blob
                    start = exec_result.logs.rfind("{", 0, json_match.start())
                    end = exec_result.logs.find("}", json_match.end()) + 1
                    if start != -1 and end > start:
                        coverage_data = json.loads(exec_result.logs[start:end])
                except Exception:
                    pass

        # ── 3. LLM estimation fallback ────────────────────────────────────────
        if coverage_data is None:
            logger.info("coverage_llm_estimation", reason="no coverage XML/JSON in logs")
            coverage_data = await self._estimate_via_llm(state, exec_result, repo_summary, threshold)

        # ── Build CoverageReport ──────────────────────────────────────────────
        line_pct = float(coverage_data.get("line_coverage_pct", 0.0))
        branch_pct = float(coverage_data.get("branch_coverage_pct", 0.0))
        files = coverage_data.get("files", [])

        # Identify uncovered lines for downstream agents
        uncovered = [
            {"file": f.get("filename", ""), "line_numbers": f.get("missing_lines", [])}
            for f in files
            if f.get("missing_lines")
        ]

        meets = line_pct >= threshold

        report = CoverageReport(
            line_coverage_pct=round(line_pct, 2),
            branch_coverage_pct=round(branch_pct, 2),
            files=files,
            uncovered_lines=uncovered,
            meets_threshold=meets,
            threshold_pct=threshold,
        )

        explanation = self.build_explanation(
            decision=f"Coverage: {report.line_coverage_pct:.1f}% line, {report.branch_coverage_pct:.1f}% branch — {'PASS' if meets else 'BELOW THRESHOLD'}",
            reason=coverage_data.get("summary", "Coverage measured from pytest execution telemetry"),
            confidence=0.85 if coverage_data.get("_source") != "llm_estimate" else 0.65,
            evidence=[
                f"{len(files)} files analyzed",
                f"{len(uncovered)} files with uncovered lines",
                f"Threshold: {threshold:.0f}% — {'met' if meets else 'not met'}",
            ],
        )

        return {
            "coverage_report": report,
            "status": PipelineStatus.EXECUTING,
            "explanations": [explanation],
        }

    async def _estimate_via_llm(
        self,
        state: AgentState,
        exec_result: Any,
        repo_summary: dict,
        threshold: float,
    ) -> dict[str, Any]:
        """Use LLM to estimate coverage when no real coverage data is available."""
        tests = state.get("generated_tests", [])
        files = repo_summary.get("files", [])

        test_summary = "\n".join(
            f"- {t.name} ({t.test_type}): {t.target_entity} — {'PASS' if exec_result and exec_result.passed > 0 else 'UNKNOWN'}"
            for t in tests[:20]
        )
        file_list = "\n".join(f"- {f.get('path', '?')}" for f in files[:20])

        passed = exec_result.passed if exec_result else 0
        total = exec_result.total if exec_result else len(tests)
        pass_rate = (passed / total * 100) if total > 0 else 0.0

        user_prompt = f"""Estimate code coverage for this project.

Pass rate: {pass_rate:.1f}% ({passed}/{total} tests passing)
Coverage threshold: {threshold:.0f}%

Test cases executed:
{test_summary or 'None'}

Source files in project:
{file_list or 'None'}

Estimate line and branch coverage. Be realistic based on the number of tests vs files.
Respond with JSON coverage report."""

        try:
            response = await self.invoke_llm(self.SYSTEM_PROMPT, user_prompt)
            data = json.loads(self.extract_json(response))
            data["_source"] = "llm_estimate"
            return data
        except Exception as e:
            logger.warning("coverage_llm_failed", error=str(e))
            # Hard fallback: derive from pass rate
            estimated_pct = round(pass_rate * 0.8, 2)  # conservative estimate
            return {
                "line_coverage_pct": estimated_pct,
                "branch_coverage_pct": round(estimated_pct * 0.75, 2),
                "files": [
                    {"filename": f.get("path", ""), "line_rate": estimated_pct / 100, "missing_lines": []}
                    for f in files[:10]
                ],
                "meets_threshold": estimated_pct >= threshold,
                "summary": f"Estimated {estimated_pct:.1f}% coverage from {pass_rate:.0f}% test pass rate",
                "_source": "llm_estimate",
            }
