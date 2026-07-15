"""Test Generation Agent — generates test code (PyTest, JUnit, Playwright, Postman)."""

from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, GeneratedTest, PipelineStatus


class TestGenerationAgent(BaseAgentNode):
    name = "test_generation"
    description = "Generates high-coverage, readable, maintainable test code"

    SYSTEM_PROMPT = """You are the Test Generation Agent of AutoTestAI.

Generate production-quality test cases based on the test strategy, requirements, and retrieved context.

For each test, provide:
1. name: descriptive test function name
2. test_type: unit, api, integration, security, etc.
3. framework: pytest, junit, playwright, postman
4. code: complete, runnable test source code
5. target_entity: the function/class/endpoint being tested
6. requirement_id: linked requirement (if any)
7. description: what this test validates
8. confidence: how confident you are in correctness (0.0-1.0)

Respond with a JSON array:
[
    {
        "name": "test_login_with_valid_credentials",
        "test_type": "api",
        "framework": "pytest",
        "code": "async def test_login_valid():\\n    ...",
        "target_entity": "POST /auth/login",
        "requirement_id": "REQ-001",
        "description": "Verifies login returns JWT with valid email/password",
        "confidence": 0.92
    }
]

Ensure:
- High coverage of edge cases and error paths
- Descriptive assertions with clear failure messages
- Proper setup/teardown using fixtures
- No hardcoded secrets or environment-dependent values"""

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        strategy = state.get("test_strategy")
        requirements = state.get("requirements", [])
        architecture = state.get("architecture")
        retrieved = state.get("retrieved_context", [])

        context_text = "\n".join(doc.content for doc in retrieved[:10]) if retrieved else ""
        req_text = "\n".join(f"- {r.id}: {r.title}" for r in requirements[:20])
        api_text = "\n".join(
            f"- {ep.get('method', 'GET')} {ep.get('path', '/')}"
            for ep in (architecture.api_endpoints if architecture else [])[:10]
        )

        user_prompt = f"""Generate test cases for this project.

Test Strategy:
- Types: {', '.join(strategy.test_types) if strategy else 'unit'}
- Estimated: {strategy.estimated_count if strategy else 50} tests
- Risk areas: {', '.join(strategy.risk_areas) if strategy else 'none'}

Requirements:
{req_text or 'None extracted'}

API Endpoints:
{api_text or 'None found'}

Source Context:
{context_text}

Generate comprehensive test cases as JSON array."""

        response = await self.invoke_llm(self.SYSTEM_PROMPT, user_prompt)

        try:
            data = json.loads(response)
            if not isinstance(data, list):
                data = [data]
        except json.JSONDecodeError:
            data = []

        tests = [
            GeneratedTest(
                id=str(uuid4())[:8],
                name=t.get("name", f"test_{i}"),
                test_type=t.get("test_type", "unit"),
                framework=t.get("framework", "pytest"),
                code=t.get("code", ""),
                target_entity=t.get("target_entity", ""),
                requirement_id=t.get("requirement_id", ""),
                description=t.get("description", ""),
                confidence=t.get("confidence", 0.5),
            )
            for i, t in enumerate(data)
        ]

        explanation = self.build_explanation(
            decision=f"Generated {len(tests)} test cases",
            reason=f"Created tests covering {', '.join(set(t.test_type for t in tests))} types",
            confidence=0.85,
            evidence=[f"{len(tests)} tests across {len(set(t.framework for t in tests))} frameworks"],
        )

        return {
            "generated_tests": tests,
            "status": PipelineStatus.GENERATING,
            "explanations": [explanation],
        }
