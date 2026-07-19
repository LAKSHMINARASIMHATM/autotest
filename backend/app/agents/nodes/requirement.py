"""Requirement Agent — parses SRS, identifies functional and non-functional requirements."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, Requirement


class RequirementAgent(BaseAgentNode):
    name = "requirement"
    description = "Parses SRS documents, identifies functional and non-functional requirements"

    SYSTEM_PROMPT = """You are the Requirement Agent of AutoTestAI.

Your role is to extract and categorize software requirements from project documentation.

For each requirement, provide:
1. A unique ID (REQ-001, REQ-002, etc.)
2. Type: functional, non_functional, security, performance, usability
3. Title: brief title
4. Description: detailed description
5. Priority: critical, high, medium, low
6. Acceptance criteria: list of testable conditions
7. Confidence: 0.0 to 1.0

Respond with a JSON array of requirement objects:
[
    {
        "id": "REQ-001",
        "req_type": "functional",
        "title": "...",
        "description": "...",
        "priority": "high",
        "acceptance_criteria": ["..."],
        "confidence": 0.9
    }
]"""

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        project_ctx = state.get("project_context")
        retrieved = state.get("retrieved_context", [])

        context_text = "\n".join(doc.content for doc in retrieved[:10]) if retrieved else "No documentation available"

        user_prompt = f"""Extract requirements from this project.

Project: {project_ctx.name if project_ctx else 'Unknown'}
Language: {project_ctx.language if project_ctx else 'Unknown'}
Framework: {project_ctx.framework if project_ctx else 'Unknown'}

Available Documentation:
{context_text}

Extract all functional and non-functional requirements as JSON."""

        response = await self.invoke_llm(self.SYSTEM_PROMPT, user_prompt)

        try:
            data = json.loads(self.extract_json(response))
            if not isinstance(data, list):
                data = [data]
        except json.JSONDecodeError:
            data = []

        requirements = [
            Requirement(
                id=r.get("id", f"REQ-{i+1:03d}"),
                req_type=r.get("req_type", "functional"),
                title=r.get("title", ""),
                description=r.get("description", ""),
                priority=r.get("priority", "medium"),
                acceptance_criteria=r.get("acceptance_criteria", []),
                confidence=r.get("confidence", 0.5),
            )
            for i, r in enumerate(data)
        ]

        explanation = self.build_explanation(
            decision=f"Extracted {len(requirements)} requirements",
            reason="Analyzed project documentation and source code to identify requirements",
            confidence=0.85,
            evidence=[f"{len(requirements)} requirements extracted"],
        )

        return {
            "requirements": requirements,
            "explanations": [explanation],
        }
