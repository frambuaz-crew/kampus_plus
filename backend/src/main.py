"""
KAMPÜS+ Backend API
FastAPI application entry point
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.core.config import get_settings
from src.core.database import close_db, init_db
from src.core.logging import RequestIDMiddleware, setup_logging
from src.api.routes.health import router as health_router
from src.api.routes.auth import router as auth_router
from src.services import get_vector_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown events."""
    # Startup
    # Initialize structured JSON logging
    settings = get_settings()
    setup_logging(level=settings.log_level)
    
    # Initialize database
    await init_db()
    
    # Initialize vector stores
    vector_service = get_vector_service()
    print(f"✅ Vector stores initialized: {vector_service.get_stats()}")
    
    yield
    
    # Shutdown
    vector_service.save_indexes()
    await close_db()


# Create FastAPI app
app = FastAPI(
    title="KAMPÜS+ AI Platform",
    version="0.1.0",
    description="AI-Powered Hybrid Intelligence Platform for Universities",
    lifespan=lifespan,
)

# Get settings for configuration
settings = get_settings()

# Request ID middleware (must be first to track all requests)
app.add_middleware(RequestIDMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTPException to unwrap nested detail structure.
    
    If detail is already a dict with 'error' key, use it directly.
    Otherwise, wrap in standard error format.
    """
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        # Already in correct format (from our endpoints)
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.detail
        )
    else:
        # Legacy format or string detail
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": "ERROR",
                    "message": str(exc.detail)
                }
            }
        )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Convert Pydantic 422 validation errors to 400 Bad Request with consistent format."""
    errors = exc.errors()
    
    # Extract first error message for simplicity
    first_error = errors[0] if errors else {"msg": "Validation error"}
    field = " -> ".join(str(loc) for loc in first_error.get("loc", []))
    message = first_error.get("msg", "Validation error")
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": f"{field}: {message}" if field else message,
                "details": errors
            }
        }
    )


# Include routers
app.include_router(health_router)
app.include_router(auth_router, prefix="/v1")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "KAMPÜS+ API",
        "version": "0.1.0",
        "status": "running"
    }
