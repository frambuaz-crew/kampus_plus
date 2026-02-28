"""Favoriler modeli.

Polimorfik yapı: target_type (forum_topic, marketplace_listing, career_listing) ve target_id.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class UserFavorite(Base):
    """Kullanıcı favorileri (kaydedilenler) modeli."""
    
    __tablename__ = "user_favorites"
    
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
    
    # "forum_topic", "marketplace_listing", "career_listing", "academic_contribution"
    target_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    
    # Favorilenen öğenin ID'si (ör. forum_topics.id)
    target_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    
    # Kullanıcıyla ilişki
    user = relationship("User", backref="favorites")
