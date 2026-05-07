"""Messages modelleri - Spec'lere göre.

Spec: specs/SYSTEM_OVERVIEW.md - conversations, marketplace_messages, career_messages tabloları
"""

import enum
from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class ConversationType(str, enum.Enum):
    """Konuşma tipi enum."""
    MARKETPLACE = "marketplace"
    CAREER = "career"
    DIRECT = "direct"


class Conversation(Base):
    """Merkezi konuşma modeli - Marketplace ve Career mesajları için."""
    
    __tablename__ = "conversations"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    reference_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)  # İlan ID'si (direct mesajlarda NULL)
    
    user1_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user2_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
        index=True,
    )
    
    user1_unread_count: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    user2_unread_count: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    
    user1 = relationship("User", foreign_keys=[user1_id], overlaps="conversations_as_user1")
    user2 = relationship("User", foreign_keys=[user2_id], overlaps="conversations_as_user2")
    marketplace_messages = relationship("MarketplaceMessage", back_populates="conversation")
    career_messages = relationship("CareerMessage", back_populates="conversation")
    career_applications = relationship("CareerApplication", back_populates="conversation")
    direct_messages = relationship("DirectMessage", back_populates="conversation")
    
    __table_args__ = (
        UniqueConstraint('type', 'reference_id', 'user1_id', 'user2_id', name='uq_conversations_unique'),
    )

