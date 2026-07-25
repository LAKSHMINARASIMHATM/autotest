"""Authentication endpoints — register, login, refresh, user profile, API keys, audit log."""

from __future__ import annotations

import hashlib
import secrets
from typing import Any

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

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
)
async def register(request: RegisterRequest) -> TokenResponse:
    return await AuthService.register(request)


@router.post("/login", response_model=TokenResponse, summary="Login")
async def login(request: LoginRequest) -> TokenResponse:
    return await AuthService.login(request)


@router.post("/refresh", response_model=TokenResponse, summary="Refresh token")
async def refresh(request: RefreshTokenRequest) -> TokenResponse:
    return await AuthService.refresh(request)


@router.get("/me", response_model=UserResponse, summary="Current user profile")
async def get_me(user_id: str = Depends(get_current_user_id)) -> UserResponse:
    return await AuthService.get_user_by_id(user_id)


# ── API Key management ────────────────────────────────────────────────────────

class CreateApiKeyRequest(BaseModel):
    name: str
    role: str = "Engineer"


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    token: str          # full raw token returned ONLY on creation
    key_prefix: str
    role: str
    created: str


class ApiKeyListItem(BaseModel):
    id: str
    name: str
    token: str          # masked for list view
    key_prefix: str
    role: str
    created: str


@router.get("/api-keys", summary="List API keys for current user")
async def list_api_keys(user_id: str = Depends(get_current_user_id)) -> list[dict[str, Any]]:
    from app.models.api_key import ApiKey
    keys = await ApiKey.find(
        ApiKey.user_id == PydanticObjectId(user_id),
        ApiKey.is_deleted == False,
    ).sort(-ApiKey.created_at).to_list()
    return [
        {
            "id": str(k.id),
            "name": k.name,
            "token": f"at_pk_••••••••••••••••{k.key_prefix[-4:]}",
            "key_prefix": k.key_prefix,
            "role": k.role,
            "created": k.created_at.strftime("%Y-%m-%d"),
        }
        for k in keys
    ]


@router.post("/api-keys", status_code=status.HTTP_201_CREATED, summary="Create API key")
async def create_api_key(
    body: CreateApiKeyRequest,
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    from app.models.api_key import ApiKey
    from app.models.audit_log import AuditLog

    raw = f"at_pk_live_{secrets.token_urlsafe(24)}"
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    key_prefix = raw[:16]

    key = ApiKey(
        user_id=PydanticObjectId(user_id),
        name=body.name,
        key_prefix=key_prefix,
        key_hash=key_hash,
        role=body.role,
    )
    await key.insert()

    await AuditLog(
        user_id=PydanticObjectId(user_id),
        action="apikey.create",
        resource_type="api_key",
        resource_id=str(key.id),
        details={"name": body.name, "role": body.role},
    ).insert()

    return {
        "id": str(key.id),
        "name": key.name,
        "token": raw,                      # one-time full value
        "key_prefix": key_prefix,
        "role": key.role,
        "created": key.created_at.strftime("%Y-%m-%d"),
    }


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Revoke API key")
async def delete_api_key(
    key_id: str,
    user_id: str = Depends(get_current_user_id),
) -> None:
    from app.models.api_key import ApiKey
    from app.models.audit_log import AuditLog

    key = await ApiKey.get(PydanticObjectId(key_id))
    if not key or str(key.user_id) != user_id:
        raise HTTPException(status_code=404, detail="API key not found")

    key.soft_delete()
    await key.save()

    await AuditLog(
        user_id=PydanticObjectId(user_id),
        action="apikey.revoke",
        resource_type="api_key",
        resource_id=key_id,
        details={"name": key.name},
    ).insert()


# ── Audit log ─────────────────────────────────────────────────────────────────

@router.get("/audit-log", summary="Fetch recent audit log entries")
async def get_audit_log(
    limit: int = 50,
    user_id: str = Depends(get_current_user_id),
) -> list[dict[str, Any]]:
    from app.models.audit_log import AuditLog

    entries = (
        await AuditLog.find()
        .sort(-AuditLog.created_at)
        .limit(limit)
        .to_list()
    )
    return [
        {
            "id": str(e.id),
            "action": e.action,
            "resource_type": e.resource_type,
            "resource_id": e.resource_id,
            "details": e.details,
            "ip_address": e.ip_address,
            "timestamp": e.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        }
        for e in entries
    ]

