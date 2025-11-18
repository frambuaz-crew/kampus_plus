"""
Initialize SQLite database with tables.
Run this script to create all tables without Alembic migrations.
"""
import asyncio
from src.core.database import get_engine
from src.models.base import Base

async def init_database():
    """Create all tables in the database."""
    engine = get_engine()
    
    # Import all models to register them with Base.metadata
    from src.models.user import User, RefreshToken
    from src.models.course import Course, Enrollment
    from src.models.conversation import ConversationSession, ChatMessage
    from src.models.document import OfficialDocument, UserDocument, VectorEmbedding
    from src.models.forum import ForumPost, AnonymousMapping
    from src.models.sync import SyncJob, AuditLog
    
    print("Creating database tables...")
    
    async with engine.begin() as conn:
        # Drop all tables (for clean slate)
        await conn.run_sync(Base.metadata.drop_all)
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ Database tables created successfully!")
    print(f"Tables: {', '.join(Base.metadata.tables.keys())}")

if __name__ == "__main__":
    asyncio.run(init_database())
