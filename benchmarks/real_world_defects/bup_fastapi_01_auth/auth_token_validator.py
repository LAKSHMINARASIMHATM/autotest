"""Real-world JWT Bearer token parsing and scope validation service.
Modeled after BugsInPy / FastAPI security dependency defects.
"""
from __future__ import annotations

import base64
import json
import time
from typing import Any


class AuthenticationError(Exception):
    pass


class InsufficientScopeError(Exception):
    pass


class TokenValidator:
    """Validates incoming HTTP authorization headers, token payloads, and permission scopes."""

    def __init__(self, secret: str = "secret-key", allowed_audiences: list[str] | None = None):
        self.secret = secret
        self.allowed_audiences = allowed_audiences or ["autotest-api"]

    def extract_token_from_headers(self, headers: dict[str, str]) -> str:
        """Extracts the Bearer token from request headers.
        Per RFC 7230, HTTP header field names are case-insensitive.
        """
        auth_header = None
        # BUG: Uses exact case 'Authorization', failing when HTTP/2 or ASGI proxies lowercase headers
        if "Authorization" in headers:
            auth_header = headers["Authorization"]

        if not auth_header:
            raise AuthenticationError("Missing Authorization header")

        parts = auth_header.strip().split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise AuthenticationError("Invalid Authorization header format. Expected 'Bearer <token>'")

        return parts[1]

    def verify_and_decode_claims(self, token: str) -> dict[str, Any]:
        """Decodes token payload and validates expiration and audience."""
        try:
            parts = token.split(".")
            if len(parts) != 3:
                raise AuthenticationError("Malformed token: JWT must have 3 segments")

            payload_b64 = parts[1]
            padding = 4 - (len(payload_b64) % 4)
            if padding != 4:
                payload_b64 += "=" * padding

            payload_bytes = base64.urlsafe_b64decode(payload_b64)
            claims = json.loads(payload_bytes.decode("utf-8"))
        except Exception as e:
            raise AuthenticationError(f"Failed to decode token payload: {str(e)}")

        now = time.time()
        exp = claims.get("exp")
        if exp is not None and now > exp:
            raise AuthenticationError("Token has expired")

        aud = claims.get("aud")
        if aud and aud not in self.allowed_audiences:
            raise AuthenticationError(f"Invalid audience: '{aud}' not allowed")

        return claims

    def authorize_scope(self, claims: dict[str, Any], required_scope: str) -> bool:
        """Verifies that the token claims include the required permission scope."""
        scopes = claims.get("scopes", [])
        if isinstance(scopes, str):
            scopes = scopes.split()

        if "admin" in scopes or required_scope in scopes:
            return True

        raise InsufficientScopeError(f"Token lacks required scope: '{required_scope}'")
