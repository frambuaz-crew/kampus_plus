"""Fakülte modeli — University → Faculty → Department hiyerarşisinin orta katmanı."""

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .university import University
    from .department import Department


class Faculty(Base):
    """Fakülte — Bir üniversiteye bağlı, bölümleri barındıran birim."""

    __tablename__ = "faculties"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    university_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("universities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, server_default=text("true"), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

    # İlişkiler
    university: Mapped["University"] = relationship("University", back_populates="faculties")
    departments: Mapped[list["Department"]] = relationship(
        "Department", back_populates="faculty", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("name", "university_id", name="uq_faculty_name_university"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Faculty name='{self.name}'>"
