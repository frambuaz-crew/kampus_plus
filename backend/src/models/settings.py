"""Settings modelleri - Spec'lere göre.

Spec: specs/SYSTEM_OVERVIEW.md - contact_messages tablosu
"""

import enum
from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class ContactMessageStatus(str, enum.Enum):
    """İletişim mesajı durumu enum."""
    PENDING = "pending"
    ANSWERED = "answered"
    CLOSED = "closed"


class ContactMessage(Base):
    """İletişim mesajı modeli."""
    
    __tablename__ = "contact_messages"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    
    subject: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), server_default="pending", nullable=False, index=True)
    
    answered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    answered_by: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=True,
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
        index=True,
    )
    
    user = relationship("User", back_populates="contact_messages", foreign_keys=[user_id])
    answerer = relationship("User", foreign_keys=[answered_by])

