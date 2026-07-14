"""Authentication endpoints — register, login, refresh, and user profile."""

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user_id
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Create a new user account and return JWT tokens.",
)
async def register(request: RegisterRequest) -> TokenResponse:
    return await AuthService.register(request)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login",
    description="Authenticate with email and password, receive JWT tokens.",
)
async def login(request: LoginRequest) -> TokenResponse:
    return await AuthService.login(request)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh token",
    description="Exchange a valid refresh token for a new token pair.",
)
async def refresh(request: RefreshTokenRequest) -> TokenResponse:
    return await AuthService.refresh(request)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Current user profile",
    description="Get the authenticated user's profile information.",
)
async def get_me(user_id: str = Depends(get_current_user_id)) -> UserResponse:
    return await AuthService.get_user_by_id(user_id)
