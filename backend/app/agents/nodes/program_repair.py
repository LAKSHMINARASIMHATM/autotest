"""Program Repair Agent — generates code patches/fixes for bugs."""

from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, Patch, PipelineStatus


class ProgramRepairAgent(BaseAgentNode):
    name = "program_repair"
    description = "Generates targeted candidate source code patches to repair identified bugs"

    SYSTEM_PROMPT = """You are the Program Repair Agent of AutoTestAI.

Your role is to write clean, minimal, syntax-valid source code patches to fix localized bugs.

For each patch candidate, respond with JSON format:
{
    "bug_id": "<bug_id>",
    "strategy": "minimal|refactor|safety_check",
    "diff": "<unified diff of the patch or fixed code block>",
    "file_path": "<relative/path/to/file.py>",
    "description": "<detailed patch explanation>",
    "confidence": <float between 0.0 and 1.0>
}"""

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        causes = state.get("root_causes", [])
        localizations = state.get("bug_localizations", [])

        if not localizations:
            return {"patches": []}

        loc = localizations[0]
        cause = causes[0] if causes else None

        user_prompt = f"""Generate a program repair patch for:

Bug ID: {loc.id}
File Path: {loc.file_path}
Method: {loc.method_name}
Line: {loc.line_number}
Error: {loc.error_message}
Root Cause: {cause.why if cause else 'Unknown'}

Provide your repair candidate as JSON."""

        response = await self.invoke_llm(self.SYSTEM_PROMPT, user_prompt)

        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            data = {}

        patch = Patch(
            id=str(uuid4())[:8],
            bug_id=data.get("bug_id", loc.id),
            strategy=data.get("strategy", "minimal"),
            diff=data.get("diff", response),
            file_path=data.get("file_path", loc.file_path),
            description=data.get("description", "Auto-generated patch to resolve defect"),
            confidence=data.get("confidence", 0.75),
        )

        explanation = self.build_explanation(
            decision=f"Generated program patch candidate {patch.id}",
            reason=patch.description,
            confidence=patch.confidence,
            evidence=[f"Strategy: {patch.strategy}", f"File: {patch.file_path}"],
        )

        return {
            "patches": [patch],
            "status": PipelineStatus.REPAIRING,
            "explanations": [explanation],
        }
