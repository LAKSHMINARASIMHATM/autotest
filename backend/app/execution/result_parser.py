"""Unified result parser — normalises JUnit XML, JSON reports into ExecutionResult schema."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import Any


class ResultParser:
    """Converts raw runner outputs into a normalized ExecutionResult-compatible dict."""

    @classmethod
    def from_junit_xml(cls, xml_str: str) -> dict[str, Any]:
        """Parse JUnit XML (pytest/java) into a normalized result dict."""
        failures = []
        passed = failed = errors = total = 0
        duration_ms = 0.0

        try:
            root = ET.fromstring(xml_str)
            # Handle both <testsuites> and single <testsuite>
            suites = root.findall("testsuite") if root.tag == "testsuites" else [root]

            for suite in suites:
                total += int(suite.get("tests", 0))
                failed += int(suite.get("failures", 0))
                errors += int(suite.get("errors", 0))
                duration_ms += float(suite.get("time", 0)) * 1000

                for case in suite.findall("testcase"):
                    failure_el = case.find("failure")
                    error_el = case.find("error")
                    if failure_el is not None or error_el is not None:
                        el = failure_el if failure_el is not None else error_el
                        assert el is not None
                        failures.append({
                            "node_id": f"{case.get('classname', '')}.{case.get('name', '')}",
                            "outcome": "failed" if failure_el is not None else "error",
                            "longrepr": (el.text or "") + (el.get("message") or ""),
                        })

            passed = total - failed - errors
        except ET.ParseError:
            pass

        return {
            "passed": passed,
            "failed": failed,
            "errors": errors,
            "total": total,
            "duration_ms": round(duration_ms, 2),
            "failures": failures,
        }

    @classmethod
    def merge_results(cls, *results: dict[str, Any]) -> dict[str, Any]:
        """Merge multiple runner result dicts into one aggregate."""
        merged: dict[str, Any] = {
            "passed": 0, "failed": 0, "errors": 0, "total": 0,
            "duration_ms": 0.0, "failures": [], "logs": "",
        }
        for r in results:
            merged["passed"] += r.get("passed", 0)
            merged["failed"] += r.get("failed", 0)
            merged["errors"] += r.get("errors", 0)
            merged["total"] += r.get("total", 0)
            merged["duration_ms"] += r.get("duration_ms", 0.0)
            merged["failures"].extend(r.get("failures", []))
            if r.get("logs"):
                merged["logs"] += r["logs"] + "\n"
        return merged
