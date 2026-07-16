"""XAI Service — formats agent explanations into structured, human-readable reports."""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)


class XAIService:
    """Generates explainability reports from agent trace logs stored in MongoDB."""

    @classmethod
    async def get_session_trace(cls, session_id: str) -> dict[str, Any]:
        """Return the full XAI trace for a pipeline session.

        Each entry documents which agent made a decision, why, with what
        evidence, and what alternatives were considered.
        """
        # In production: query MongoDB AuditLog by session_id
        # Demo: return structured mock trace
        return {
            "session_id": session_id,
            "agents": [
                {
                    "name": "planner",
                    "decision": "Identified 3 modules and 24 functions for analysis",
                    "reason": "Parsed project structure and prioritized complex modules",
                    "confidence": 0.92,
                    "evidence": ["Found 3 modules", "Detected FastAPI framework"],
                    "alternatives": ["Full repo scan", "Entry-point only analysis"],
                },
                {
                    "name": "requirement",
                    "decision": "Extracted 14 functional requirements",
                    "reason": "Scanned docstrings, OpenAPI schema, and README for requirements",
                    "confidence": 0.87,
                    "evidence": ["README mentions 5 features", "OpenAPI has 12 endpoints"],
                    "alternatives": ["Manual SRS input", "Stakeholder interview"],
                },
                {
                    "name": "test_strategy",
                    "decision": "Selected unit + API + security test types",
                    "reason": "Auth endpoints and payment logic are high-risk areas",
                    "confidence": 0.89,
                    "evidence": ["Auth module: 4 endpoints", "Payment module: complex branching"],
                    "alternatives": ["Unit-only strategy", "Full E2E suite"],
                },
                {
                    "name": "test_generation",
                    "decision": "Generated 247 test cases across 3 frameworks",
                    "reason": "Covered all requirements with boundary and edge-case tests",
                    "confidence": 0.85,
                    "evidence": ["247 tests: 180 pytest, 45 postman, 22 playwright"],
                    "alternatives": ["50-test minimal suite"],
                },
                {
                    "name": "bug_localization",
                    "decision": "Localized 3 bugs in auth.py, payments.py, utils.py",
                    "reason": "Analyzed failing test stack traces and call graphs",
                    "confidence": 0.91,
                    "evidence": ["NullPointerError at auth.py:142", "TypeError at payments.py:87"],
                    "alternatives": ["Manual code review", "Static analysis only"],
                },
                {
                    "name": "program_repair",
                    "decision": "Generated 4 patch strategies for auth.py bug",
                    "reason": "Applied minimal, defensive, refactor, boundary strategies",
                    "confidence": 0.88,
                    "evidence": ["Minimal patch: 3 lines changed", "Defensive patch: added null check"],
                    "alternatives": ["Single strategy", "Manual patch"],
                },
            ],
            "summary": (
                "AutoTestAI executed a full quality engineering cycle: analyzed the project, "
                "extracted 14 requirements, generated 247 tests, detected 3 bugs, and "
                "generated repair patches — all autonomously."
            ),
        }

    @classmethod
    async def get_agent_confidence_scores(cls, session_id: str) -> list[dict[str, Any]]:
        """Return per-agent confidence scores for visualization."""
        return [
            {"agent": "planner",        "confidence": 0.92, "status": "complete"},
            {"agent": "requirement",     "confidence": 0.87, "status": "complete"},
            {"agent": "architecture",    "confidence": 0.88, "status": "complete"},
            {"agent": "retriever",       "confidence": 0.90, "status": "complete"},
            {"agent": "test_strategy",   "confidence": 0.89, "status": "complete"},
            {"agent": "test_generation", "confidence": 0.85, "status": "complete"},
            {"agent": "verification",    "confidence": 0.91, "status": "complete"},
            {"agent": "execution",       "confidence": 0.95, "status": "complete"},
            {"agent": "bug_localization","confidence": 0.91, "status": "complete"},
            {"agent": "root_cause",      "confidence": 0.85, "status": "complete"},
            {"agent": "program_repair",  "confidence": 0.88, "status": "complete"},
            {"agent": "patch_validation","confidence": 0.93, "status": "complete"},
            {"agent": "learning",        "confidence": 0.90, "status": "complete"},
        ]
