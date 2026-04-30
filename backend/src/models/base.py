"""Tüm modeller için SQLAlchemy declarative base ve paylaşılan column tipleri."""

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB as _PG_JSONB
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.types import TypeDecorator


class DialectJSON(TypeDecorator):
    """Dialect-agnostic JSON column type.

    Emits PostgreSQL JSONB (binary JSON with operator and index support) when
    the connected engine is PostgreSQL.  Falls back to SQLAlchemy's standard
    JSON type (stored as TEXT) for SQLite and any other dialect.

    Using this type everywhere instead of the raw ``postgresql.JSONB`` import
    keeps all ORM models compatible with the in-memory SQLite database used by
    the integration-test suite while preserving full JSONB semantics in
    production.
    """

    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(_PG_JSONB())
        return dialect.type_descriptor(JSON())


class Base(DeclarativeBase):
    """Tüm SQLAlchemy ORM modelleri için base class."""
    pass
