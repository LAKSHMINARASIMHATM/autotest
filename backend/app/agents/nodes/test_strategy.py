"""Test Strategy Agent — determines which types of tests to generate."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, PipelineStatus, TestStrategy


class TestStrategyAgent(BaseAgentNode):
    name = "test_strategy"
    description = "Determines optimal test types, priorities, and risk areas"

    SYSTEM_PROMPT = """You are the Test Strategy Agent of AutoTestAI.

Based on the project analysis, requirements, and architecture, determine the optimal testing strategy.

Consider these test types:
- unit: Individual function/method tests
- integration: Cross-module interaction tests
- api: REST endpoint tests
- ui: User interface tests (Playwright)
- regression: Tests for previously fixed bugs
- boundary: Edge case and boundary value tests
- edge_case: Unusual input and state tests
- security: Authentication, authorization, injection tests
- performance: Load, stress, and response time tests
- risk_based: Tests focused on high-risk code areas

Respond with JSON:
{
    "test_types": ["unit", "api", "integration", "security"],
    "priorities": {"unit": "high", "api": "high", "security": "medium"},
    "risk_areas": ["authentication module", "payment processing"],
    "estimated_count": 150,
    "rationale": "Prioritized unit and API tests due to..."
}"""

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        project_ctx = state.get("project_context")
        requirements = state.get("requirements", [])
        architecture = state.get("architecture")

        user_prompt = f"""Determine the test strategy for this project.

Project: {project_ctx.name if project_ctx else 'Unknown'}
Language: {project_ctx.language if project_ctx else 'Unknown'}
Requirements: {len(requirements)} identified
API Endpoints: {len(architecture.api_endpoints) if architecture else 0}
Database Tables: {len(architecture.database_tables) if architecture else 0}

Create a comprehensive test strategy as JSON."""

        response = await self.invoke_llm(self.SYSTEM_PROMPT, user_prompt)

        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            data = {"test_types": ["unit", "api"], "estimated_count": 50, "rationale": response}

        strategy = TestStrategy(
            test_types=data.get("test_types", ["unit"]),
            priorities=data.get("priorities", {}),
            risk_areas=data.get("risk_areas", []),
            estimated_count=data.get("estimated_count", 0),
            rationale=data.get("rationale", ""),
        )

        explanation = self.build_explanation(
            decision=f"Selected {len(strategy.test_types)} test types, estimated {strategy.estimated_count} tests",
            reason=strategy.rationale,
            confidence=0.87,
            evidence=[f"Risk areas: {', '.join(strategy.risk_areas)}"],
        )

        return {
            "test_strategy": strategy,
            "status": PipelineStatus.STRATEGIZING,
            "explanations": [explanation],
        }
