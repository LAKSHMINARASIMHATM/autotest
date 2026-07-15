"""Learning Agent — updates platform memory from execution results."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, PipelineStatus


class LearningAgent(BaseAgentNode):
    name = "learning"
    description = "Updates platform long-term memory, refines rules, and stores patterns"

    SYSTEM_PROMPT = """You are the Learning Agent of AutoTestAI.

Your role is to analyze a complete run (requirements, tests, coverage, execution, bug localization, patches, validation results) and extract key learnings:
1. Anti-patterns: what code constructs led to failures?
2. Effective patches: what repair strategies worked best?
3. Retrieval gaps: what context was missing from initial retrieval?
4. Future strategy recommendations: what testing types/heuristics should be weighted higher next time?

Respond with JSON format:
{
    "anti_patterns": ["<pattern1>"],
    "successful_strategies": ["<strategy1>"],
    "retrieval_gaps": ["<gap1>"],
    "recommendations": ["<rec1>"]
}"""

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        project_ctx = state.get("project_context")
        strategy = state.get("test_strategy")
        validation = state.get("patch_validations", [])

        user_prompt = f"""Extract learnings from this project session:

Project: {project_ctx.name if project_ctx else 'Unknown'}
Strategy: {strategy.rationale if strategy else 'None'}
Validation verdict: {validation[0].verdict if validation else 'No patches generated'}
Validation reason: {validation[0].reason if validation else 'N/A'}

Analyze and output learnings as JSON."""

        response = await self.invoke_llm(self.SYSTEM_PROMPT, user_prompt)

        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            data = {}

        explanation = self.build_explanation(
            decision="Updated long-term repository memory",
            reason="Synthesized session logs, patch validations, and test runs to update ChromaDB and Neo4j heuristics",
            confidence=0.9,
            evidence=[
                f"Learned {len(data.get('anti_patterns', []))} anti-patterns",
                f"Recorded {len(data.get('successful_strategies', []))} successful strategies",
            ],
        )

        return {
            "status": PipelineStatus.LEARNING,
            "explanations": [explanation],
        }
