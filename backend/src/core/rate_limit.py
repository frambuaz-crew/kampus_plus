"""SlowAPI rate limiter — Redis-backed, IP-keyed.

Usage in routes:
    from fastapi import Request
    from src.core.rate_limit import limiter

    @router.post("/endpoint")
    @limiter.limit("5/minute")
    async def my_endpoint(request: Request, ...):
        ...

The `request: Request` parameter must be present; SlowAPI locates it by
type inspection so the parameter name does not have to be "request".
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from src.core.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.redis_url,
    default_limits=[f"{settings.rate_limit_per_minute}/minute"],
)
