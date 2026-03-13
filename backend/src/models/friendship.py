"""Friendship (Arkadaşlık) modeli.

İki kullanıcı arasındaki arkadaşlık isteği ve durumunu saklar.
Status değerleri: 'pending', 'accepted', 'rejected'
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Friendship(Base):
    """İki kullanıcı arasındaki arkadaşlık kaydı."""

    __tablename__ = "friendships"

    __table_args__ = (
        UniqueConstraint("requester_id", "addressee_id", name="uq_friendship_pair"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    requester_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    addressee_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 'pending' | 'accepted' | 'rejected'
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default=text("'pending'"),
        index=True,
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

    # İsteği gönderen kullanıcı
    requester = relationship(
        "User",
        foreign_keys=[requester_id],
        back_populates="sent_friend_requests",
    )

    # İsteği alan kullanıcı
    addressee = relationship(
        "User",
        foreign_keys=[addressee_id],
        back_populates="received_friend_requests",
    )
