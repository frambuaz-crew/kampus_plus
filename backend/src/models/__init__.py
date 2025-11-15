"""SQLAlchemy ORM Models for KAMPÜS+ Platform.

This package contains all database models matching the schema
defined in specs/001-ai-platform/data-model.md.
"""

from .base import Base
from .user import User, RefreshToken
from .course import Course, Enrollment
from .document import OfficialDocument, UserDocument, VectorEmbedding
from .conversation import ConversationSession, ChatMessage
from .forum import ForumPost, AnonymousMapping
from .sync import SyncJob, AuditLog

__all__ = [
    "Base",
    "User",
    "RefreshToken",
    "Course",
    "Enrollment",
    "OfficialDocument",
    "UserDocument",
    "VectorEmbedding",
    "ConversationSession",
    "ChatMessage",
    "ForumPost",
    "AnonymousMapping",
    "SyncJob",
    "AuditLog",
]
