"""Security module — JWT token management, password hashing, and RBAC enforcement."""

from datetime import UTC, datetime, timedelta
from enum import StrEnum

import firebase_admin
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Initialize Firebase Admin SDK only if credentials / project are available
_firebase_ready = False
try:
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
    # Quick probe: if no project is set, Firebase will fail on every call anyway
    _app = firebase_admin.get_app()
    _firebase_ready = bool(getattr(_app, '_options', {}).get('projectId') or
                           __import__('os').environ.get('GOOGLE_CLOUD_PROJECT') or
                           __import__('os').environ.get('GCLOUD_PROJECT'))
except Exception:
    _firebase_ready = False

_firebase_warning_logged = False  # warn only once per process

# ── Password Hashing ────────────────────────────────────────────

import bcrypt


def hash_password(plain: str) -> str:
    """Hash a plaintext password using bcrypt."""
    pw_bytes = plain.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    pw_bytes = plain.encode('utf-8')
    hash_bytes = hashed.encode('utf-8')
    try:
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False


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

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> TokenPayload:
    """FastAPI dependency — extracts and validates the JWT/Firebase token."""
    settings = get_settings()

    if credentials is not None:
        token = credentials.credentials
        # Ignore obviously invalid / dev placeholder tokens
        _is_dev_token = not token or token in ("undefined", "null", "none", "") or token.startswith("dev-")
        if not _is_dev_token:
            try:
                # ── Local JWT first (fastest, no network) ─────────────
                try:
                    return decode_token(token, settings)
                except HTTPException:
                    pass

                # ── Firebase token — only attempt if SDK is configured ─
                global _firebase_warning_logged
                if _firebase_ready:
                    decoded_token = auth.verify_id_token(token)
                    email = decoded_token.get("email", "")

                    # Retrieve or sync user in MongoDB
                    from app.models.user import User
                    user = await User.find_one(User.email == email)
                    if not user:
                        user = User(
                            email=email,
                            password_hash="",  # Firebase handles password security
                            full_name=decoded_token.get("name", email.split("@")[0]),
                            role=Role.ENGINEER,
                            is_active=True
                        )
                        await user.insert()

                    exp_val = decoded_token.get("exp", 0)
                    exp_dt = datetime.fromtimestamp(exp_val, UTC) if exp_val else datetime.now(UTC) + timedelta(hours=1)

                    return TokenPayload(
                        sub=str(user.id),
                        role=user.role,
                        exp=exp_dt
                    )
                else:
                    # Firebase not configured — skip silently in dev, raise in prod
                    if settings.APP_ENV != "development":
                        if not _firebase_warning_logged:
                            logger.warning("firebase_not_configured_skipping_verify")
                            _firebase_warning_logged = True
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Firebase authentication is not configured.",
                            headers={"WWW-Authenticate": "Bearer"},
                        )

            except HTTPException:
                raise
            except Exception as e:
                if settings.APP_ENV == "development":
                    if not _firebase_warning_logged:
                        logger.warning("token_verification_failed_using_dev_fallback", error=str(e))
                        _firebase_warning_logged = True
                else:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"Invalid or expired token: {e}",
                        headers={"WWW-Authenticate": "Bearer"},
                    )

    # Dev fallback
    if settings.APP_ENV == "development":
        from app.models.user import User
        user = None
        try:
            # Find any user
            user = await User.find_one({})
            if not user:
                try:
                    user = User(
                        email="dev@autotest.ai",
                        password_hash="",
                        full_name="Dev Engineer",
                        role=Role.ENGINEER,
                        is_active=True
                    )
                    await user.insert()
                    logger.info("dev_user_auto_seeded", email=user.email)
                except Exception as seed_err:
                    logger.warning("user_auto_seed_failed", error=str(seed_err))
        except Exception as db_err:
            logger.warning("dev_fallback_db_error_using_mock_payload", error=str(db_err))

        if user:
            return TokenPayload(
                sub=str(user.id),
                role=user.role,
                exp=datetime.now(UTC) + timedelta(days=1)
            )
        else:
            # Unreachable DB fallback
            from beanie import PydanticObjectId
            return TokenPayload(
                sub=str(PydanticObjectId()),
                role=Role.ENGINEER,
                exp=datetime.now(UTC) + timedelta(days=1)
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


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
