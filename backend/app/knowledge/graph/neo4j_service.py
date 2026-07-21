"""Neo4j Knowledge Graph Service — driver initialization, index creation, Cypher executions."""

from __future__ import annotations

from typing import Any

from neo4j import AsyncDriver, AsyncGraphDatabase

import logging
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Suppress verbose Neo4j driver notifications
logging.getLogger("neo4j.notifications").setLevel(logging.ERROR)


def serialize_neo4j_value(value: Any) -> Any:
    """Helper to convert Neo4j query return values (Node, Relationship, Path, etc.) into serializable dictionaries."""
    from neo4j.graph import Node, Relationship, Path
    
    if isinstance(value, Node):
        return {
            "id": getattr(value, "element_id", None) or getattr(value, "id", None),
            "labels": list(value.labels),
            "properties": dict(value.items())
        }
    elif isinstance(value, Relationship):
        return {
            "id": getattr(value, "element_id", None) or getattr(value, "id", None),
            "type": value.type,
            "start_node_id": getattr(value.start_node, "element_id", None) or getattr(value.start_node, "id", None),
            "end_node_id": getattr(value.end_node, "element_id", None) or getattr(value.end_node, "id", None),
            "properties": dict(value.items())
        }
    elif isinstance(value, Path):
        return {
            "nodes": [serialize_neo4j_value(n) for n in value.nodes],
            "relationships": [serialize_neo4j_value(r) for r in value.relationships]
        }
    elif isinstance(value, dict):
        return {k: serialize_neo4j_value(v) for k, v in value.items()}
    elif isinstance(value, (list, tuple, set)):
        return [serialize_neo4j_value(v) for v in value]
    return value


class Neo4jService:
    """Manages connection lifetime and Cypher query execution for Neo4j."""

    _driver: AsyncDriver | None = None

    @classmethod
    async def init_driver(cls) -> None:
        """Initializes the Neo4j connection driver and creates indexes/constraints."""
        if cls._driver is not None:
            return

        settings = get_settings()
        uri = settings.NEO4J_URI
        user = settings.NEO4J_USER
        password = settings.NEO4J_PASSWORD.get_secret_value()

        try:
            logger.info("neo4j_connecting", uri=uri)
            cls._driver = AsyncGraphDatabase.driver(
                uri,
                auth=(user, password),
                notifications_min_severity="OFF",
                warn_notification_severity="OFF"
            )
            # Verify connectivity
            await cls._driver.verify_connectivity()
            logger.info("neo4j_connected")

            # Setup indexes
            await cls.create_indexes()
        except Exception as e:
            logger.exception("neo4j_connection_failed", error=str(e))
            raise

    @classmethod
    async def close_driver(cls) -> None:
        """Closes the Neo4j driver connection."""
        if cls._driver is not None:
            await cls._driver.close()
            cls._driver = None
            logger.info("neo4j_driver_closed")

    @classmethod
    async def create_indexes(cls) -> None:
        """Creates unique constraints on identifiers for all node types."""
        # 1. Drop old name-based constraints if they exist (to avoid global conflict)
        drop_queries = [
            "DROP CONSTRAINT module_name_uniq IF EXISTS",
            "DROP CONSTRAINT class_name_uniq IF EXISTS",
            "DROP CONSTRAINT func_name_uniq IF EXISTS",
            "DROP CONSTRAINT api_path_uniq IF EXISTS",
        ]
        for dq in drop_queries:
            try:
                await cls.execute_query(dq)
            except Exception as e:
                logger.warning("failed_to_drop_constraint", query=dq, error=str(e))

        # 2. Create new id-based constraints scoped to project
        constraints = [
            "CREATE CONSTRAINT project_id_uniq IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT module_id_uniq IF NOT EXISTS FOR (m:Module) REQUIRE m.id IS UNIQUE",
            "CREATE CONSTRAINT class_id_uniq IF NOT EXISTS FOR (c:Class) REQUIRE c.id IS UNIQUE",
            "CREATE CONSTRAINT func_id_uniq IF NOT EXISTS FOR (f:Function) REQUIRE f.id IS UNIQUE",
            "CREATE CONSTRAINT api_id_uniq IF NOT EXISTS FOR (a:API) REQUIRE a.id IS UNIQUE",
            "CREATE CONSTRAINT req_id_uniq IF NOT EXISTS FOR (r:Requirement) REQUIRE r.id IS UNIQUE",
        ]
        for query in constraints:
            await cls.execute_query(query)
        logger.info("neo4j_constraints_created")

    @classmethod
    async def execute_query(cls, query: str, parameters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """Executes an arbitrary Cypher query and returns the results as list of dicts."""
        if cls._driver is None:
            await cls.init_driver()

        assert cls._driver is not None
        parameters = parameters or {}

        db_name = get_settings().NEO4J_DATABASE
        async with cls._driver.session(database=db_name) as session:
            try:
                result = await session.run(query, parameters)
                records = []
                async for record in result:
                    record_dict = {}
                    for k, v in record.items():
                        record_dict[k] = serialize_neo4j_value(v)
                    records.append(record_dict)
                return records
            except Exception as e:
                logger.error("neo4j_query_error", query=query, error=str(e))
                raise
