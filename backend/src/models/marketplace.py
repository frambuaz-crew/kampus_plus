"""Marketplace modelleri - Spec'lere göre.

Spec: specs/SYSTEM_OVERVIEW.md - marketplace_categories, marketplace_listings, marketplace_reports, marketplace_messages tabloları
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
    """Ürün durumu enum."""
    NEW = "new"
    LIKE_NEW = "like_new"
    GOOD = "good"
    FAIR = "fair"


class MarketplaceCategory(Base):
    """Pazar yeri kategori modeli."""

    __tablename__ = "marketplace_categories"

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

    # Multi-tenant: nullable → global kategori
    university_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("universities.id"), nullable=True, index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

    listings = relationship("MarketplaceListing", back_populates="category_rel")


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
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Multi-tenant: university_id for listings
    university_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("universities.id", ondelete="SET NULL"), nullable=True, index=True,
    )

    # Relational category (replaces the old plain String column)
    category_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("marketplace_categories.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(precision=10, scale=2), nullable=False)
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

    seller = relationship("User", foreign_keys=[seller_id], overlaps="marketplace_listings")
    category_rel = relationship("MarketplaceCategory", back_populates="listings")
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
        ForeignKey("marketplace_listings.id", ondelete="CASCADE"),
        nullable=False,
    )
    reporter_user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), server_default="pending", nullable=False)

    reviewed_by: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
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
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    sender_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    receiver_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    listing_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("marketplace_listings.id", ondelete="CASCADE"),
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
