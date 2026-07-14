"""Test result document — individual test case execution outcome."""

from enum import StrEnum

from beanie import PydanticObjectId
from pydantic import Field

from app.models.base import BaseDocument


class TestResultStatus(StrEnum):
    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"
    SKIPPED = "skipped"


class TestResult(BaseDocument):
    """Result of executing a single test case within a test run.

    Stores the execution output, duration, and any captured artifacts
    (screenshots for UI tests, response bodies for API tests).
    """

    test_run_id: PydanticObjectId
    test_case_id: PydanticObjectId
    status: TestResultStatus
    output: str = Field(default="", description="stdout/stderr from test execution")
    error_message: str = ""
    stack_trace: str = ""
    duration_ms: float = 0.0
    screenshot_path: str = Field(default="", description="Path to screenshot (UI tests)")
    artifacts: list[str] = Field(default_factory=list, description="Paths to captured artifacts")

    class Settings:
        name = "test_results"
        use_state_management = True
        indexes = [
            "test_run_id",
            "test_case_id",
        ]
