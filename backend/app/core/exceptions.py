"""Application exception hierarchy.

All custom exceptions extend AppException. FastAPI exception handlers
translate these into structured JSON error responses.
"""

from fastapi import HTTPException, status


class AppException(HTTPException):
    """Base exception for all application errors.

    Provides a uniform error structure:
    {
        "detail": "Human-readable message",
        "error_code": "MACHINE_READABLE_CODE"
    }
    """

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "INTERNAL_ERROR"

    def __init__(self, detail: str | None = None, **kwargs) -> None:
        super().__init__(
            status_code=self.status_code,
            detail=detail or self.error_code,
            **kwargs,
        )


class AuthenticationError(AppException):
    """Invalid credentials or expired token."""

    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "AUTHENTICATION_FAILED"

    def __init__(self, detail: str = "Invalid credentials") -> None:
        super().__init__(detail=detail, headers={"WWW-Authenticate": "Bearer"})


class AuthorizationError(AppException):
    """Insufficient permissions for the requested resource."""

    status_code = status.HTTP_403_FORBIDDEN
    error_code = "AUTHORIZATION_DENIED"


class NotFoundError(AppException):
    """Requested resource does not exist."""

    status_code = status.HTTP_404_NOT_FOUND
    error_code = "NOT_FOUND"


class ConflictError(AppException):
    """Resource already exists or state conflict."""

    status_code = status.HTTP_409_CONFLICT
    error_code = "CONFLICT"


class ValidationError(AppException):
    """Request payload failed business validation."""

    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    error_code = "VALIDATION_FAILED"


class AgentExecutionError(AppException):
    """An agent encountered an unrecoverable error during execution."""

    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code = "AGENT_EXECUTION_ERROR"


class SandboxError(AppException):
    """Error in the Docker sandbox environment."""

    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code = "SANDBOX_ERROR"


class ExternalServiceError(AppException):
    """Upstream dependency (LLM API, Neo4j, ChromaDB) failed."""

    status_code = status.HTTP_502_BAD_GATEWAY
    error_code = "EXTERNAL_SERVICE_ERROR"


class RateLimitError(AppException):
    """Client has exceeded the rate limit."""

    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    error_code = "RATE_LIMIT_EXCEEDED"
