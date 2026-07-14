"""Source file document — represents a single file within a project."""

from beanie import PydanticObjectId
from pydantic import Field

from app.models.base import BaseDocument


class SourceFile(BaseDocument):
    """A source code file belonging to a project.

    Stores the file path, language, content hash (for change detection),
    and indexing status for RAG/KG ingestion.
    """

    project_id: PydanticObjectId
    module_name: str = Field(default="", description="Logical module this file belongs to")
    path: str = Field(description="Relative path within the project")
    language: str = Field(default="python")
    content_hash: str = Field(default="", description="SHA-256 hash for change detection")
    line_count: int = 0
    is_indexed: bool = Field(default=False, description="Whether RAG/KG ingestion is complete")

    class Settings:
        name = "source_files"
        use_state_management = True
        indexes = [
            "project_id",
            [("project_id", 1), ("path", 1)],
        ]
