"""
Health check endpoints for monitoring and orchestration.

This module provides:
- GET /health: Basic health check (always returns 200 OK)
- GET /health/ready: Readiness probe (checks DB + vector stores)
- GET /health/live: Liveness probe (process alive check)

Used by: Kubernetes probes, load balancers, monitoring tools
"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session_factory
from src.services.vector_service import VectorStoreService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=Dict[str, str])
async def health_check() -> Dict[str, str]:
    """
    Basic health check endpoint.
    
    Returns:
        200 OK: Service is running
        
    Response:
        {
            "status": "ok",
            "service": "kampus_plus_backend"
        }
    """
    return {
        "status": "ok",
        "service": "kampus_plus_backend"
    }


@router.get("/live", response_model=Dict[str, str])
async def liveness_probe() -> Dict[str, str]:
    """
    Kubernetes liveness probe endpoint.
    
    This endpoint checks if the application process is alive and able to serve requests.
    If this fails, Kubernetes will restart the pod.
    
    Returns:
        200 OK: Process is alive
        
    Response:
        {
            "status": "alive",
            "service": "kampus_plus_backend"
        }
    """
    return {
        "status": "alive",
        "service": "kampus_plus_backend"
    }


@router.get("/ready", response_model=Dict[str, Any])
async def readiness_probe() -> Dict[str, Any]:
    """
    Kubernetes readiness probe endpoint.
    
    Checks if the application is ready to serve traffic by verifying:
    1. Database connection is working
    2. FAISS vector stores are loaded
    
    If any check fails, returns 503 Service Unavailable.
    Kubernetes will stop routing traffic to this pod until it becomes ready.
    
    Returns:
        200 OK: Service is ready to serve traffic
        503 Service Unavailable: Service has issues
        
    Response (success):
        {
            "status": "ready",
            "checks": {
                "database": "ok",
                "vector_stores": "ok"
            }
        }
        
    Response (failure):
        {
            "status": "not_ready",
            "checks": {
                "database": "ok" | "failed",
                "vector_stores": "ok" | "failed"
            },
            "errors": ["error messages"]
        }
    """
    checks = {
        "database": "unknown",
        "vector_stores": "unknown"
    }
    errors = []
    
    # Check database connection
    try:
        session_factory = get_session_factory()
        async with session_factory() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
        logger.debug("Database health check passed")
    except Exception as e:
        checks["database"] = "failed"
        error_msg = f"Database connection failed: {str(e)}"
        errors.append(error_msg)
        logger.error(error_msg)
    
    # Check vector stores
    try:
        vector_service = VectorStoreService()
        
        # Check if official vector store is loaded
        official_size = vector_service.get_index_size("official")
        user_size = vector_service.get_index_size("user")
        
        # Vector stores are considered ready if they exist (size >= 0)
        # Empty indexes are valid (size == 0)
        if official_size >= 0 and user_size >= 0:
            checks["vector_stores"] = "ok"
            logger.debug(f"Vector stores health check passed (official: {official_size}, user: {user_size})")
        else:
            checks["vector_stores"] = "failed"
            error_msg = "Vector stores not properly initialized"
            errors.append(error_msg)
            logger.error(error_msg)
    except Exception as e:
        checks["vector_stores"] = "failed"
        error_msg = f"Vector store check failed: {str(e)}"
        errors.append(error_msg)
        logger.error(error_msg)
    
    # Determine overall status
    all_ok = all(check == "ok" for check in checks.values())
    
    if all_ok:
        return {
            "status": "ready",
            "checks": checks
        }
    else:
        logger.warning(f"Readiness check failed: {errors}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "not_ready",
                "checks": checks,
                "errors": errors
            }
        )
