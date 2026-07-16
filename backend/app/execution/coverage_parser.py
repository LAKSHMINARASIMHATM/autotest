"""Coverage parser — extracts line and branch coverage from coverage.xml (Cobertura format)."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import Any


class CoverageParser:
    """Parses Cobertura-format coverage.xml produced by pytest-cov."""

    @classmethod
    def parse_xml(cls, xml_str: str) -> dict[str, Any]:
        """Parse coverage.xml and return line rate, branch rate, and per-file data.

        Args:
            xml_str: Raw Cobertura XML string.

        Returns:
            Dict with:
                - line_rate: float (0.0-1.0)
                - branch_rate: float (0.0-1.0)
                - line_coverage_pct: float (0-100)
                - branch_coverage_pct: float (0-100)
                - files: list[dict] per file with name, line_rate, missing_lines
        """
        try:
            root = ET.fromstring(xml_str)
            line_rate = float(root.get("line-rate", 0))
            branch_rate = float(root.get("branch-rate", 0))

            files = []
            for pkg in root.findall(".//package"):
                for cls_el in pkg.findall("classes/class"):
                    filename = cls_el.get("filename", "")
                    cls_line_rate = float(cls_el.get("line-rate", 0))
                    missing = [
                        int(ln.get("number", 0))
                        for ln in cls_el.findall("lines/line")
                        if ln.get("hits", "0") == "0"
                    ]
                    files.append({
                        "filename": filename,
                        "line_rate": round(cls_line_rate, 4),
                        "missing_lines": missing,
                    })

            return {
                "line_rate": round(line_rate, 4),
                "branch_rate": round(branch_rate, 4),
                "line_coverage_pct": round(line_rate * 100, 2),
                "branch_coverage_pct": round(branch_rate * 100, 2),
                "files": files,
            }
        except (ET.ParseError, ValueError):
            return {
                "line_rate": 0.0,
                "branch_rate": 0.0,
                "line_coverage_pct": 0.0,
                "branch_coverage_pct": 0.0,
                "files": [],
            }
