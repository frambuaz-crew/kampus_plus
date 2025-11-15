"""
KAMPÜS+ Backend API
FastAPI application entry point
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.database import close_db, init_db
from src.services import get_vector_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown events."""
    # Startup
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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "KAMPÜS+ API",
        "version": "0.1.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "service": "kampus-backend"
    }


@app.get("/health/db")
async def health_check_db():
    """Database health check endpoint"""
    from sqlalchemy import text
    from src.core.database import get_db
    
    try:
        async for db in get_db():
            # Test database connection with simple query
            result = await db.execute(text("SELECT 1 as health_check"))
            row = result.fetchone()
            
            return {
                "status": "healthy",
                "database": "connected",
                "test_query": row[0] == 1
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }


@app.get("/health/vectors")
async def health_check_vectors():
    """Vector stores health check endpoint"""
    try:
        vector_service = get_vector_service()
        stats = vector_service.get_stats()
        
        return {
            "status": "healthy",
            "vector_stores": stats
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


@app.get("/health/s3")
async def health_check_s3():
    """S3 storage health check endpoint"""
    try:
        from src.services import get_s3_service
        
        s3_service = get_s3_service()
        info = s3_service.get_bucket_info()
        
        return {
            "status": "healthy" if info["status"] == "connected" else "unhealthy",
            "s3": info
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
