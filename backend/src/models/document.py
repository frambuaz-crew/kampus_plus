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
    sync_job_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("sync_jobs.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    # Source Info
    source_system: Mapped[SourceSystemType] = mapped_column(
        Enum(SourceSystemType),
        nullable=False,
        index=True,
    )
    source_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    document_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
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
    
    # Status
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        server_default=text("true"),
        nullable=False,
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
    sync_job = relationship("SyncJob", back_populates="official_documents")
    
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
    s3_bucket: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Processing
    processing_status: Mapped[ProcessingStatusType] = mapped_column(
        Enum(ProcessingStatusType),
        server_default=text("'pending'"),
        nullable=False,
        index=True,
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Timestamps
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    
    # Soft Delete
    is_deleted: Mapped[bool] = mapped_column(
        Boolean, 
        server_default=text("0"), 
        default=False,
        nullable=False
    )
    
    # Relationships
    user = relationship("User", back_populates="user_documents")
    
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
    
    # Note: No explicit relationships for polymorphic document reference
    # Use document_id + document_type to manually join in queries
    
    def __repr__(self) -> str:
        return f"<VectorEmbedding(id={self.id}, vector_store={self.vector_store}, faiss_index_id={self.faiss_index_id})>"
