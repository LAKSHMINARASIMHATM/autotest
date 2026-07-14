"""Requirement document — functional and non-functional requirements extracted from SRS."""

from enum import StrEnum

from beanie import PydanticObjectId
from pydantic import Field

from app.models.base import BaseDocument


class RequirementType(StrEnum):
    FUNCTIONAL = "functional"
    NON_FUNCTIONAL = "non_functional"
    SECURITY = "security"
    PERFORMANCE = "performance"
    USABILITY = "usability"


class RequirementPriority(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RequirementStatus(StrEnum):
    IDENTIFIED = "identified"
    ANALYZED = "analyzed"
    TESTED = "tested"
    VERIFIED = "verified"


class Requirement(BaseDocument):
    """A requirement extracted by the Requirement Agent.

    Supports traceability to test cases and code entities via
    the Knowledge Graph.
    """

    project_id: PydanticObjectId
    req_type: RequirementType
    title: str
    description: str
    priority: RequirementPriority = Field(default=RequirementPriority.MEDIUM)
    status: RequirementStatus = Field(default=RequirementStatus.IDENTIFIED)
    source: str = Field(default="", description="Source document or section")
    acceptance_criteria: list[str] = Field(default_factory=list)
    traced_test_ids: list[PydanticObjectId] = Field(
        default_factory=list,
        description="IDs of test cases that validate this requirement",
    )
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)

    class Settings:
        name = "requirements"
        use_state_management = True
        indexes = [
            "project_id",
            [("project_id", 1), ("req_type", 1)],
        ]
