"""
Alembic Migration Environment Configuration

This file configures how Alembic connects to the database and runs migrations.
"""
from logging.config import fileConfig
import sys
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context

# Add the backend/src directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

# Import our application config (reads from .env)
from core.config import get_settings

# This is the Alembic Config object (from alembic.ini)
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ============================================================================
# IMPORTANT: Import all models here for autogenerate to work!
# When you create models later, uncomment these lines:
# ============================================================================
# from models.base import Base  # Base class with metadata
# from models import user, course, enrollment  # Import all model modules
# target_metadata = Base.metadata

# For now, we'll set it to None (we'll fix this after creating models)
target_metadata = None

# ============================================================================
# Override database URL from our Settings (reads from environment variables)
# ============================================================================
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url_sync)

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode (generates SQL without DB connection).
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,  # Detect column type changes
        compare_server_default=True,  # Detect default value changes
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode (connects to DB and applies).
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,  # Detect column type changes
            compare_server_default=True,  # Detect default value changes
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
