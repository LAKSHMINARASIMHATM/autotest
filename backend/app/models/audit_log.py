"""Audit log document — immutable record of all security-relevant actions."""

from beanie import PydanticObjectId
from pydantic import Field

from app.models.base import BaseDocument


class AuditLog(BaseDocument):
    """Immutable audit trail entry for security and compliance.

    Records every mutation (create, update, delete) along with
    the acting user and request metadata.
    """

    user_id: PydanticObjectId | None = None
    action: str = Field(description="Action performed (e.g., 'project.create', 'test.execute')")
    resource_type: str = Field(default="", description="Type of resource affected")
    resource_id: str = Field(default="", description="ID of the affected resource")
    details: dict = Field(default_factory=dict, description="Additional context")
    ip_address: str = ""
    user_agent: str = ""

    class Settings:
        name = "audit_logs"
        use_state_management = True
        indexes = [
            "user_id",
            "action",
            [("created_at", -1)],
        ]
