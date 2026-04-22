"""Alembic migration ortam konfigürasyonu."""
from logging.config import fileConfig
import sys
from pathlib import Path

from sqlalchemy import engine_from_config, pool
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
        compare_type=True,  # Sütun tipi değişikliklerini algıla
        compare_server_default=True,  # Varsayılan değer değişikliklerini algıla
        render_as_batch=True,  # SQLite için zorunlu: DROP/ADD COLUMN, FK değişikliklerini destekler
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
            compare_type=True,  # Sütun tipi değişikliklerini algıla
            compare_server_default=True,  # Varsayılan değer değişikliklerini algıla
            render_as_batch=True,  # SQLite için zorunlu: DROP/ADD COLUMN, FK değişikliklerini destekler
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
