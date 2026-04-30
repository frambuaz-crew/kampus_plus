"""Alembic migration ortam konfigürasyonu."""
from logging.config import fileConfig
import sys
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from sqlalchemy.dialects.postgresql import JSONB as _PG_JSONB
from alembic import context

# backend/src dizinini Python path'ine ekle
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from core.config import get_settings
from models.base import Base
# Tüm modelleri import et (Base.metadata için gerekli)
from models import (
    user,
    forum,
    marketplace,
    career,
    academic,
    messages,
    notifications,
    ai,
    settings,
    university,
    department,
    sync,
    favorite,
    course_notes,
)

config = context.config

# Logging konfigürasyonunu yükle
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Tüm modelleri import ettiğimiz için Base.metadata'da tüm tablolar var
target_metadata = Base.metadata


def _compare_column_type(context, inspected_column, metadata_column, inspected_type, metadata_type):
    """Custom type comparator that prevents spurious migrations for DialectJSON columns.

    Alembic resolves TypeDecorator types by reading `TypeDecorator.impl` —
    not `load_dialect_impl` — when compare_type=True.  Because DialectJSON
    sets `impl = JSON` (the SQLite-compatible fallback), Alembic would see
    JSON ≠ JSONB on every autogenerate run against PostgreSQL and emit
    destructive ALTER TABLE statements on all JSONB columns.

    Returning False  → types are equivalent, no ALTER needed.
    Returning None   → fall through to Alembic's default comparison.
    """
    from models.base import DialectJSON

    if isinstance(metadata_type, DialectJSON) and isinstance(inspected_type, _PG_JSONB):
        return False  # DialectJSON renders as JSONB on PostgreSQL — no change.

    return None  # Use Alembic's default comparison for all other types.


# Veritabanı URL'ini environment variable'lardan al
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.get_database_url_sync())


def run_migrations_offline() -> None:
    """Offline modda migration çalıştır (veritabanı bağlantısı olmadan SQL üretir)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=_compare_column_type,
        compare_server_default=True,  # Varsayılan değer değişikliklerini algıla
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Online modda migration çalıştır (veritabanına bağlanır ve uygular)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=_compare_column_type,
            compare_server_default=True,  # Varsayılan değer değişikliklerini algıla
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
