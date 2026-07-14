"""Project request/response schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.project import ProjectStatus


# ── Requests ─────────────────────────────────────────────────────


class ProjectCreateRequest(BaseModel):
    """Payload for creating a new project."""

    name: str = Field(min_length=1, max_length=255)
    description: str = ""
    repo_url: str = ""
    language: str = "python"
    framework: str = ""
    branch: str = "main"
    config: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)


class ProjectUpdateRequest(BaseModel):
    """Payload for updating project metadata."""

    name: str | None = None
    description: str | None = None
    language: str | None = None
    framework: str | None = None
    branch: str | None = None
    config: dict[str, Any] | None = None
    tags: list[str] | None = None


# ── Responses ────────────────────────────────────────────────────


class ProjectResponse(BaseModel):
    """Full project representation."""

    id: str
    name: str
    description: str
    repo_url: str
    language: str
    framework: str
    branch: str
    status: ProjectStatus
    config: dict[str, Any]
    tags: list[str]
    total_files: int
    total_test_cases: int
    total_bugs_found: int
    total_patches_applied: int
    coverage_percentage: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    """Paginated list of projects."""

    items: list[ProjectResponse]
    total: int
    page: int
    page_size: int
