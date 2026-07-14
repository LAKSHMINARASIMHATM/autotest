"""Code entity document — represents a class, function, or method extracted from source."""

from enum import StrEnum
from typing import Any

from beanie import PydanticObjectId
from pydantic import Field

from app.models.base import BaseDocument


class EntityType(StrEnum):
    """Type of code entity extracted by the Architecture Agent."""

    CLASS = "class"
    FUNCTION = "function"
    METHOD = "method"
    INTERFACE = "interface"
    MODULE = "module"
    ENDPOINT = "endpoint"
    DATABASE_TABLE = "database_table"


class CodeEntity(BaseDocument):
    """A structural element extracted from source code via AST parsing.

    Used to populate the Knowledge Graph and provide fine-grained
    retrieval context for agents.
    """

    project_id: PydanticObjectId
    file_id: PydanticObjectId
    entity_type: EntityType
    name: str
    qualified_name: str = Field(default="", description="Fully qualified name (e.g., module.Class.method)")
    start_line: int = 0
    end_line: int = 0
    parameters: list[str] = Field(default_factory=list)
    return_type: str = ""
    docstring: str = ""
    dependencies: list[str] = Field(default_factory=list, description="Names of entities this calls/imports")
    metadata: dict[str, Any] = Field(default_factory=dict)

    class Settings:
        name = "code_entities"
        use_state_management = True
        indexes = [
            "project_id",
            "file_id",
            [("project_id", 1), ("entity_type", 1)],
        ]
