"""Root Cause Agent — performs root cause analysis on localized bugs."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, RootCause


class RootCauseAgent(BaseAgentNode):
    name = "root_cause"
    description = "Analyzes localized bugs to determine their root cause, severity, and requirements impact"

    SYSTEM_PROMPT = """You are the Root Cause Agent of AutoTestAI.

Your role is to perform a detailed root cause analysis on a localized bug by examining the failure context, localized file, and project requirements.

For each bug, respond with JSON format:
{
    "bug_id": "<bug_id>",
    "summary": "<one sentence summary of the bug>",
    "why": "<5-whys explanation of root cause>",
    "dependency_impact": ["<affected modules/files>"],
    "requirement_violated": "<linked requirement ID or empty>",
    "severity": "critical|high|medium|low"
}"""

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        localizations = state.get("bug_localizations", [])
        requirements = state.get("requirements", [])

        if not localizations:
            return {"root_causes": []}

        # Analyze the first localization for demo/base workflow
        loc = localizations[0]
        req_text = "\n".join(f"- {r.id}: {r.title}" for r in requirements[:15])

        user_prompt = f"""Perform root cause analysis on this localized bug:

Bug ID: {loc.id}
File Path: {loc.file_path}
Method: {loc.method_name}
Line: {loc.line_number}
Error Message: {loc.error_message}

Available Requirements:
{req_text}

Provide analysis as JSON."""

        response = await self.invoke_llm(self.SYSTEM_PROMPT, user_prompt)

        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            data = {}

        cause = RootCause(
            bug_id=data.get("bug_id", loc.id),
            summary=data.get("summary", "Unexpected error encountered"),
            why=data.get("why", response),
            dependency_impact=data.get("dependency_impact", []),
            requirement_violated=data.get("requirement_violated", ""),
            severity=data.get("severity", "medium"),
        )

        explanation = self.build_explanation(
            decision=f"Root cause analyzed for bug {cause.bug_id}",
            reason=cause.summary,
            confidence=0.85,
            evidence=[f"Severity: {cause.severity}", f"Why: {cause.why[:100]}..."],
        )

        return {
            "root_causes": [cause],
            "explanations": [explanation],
        }
