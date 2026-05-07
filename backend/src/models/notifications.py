"""Notifications modeli - Spec'lere göre.

Spec: specs/SYSTEM_OVERVIEW.md - notifications tablosu
"""

import enum
from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, DialectJSON


class NotificationType(str, enum.Enum):
    """Bildirim tipi enum."""
    FORUM_REPLY = "forum_reply"
    FORUM_MENTION = "forum_mention"
    ACADEMIC_CONTRIBUTION_APPROVED = "academic_contribution_approved"
    ACADEMIC_CONTRIBUTION_REJECTED = "academic_contribution_rejected"
    LISTING_EXPIRING = "listing_expiring"


class Notification(Base):
    """Bildirim modeli."""
    
    __tablename__ = "notifications"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    actor_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
    )
    
    link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(DialectJSON, nullable=True)  # JSON object (metadata reserved keyword)
    
    is_read: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), nullable=False, index=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
        index=True,
    )
    
    user = relationship("User", foreign_keys=[user_id], overlaps="notifications")
    actor = relationship("User", foreign_keys=[actor_id])

