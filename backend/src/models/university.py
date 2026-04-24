"""Üniversite modeli - YÖK Atlas'tan çekilen üniversite bilgileri.

Email domain'lerinden üniversite isimlerini eşleştirmek için kullanılır.
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, String, Text, text, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .faculty import Faculty


class University(Base):
    """Üniversite modeli - YÖK Atlas'tan çekilen üniversite bilgileri."""
    
    __tablename__ = "universities"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    # Üniversite ismi (YÖK'tan)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    
    # Üniversite tipi: "devlet", "vakıf", "özel"
    university_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    
    # Şehir
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    
    # Email domain'leri (JSON array string: ["selcuk.edu.tr", "ogr.selcuk.edu.tr"])
    email_domains: Mapped[Optional[str]] = mapped_column(JSONB, nullable=True)
    
    # YÖK'tan çekilen ek bilgiler (JSON)
    yok_data: Mapped[Optional[str]] = mapped_column(JSONB, nullable=True)
    
    # Aktif mi?
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False, index=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    
    # İlişkiler
    faculties: Mapped[list["Faculty"]] = relationship(
        "Faculty", back_populates="university", cascade="all, delete-orphan"
    )

    # Index: name + type için hızlı arama
    __table_args__ = (
        Index('idx_university_name_type', 'name', 'university_type'),
    )

