"""Forum modelleri - Spec'lere göre.

Spec: specs/SYSTEM_OVERVIEW.md - forum_categories, forum_topics, forum_replies tabloları
"""

import enum
from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class ForumCategory(Base):
    """Forum kategori modeli."""
    
    __tablename__ = "forum_categories"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    
    topics = relationship("ForumTopic", back_populates="category", cascade="all, delete-orphan")



class ForumTopic(Base):
    """Forum konu modeli."""
    
    __tablename__ = "forum_topics"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    category_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("forum_categories.id"),
        nullable=True,
        index=True,
    )
    author_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # SARI YENİ EKLENTİLER
    topic_type: Mapped[str] = mapped_column(String(20), server_default=text("'text'"), nullable=False)
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON array tutulacak
    image_urls: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON array tutulacak
    event_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    
    is_pinned: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), nullable=False)
    
    view_count: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    reply_count: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    helpful_count: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    
    last_reply_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    
    category = relationship("ForumCategory", back_populates="topics")
    author = relationship("User", foreign_keys=[author_id])
    replies = relationship("ForumReply", back_populates="topic", cascade="all, delete-orphan")


class ForumReply(Base):
    """Forum cevap modeli."""
    
    __tablename__ = "forum_replies"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    topic_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("forum_topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    
    # SARI YENİ: Threaded comments için üst yorum referansı
    parent_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("forum_replies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    
    content: Mapped[str] = mapped_column(Text, nullable=False)
    helpful_count: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    
    topic = relationship("ForumTopic", back_populates="replies")
    author = relationship("User", foreign_keys=[author_id])
    
    # Kendi kendine ilişki (Self-referential)
    replies = relationship("ForumReply", back_populates="parent", cascade="all, delete-orphan")
    parent = relationship("ForumReply", back_populates="replies", remote_side=[id])

