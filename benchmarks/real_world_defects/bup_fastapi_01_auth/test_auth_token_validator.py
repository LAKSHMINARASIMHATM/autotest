"""PyTest suite for TokenValidator — tests bearer token extraction, expiration, and scopes."""
import base64
import json
import time
import pytest
from auth_token_validator import TokenValidator, AuthenticationError, InsufficientScopeError


def _make_dummy_jwt(payload: dict) -> str:
    header_b64 = base64.urlsafe_b64encode(b'{"alg":"HS256","typ":"JWT"}').decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig_b64 = base64.urlsafe_b64encode(b"simulated_signature").decode().rstrip("=")
    return f"{header_b64}.{payload_b64}.{sig_b64}"


def test_standard_uppercase_authorization_header():
    validator = TokenValidator()
    token = _make_dummy_jwt({"sub": "user_123", "aud": "autotest-api"})
    headers = {"Authorization": f"Bearer {token}"}
    extracted = validator.extract_token_from_headers(headers)
    assert extracted == token


def test_rfc7230_lowercase_authorization_header():
    """Real-world defect: HTTP/2 and ASGI gateways lowercase all incoming header names."""
    validator = TokenValidator()
    token = _make_dummy_jwt({"sub": "user_456", "aud": "autotest-api"})
    headers = {"authorization": f"Bearer {token}"}
    extracted = validator.extract_token_from_headers(headers)
    assert extracted == token


def test_missing_authorization_header_raises_error():
    validator = TokenValidator()
    with pytest.raises(AuthenticationError, match="Missing Authorization header"):
        validator.extract_token_from_headers({"content-type": "application/json"})


def test_invalid_scheme_raises_error():
    validator = TokenValidator()
    with pytest.raises(AuthenticationError, match="Invalid Authorization header format"):
        validator.extract_token_from_headers({"Authorization": "Basic dXNlcjpwYXNz"})


def test_decode_claims_valid():
    validator = TokenValidator()
    token = _make_dummy_jwt({"sub": "user_789", "aud": "autotest-api", "scopes": "read write"})
    claims = validator.verify_and_decode_claims(token)
    assert claims["sub"] == "user_789"
    assert validator.authorize_scope(claims, "read") is True


def test_insufficient_scope_raises_error():
    validator = TokenValidator()
    token = _make_dummy_jwt({"sub": "user_101", "aud": "autotest-api", "scopes": "read"})
    claims = validator.verify_and_decode_claims(token)
    with pytest.raises(InsufficientScopeError):
        validator.authorize_scope(claims, "admin")
