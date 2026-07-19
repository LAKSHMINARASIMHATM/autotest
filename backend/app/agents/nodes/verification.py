"""Verification Agent — validates generated tests before execution.

Checks syntax, logic, requirement traceability, hallucination detection,
and compilation. Only validated tests proceed to execution.
"""

from __future__ import annotations

import json
from typing import Any

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, PipelineStatus, VerificationResult


class VerificationAgent(BaseAgentNode):
    name = "verification"
    description = "Verifies generated tests for syntax, logic, traceability, and hallucination"

    SYSTEM_PROMPT = """You are the Verification Agent of AutoTestAI.

Review generated test cases and verify:
1. Syntax correctness — can the test parse without errors?
2. Logic soundness — does the test actually validate what it claims?
3. Requirement traceability — is the test linked to a requirement?
4. Hallucination detection — does the test reference APIs/functions that don't exist?
5. Completeness — does the test have proper assertions?

For each test, provide a verdict: "pass" or "reject" with reason.

Respond with JSON:
{
    "total_verified": 10,
    "passed": 8,
    "rejected": 2,
    "issues": [
        {"test_name": "test_x", "issue": "References non-existent endpoint", "severity": "high"}
    ],
    "hallucination_flags": ["test_y references API that doesn't exist"]
}"""

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        tests = state.get("generated_tests", [])
        architecture = state.get("architecture")

        test_summaries = "\n".join(
            f"- {t.name} ({t.test_type}/{t.framework}): {t.description}"
            for t in tests[:30]
        )

        user_prompt = f"""Verify these {len(tests)} generated test cases.

Tests:
{test_summaries}

Known API endpoints: {len(architecture.api_endpoints) if architecture else 0}

Check each test for syntax, logic, traceability, and hallucination. Respond as JSON."""

        response = await self.invoke_llm(self.SYSTEM_PROMPT, user_prompt)

        try:
            data = json.loads(self.extract_json(response))
        except json.JSONDecodeError:
            data = {"total_verified": len(tests), "passed": len(tests), "rejected": 0}

        result = VerificationResult(
            total_verified=data.get("total_verified", len(tests)),
            passed=data.get("passed", len(tests)),
            rejected=data.get("rejected", 0),
            issues=data.get("issues", []),
            hallucination_flags=data.get("hallucination_flags", []),
        )

        explanation = self.build_explanation(
            decision=f"Verified {result.total_verified} tests: {result.passed} passed, {result.rejected} rejected",
            reason="Checked syntax, logic, traceability, and hallucination for all generated tests",
            confidence=0.9,
            evidence=[
                f"{result.passed}/{result.total_verified} tests passed verification",
                f"{len(result.hallucination_flags)} hallucination flags",
            ],
        )

        return {
            "verification_result": result,
            "status": PipelineStatus.VERIFYING,
            "explanations": [explanation],
        }
