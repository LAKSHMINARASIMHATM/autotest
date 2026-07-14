"""User document model with indexed email and role-based access."""

from beanie import Indexed
from pydantic import EmailStr, Field

from app.core.security import Role
from app.models.base import BaseDocument


class User(BaseDocument):
    """Registered user with authentication credentials and RBAC role."""

    email: Indexed(EmailStr, unique=True)  # type: ignore[valid-type]
    password_hash: str
    full_name: str = Field(min_length=1, max_length=255)
    role: Role = Field(default=Role.VIEWER)
    is_active: bool = Field(default=True)

    class Settings:
        name = "users"
        use_state_management = True
        indexes = [
            "email",
        ]
