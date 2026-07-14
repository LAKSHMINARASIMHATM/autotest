"""Bug report document — failure localized by the Bug Localization Agent."""

from enum import StrEnum
from typing import Any

from beanie import PydanticObjectId
from pydantic import Field

from app.models.base import BaseDocument


class BugSeverity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class BugStatus(StrEnum):
    DETECTED = "detected"
    LOCALIZED = "localized"
    ROOT_CAUSE_IDENTIFIED = "root_cause_identified"
    PATCH_GENERATED = "patch_generated"
    FIXED = "fixed"
    WONT_FIX = "wont_fix"


class BugReport(BaseDocument):
    """A bug identified and localized by the Bug Localization and Root Cause agents.

    Contains the precise location (file, class, method, line), severity,
    confidence score, root cause analysis, and links to the failing test.
    """

    project_id: PydanticObjectId
    test_result_id: PydanticObjectId
    file_id: PydanticObjectId | None = None
    severity: BugSeverity
    status: BugStatus = Field(default=BugStatus.DETECTED)

    # Localization
    file_path: str = ""
    class_name: str = ""
    method_name: str = ""
    line_number: int = 0
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)

    # Root cause analysis
    root_cause_summary: str = ""
    dependency_impact: list[str] = Field(default_factory=list)
    requirement_violated: str = ""
    explanation: dict[str, Any] = Field(default_factory=dict, description="XAI trace")

    class Settings:
        name = "bug_reports"
        use_state_management = True
        indexes = [
            "project_id",
            "test_result_id",
            [("project_id", 1), ("severity", 1)],
        ]
