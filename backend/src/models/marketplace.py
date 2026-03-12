"""Marketplace modelleri - Spec'lere göre.

Spec: specs/SYSTEM_OVERVIEW.md - marketplace_listings, marketplace_reports, marketplace_messages tabloları
"""

import enum
from datetime import datetime
from typing import Optional
from uuid import uuid4
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class ListingStatus(str, enum.Enum):
    """İlan durumu enum."""
    ACTIVE = "active"
    SOLD = "sold"
    EXPIRED = "expired"


class ListingCondition(str, enum.Enum):
    """İlan durumu enum."""
    NEW = "new"
    LIKE_NEW = "like_new"
    GOOD = "good"
    FAIR = "fair"


class MarketplaceListing(Base):
    """Pazar ilanı modeli."""
    
    __tablename__ = "marketplace_listings"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    seller_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(precision=10, scale=2), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    condition: Mapped[str] = mapped_column(String(50), nullable=False)
    
    image_urls: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string (array)
    
    status: Mapped[str] = mapped_column(String(20), server_default="active", nullable=False, index=True)
    view_count: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    message_count: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    
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
    
    seller = relationship("User", foreign_keys=[seller_id])
    reports = relationship("MarketplaceReport", back_populates="listing", cascade="all, delete-orphan")
    messages = relationship("MarketplaceMessage", back_populates="listing", cascade="all, delete-orphan")


class MarketplaceReport(Base):
    """Pazar rapor modeli."""
    
    __tablename__ = "marketplace_reports"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    listing_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("marketplace_listings.id"),
        nullable=False,
    )
    reporter_user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
    )
    
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), server_default="pending", nullable=False)
    
    reviewed_by: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=True,
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    
    listing = relationship("MarketplaceListing", back_populates="reports")
    reporter = relationship("User", foreign_keys=[reporter_user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class MarketplaceMessage(Base):
    """Pazar mesaj modeli."""
    
    __tablename__ = "marketplace_messages"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    conversation_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("conversations.id"),
        nullable=True,
        index=True,
    )
    sender_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    receiver_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    listing_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("marketplace_listings.id"),
        nullable=False,
        index=True,
    )
    
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
        index=True,
    )
    
    conversation = relationship("Conversation", foreign_keys=[conversation_id], back_populates="marketplace_messages")
    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
    listing = relationship("MarketplaceListing", back_populates="messages")

