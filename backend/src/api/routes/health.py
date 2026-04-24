"""Health check endpoints for monitoring and orchestration.

Endpoints:
- GET /health: Basic health check (database, vector stores)
- GET /health/ready: Readiness probe (checks DB + vector stores)
- GET /health/live: Liveness probe (process alive check)
"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text

from src.core.database import get_session_factory
from src.services import get_vector_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["health"])


async def _check_database() -> tuple[str, str]:
    """Check database connection. Returns (status, error_message)."""
    try:
        session_factory = get_session_factory()
        async with session_factory() as session:
            await session.execute(text("SELECT 1"))
        return "ok", ""
    except Exception as e:
        return "failed", f"Database: {str(e)}"


async def _check_vector_stores() -> tuple[str, str]:
    """Check vector stores. Returns (status, error_message)."""
    try:
        vector_service = get_vector_service()
        # get_official_stats() kullan (get_index_size() yok)
        stats = vector_service.get_official_stats()
        
        if stats.get("total_vectors", 0) >= 0:
            return "ok", ""
        return "failed", "Vector stores not initialized"
    except Exception as e:
        return "failed", f"Vector stores: {str(e)}"


@router.get("", response_model=Dict[str, Any])
async def health_check() -> Dict[str, Any]:
    """Comprehensive health check endpoint."""
    checks = {}
    errors = []
    
    db_status, db_error = await _check_database()
    checks["database"] = db_status
    if db_error:
        errors.append(db_error)
    
    vs_status, vs_error = await _check_vector_stores()
    checks["vector_stores"] = vs_status
    if vs_error:
        errors.append(vs_error)
    
    all_ok = all(status == "ok" for status in checks.values())
    
    if all_ok:
        return {
            "status": "healthy",
            "service": "kampus_plus_backend",
            "checks": checks
        }
    
    logger.warning("Sağlık kontrolü başarısız: %s", errors)
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "status": "unhealthy",
            "service": "kampus_plus_backend",
            "checks": checks,
            "errors": errors
        }
    )


@router.get("/live", response_model=Dict[str, str])
async def liveness_probe() -> Dict[str, str]:
    """Kubernetes liveness probe - checks if process is alive."""
    return {
        "status": "alive",
        "service": "kampus_plus_backend"
    }


@router.get("/ready", response_model=Dict[str, Any])
async def readiness_probe() -> Dict[str, Any]:
    """Kubernetes readiness probe - checks if service is ready to serve traffic."""
    checks = {}
    errors = []
    
    db_status, db_error = await _check_database()
    checks["database"] = db_status
    if db_error:
        errors.append(db_error)
        logger.error(db_error)
    
    vs_status, vs_error = await _check_vector_stores()
    checks["vector_stores"] = vs_status
    if vs_error:
        errors.append(vs_error)
        logger.error(vs_error)
    
    all_ok = all(status == "ok" for status in checks.values())
    
    if all_ok:
        return {
            "status": "ready",
            "checks": checks
        }
    
    logger.warning("Hazırlık kontrolü başarısız: %s", errors)
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "status": "not_ready",
            "checks": checks,
            "errors": errors
        }
    )
