"""Graph Builder Service — parses and ingests code structures into the Neo4j Knowledge Graph."""

from __future__ import annotations

from typing import Any

from app.knowledge.graph.neo4j_service import Neo4jService
from app.core.logging import get_logger

logger = get_logger(__name__)


class GraphBuilder:
    """Methods to construct nodes and relationships representing a code project in Neo4j."""

    @classmethod
    async def create_project(cls, project_id: str, name: str) -> None:
        """Create a Project root node."""
        query = """
        MERGE (p:Project {id: $project_id})
        ON CREATE SET p.name = $name, p.created_at = timestamp()
        ON MATCH SET p.name = $name
        """
        await Neo4jService.execute_query(query, {"project_id": project_id, "name": name})

    @classmethod
    async def create_module(cls, project_id: str, name: str, file_path: str) -> None:
        """Create a Module node and link to Project."""
        query = """
        MERGE (m:Module {name: $name})
        SET m.file_path = $file_path
        WITH m
        MATCH (p:Project {id: $project_id})
        MERGE (p)-[:CONTAINS]->(m)
        """
        await Neo4jService.execute_query(
            query, {"project_id": project_id, "name": name, "file_path": file_path}
        )

    @classmethod
    async def create_class(cls, module_name: str, name: str, docstring: str = "") -> None:
        """Create a Class node and link to its parent Module."""
        query = """
        MERGE (c:Class {name: $name})
        SET c.docstring = $docstring
        WITH c
        MATCH (m:Module {name: $module_name})
        MERGE (m)-[:CONTAINS]->(c)
        """
        await Neo4jService.execute_query(
            query, {"module_name": module_name, "name": name, "docstring": docstring}
        )

    @classmethod
    async def create_function(
        cls,
        parent_name: str,
        parent_type: str,
        name: str,
        signature: str = "",
        docstring: str = "",
    ) -> None:
        """Create a Function node and link to its parent Module or Class."""
        assert parent_type in ("Module", "Class")
        query = f"""
        MERGE (f:Function {{name: $name}})
        SET f.signature = $signature, f.docstring = $docstring
        WITH f
        MATCH (p:{parent_type} {{name: $parent_name}})
        MERGE (p)-[:CONTAINS]->(f)
        """
        await Neo4jService.execute_query(
            query,
            {
                "parent_name": parent_name,
                "name": name,
                "signature": signature,
                "docstring": docstring,
            },
        )

    @classmethod
    async def create_dependency(cls, from_module: str, to_module: str) -> None:
        """Create a DEPENDS_ON relationship between modules."""
        query = """
        MATCH (m1:Module {name: $from_module})
        MATCH (m2:Module {name: $to_module})
        MERGE (m1)-[:DEPENDS_ON]->(m2)
        """
        await Neo4jService.execute_query(query, {"from_module": from_module, "to_module": to_module})

    @classmethod
    async def create_call_relationship(cls, from_func: str, to_func: str) -> None:
        """Create a CALLS relationship between functions."""
        query = """
        MATCH (f1:Function {name: $from_func})
        MATCH (f2:Function {name: $to_func})
        MERGE (f1)-[:CALLS]->(f2)
        """
        await Neo4jService.execute_query(query, {"from_func": from_func, "to_func": to_func})

    @classmethod
    async def ingest_project_structure(cls, project_id: str, analysis: dict[str, Any]) -> None:
        """Orchestrates ingestion of structural analysis results from architectural parsing.

        Args:
            project_id: Target project identifier.
            analysis: Dict structure containing modules, classes, and call maps.
        """
        logger.info("neo4j_ingest_started", project_id=project_id)
        # 1. Root project
        await cls.create_project(project_id, analysis.get("name", "Project"))

        # 2. Ingest modules
        for mod in analysis.get("modules", []):
            mod_name = mod.get("name")
            await cls.create_module(project_id, mod_name, mod.get("file_path", ""))

            # Ingest classes
            for cls_data in mod.get("classes", []):
                class_name = cls_data.get("name")
                await cls.create_class(mod_name, class_name, cls_data.get("docstring", ""))

                # Ingest class methods
                for method in cls_data.get("methods", []):
                    await cls.create_function(
                        parent_name=class_name,
                        parent_type="Class",
                        name=method.get("name"),
                        signature=method.get("signature", ""),
                        docstring=method.get("docstring", ""),
                    )

            # Ingest module functions (non-methods)
            for func in mod.get("functions", []):
                await cls.create_function(
                    parent_name=mod_name,
                    parent_type="Module",
                    name=func.get("name"),
                    signature=func.get("signature", ""),
                    docstring=func.get("docstring", ""),
                )

        # 3. Ingest module-level dependencies
        for dep in analysis.get("dependencies", []):
            await cls.create_dependency(dep.get("from"), dep.get("to"))

        # 4. Ingest call graphs
        for call in analysis.get("calls", []):
            await cls.create_call_relationship(call.get("from"), call.get("to"))

        logger.info("neo4j_ingest_completed", project_id=project_id)
