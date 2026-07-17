"""Redis client helper for managing agent session history and short-term state memory."""

from __future__ import annotations

import redis.asyncio as aioredis

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class RedisService:
    """Connection manager for Redis memory cache."""

    _redis: aioredis.Redis | None = None

    @classmethod
    def get_client(cls) -> aioredis.Redis:
        """Get or initialize the asynchronous Redis connection client."""
        if cls._redis is None:
            settings = get_settings()
            logger.info("redis_connecting", url=settings.REDIS_URL)
            cls._redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        return cls._redis

    @classmethod
    async def close_client(cls) -> None:
        """Close the Redis client pool connection."""
        if cls._redis is not None:
            await cls._redis.close()
            cls._redis = None
            logger.info("redis_connection_closed")
