"""AI Assistant modelleri - Spec'lere göre.

Spec: specs/SYSTEM_OVERVIEW.md - ai_conversations, ai_messages, ai_system_settings, ai_knowledge_base tabloları
"""

import enum
from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class MessageRole(str, enum.Enum):
    """AI mesaj rolü enum."""
    USER = "user"
    ASSISTANT = "assistant"


class AIConversation(Base):
    """AI konuşma modeli."""
    
    __tablename__ = "ai_conversations"
    
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
    
    user = relationship("User", foreign_keys=[user_id], overlaps="ai_conversations")
    messages = relationship("AIMessage", back_populates="conversation", cascade="all, delete-orphan")


class AIMessage(Base):
    """AI mesaj modeli."""
    
    __tablename__ = "ai_messages"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    conversation_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("ai_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
        index=True,
    )
    
    conversation = relationship("AIConversation", back_populates="messages")


class AISystemSettings(Base):
    """AI sistem ayarları modeli."""
    
    __tablename__ = "ai_system_settings"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    rate_limit_per_day: Mapped[int] = mapped_column(Integer, server_default=text("50"), nullable=False)
    
    updated_by: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    
    updater = relationship("User", foreign_keys=[updated_by])


class AIKnowledgeBase(Base):
    """AI knowledge base modeli."""
    
    __tablename__ = "ai_knowledge_base"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    keywords: Mapped[str] = mapped_column(Text, nullable=False)  # JSON string (array)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, server_default=text("1"), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False, index=True)
    
    created_by: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=True,
    )
    
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
    
    creator = relationship("User", foreign_keys=[created_by])

