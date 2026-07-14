"""Patch validation document — results of validating a patch in isolation."""

from beanie import PydanticObjectId
from pydantic import Field

from app.models.base import BaseDocument


class PatchValidation(BaseDocument):
    """Validation result for a candidate patch.

    The Patch Validation Agent applies the patch in an isolated Docker
    sandbox, compiles, runs the failing test, runs regression, and
    checks coverage. All criteria must pass for acceptance.
    """

    patch_id: PydanticObjectId
    sandbox_id: str = Field(default="", description="Docker container used for validation")

    # Validation criteria
    compilation_success: bool = False
    failing_test_passes: bool = False
    regression_passes: bool = False
    coverage_maintained: bool = False

    # Results
    verdict: str = Field(default="pending", description="'accepted', 'rejected', or 'pending'")
    reason: str = ""
    regression_failures: list[str] = Field(default_factory=list)
    coverage_before: float = 0.0
    coverage_after: float = 0.0
    duration_ms: float = 0.0

    class Settings:
        name = "patch_validations"
        use_state_management = True
        indexes = [
            "patch_id",
        ]
