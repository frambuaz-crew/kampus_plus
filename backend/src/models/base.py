"""Tüm modeller için SQLAlchemy declarative base."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Tüm SQLAlchemy ORM modelleri için base class."""
    pass
