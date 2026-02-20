"""Career modelleri - Spec'lere göre.

Spec: specs/SYSTEM_OVERVIEW.md - career_listings, career_applications, career_reports, career_messages tabloları
"""

import enum
from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class CareerListingType(str, enum.Enum):
    """Kariyer ilan tipi enum."""
    JOB = "job"
    INTERNSHIP = "internship"
    STARTUP = "startup"
    PROJECT = "project"


class ApplicationType(str, enum.Enum):
    """Başvuru tipi enum."""
    EXTERNAL = "external"
    DM = "dm"


class CareerListing(Base):
    """Kariyer ilanı modeli."""
    
    __tablename__ = "career_listings"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    posted_by: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    company_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_remote: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), nullable=False)
    
    application_type: Mapped[str] = mapped_column(String(20), nullable=False)
    external_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    sector: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    salary_range: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    required_position: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    duration: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    payment_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    status: Mapped[str] = mapped_column(String(20), server_default="active", nullable=False, index=True)
    view_count: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    application_count: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    
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
    
    posted_by_user = relationship("User", foreign_keys=[posted_by])
    applications = relationship("CareerApplication", back_populates="listing", cascade="all, delete-orphan")
    reports = relationship("CareerReport", back_populates="listing", cascade="all, delete-orphan")
    messages = relationship("CareerMessage", back_populates="listing", cascade="all, delete-orphan")


class CareerApplication(Base):
    """Kariyer başvuru modeli."""
    
    __tablename__ = "career_applications"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    listing_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("career_listings.id"),
        nullable=False,
        index=True,
    )
    applicant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    
    application_type: Mapped[str] = mapped_column(String(20), nullable=False)
    dm_conversation_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("conversations.id"),
        nullable=True,
    )
    
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    
    listing = relationship("CareerListing", back_populates="applications")
    applicant = relationship("User", foreign_keys=[applicant_id])
    conversation = relationship("Conversation", foreign_keys=[dm_conversation_id], back_populates="career_applications")
    
    __table_args__ = (
        UniqueConstraint('listing_id', 'applicant_id', name='uq_career_applications_listing_applicant'),
    )


class CareerReport(Base):
    """Kariyer rapor modeli."""
    
    __tablename__ = "career_reports"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    listing_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("career_listings.id"),
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
    
    listing = relationship("CareerListing", back_populates="reports")
    reporter = relationship("User", foreign_keys=[reporter_user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class CareerMessage(Base):
    """Kariyer mesaj modeli."""
    
    __tablename__ = "career_messages"
    
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
        ForeignKey("career_listings.id"),
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
    
    conversation = relationship("Conversation", foreign_keys=[conversation_id], back_populates="career_messages")
    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
    listing = relationship("CareerListing", back_populates="messages")

