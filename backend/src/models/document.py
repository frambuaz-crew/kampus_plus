"""Document and VectorEmbedding models."""

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSON, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class SourceSystemType(str, enum.Enum):
    """Source system enumeration."""
    
    UZEM = "uzem"
    ANNOUNCEMENTS = "announcements"
    SCHEDULE = "schedule"


class ProcessingStatusType(str, enum.Enum):
    """Processing status enumeration."""
    
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentType(str, enum.Enum):
    """Document type enumeration."""
    
    OFFICIAL = "official"
    USER = "user"
    FORUM = "forum"


class VectorStoreType(str, enum.Enum):
    """Vector store type enumeration."""
    
    VDB_OFFICIAL = "vdb_official"
    VDB_USER = "vdb_user"


class OfficialDocument(Base):
    """OfficialDocument model - university official content."""
    
    __tablename__ = "official_documents"
    
    # Primary Key
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    
    # Foreign Key
    course_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    
    # Source Info
    source_system: Mapped[SourceSystemType] = mapped_column(
        Enum(SourceSystemType),
        nullable=False,
        index=True,
    )
    
    # Content
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    doc_metadata: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)
    
    # Publication
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=False),
        nullable=True,
        index=True,
    )
    
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
    course = relationship("Course", back_populates="official_documents")
    vector_embeddings = relationship("VectorEmbedding", back_populates="official_document")
    
    def __repr__(self) -> str:
        return f"<OfficialDocument(id={self.id}, title={self.title[:30]})>"


class UserDocument(Base):
    """UserDocument model - user-uploaded PDFs."""
    
    __tablename__ = "user_documents"
    
    # Primary Key
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    
    # Foreign Key
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # File Info
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    s3_key: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Processing
    processing_status: Mapped[ProcessingStatusType] = mapped_column(
        Enum(ProcessingStatusType),
        server_default=text("'pending'"),
        nullable=False,
        index=True,
    )
    
    # Timestamps
    upload_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    
    # Soft Delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="user_documents")
    vector_embeddings = relationship("VectorEmbedding", back_populates="user_document")
    
    def __repr__(self) -> str:
        return f"<UserDocument(id={self.id}, filename={self.filename})>"


class VectorEmbedding(Base):
    """VectorEmbedding model - metadata for FAISS vectors."""
    
    __tablename__ = "vector_embeddings"
    
    # Primary Key
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    
    # Document Reference (polymorphic)
    document_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    document_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType), nullable=False)
    
    # Vector Store
    vector_store: Mapped[VectorStoreType] = mapped_column(
        Enum(VectorStoreType),
        nullable=False,
        index=True,
    )
    faiss_index_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    
    # Content
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_metadata: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)
    
    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    
    # Relationships (manual join on document_id + document_type)
    official_document = relationship(
        "OfficialDocument",
        back_populates="vector_embeddings",
        foreign_keys=[document_id],
        primaryjoin="and_(VectorEmbedding.document_id==OfficialDocument.id, "
                    "VectorEmbedding.document_type=='official')",
        viewonly=True,
    )
    user_document = relationship(
        "UserDocument",
        back_populates="vector_embeddings",
        foreign_keys=[document_id],
        primaryjoin="and_(VectorEmbedding.document_id==UserDocument.id, "
                    "VectorEmbedding.document_type=='user')",
        viewonly=True,
    )
    
    def __repr__(self) -> str:
        return f"<VectorEmbedding(id={self.id}, vector_store={self.vector_store}, faiss_index_id={self.faiss_index_id})>"
