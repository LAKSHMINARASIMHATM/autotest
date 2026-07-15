"""Bug Localization Agent — localizes code bugs using execution failures."""

from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, BugLocalization, PipelineStatus


class BugLocalizationAgent(BaseAgentNode):
    name = "bug_localization"
    description = "Localizes bugs to specific files, methods, lines, and constructs from test failures"

    SYSTEM_PROMPT = """You are the Bug Localization Agent of AutoTestAI.

Your role is to analyze failing test results and locate the exact file, class, method, and line number where the bug is located.

For each localized bug, respond with JSON format:
[
    {
        "test_id": "<failing test id>",
        "file_path": "<relative/path/to/file.py>",
        "class_name": "<class name or empty>",
        "method_name": "<method/function name>",
        "line_number": <int>,
        "confidence": <float between 0.0 and 1.0>,
        "error_message": "<the traceback error message>"
    }
]"""

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        exec_res = state.get("execution_result")
        failures = exec_res.failures if exec_res else []

        if not failures:
            explanation = self.build_explanation(
                decision="No bug localization required",
                reason="All execution tests passed successfully; no failures detected.",
                confidence=1.0,
            )
            return {
                "bug_localizations": [],
                "explanations": [explanation]
            }

        user_prompt = f"""Localize bugs for these test failures:
{json.dumps(failures, indent=2)}

Analyze the tracebacks and identify the faulty files, methods, and line numbers."""

        response = await self.invoke_llm(self.SYSTEM_PROMPT, user_prompt)

        try:
            data = json.loads(response)
            if not isinstance(data, list):
                data = [data]
        except json.JSONDecodeError:
            data = []

        localizations = [
            BugLocalization(
                id=str(uuid4())[:8],
                test_id=loc.get("test_id", ""),
                file_path=loc.get("file_path", ""),
                class_name=loc.get("class_name", ""),
                method_name=loc.get("method_name", ""),
                line_number=loc.get("line_number", 0),
                confidence=loc.get("confidence", 0.5),
                error_message=loc.get("error_message", ""),
            )
            for loc in data
        ]

        explanation = self.build_explanation(
            decision=f"Localized {len(localizations)} bugs",
            reason="Analyzed failure stack traces and code contexts to pin down defect locations",
            confidence=0.88,
            evidence=[f"{len(localizations)} bugs localized from {len(failures)} failures"],
        )

        return {
            "bug_localizations": localizations,
            "status": PipelineStatus.DEBUGGING,
            "explanations": [explanation],
        }
