"""KAMPÜS+ Backend API - FastAPI uygulama giriş noktası

NOT: Bu proje LOCAL STORAGE kullanır (backend/uploads/).
S3, MinIO veya cloud storage kullanılmaz.
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from src.core.config import get_settings
from src.core.database import close_db, init_db
from src.core.logging import RequestIDMiddleware, setup_logging
from src.api.routes.health import router as health_router
from src.api.routes.auth import router as auth_router
from src.api.routes.chat import router as chat_router
from src.api.routes.forum import router as forum_router
from src.api.routes.notifications import router as notifications_router
from src.api.routes.messages import router as messages_router
from src.services import get_vector_service
from src.api.routes.marketplace import router as marketplace_router
from src.api.routes.career import router as career_router
from src.api.routes.academic import router as academic_router
from src.api.routes import users
from src.api.routes.friendships import router as friendships_router
from src.api.routes.institutions import router as institutions_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Uygulama başlatma/kapatma olaylarını yönetir."""
    settings = get_settings()
    setup_logging(level=settings.log_level)
    await init_db()
    
    vector_service = get_vector_service()
    stats = vector_service.get_official_stats()
    print(f"✅ Vector stores initialized: {stats['total_vectors']} vectors, {stats['metadata_count']} metadata")
    
    yield
    
    vector_service.save_indexes()
    await close_db()


app = FastAPI(
    title="KAMPÜS+ AI Platform",
    version="0.1.0",
    description="AI-Powered Hybrid Intelligence Platform for Universities",
    lifespan=lifespan,
)

settings = get_settings()

# Request ID middleware (tüm istekleri takip etmek için ilk sırada olmalı)
app.add_middleware(RequestIDMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTPException'ları standart hata formatına dönüştürür."""
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    else:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": "ERROR", "message": str(exc.detail)}},
        )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Pydantic validation hatalarını 400 Bad Request formatına dönüştürür."""
    errors = exc.errors()
    first_error = errors[0] if errors else {"msg": "Validation error"}
    field = " -> ".join(str(loc) for loc in first_error.get("loc", []))
    message = first_error.get("msg", "Validation error")
    
    sanitized_errors = []
    for error in errors:
        sanitized_error = {
            "loc": error.get("loc", []),
            "msg": str(error.get("msg", "")),
            "type": error.get("type", ""),
        }
        if "ctx" in error:
            try:
                sanitized_error["ctx"] = {k: str(v) for k, v in error["ctx"].items()}
            except Exception:
                pass
        sanitized_errors.append(sanitized_error)
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": f"{field}: {message}" if field else message,
                "details": {"validation_errors": sanitized_errors} if sanitized_errors else None,
            }
        },
    )


# --- STATİK DOSYA AYARLARI ---

# 1. Mevcut Uploads Dizini
upload_dir = settings.get_upload_dir_absolute()
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

# 2. Marketplace ve Diğer Statik İçerikler İçin /static Dizini
# Marketplace rotasında "static/uploads/marketplace" kullandığın için burayı mount ediyoruz
static_path = Path("static")
static_path.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# 3. AI kaynak dokumanlari icin /api/v1/ai/documents dizini
# Docker konteynerinde dokumanlar /app/data/raw_docs altinda tutulur.
raw_docs_dir = Path("/app/data/raw_docs")
raw_docs_dir.mkdir(parents=True, exist_ok=True)

if not raw_docs_dir.exists() or not raw_docs_dir.is_dir():
    raise RuntimeError(f"AI document directory is invalid: {raw_docs_dir}")

app.mount(
    "/api/v1/ai/documents",
    StaticFiles(directory=str(raw_docs_dir.resolve()), check_dir=True),
    name="ai-documents",
)


# Router'ları ekle
app.include_router(health_router)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(forum_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(messages_router, prefix="/api/v1")
app.include_router(marketplace_router, prefix="/api/v1")
app.include_router(career_router, prefix="/api/v1")
app.include_router(academic_router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(friendships_router, prefix="/api/v1")
app.include_router(institutions_router, prefix="/api/v1")

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "KAMPÜS+ API", "version": "0.1.0", "status": "running"}