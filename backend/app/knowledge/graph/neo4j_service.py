"""Neo4j Knowledge Graph Service — driver initialization, index creation, Cypher executions."""

from __future__ import annotations

from typing import Any

from neo4j import AsyncGraphDatabase, AsyncDriver

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


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
            cls._driver = AsyncGraphDatabase.driver(uri, auth=(user, password))
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
        constraints = [
            "CREATE CONSTRAINT project_id_uniq IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT module_name_uniq IF NOT EXISTS FOR (m:Module) REQUIRE m.name IS UNIQUE",
            "CREATE CONSTRAINT class_name_uniq IF NOT EXISTS FOR (c:Class) REQUIRE c.name IS UNIQUE",
            "CREATE CONSTRAINT func_name_uniq IF NOT EXISTS FOR (f:Function) REQUIRE f.name IS UNIQUE",
            "CREATE CONSTRAINT api_path_uniq IF NOT EXISTS FOR (a:API) REQUIRE a.path IS UNIQUE",
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
                    records.append(dict(record.items()))
                return records
            except Exception as e:
                logger.error("neo4j_query_error", query=query, error=str(e))
                raise
