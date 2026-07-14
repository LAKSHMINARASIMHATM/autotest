"""Base document mixin providing common fields and configuration."""

from datetime import UTC, datetime

from beanie import Document
from pydantic import Field


class BaseDocument(Document):
    """Abstract base for all AutoTestAI documents.

    Provides:
    - created_at / updated_at timestamps with auto-defaults
    - is_deleted soft-delete flag
    - Common Settings configuration

    Subclasses must define their own `Settings` inner class with
    the `name` attribute for the MongoDB collection name.
    """

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    is_deleted: bool = Field(default=False)

    def mark_updated(self) -> None:
        """Update the `updated_at` timestamp to current UTC time."""
        self.updated_at = datetime.now(UTC)

    def soft_delete(self) -> None:
        """Mark this document as deleted without removing from DB."""
        self.is_deleted = True
        self.mark_updated()

    class Settings:
        use_state_management = True
