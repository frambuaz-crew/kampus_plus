"""Course and Enrollment models."""

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSON, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class EnrollmentStatus(str, enum.Enum):
    """Enrollment status enumeration."""
    
    ACTIVE = "active"
    COMPLETED = "completed"
    DROPPED = "dropped"


class Course(Base):
    """Course model - university courses."""
    
    __tablename__ = "courses"
    
    # Primary Key
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    
    # Course Details
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Instructor
    instructor_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    # Semester Info
    semester: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Additional Course Details (from spec)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    credits: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    schedule: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    syllabus_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False)
    
    # Timestamps
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
    
    # Relationships
    instructor = relationship("User", back_populates="taught_courses", foreign_keys=[instructor_id])
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    official_documents = relationship("OfficialDocument", back_populates="course", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint("code", "semester", "year", name="uq_course_code_semester_year"),
    )
    
    def __repr__(self) -> str:
        return f"<Course(id={self.id}, code={self.code}, name={self.name})>"


class Enrollment(Base):
    """Enrollment model - student-course relationships."""
    
    __tablename__ = "enrollments"
    
    # Primary Key
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    
    # Foreign Keys
    student_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Enrollment Details
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    status: Mapped[EnrollmentStatus] = mapped_column(
        Enum(EnrollmentStatus),
        server_default=text("'active'"),
        nullable=False,
    )
    
    # Relationships
    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint("student_id", "course_id", name="uq_student_course"),
    )
    
    def __repr__(self) -> str:
        return f"<Enrollment(id={self.id}, student_id={self.student_id}, course_id={self.course_id})>"
