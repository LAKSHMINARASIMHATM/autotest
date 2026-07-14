"""Authentication service — handles user registration, login, and token management."""

from beanie import PydanticObjectId

from app.core.exceptions import AuthenticationError, ConflictError, NotFoundError
from app.core.logging import get_logger
from app.core.security import (
    Role,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

logger = get_logger(__name__)


class AuthService:
    """Stateless service encapsulating authentication business logic.

    All methods are static/class methods — no instance state.
    This follows the service pattern for clean separation of
    concerns between API endpoints and data access.
    """

    @staticmethod
    async def register(request: RegisterRequest) -> TokenResponse:
        """Register a new user account.

        Args:
            request: Registration payload with email, password, full_name.

        Returns:
            JWT token pair.

        Raises:
            ConflictError: If email is already registered.
        """
        existing = await User.find_one(User.email == request.email)
        if existing is not None:
            raise ConflictError(detail=f"Email '{request.email}' is already registered")

        user = User(
            email=request.email,
            password_hash=hash_password(request.password),
            full_name=request.full_name,
            role=Role.ENGINEER,
        )
        await user.insert()

        logger.info("user_registered", user_id=str(user.id), email=user.email)

        await AuditLog(
            user_id=user.id,
            action="auth.register",
            resource_type="user",
            resource_id=str(user.id),
        ).insert()

        return _create_token_response(user)

    @staticmethod
    async def login(request: LoginRequest) -> TokenResponse:
        """Authenticate a user and return JWT tokens.

        Args:
            request: Login payload with email and password.

        Returns:
            JWT token pair.

        Raises:
            AuthenticationError: If credentials are invalid.
        """
        user = await User.find_one(User.email == request.email)
        if user is None or not verify_password(request.password, user.password_hash):
            raise AuthenticationError(detail="Invalid email or password")

        if not user.is_active:
            raise AuthenticationError(detail="Account is deactivated")

        logger.info("user_logged_in", user_id=str(user.id))

        await AuditLog(
            user_id=user.id,
            action="auth.login",
            resource_type="user",
            resource_id=str(user.id),
        ).insert()

        return _create_token_response(user)

    @staticmethod
    async def refresh(request: RefreshTokenRequest) -> TokenResponse:
        """Issue new tokens using a valid refresh token.

        Args:
            request: Refresh token payload.

        Returns:
            New JWT token pair.

        Raises:
            AuthenticationError: If refresh token is invalid or user not found.
        """
        payload = decode_token(request.refresh_token)
        if payload.type != "refresh":
            raise AuthenticationError(detail="Invalid token type — expected refresh token")

        user = await User.get(PydanticObjectId(payload.sub))
        if user is None or not user.is_active:
            raise AuthenticationError(detail="User not found or deactivated")

        return _create_token_response(user)

    @staticmethod
    async def get_user_by_id(user_id: str) -> UserResponse:
        """Fetch a user by ID.

        Args:
            user_id: The user's MongoDB ObjectId as a string.

        Returns:
            Public user information.

        Raises:
            NotFoundError: If user does not exist.
        """
        user = await User.get(PydanticObjectId(user_id))
        if user is None:
            raise NotFoundError(detail=f"User '{user_id}' not found")

        return UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
        )


def _create_token_response(user: User) -> TokenResponse:
    """Build a TokenResponse from a User document."""
    from app.core.config import get_settings

    settings = get_settings()
    access_token = create_access_token(str(user.id), user.role)
    refresh_token = create_refresh_token(str(user.id), user.role)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
