from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base

class Department(Base):
    """Üniversite bölümleri tablosu."""
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    
    # User tablosuyla ters ilişki (Bir bölümde birçok kullanıcı olur)
    users = relationship("User", back_populates="department_rel")

    def __repr__(self):
        return f"<Department(name='{self.name}')>"