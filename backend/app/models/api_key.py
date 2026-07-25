"""API Key document — persisted token credentials per user."""

from beanie import PydanticObjectId
from pydantic import Field

from app.models.base import BaseDocument


class ApiKey(BaseDocument):
    """Hashed API key scoped to a user with a role label."""

    user_id: PydanticObjectId
    name: str = Field(description="Human-readable label for this key")
    key_prefix: str = Field(description="First 8 chars of the raw key (display only)")
    key_hash: str = Field(description="SHA-256 hash of the raw key for verification")
    role: str = Field(default="Engineer", description="Role label: Admin | Engineer | Viewer")

    class Settings:
        name = "api_keys"
        use_state_management = True
        indexes = [
            "user_id",
            [("created_at", -1)],
        ]
