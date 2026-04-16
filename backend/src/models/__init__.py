"""SQLAlchemy ORM Modelleri - KAMPÜS+ Platform.

Bu paket specs/SYSTEM_OVERVIEW.md'de tanımlanan
veritabanı şemasına uygun tüm modelleri içerir.
"""

from .base import Base
from .user import User, RefreshToken
from .faculty import Faculty
from .department import Department
from .forum import ForumCategory, ForumTopic, ForumReply
from .marketplace import MarketplaceListing, MarketplaceReport, MarketplaceMessage
from .career import CareerListing, CareerApplication, CareerReport, CareerMessage
from .academic import AcademicCalendarEvent, CourseSchedule, AcademicContribution
from .messages import Conversation
from .notifications import Notification
from .ai import AIConversation, AIMessage, AISystemSettings, AIKnowledgeBase
from .settings import ContactMessage
from .university import University
from .sync import AuditLog
from .favorite import UserFavorite
from .friendship import Friendship

__all__ = [
    "Base",
    # Core
    "User",
    "RefreshToken",
    "Department",
    # Forum
    "ForumCategory",
    "ForumTopic",
    "ForumReply",
    # Marketplace
    "MarketplaceListing",
    "MarketplaceReport",
    "MarketplaceMessage",
    # Career
    "CareerListing",
    "CareerApplication",
    "CareerReport",
    "CareerMessage",
    # Academic
    "AcademicCalendarEvent",
    "CourseSchedule",
    "AcademicContribution",
    # Messages
    "Conversation",
    # Notifications
    "Notification",
    # AI
    "AIConversation",
    "AIMessage",
    "AISystemSettings",
    "AIKnowledgeBase",
    # Settings
    "ContactMessage",
    # University
    "University",
    "Faculty",
    "AuditLog",
    # Favorites
    "UserFavorite",
    # Friendship
    "Friendship",
]
