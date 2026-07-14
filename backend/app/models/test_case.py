"""Test case document — AI-generated test with traceability and explanation."""

from enum import StrEnum
from typing import Any

from beanie import PydanticObjectId
from pydantic import Field

from app.models.base import BaseDocument


class TestType(StrEnum):
    UNIT = "unit"
    INTEGRATION = "integration"
    API = "api"
    UI = "ui"
    REGRESSION = "regression"
    BOUNDARY = "boundary"
    EDGE_CASE = "edge_case"
    SECURITY = "security"
    PERFORMANCE = "performance"
    RISK_BASED = "risk_based"


class TestFramework(StrEnum):
    PYTEST = "pytest"
    JUNIT = "junit"
    PLAYWRIGHT = "playwright"
    POSTMAN = "postman"


class TestCase(BaseDocument):
    """An AI-generated test case with full traceability.

    Links back to the requirement it validates, the code entity it targets,
    and includes the XAI explanation for why this test was generated.
    """

    project_id: PydanticObjectId
    requirement_id: PydanticObjectId | None = None
    target_entity_id: PydanticObjectId | None = None
    test_type: TestType
    framework: TestFramework
    name: str
    description: str = ""
    code: str = Field(description="Complete test source code")
    file_path: str = Field(default="", description="Path where test file is written")
    is_verified: bool = Field(default=False, description="Passed Verification Agent checks")
    verification_notes: str = ""
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    explanation: dict[str, Any] = Field(default_factory=dict, description="XAI explanation")

    class Settings:
        name = "test_cases"
        use_state_management = True
        indexes = [
            "project_id",
            [("project_id", 1), ("test_type", 1)],
        ]
