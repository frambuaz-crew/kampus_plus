"""Ders Notları modülleri - CourseNoteTopic, CourseNoteEntry, CourseNoteAttachment."""

from typing import Optional
from uuid import uuid4
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class CourseNoteTopic(Base):
    __tablename__ = "course_note_topics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    course_code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    university_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("universities.id", name="fk_course_note_topics_university_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", name="fk_course_note_topics_created_by", ondelete="CASCADE"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    university = relationship("University", foreign_keys=[university_id])
    entries = relationship(
        "CourseNoteEntry",
        back_populates="topic",
        cascade="all, delete-orphan",
        order_by="CourseNoteEntry.created_at",
    )


class CourseNoteEntry(Base):
    __tablename__ = "course_note_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    topic_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("course_note_topics.id", name="fk_course_note_entries_topic_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", name="fk_course_note_entries_user_id", ondelete="CASCADE"),
        nullable=False,
    )
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

    # Relationships
    topic = relationship("CourseNoteTopic", back_populates="entries")
    author = relationship("User", foreign_keys=[user_id])
    attachments = relationship(
        "CourseNoteAttachment",
        back_populates="entry",
        cascade="all, delete-orphan",
    )


class CourseNoteAttachment(Base):
    __tablename__ = "course_note_attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    entry_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("course_note_entries.id", name="fk_course_note_attachments_entry_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)  # "pdf" | "image"
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

    # Relationships
    entry = relationship("CourseNoteEntry", back_populates="attachments")
