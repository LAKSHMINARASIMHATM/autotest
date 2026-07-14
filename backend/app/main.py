"""FastAPI application factory.

Creates and configures the FastAPI application with:
- CORS middleware
- Lifespan events (MongoDB init/close)
- API router mounting
- Global exception handlers
- OpenAPI documentation
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_v1_router
from app.core.config import get_settings
from app.core.database import close_mongodb, init_mongodb
from app.core.exceptions import AppException
from app.core.logging import get_logger, set_correlation_id, setup_logging

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager.

    Startup: Initialize logging, MongoDB/Beanie.
    Shutdown: Close MongoDB connection.
    """
    setup_logging()
    logger.info("starting_application", env=get_settings().APP_ENV)

    await init_mongodb()
    logger.info("mongodb_initialized")

    yield

    await close_mongodb()
    logger.info("application_shutdown")


def create_app() -> FastAPI:
    """Application factory — creates and configures the FastAPI instance.

    Returns:
        Configured FastAPI application ready to serve.
    """
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "Agentic Multi-Agent Software Quality Engineer — "
            "Autonomous Testing, Root Cause Analysis, Automated Program Repair, "
            "and Continuous Validation using RAG and Knowledge Graphs."
        ),
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── Middleware ────────────────────────────────────────────────

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Correlation ID Middleware ─────────────────────────────────

    @app.middleware("http")
    async def correlation_id_middleware(request: Request, call_next):
        """Inject a correlation ID into every request for distributed tracing."""
        cid = request.headers.get("X-Correlation-ID")
        set_correlation_id(cid)
        response = await call_next(request)
        response.headers["X-Correlation-ID"] = cid or ""
        return response

    # ── Exception Handlers ───────────────────────────────────────

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        """Convert AppException subclasses to structured JSON responses."""
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail,
                "error_code": getattr(exc, "error_code", "UNKNOWN"),
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Catch-all handler for unexpected exceptions."""
        logger.exception("unhandled_exception", error=str(exc))
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "An unexpected error occurred",
                "error_code": "INTERNAL_ERROR",
            },
        )

    # ── Routes ───────────────────────────────────────────────────

    app.include_router(api_v1_router)

    @app.get("/health", tags=["System"])
    async def health_check():
        """Health check endpoint for load balancers and monitoring."""
        return {"status": "healthy", "version": settings.APP_VERSION}

    return app


# Create the application instance
app = create_app()
