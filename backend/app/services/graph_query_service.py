"""Graph Query Service — traversal cypher query helpers for agent/RAG reasoning."""

from __future__ import annotations

from typing import Any

from app.services.neo4j_service import Neo4jService
from app.core.logging import get_logger

logger = get_logger(__name__)


class GraphQueryService:
    """Read-only Cypher query routines for quality analysis and context retrieval."""

    @classmethod
    async def get_module_dependencies(cls, module_name: str) -> list[dict[str, Any]]:
        """Get direct dependencies of a module."""
        query = """
        MATCH (m:Module {name: $module_name})-[:DEPENDS_ON]->(dep:Module)
        RETURN dep.name AS name, dep.file_path AS file_path
        """
        return await Neo4jService.execute_query(query, {"module_name": module_name})

    @classmethod
    async def get_module_dependents(cls, module_name: str) -> list[dict[str, Any]]:
        """Get modules that depend on this module."""
        query = """
        MATCH (dep:Module)-[:DEPENDS_ON]->(m:Module {name: $module_name})
        RETURN dep.name AS name, dep.file_path AS file_path
        """
        return await Neo4jService.execute_query(query, {"module_name": module_name})

    @classmethod
    async def get_function_callers(cls, function_name: str) -> list[dict[str, Any]]:
        """Get functions that call the target function."""
        query = """
        MATCH (caller:Function)-[:CALLS]->(f:Function {name: $function_name})
        RETURN caller.name AS name, caller.signature AS signature
        """
        return await Neo4jService.execute_query(query, {"function_name": function_name})

    @classmethod
    async def get_function_callees(cls, function_name: str) -> list[dict[str, Any]]:
        """Get functions called by the target function."""
        query = """
        MATCH (f:Function {name: $function_name})-[:CALLS]->(callee:Function)
        RETURN callee.name AS name, callee.signature AS signature
        """
        return await Neo4jService.execute_query(query, {"function_name": function_name})

    @classmethod
    async def get_isolated_functions(cls) -> list[dict[str, Any]]:
        """Identifies functions with 0 callers/callees (potential dead code)."""
        query = """
        MATCH (f:Function)
        WHERE NOT (f)-[:CALLS]-()
        RETURN f.name AS name, f.docstring AS docstring
        """
        return await Neo4jService.execute_query(query)

    @classmethod
    async def get_transitive_impact(cls, module_name: str, depth: int = 3) -> list[dict[str, Any]]:
        """Perform a variable depth search to identify transitive impact graph for a module change."""
        query = f"""
        MATCH path = (affected:Module)-[:DEPENDS_ON*1..{depth}]->(m:Module {{name: $module_name}})
        RETURN affected.name AS affected_module, length(path) AS distance
        ORDER BY distance ASC
        """
        return await Neo4jService.execute_query(query, {"module_name": module_name})
