"""Redis client — shared async connection for caching and rate limiting."""

import redis.asyncio as aioredis

from src.core.config import settings

_client: aioredis.Redis | None = None


def get_redis_client() -> aioredis.Redis:
    global _client
    if _client is None:
        _client = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
    return _client
