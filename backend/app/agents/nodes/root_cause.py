"""Root Cause Agent — performs root cause analysis on ALL localized bugs."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, RootCause


class RootCauseAgent(BaseAgentNode):
    name = "root_cause"
    description = "Analyzes all localized bugs to determine root causes, severity, and requirement impact"

    SYSTEM_PROMPT = """You are the Root Cause Agent of AutoTestAI.

Perform root cause analysis on ALL provided localized bugs.

For each bug respond with a JSON array:
[
    {
        "bug_id": "<bug_id>",
        "summary": "<one sentence summary>",
        "why": "<5-whys root cause explanation>",
        "dependency_impact": ["<affected module1>", "<affected module2>"],
        "requirement_violated": "<linked requirement ID or empty string>",
        "severity": "critical|high|medium|low"
    }
]"""

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        localizations = state.get("bug_localizations", [])
        requirements  = state.get("requirements", [])

        if not localizations:
            return {"root_causes": []}

        req_text = "\n".join(f"- {r.id}: {r.title}" for r in requirements[:15])

        # Build description of ALL bugs for the LLM
        bugs_text = "\n\n".join(
            f"Bug ID: {loc.id}\n"
            f"File: {loc.file_path}\n"
            f"Method: {loc.method_name}\n"
            f"Line: {loc.line_number}\n"
            f"Error: {loc.error_message}"
            for loc in localizations
        )

        user_prompt = f"""Perform root cause analysis on these {len(localizations)} localized bugs:

{bugs_text}

Available Requirements:
{req_text or 'None available'}

Respond with a JSON array (one entry per bug)."""

        response = await self.invoke_llm(self.SYSTEM_PROMPT, user_prompt)

        try:
            data = json.loads(self.extract_json(response))
            if not isinstance(data, list):
                data = [data]
        except json.JSONDecodeError:
            # Fallback: create a generic cause per localization
            data = [
                {
                    "bug_id": loc.id,
                    "summary": f"Unexpected error in {loc.method_name}",
                    "why": loc.error_message or "Root cause could not be determined automatically.",
                    "dependency_impact": [loc.file_path],
                    "requirement_violated": "",
                    "severity": "medium",
                }
                for loc in localizations
            ]

        causes = [
            RootCause(
                bug_id=item.get("bug_id") or (localizations[i].id if i < len(localizations) else ""),
                summary=item.get("summary") or "Unexpected error",
                why=item.get("why") or "",
                dependency_impact=item.get("dependency_impact") or [],
                requirement_violated=item.get("requirement_violated") or "",
                severity=item.get("severity") or "medium",
            )
            for i, item in enumerate(data)
            if isinstance(item, dict)
        ]

        explanation = self.build_explanation(
            decision=f"Root cause analyzed for {len(causes)} bug(s)",
            reason=causes[0].summary if causes else "No bugs to analyze",
            confidence=0.85,
            evidence=[f"Bug {c.bug_id}: {c.severity} — {c.summary}" for c in causes[:3]],
        )

        return {
            "root_causes": causes,
            "explanations": [explanation],
        }
