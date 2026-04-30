"""
Integration-test fixtures for backend/tests/integration/.

Design decisions
----------------
1.  **Minimal test app** — We do NOT import `src.main.app` because main.py has
    several module-level side-effects that break outside Docker:
      • `Path("/app/data/raw_docs").mkdir(...)` — invalid on Windows
      • `get_vector_service()` in the lifespan — loads large FAISS indexes
      • `StaticFiles(directory="static")` — requires the directory to exist
    Instead we build a tiny FastAPI instance that includes only the two routers
    under test and mirrors the production HTTPException handler.

2.  **In-memory SQLite with StaticPool** — `sqlite+aiosqlite:///:memory:` creates
    a new in-memory database per connection by default.  StaticPool forces every
    `engine.connect()` call to reuse the same underlying connection, so all
    requests in a single test see the same data.

3.  **Per-test engine** (function scope) — Each test gets a fresh in-memory
    database with tables created via `Base.metadata.create_all`.  This gives
    perfect isolation without needing transactions or truncations.

4.  **FK enforcement** — The test engine does NOT execute `PRAGMA foreign_keys=ON`,
    so helper functions can insert users with placeholder `department_id` /
    `university_id` values that don't reference actual rows.

5.  **Coverage note** — pytest.ini sets `--cov-fail-under=80`.  Run the
    integration suite in isolation with `pytest tests/integration -p no:cov` to
    skip the global coverage gate while developing.  The gate is only meaningful
    when the full test suite runs together.
"""
from typing import AsyncGenerator

import pytest_asyncio
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

# Importing src.models registers ALL ORM mappers with Base.metadata in one shot
# because models/__init__.py re-exports every model class.
import src.models  # noqa: F401
from src.core.database import get_db
from src.models.base import Base
from src.api.routes.career import router as career_router
from src.api.routes.marketplace import router as marketplace_router


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


# ── Test app (built once at module import) ────────────────────────────────────

def _build_test_app() -> FastAPI:
    """Return a minimal FastAPI instance suitable for integration testing.

    Mirrors only the exception handler and the two route prefixes used by the
    tests.  No lifespan, no static mounts, no vector service.
    """
    app = FastAPI(title="KAMPÜS+ Integration Test App")

    # Mirror the production exception handler so response bodies match what
    # the real app returns.  Without this, HTTPException details would be
    # wrapped in a "detail" key instead of being returned at root level.
    @app.exception_handler(HTTPException)
    async def _http_exc_handler(request, exc: HTTPException):
        if isinstance(exc.detail, dict) and "error" in exc.detail:
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": "ERROR", "message": str(exc.detail)}},
        )

    app.include_router(marketplace_router, prefix="/api/v1")
    app.include_router(career_router, prefix="/api/v1")
    return app


_test_app = _build_test_app()


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def engine():
    """Fresh in-memory SQLite engine with all tables created.

    StaticPool ensures every SQLAlchemy connection within this test reuses the
    same underlying aiosqlite connection, which is required for in-memory SQLite
    to be visible across multiple ORM queries in the same test.
    """
    eng = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield eng

    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Async session bound to the test engine.

    expire_on_commit=False keeps ORM attributes accessible after commit without
    an extra SELECT, which matters when helpers return objects and tests inspect
    them after the route handler has committed its own changes.
    """
    factory = async_sessionmaker(engine, expire_on_commit=False, autoflush=False)
    async with factory() as session:
        yield session


@pytest_asyncio.fixture
async def api_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """httpx AsyncClient wired to the minimal test app.

    get_db is overridden to yield the per-test session, so every route handler
    reads from and writes to the same in-memory database that the test populates.
    dependency_overrides is cleared in a finally block so a failing test cannot
    leak state to subsequent tests.
    """
    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    _test_app.dependency_overrides[get_db] = _override_get_db
    try:
        async with AsyncClient(
            transport=ASGITransport(app=_test_app),
            base_url="http://test",
        ) as client:
            yield client
    finally:
        _test_app.dependency_overrides.clear()
