"""Database connection pool and session management.

This module provides async SQLAlchemy engine and session factory
for database operations across the application.
"""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from .config import get_settings

# Global engine instance (created on first import)
engine: AsyncEngine | None = None
async_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Get or create the async database engine.
    
    Returns:
        AsyncEngine: SQLAlchemy async engine instance.
    
    Raises:
        RuntimeError: If engine creation fails.
    """
    global engine
    
    if engine is None:
        settings = get_settings()
        
        # Create async engine with connection pool
        engine = create_async_engine(
            settings.database_url,
            echo=settings.debug,  # Log SQL queries in debug mode
            pool_size=10,  # Max connections in pool
            max_overflow=20,  # Max additional connections beyond pool_size
            pool_timeout=30,  # Seconds to wait for connection
            pool_recycle=3600,  # Recycle connections after 1 hour
            pool_pre_ping=True,  # Test connection health before use
        )
    
    return engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Get or create the async session factory.
    
    Returns:
        async_sessionmaker: Factory for creating async sessions.
    """
    global async_session_factory
    
    if async_session_factory is None:
        async_session_factory = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,  # Don't expire objects after commit
            autoflush=False,  # Manual flush control
            autocommit=False,  # Manual transaction control
        )
    
    return async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async database sessions.
    
    Use with FastAPI's Depends() for route handlers:
    ```python
    @app.get("/users")
    async def get_users(db: AsyncSession = Depends(get_db)):
        result = await db.execute(select(User))
        return result.scalars().all()
    ```
    
    Yields:
        AsyncSession: Active database session.
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database connection pool.
    
    Call this during application startup to create the engine
    and verify database connectivity.
    
    Raises:
        Exception: If database connection fails.
    """
    engine = get_engine()
    
    # Test connection
    async with engine.begin() as conn:
        await conn.run_sync(lambda _: None)  # Ping database
    
    print(f"✅ Database connection pool initialized: {engine.url.database}")


async def close_db() -> None:
    """Close database connection pool.
    
    Call this during application shutdown to gracefully close
    all connections.
    """
    global engine, async_session_factory
    
    if engine is not None:
        await engine.dispose()
        engine = None
        async_session_factory = None
        print("✅ Database connection pool closed")


# Testing utility: Use NullPool for tests to avoid connection leaks
def get_test_engine(database_url: str) -> AsyncEngine:
    """Create a test engine with NullPool (no connection pooling).
    
    Args:
        database_url: Database connection URL for tests.
    
    Returns:
        AsyncEngine: Test-specific engine instance.
    """
    return create_async_engine(
        database_url,
        echo=False,
        poolclass=NullPool,  # No connection pooling for tests
    )
