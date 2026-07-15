"""Planner Agent — understands the project, creates the workflow, assigns tasks.

The Planner is the first agent in the pipeline. It analyzes the project
structure, determines which agents to activate, and creates the execution plan.
"""

from __future__ import annotations

import json
from typing import Any

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, PipelineStatus, ProjectContext


class PlannerAgent(BaseAgentNode):
    name = "planner"
    description = "Understands the project, creates execution workflow, assigns tasks to agents"

    SYSTEM_PROMPT = """You are the Planner Agent of AutoTestAI, an autonomous software quality engineering system.

Your role is to analyze a software project and create an execution plan for the agent pipeline.

Given the project information, you must:
1. Identify the project's language, framework, and structure
2. List all modules/packages found
3. Count files, classes, functions, and API endpoints
4. Determine which agents need to be activated
5. Prioritize testing areas based on complexity and risk

Respond with valid JSON in this exact schema:
{
    "name": "<project name>",
    "language": "<primary language>",
    "framework": "<primary framework or empty>",
    "total_files": <int>,
    "total_functions": <int>,
    "total_classes": <int>,
    "total_endpoints": <int>,
    "modules": ["<module1>", "<module2>"],
    "plan_summary": "<brief execution plan>"
}"""

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        project_id = state.get("project_id", "")
        session_id = state.get("session_id", "")

        user_prompt = f"""Analyze this software project and create an execution plan.

Project ID: {project_id}
Session ID: {session_id}

Provide your analysis as JSON."""

        response = await self.invoke_llm(self.SYSTEM_PROMPT, user_prompt)

        # Parse LLM response
        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            data = {
                "name": "Unknown Project",
                "language": "python",
                "framework": "",
                "total_files": 0,
                "total_functions": 0,
                "total_classes": 0,
                "total_endpoints": 0,
                "modules": [],
                "plan_summary": response,
            }

        project_context = ProjectContext(
            project_id=project_id,
            name=data.get("name", ""),
            language=data.get("language", "python"),
            framework=data.get("framework", ""),
            total_files=data.get("total_files", 0),
            total_functions=data.get("total_functions", 0),
            total_classes=data.get("total_classes", 0),
            total_endpoints=data.get("total_endpoints", 0),
            modules=data.get("modules", []),
        )

        explanation = self.build_explanation(
            decision="Created execution plan for project analysis",
            reason=data.get("plan_summary", "Analyzed project structure and determined agent pipeline"),
            confidence=0.9,
            evidence=[f"Found {project_context.total_files} files, {project_context.total_functions} functions"],
        )

        return {
            "project_context": project_context,
            "status": PipelineStatus.ANALYZING,
            "explanations": [explanation],
        }
