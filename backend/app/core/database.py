"""MongoDB connection and Beanie ODM initialization."""

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None


def get_motor_client() -> AsyncIOMotorClient:
    """Return the singleton Motor client. Raises if not initialized."""
    if _client is None:
        raise RuntimeError("MongoDB client not initialized. Call init_mongodb() first.")
    return _client


def get_database() -> AsyncIOMotorDatabase:
    """Return the active database instance. Raises if not initialized."""
    if _database is None:
        raise RuntimeError("MongoDB database not initialized. Call init_mongodb() first.")
    return _database


async def init_mongodb() -> None:
    """Initialize Motor client and Beanie ODM with all document models.

    Called once at application startup. Discovers all Beanie Document
    subclasses registered in app.models and initializes indexes.
    """
    global _client, _database

    settings = get_settings()
    _client = AsyncIOMotorClient(settings.MONGODB_URL)
    _database = _client[settings.MONGODB_DB_NAME]

    # Import all document models so Beanie can discover them
    from app.models.audit_log import AuditLog
    from app.models.bug_report import BugReport
    from app.models.code_entity import CodeEntity
    from app.models.patch import Patch
    from app.models.patch_validation import PatchValidation
    from app.models.project import Project
    from app.models.requirement import Requirement
    from app.models.source_file import SourceFile
    from app.models.test_case import TestCase
    from app.models.test_result import TestResult
    from app.models.test_run import TestRun
    from app.models.user import User

    document_models = [
        User,
        Project,
        SourceFile,
        CodeEntity,
        Requirement,
        TestCase,
        TestRun,
        TestResult,
        BugReport,
        Patch,
        PatchValidation,
        AuditLog,
    ]

    from app.core.logging import get_logger
    logger = get_logger(__name__)

    try:
        logger.info("mongodb_connecting", url=settings.MONGODB_URL)
        # Use a 5-second server selection timeout to fail fast on DNS timeout
        _client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=5000)
        _database = _client[settings.MONGODB_DB_NAME]
        await init_beanie(database=_database, document_models=document_models)  # type: ignore[arg-type]
        logger.info("mongodb_initialized_successfully")
    except Exception as e:
        fallback_url = "mongodb://127.0.0.1:27017"
        logger.warning("mongodb_primary_failed_trying_local_fallback", error=str(e), fallback=fallback_url)
        try:
            _client = AsyncIOMotorClient(fallback_url, serverSelectionTimeoutMS=3000)
            _database = _client[settings.MONGODB_DB_NAME]
            await init_beanie(database=_database, document_models=document_models)  # type: ignore[arg-type]
            logger.info("mongodb_initialized_local_fallback_success", url=fallback_url)
        except Exception as fallback_err:
            logger.error("mongodb_all_connection_attempts_failed", error=str(fallback_err))
            raise fallback_err


async def close_mongodb() -> None:
    """Close the Motor client connection. Called at application shutdown."""
    global _client, _database
    if _client is not None:
        _client.close()
        _client = None
        _database = None
