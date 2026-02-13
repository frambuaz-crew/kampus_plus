"""Veritabanı bağlantı havuzu ve session yönetimi.

Bu modül uygulama genelinde veritabanı işlemleri için
async SQLAlchemy engine ve session factory sağlar.
"""

from typing import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from .config import get_settings


# Global engine instance (ilk import'ta oluşturulur)
engine: AsyncEngine | None = None
async_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Async veritabanı engine'ini al veya oluştur.
    
    Returns:
        AsyncEngine: SQLAlchemy async engine instance.
    """
    global engine
    
    if engine is None:
        settings = get_settings()
        database_url = settings.get_database_url()
        
        connect_args: dict = {}
        if database_url.startswith("sqlite"):
            connect_args = {"check_same_thread": False, "timeout": 20.0}
        
        engine_kw: dict = {
            "echo": settings.debug,
            "pool_pre_ping": True,
        }
        if connect_args:
            engine_kw["connect_args"] = connect_args
        if database_url.startswith("sqlite"):
            engine_kw["poolclass"] = NullPool
        else:
            engine_kw["pool_size"] = 5
            engine_kw["max_overflow"] = 10
        
        engine = create_async_engine(database_url, **engine_kw)
        
        # SQLite: WAL mode (concurrent reads/writes)
        if database_url.startswith("sqlite"):
            @event.listens_for(engine.sync_engine, "connect")
            def _enable_wal(dbapi_conn, connection_record):
                cursor = dbapi_conn.cursor()
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA synchronous=NORMAL")
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.close()
    
    return engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Async session factory'yi al veya oluştur.
    
    Returns:
        async_sessionmaker: Async session'lar oluşturmak için factory.
    """
    global async_session_factory
    
    if async_session_factory is None:
        async_session_factory = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
            autocommit=False,
        )
    
    return async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Async veritabanı session'ları için dependency.
    
    FastAPI route handler'larında Depends() ile kullan:
    ```python
    @router.get("/users")
    async def get_users(session: AsyncSession = Depends(get_db)):
        result = await session.execute(select(User))
        return result.scalars().all()
    ```
    
    Yields:
        AsyncSession: Aktif veritabanı session'ı.
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
    """Veritabanı bağlantı havuzunu başlat.
    
    Uygulama başlangıcında engine'i oluşturmak ve
    veritabanı bağlantısını doğrulamak için çağır.
    """
    engine = get_engine()
    
    # Bağlantıyı test et
    async with engine.begin() as conn:
        await conn.run_sync(lambda _: None)
    
    print(f"✅ Veritabanı bağlantı havuzu başlatıldı: {engine.url.database}")


async def close_db() -> None:
    """Veritabanı bağlantı havuzunu kapat.
    
    Uygulama kapanışında tüm bağlantıları düzgün şekilde
    kapatmak için çağır.
    """
    global engine, async_session_factory
    
    if engine is not None:
        await engine.dispose()
        engine = None
        async_session_factory = None
        print("✅ Veritabanı bağlantı havuzu kapatıldı")


def get_test_engine(database_url: str) -> AsyncEngine:
    """Test için NullPool ile engine oluştur (connection pooling yok).
    
    Args:
        database_url: Test için veritabanı bağlantı URL'i.
    
    Returns:
        AsyncEngine: Test-specific engine instance.
    """
    return create_async_engine(
        database_url,
        echo=False,
        poolclass=NullPool,
    )
