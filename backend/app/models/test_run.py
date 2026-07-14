"""Test run document — represents a single execution of a test suite."""

from enum import StrEnum
from typing import Any

from beanie import PydanticObjectId
from pydantic import Field

from app.models.base import BaseDocument


class TestRunStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"
    CANCELLED = "cancelled"


class TestRun(BaseDocument):
    """A test execution session triggered by the Execution Agent.

    Stores aggregate results, coverage data, and timing information.
    """

    project_id: PydanticObjectId
    triggered_by: str = Field(default="agent", description="'agent' or user ID")
    status: TestRunStatus = Field(default=TestRunStatus.PENDING)
    total_tests: int = 0
    passed: int = 0
    failed: int = 0
    errors: int = 0
    skipped: int = 0
    duration_ms: float = 0.0
    coverage: dict[str, Any] = Field(default_factory=dict, description="Coverage data (line, branch, function)")
    sandbox_id: str = Field(default="", description="Docker container ID used for execution")
    logs: str = Field(default="", description="Aggregated stdout/stderr")

    class Settings:
        name = "test_runs"
        use_state_management = True
        indexes = [
            "project_id",
            [("project_id", 1), ("status", 1)],
        ]
