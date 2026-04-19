"""User ve RefreshToken modelleri.

Spec: specs/SYSTEM_OVERVIEW.md - users ve refresh_tokens tabloları
"""

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class UserRole(str, enum.Enum):
    """Kullanıcı rolü enum."""
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"
    UNIVERSITY_ADMIN = "university_admin"


class User(Base):
    """Kullanıcı modeli - öğrenciler ve yöneticiler."""
    
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    username_last_changed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    
    university: Mapped[str] = mapped_column(String(255), nullable=False)
    university_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("universities.id"), nullable=True, index=True
    )

    department_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, values_callable=lambda obj: [e.value for e in obj], native_enum=False),
        nullable=False,
        index=True,
    )
    
    is_verified: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False, index=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), nullable=False, index=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    
    grade: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    profile_picture_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    theme_preference: Mapped[str] = mapped_column(String(10), server_default=text("'light'"), nullable=False)
    
    terms_accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    daily_message_count: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    last_message_reset: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)

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
    
    # ⬇️ YENİ İLİŞKİ: Bölüm nesnesine erişim sağlar
    department_rel = relationship("Department", back_populates="users")
    university_rel = relationship("University", foreign_keys=[university_id])

    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    
    # Forum relationships
    forum_topics = relationship("ForumTopic", foreign_keys="ForumTopic.author_id", cascade="all, delete-orphan")
    forum_replies = relationship("ForumReply", foreign_keys="ForumReply.author_id", cascade="all, delete-orphan")
    
    # Marketplace relationships
    marketplace_listings = relationship("MarketplaceListing", foreign_keys="MarketplaceListing.seller_id", cascade="all, delete-orphan")
    
    # Career relationships
    career_listings = relationship("CareerListing", foreign_keys="CareerListing.posted_by", cascade="all, delete-orphan")
    career_applications = relationship("CareerApplication", foreign_keys="CareerApplication.applicant_id", cascade="all, delete-orphan")
    
    # Academic relationships
    academic_contributions = relationship("AcademicContribution", foreign_keys="AcademicContribution.user_id", cascade="all, delete-orphan")
    
    # Messages relationships
    conversations_as_user1 = relationship("Conversation", foreign_keys="Conversation.user1_id", cascade="all, delete-orphan")
    conversations_as_user2 = relationship("Conversation", foreign_keys="Conversation.user2_id", cascade="all, delete-orphan")
    
    # Notifications
    notifications = relationship("Notification", foreign_keys="Notification.user_id", cascade="all, delete-orphan")
    
    # AI relationships
    ai_conversations = relationship("AIConversation", foreign_keys="AIConversation.user_id", cascade="all, delete-orphan")
    
    # Settings relationships
    contact_messages = relationship("ContactMessage", foreign_keys="ContactMessage.user_id", cascade="all, delete-orphan")

    # Audit relationships
    audit_logs = relationship("AuditLog", back_populates="user")

    # Friendship relationships
    sent_friend_requests = relationship(
        "Friendship",
        foreign_keys="Friendship.requester_id",
        back_populates="requester",
        cascade="all, delete-orphan",
    )
    received_friend_requests = relationship(
        "Friendship",
        foreign_keys="Friendship.addressee_id",
        back_populates="addressee",
        cascade="all, delete-orphan",
    )


class RefreshToken(Base):
    """JWT refresh token saklama modeli."""
    
    __tablename__ = "refresh_tokens"
    
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
    
    token: Mapped[str] = mapped_column(String(500), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, index=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    
    user = relationship("User", back_populates="refresh_tokens")


from .sync import AuditLog