"""Pytest configuration and shared fixtures for all tests.

Provides:
- Test database setup/teardown
- Database session fixtures
- Test client with overridden dependencies
"""

import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from src.core.database import get_db
from src.models.base import Base
from src.main import app

# Import all models so they are registered with Base.metadata
import src.models.user  # noqa: F401
import src.models.document  # noqa: F401
import src.models.sync  # noqa: F401
import src.models.forum  # noqa: F401


# Test database URL (file-based for consistency)
import os
TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "test.db")
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,  # Disable connection pooling for tests
    echo=False,  # Set to True for SQL query debugging
    connect_args={"check_same_thread": False}  # Allow multiple threads for SQLite
)

# Create test session maker
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests.
    
    On Windows, use SelectorEventLoop for psycopg compatibility.
    ProactorEventLoop is not compatible with psycopg async mode.
    """
    import sys
    
    policy = asyncio.get_event_loop_policy()
    
    # Force SelectorEventLoop on Windows for psycopg compatibility
    if sys.platform == "win32":
        import selectors
        from asyncio import SelectorEventLoop
        loop = SelectorEventLoop(selectors.SelectSelector())
    else:
        loop = policy.new_event_loop()
    
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create test database session for each test.
    
    - Creates all tables before test
    - Provides clean session
    - Rolls back after test
    - Drops all tables after test
    """
    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session for test
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()
    
    # Drop all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_test_db():
    """Setup and teardown test database for each test.
    
    Creates all tables before test and drops them after.
    Registers test database override with FastAPI app.
    """
    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create async def that returns test session
    async def _get_test_db() -> AsyncGenerator[AsyncSession, None]:
        async with TestSessionLocal() as session:
            yield session
    
    # Override FastAPI dependency
    app.dependency_overrides[get_db] = _get_test_db
    
    yield
    
    # Clear overrides
    app.dependency_overrides.clear()
    
    # Drop all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
