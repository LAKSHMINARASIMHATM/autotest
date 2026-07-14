"""Project document model — represents an ingested software project."""

from enum import StrEnum
from typing import Any

from beanie import Indexed, PydanticObjectId
from pydantic import Field

from app.models.base import BaseDocument


class ProjectStatus(StrEnum):
    """Lifecycle status of a project."""

    CREATED = "created"
    ANALYZING = "analyzing"
    ANALYZED = "analyzed"
    TESTING = "testing"
    TESTED = "tested"
    REPAIRING = "repairing"
    COMPLETE = "complete"
    ERROR = "error"


class Project(BaseDocument):
    """A software project imported for autonomous quality engineering.

    Stores metadata, configuration, and links to the owner.
    The `config` field holds project-specific settings (e.g., test frameworks,
    language versions, build commands).
    """

    name: Indexed(str)  # type: ignore[valid-type]
    description: str = ""
    repo_url: str = ""
    language: str = Field(default="python", description="Primary programming language")
    framework: str = Field(default="", description="Primary framework (e.g., FastAPI, Spring)")
    branch: str = Field(default="main")
    local_path: str = Field(default="", description="Path to cloned/uploaded project on server")
    owner_id: PydanticObjectId
    status: ProjectStatus = Field(default=ProjectStatus.CREATED)
    config: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)

    # Aggregated metrics (updated by agents)
    total_files: int = 0
    total_test_cases: int = 0
    total_bugs_found: int = 0
    total_patches_applied: int = 0
    coverage_percentage: float = 0.0

    class Settings:
        name = "projects"
        use_state_management = True
