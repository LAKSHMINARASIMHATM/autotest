"""Security module — JWT token management, password hashing, and RBAC enforcement."""

from datetime import UTC, datetime, timedelta
from enum import StrEnum

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.config import Settings, get_settings

# ── Password Hashing ────────────────────────────────────────────

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return _pwd_context.verify(plain, hashed)


# ── Roles ────────────────────────────────────────────────────────


class Role(StrEnum):
    """RBAC roles with hierarchical permissions."""

    ADMIN = "admin"
    ENGINEER = "engineer"
    VIEWER = "viewer"


# ── JWT Token ────────────────────────────────────────────────────


class TokenPayload(BaseModel):
    """Decoded JWT payload schema."""

    sub: str  # user id
    role: str
    exp: datetime
    type: str = "access"  # "access" or "refresh"


def create_access_token(
    subject: str,
    role: str,
    settings: Settings | None = None,
) -> str:
    """Create a signed JWT access token.

    Args:
        subject: User identifier (typically user ID as string).
        role: User role for RBAC.
        settings: Application settings. Uses singleton if not provided.

    Returns:
        Encoded JWT string.
    """
    if settings is None:
        settings = get_settings()

    now = datetime.now(UTC)
    expire = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": subject,
        "role": role,
        "exp": expire,
        "iat": now,
        "type": "access",
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(
    subject: str,
    role: str,
    settings: Settings | None = None,
) -> str:
    """Create a signed JWT refresh token with longer expiry."""
    if settings is None:
        settings = get_settings()

    now = datetime.now(UTC)
    expire = now + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)

    payload = {
        "sub": subject,
        "role": role,
        "exp": expire,
        "iat": now,
        "type": "refresh",
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_token(token: str, settings: Settings | None = None) -> TokenPayload:
    """Decode and validate a JWT token.

    Args:
        token: The JWT string to decode.
        settings: Application settings.

    Returns:
        Parsed TokenPayload.

    Raises:
        HTTPException: 401 if token is invalid or expired.
    """
    if settings is None:
        settings = get_settings()

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET.get_secret_value(),
            algorithms=[settings.JWT_ALGORITHM],
        )
        return TokenPayload(**payload)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


# ── FastAPI Dependencies ─────────────────────────────────────────

_bearer_scheme = HTTPBearer()


async def get_current_user_payload(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> TokenPayload:
    """FastAPI dependency — extracts and validates the JWT from Authorization header."""
    return decode_token(credentials.credentials)


class RequireRole:
    """FastAPI dependency class for RBAC enforcement.

    Usage:
        @router.get("/admin-only", dependencies=[Depends(RequireRole(Role.ADMIN))])
        async def admin_endpoint(): ...
    """

    def __init__(self, *allowed_roles: Role) -> None:
        self.allowed_roles = set(allowed_roles)

    async def __call__(
        self,
        payload: TokenPayload = Depends(get_current_user_payload),
    ) -> TokenPayload:
        if payload.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{payload.role}' is not authorized. Required: {self.allowed_roles}",
            )
        return payload
