"""Academic modelleri - Spec'lere göre.

Spec: specs/SYSTEM_OVERVIEW.md - academic_calendar_events, course_schedules, academic_contributions tabloları
"""

import enum
from datetime import date, datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class EventType(str, enum.Enum):
    """Etkinlik tipi enum."""
    EXAM = "exam"
    REGISTRATION = "registration"
    HOLIDAY = "holiday"
    OTHER = "other"


class ContributionType(str, enum.Enum):
    """Katkı tipi enum."""
    COURSE_SCHEDULE = "course_schedule"
    ACADEMIC_CALENDAR = "academic_calendar"


class ContributionStatus(str, enum.Enum):
    """Katkı durumu enum."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class AcademicCalendarEvent(Base):
    """Akademik takvim etkinliği modeli."""
    
    __tablename__ = "academic_calendar_events"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    university: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
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


class CourseSchedule(Base):
    """Ders programı modeli."""
    
    __tablename__ = "course_schedules"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    
    university: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    department: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    class_year: Mapped[str] = mapped_column(String(50), nullable=False)
    semester: Mapped[str] = mapped_column(String(20), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False)
    
    schedule_data: Mapped[str] = mapped_column(Text, nullable=False)  # JSON string
    
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
    
    __table_args__ = (
        UniqueConstraint('university', 'department', 'class_year', 'semester', 'academic_year', 
                        name='uq_course_schedules_unique'),
    )


class AcademicContribution(Base):
    """Akademik katkı modeli."""
    
    __tablename__ = "academic_contributions"
    
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
    
    type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    
    university: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    class_year: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    semester: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    academic_year: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    manual_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string
    
    status: Mapped[str] = mapped_column(String(20), server_default="pending", nullable=False, index=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
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
    
    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

