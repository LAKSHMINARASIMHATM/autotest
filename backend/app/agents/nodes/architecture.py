"""Architecture Agent — analyzes project structure, builds dependency/API/service graphs."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.runnables import RunnableConfig

from app.agents.base import BaseAgentNode
from app.agents.state import AgentState, ArchitectureGraph


class ArchitectureAgent(BaseAgentNode):
    name = "architecture"
    description = "Analyzes project structure, builds dependency, API, service, and database graphs"

    SYSTEM_PROMPT = """You are the Architecture Agent of AutoTestAI.

Your role is to analyze the project's architecture and build structural graphs:
1. Dependency graph: which modules/classes depend on which
2. API graph: REST endpoints with methods, paths, and handlers
3. Service map: which services exist and their responsibilities
4. Database tables: schema entities and relationships
5. Class hierarchy: inheritance and composition relationships

Respond with JSON:
{
    "dependency_edges": [{"from": "module_a", "to": "module_b"}],
    "api_endpoints": [{"method": "POST", "path": "/auth/login", "handler": "auth.login"}],
    "service_map": {"auth": ["login", "register"], "projects": ["create", "list"]},
    "database_tables": [{"name": "users", "columns": ["id", "email", "role"]}],
    "class_hierarchy": [{"child": "AdminUser", "parent": "User"}]
}"""

    async def execute(
        self,
        state: AgentState,
        config: RunnableConfig | None = None,
    ) -> dict[str, Any]:
        project_ctx = state.get("project_context")
        retrieved = state.get("retrieved_context", [])

        context_text = "\n".join(doc.content for doc in retrieved[:15]) if retrieved else ""

        user_prompt = f"""Analyze the architecture of this project.

Project: {project_ctx.name if project_ctx else 'Unknown'}
Language: {project_ctx.language if project_ctx else 'Unknown'}
Modules: {', '.join(project_ctx.modules) if project_ctx else 'Unknown'}

Source Code Context:
{context_text}

Build the architecture graphs as JSON."""

        response = await self.invoke_llm(self.SYSTEM_PROMPT, user_prompt)

        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            data = {}

        architecture = ArchitectureGraph(
            dependency_edges=data.get("dependency_edges", []),
            api_endpoints=data.get("api_endpoints", []),
            service_map=data.get("service_map", {}),
            database_tables=data.get("database_tables", []),
            class_hierarchy=data.get("class_hierarchy", []),
        )

        explanation = self.build_explanation(
            decision="Built project architecture graph",
            reason="Analyzed source code structure to map dependencies, APIs, and services",
            confidence=0.88,
            evidence=[
                f"{len(architecture.dependency_edges)} dependency edges",
                f"{len(architecture.api_endpoints)} API endpoints",
                f"{len(architecture.database_tables)} database tables",
            ],
        )

        return {
            "architecture": architecture,
            "explanations": [explanation],
        }
