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
        import re

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

        # Retrieve file context for LLM
        files_info = ""
        repo_summary = state.get("repo_summary") or {}
        if repo_summary.get("files"):
            for f in repo_summary["files"][:15]:
                snippet = (f.get("content") or "")[:500]
                files_info += f"\n\n## File: {f.get('path', '?')}\n{snippet}"

        user_prompt = f"""Localize bugs for these test failures:
{json.dumps(failures, indent=2)}

Here are the source files in the project for context:
{files_info or 'No source available'}

Analyze the tracebacks and source files to identify the faulty files, methods, and line numbers. Output a JSON list of localized bugs."""

        response = await self.invoke_llm(self.SYSTEM_PROMPT, user_prompt)

        try:
            data = json.loads(self.extract_json(response))
            if not isinstance(data, list):
                data = [data]
        except json.JSONDecodeError:
            data = []

        localizations = [
            BugLocalization(
                id=str(uuid4())[:8],
                test_id=loc.get("test_id") or "",
                file_path=loc.get("file_path") or "",
                class_name=loc.get("class_name") or "",
                method_name=loc.get("method_name") or "",
                line_number=int(loc.get("line_number") or 0),
                confidence=float(loc.get("confidence") or 0.5),
                error_message=loc.get("error_message") or "",
            )
            for loc in data
            if isinstance(loc, dict)
        ]

        # Fallback regex parsing if LLM output was empty or invalid JSON
        if not localizations:
            for fail in failures:
                tb = fail.get("traceback") or ""
                file_path = fail.get("file") or ""
                line_number = 0
                error_message = fail.get("message") or ""
                
                if not file_path:
                    # Match pattern like: File "path/to/file.py", line 12
                    file_match = re.search(r'File "([^"]+\.py)", line (\d+)', tb)
                    if file_match:
                        file_path = file_match.group(1)
                        line_number = int(file_match.group(2))
                    else:
                        file_match = re.search(r'([\w\.-]+\.py):(\d+)', tb)
                        if file_match:
                            file_path = file_match.group(1)
                            line_number = int(file_match.group(2))
                
                # Make sure file_path is relative and clean
                if file_path:
                    if "test-bug-repo" in file_path:
                        parts = file_path.split("test-bug-repo")
                        file_path = parts[-1].lstrip("\\/")
                    
                localizations.append(
                    BugLocalization(
                        id=str(uuid4())[:8],
                        test_id=fail.get("node_id") or "",
                        file_path=file_path or "main.py",
                        class_name="",
                        method_name="",
                        line_number=line_number or 1,
                        confidence=0.6,
                        error_message=error_message or "Test failed",
                    )
                )

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
