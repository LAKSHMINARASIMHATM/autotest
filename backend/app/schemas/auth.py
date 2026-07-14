"""Authentication request/response schemas."""

from pydantic import BaseModel, EmailStr, Field

from app.core.security import Role


# ── Requests ─────────────────────────────────────────────────────


class RegisterRequest(BaseModel):
    """User registration payload."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    """User login payload."""

    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    """Token refresh payload."""

    refresh_token: str


# ── Responses ────────────────────────────────────────────────────


class TokenResponse(BaseModel):
    """JWT token pair returned after login/register."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Access token expiry in seconds")


class UserResponse(BaseModel):
    """Public user information."""

    id: str
    email: str
    full_name: str
    role: Role
    is_active: bool

    class Config:
        from_attributes = True
