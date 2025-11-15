"""Forum and AnonymousMapping models."""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class ForumPost(Base):
    """ForumPost model - anonymous forum posts and replies."""
    
    __tablename__ = "forum_posts"
    
    # Primary Key
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    
    # Foreign Keys
    author_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    thread_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("forum_posts.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    
    # Content
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Moderation
    is_flagged: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), nullable=False)
    
    # Timestamps
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
    
    # Relationships
    author = relationship("User", back_populates="forum_posts")
    parent_thread = relationship("ForumPost", remote_side=[id], back_populates="replies")
    replies = relationship("ForumPost", back_populates="parent_thread", cascade="all, delete-orphan")
    anonymous_mappings = relationship("AnonymousMapping", back_populates="thread", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<ForumPost(id={self.id}, author_id={self.author_id}, title={self.title})>"


class AnonymousMapping(Base):
    """AnonymousMapping model - secure user-to-anonymous-id mappings."""
    
    __tablename__ = "anonymous_mappings"
    
    # Primary Key
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    
    # Foreign Keys
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    thread_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("forum_posts.id", ondelete="CASCADE"),
        nullable=False,
    )
    
    # Anonymous Identity
    anonymous_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    
    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    
    # Relationships
    user = relationship("User", back_populates="anonymous_mappings")
    thread = relationship("ForumPost", back_populates="anonymous_mappings")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint("user_id", "thread_id", name="uq_user_thread_mapping"),
    )
    
    def __repr__(self) -> str:
        return f"<AnonymousMapping(id={self.id}, anonymous_id={self.anonymous_id})>"
