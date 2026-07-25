"""Graph Builder Service — parses and ingests code structures into the Neo4j Knowledge Graph."""

from __future__ import annotations

from typing import Any
from pathlib import Path

from app.core.logging import get_logger
from app.knowledge.graph.neo4j_service import Neo4jService

logger = get_logger(__name__)


class GraphBuilder:
    """Methods to construct nodes and relationships representing a code project in Neo4j."""

    @classmethod
    async def create_project(cls, project_id: str, name: str) -> None:
        """Create a Project root node."""
        query = """
        MERGE (p:Project {id: $project_id})
        ON CREATE SET p.name = $name, p.created_at = timestamp()
        ON MATCH SET p.name = $name, p.updated_at = timestamp()
        """
        await Neo4jService.execute_query(query, {"project_id": project_id, "name": name})

    @classmethod
    async def create_directory(cls, project_id: str, path: str) -> str | None:
        """Create a Directory node and link to its parent (Project or Directory)."""
        path_parts = Path(path).parts
        current_dir_id = None
        parent_id = None
        
        for i, part in enumerate(path_parts):
            current_path = str(Path(*path_parts[:i+1]))
            dir_id = f"{project_id}:dir:{current_path}"
            
            if i == 0:
                # Root directory links to Project
                query = """
                MERGE (d:Directory {id: $dir_id})
                SET d.name = $name, d.path = $path
                WITH d
                MATCH (p:Project {id: $project_id})
                MERGE (p)-[:CONTAINS]->(d)
                """
                await Neo4jService.execute_query(
                    query, 
                    {
                        "project_id": project_id, 
                        "dir_id": dir_id, 
                        "name": part, 
                        "path": current_path
                    }
                )
            else:
                # Subdirectory links to parent Directory
                query = """
                MERGE (d:Directory {id: $dir_id})
                SET d.name = $name, d.path = $path
                WITH d
                MATCH (parent:Directory {id: $parent_id})
                MERGE (parent)-[:CONTAINS]->(d)
                """
                await Neo4jService.execute_query(
                    query, 
                    {
                        "project_id": project_id, 
                        "dir_id": dir_id, 
                        "name": part, 
                        "path": current_path,
                        "parent_id": parent_id
                    }
                )
                
            parent_id = dir_id
            current_dir_id = dir_id
            
        return current_dir_id

    @classmethod
    async def create_file(cls, project_id: str, path: str, language: str = "", content_hash: str = "") -> str:
        """Create a File node and link to its parent Directory."""
        file_path = Path(path)
        parent_dir_path = str(file_path.parent) if file_path.parent != Path(".") else ""
        parent_dir_id = None
        
        if parent_dir_path:
            parent_dir_id = await cls.create_directory(project_id, parent_dir_path)
        
        file_id = f"{project_id}:file:{path}"
        
        if parent_dir_id:
            query = """
            MERGE (f:File {id: $file_id})
            SET f.name = $name, f.path = $path, f.language = $language, f.content_hash = $content_hash
            WITH f
            MATCH (d:Directory {id: $parent_dir_id})
            MERGE (d)-[:CONTAINS]->(f)
            """
            await Neo4jService.execute_query(
                query, 
                {
                    "file_id": file_id, 
                    "name": file_path.name, 
                    "path": path, 
                    "language": language,
                    "content_hash": content_hash,
                    "parent_dir_id": parent_dir_id
                }
            )
        else:
            # File is directly in project root
            query = """
            MERGE (f:File {id: $file_id})
            SET f.name = $name, f.path = $path, f.language = $language, f.content_hash = $content_hash
            WITH f
            MATCH (p:Project {id: $project_id})
            MERGE (p)-[:CONTAINS]->(f)
            """
            await Neo4jService.execute_query(
                query, 
                {
                    "project_id": project_id,
                    "file_id": file_id, 
                    "name": file_path.name, 
                    "path": path, 
                    "language": language,
                    "content_hash": content_hash
                }
            )
            
        return file_id

    @classmethod
    async def create_module(cls, project_id: str, name: str, file_path: str) -> None:
        """Create a Module node and link to File."""
        file_id = await cls.create_file(project_id, file_path)
        query = """
        MERGE (m:Module {id: $id})
        SET m.name = $name, m.file_path = $file_path
        WITH m
        MATCH (f:File {id: $file_id})
        MERGE (f)-[:DEFINES]->(m)
        """
        await Neo4jService.execute_query(
            query, 
            {
                "project_id": project_id, 
                "id": f"{project_id}:{name}", 
                "name": name, 
                "file_path": file_path,
                "file_id": file_id
            }
        )

    @classmethod
    async def create_class(cls, project_id: str, file_path: str, name: str, docstring: str = "") -> None:
        """Create a Class node and link to its parent File."""
        file_id = await cls.create_file(project_id, file_path)
        query = """
        MERGE (c:Class {id: $id})
        SET c.name = $name, c.docstring = $docstring
        WITH c
        MATCH (f:File {id: $file_id})
        MERGE (f)-[:DEFINES]->(c)
        """
        await Neo4jService.execute_query(
            query, 
            {
                "id": f"{project_id}:{file_path}:{name}",
                "file_id": file_id,
                "name": name,
                "docstring": docstring
            }
        )

    @classmethod
    async def create_function(
        cls,
        project_id: str,
        file_path: str,
        parent_name: str,
        parent_type: str,
        name: str,
        signature: str = "",
        docstring: str = "",
    ) -> None:
        """Create a Function node and link to its parent File or Class."""
        assert parent_type in ("File", "Class")
        
        if parent_type == "Class":
            func_id = f"{project_id}:{file_path}:{parent_name}:{name}"
            parent_id = f"{project_id}:{file_path}:{parent_name}"
        else:
            func_id = f"{project_id}:{file_path}::{name}"
            parent_id = await cls.create_file(project_id, file_path)

        query = f"""
        MERGE (f:Function {{id: $id}})
        SET f.name = $name, f.signature = $signature, f.docstring = $docstring
        WITH f
        MATCH (p:{parent_type} {{id: $parent_id}})
        MERGE (p)-[:DEFINES]->(f)
        """
        await Neo4jService.execute_query(
            query,
            {
                "id": func_id,
                "parent_id": parent_id,
                "name": name,
                "signature": signature,
                "docstring": docstring,
            },
        )

    @classmethod
    async def create_dependency(cls, project_id: str, from_module: str, to_module: str) -> None:
        """Create a DEPENDS_ON relationship between modules."""
        query = """
        MATCH (m1:Module {id: $from_id})
        MATCH (m2:Module {id: $to_id})
        MERGE (m1)-[:DEPENDS_ON]->(m2)
        """
        await Neo4jService.execute_query(
            query,
            {
                "from_id": f"{project_id}:{from_module}",
                "to_id": f"{project_id}:{to_module}"
            }
        )

    @classmethod
    async def create_call_relationship(cls, project_id: str, from_func: str, to_func: str) -> None:
        """Create a CALLS relationship between functions."""
        query = """
        MATCH (f1:Function) WHERE f1.name = $from_func AND f1.id STARTS WITH $prefix
        MATCH (f2:Function) WHERE f2.name = $to_func AND f2.id STARTS WITH $prefix
        MERGE (f1)-[:CALLS]->(f2)
        """
        await Neo4jService.execute_query(
            query,
            {
                "from_func": from_func,
                "to_func": to_func,
                "prefix": f"{project_id}:"
            }
        )

    @classmethod
    async def clear_project_structure(cls, project_id: str) -> None:
        """Clear all nodes and relationships for a project before re-ingesting."""
        query = """
        MATCH (p:Project {id: $project_id})
        OPTIONAL MATCH (p)-[:CONTAINS*]->(n)
        DETACH DELETE p, n
        """
        await Neo4jService.execute_query(query, {"project_id": project_id})

    @classmethod
    async def ingest_project_structure(
        cls, 
        project_id: str, 
        analysis: dict[str, Any],
        files: list[dict[str, Any]]
    ) -> None:
        """Orchestrates ingestion of structural analysis results from architectural parsing.

        Args:
            project_id: Target project identifier.
            analysis: Dict structure containing modules, classes, and call maps.
            files: List of file dicts with path, language, etc.
        """
        logger.info("neo4j_ingest_started", project_id=project_id)
        
        # 1. Clear existing structure first
        await cls.clear_project_structure(project_id)
        
        # 2. Root project
        await cls.create_project(project_id, analysis.get("name", "Project"))

        # 3. Ingest all files and directories first
        for f in files:
            await cls.create_file(
                project_id, 
                f.get("path", ""), 
                f.get("language", ""), 
                f.get("content_hash", "")
            )

        # 4. Ingest modules
        for mod in analysis.get("modules", []):
            mod_name = mod.get("name")
            file_path = mod.get("file_path", "")
            await cls.create_module(project_id, mod_name, file_path)

            # Ingest classes
            for cls_data in mod.get("classes", []):
                class_name = cls_data.get("name")
                await cls.create_class(
                    project_id, 
                    file_path, 
                    class_name, 
                    cls_data.get("docstring", "")
                )

                # Ingest class methods
                for method in cls_data.get("methods", []):
                    await cls.create_function(
                        project_id=project_id,
                        file_path=file_path,
                        parent_name=class_name,
                        parent_type="Class",
                        name=method.get("name"),
                        signature=method.get("signature", ""),
                        docstring=method.get("docstring", ""),
                    )

            # Ingest module functions (non-methods)
            for func in mod.get("functions", []):
                await cls.create_function(
                    project_id=project_id,
                    file_path=file_path,
                    parent_name=file_path,
                    parent_type="File",
                    name=func.get("name"),
                    signature=func.get("signature", ""),
                    docstring=func.get("docstring", ""),
                )

        # 5. Ingest module-level dependencies
        for dep in analysis.get("dependencies", []):
            await cls.create_dependency(project_id, dep.get("from"), dep.get("to"))

        # 6. Ingest call graphs
        for call in analysis.get("calls", []):
            await cls.create_call_relationship(project_id, call.get("from"), call.get("to"))

        logger.info("neo4j_ingest_completed", project_id=project_id)

    @classmethod
    async def validate_structure(cls, project_id: str, expected_files: list[str]) -> dict[str, Any]:
        """Validate that the knowledge graph exactly matches the expected file list."""
        query = """
        MATCH (p:Project {id: $project_id})-[:CONTAINS*]->(f:File)
        RETURN f.path AS path
        """
        results = await Neo4jService.execute_query(query, {"project_id": project_id})
        graph_files = {r["path"] for r in results}
        expected_set = set(expected_files)
        
        return {
            "valid": graph_files == expected_set,
            "missing_in_graph": list(expected_set - graph_files),
            "extra_in_graph": list(graph_files - expected_set)
        }
