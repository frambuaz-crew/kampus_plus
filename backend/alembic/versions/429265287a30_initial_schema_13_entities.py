"""initial_schema_13_entities

Revision ID: 429265287a30
Revises: b1722908f442
Create Date: 2025-11-15 12:12:14.243282

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '429265287a30'
down_revision: Union[str, Sequence[str], None] = None  # First migration
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Create all 13 entities."""
    
    # ========================================================================
    # 1. User Table
    # ========================================================================
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('role', sa.Enum('student', 'instructor', 'admin', name='user_role'), nullable=False),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('student_id', sa.String(50), nullable=True),
        sa.Column('is_verified', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('last_login', sa.TIMESTAMP(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('student_id')
    )
    op.create_index('ix_users_role', 'users', ['role'])
    op.create_index('ix_users_is_active', 'users', ['is_active'])
    
    # ========================================================================
    # 2. RefreshToken Table
    # ========================================================================
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('token_hash', sa.String(255), nullable=False),
        sa.Column('expires_at', sa.TIMESTAMP(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('is_revoked', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('device_fingerprint', sa.String(255), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('ix_refresh_tokens_user_id', 'refresh_tokens', ['user_id'])
    op.create_index('ix_refresh_tokens_token_hash', 'refresh_tokens', ['token_hash'])
    op.create_index('ix_refresh_tokens_expires_at', 'refresh_tokens', ['expires_at'])
    
    # ========================================================================
    # 3. Course Table
    # ========================================================================
    op.create_table(
        'courses',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('instructor_id', sa.UUID(), nullable=True),
        sa.Column('semester', sa.String(20), nullable=True),
        sa.Column('year', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['instructor_id'], ['users.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('code', 'semester', 'year', name='uq_course_code_semester_year')
    )
    op.create_index('ix_courses_code', 'courses', ['code'])
    op.create_index('ix_courses_instructor_id', 'courses', ['instructor_id'])
    
    # ========================================================================
    # 4. Enrollment Table
    # ========================================================================
    op.create_table(
        'enrollments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('student_id', sa.UUID(), nullable=False),
        sa.Column('course_id', sa.UUID(), nullable=False),
        sa.Column('enrolled_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('status', sa.Enum('active', 'completed', 'dropped', name='enrollment_status'), server_default='active', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('student_id', 'course_id', name='uq_student_course')
    )
    op.create_index('ix_enrollments_student_id', 'enrollments', ['student_id'])
    op.create_index('ix_enrollments_course_id', 'enrollments', ['course_id'])
    
    # ========================================================================
    # 5. OfficialDocument Table
    # ========================================================================
    op.create_table(
        'official_documents',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('course_id', sa.UUID(), nullable=True),
        sa.Column('source_system', sa.Enum('uzem', 'announcements', 'schedule', name='source_system_type'), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('published_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE')
    )
    op.create_index('ix_official_documents_course_id', 'official_documents', ['course_id'])
    op.create_index('ix_official_documents_source_system', 'official_documents', ['source_system'])
    op.create_index('ix_official_documents_published_at', 'official_documents', ['published_at'])
    
    # ========================================================================
    # 6. UserDocument Table
    # ========================================================================
    op.create_table(
        'user_documents',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('s3_key', sa.String(500), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=False),
        sa.Column('content_type', sa.String(100), nullable=False),
        sa.Column('processing_status', sa.Enum('pending', 'processing', 'completed', 'failed', name='processing_status_type'), server_default='pending', nullable=False),
        sa.Column('upload_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('processed_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('ix_user_documents_user_id', 'user_documents', ['user_id'])
    op.create_index('ix_user_documents_processing_status', 'user_documents', ['processing_status'])
    
    # ========================================================================
    # 7. VectorEmbedding Table
    # ========================================================================
    op.create_table(
        'vector_embeddings',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('document_id', sa.UUID(), nullable=True),
        sa.Column('document_type', sa.Enum('official', 'user', 'forum', name='document_type'), nullable=False),
        sa.Column('vector_store', sa.Enum('vdb_official', 'vdb_user', name='vector_store_type'), nullable=False),
        sa.Column('faiss_index_id', sa.Integer(), nullable=False),
        sa.Column('chunk_text', sa.Text(), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_vector_embeddings_document_id', 'vector_embeddings', ['document_id'])
    op.create_index('ix_vector_embeddings_vector_store', 'vector_embeddings', ['vector_store'])
    op.create_index('ix_vector_embeddings_faiss_index_id', 'vector_embeddings', ['faiss_index_id'])
    
    # ========================================================================
    # 8. ConversationSession Table
    # ========================================================================
    op.create_table(
        'conversation_sessions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('ix_conversation_sessions_user_id', 'conversation_sessions', ['user_id'])
    op.create_index('ix_conversation_sessions_is_active', 'conversation_sessions', ['is_active'])
    
    # ========================================================================
    # 9. ChatMessage Table
    # ========================================================================
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('session_id', sa.UUID(), nullable=False),
        sa.Column('role', sa.Enum('user', 'assistant', name='message_role'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('sources', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['session_id'], ['conversation_sessions.id'], ondelete='CASCADE')
    )
    op.create_index('ix_chat_messages_session_id', 'chat_messages', ['session_id'])
    op.create_index('ix_chat_messages_created_at', 'chat_messages', ['created_at'])
    
    # ========================================================================
    # 10. ForumPost Table
    # ========================================================================
    op.create_table(
        'forum_posts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('author_id', sa.UUID(), nullable=False),
        sa.Column('thread_id', sa.UUID(), nullable=True),
        sa.Column('title', sa.String(500), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_flagged', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['thread_id'], ['forum_posts.id'], ondelete='CASCADE')
    )
    op.create_index('ix_forum_posts_author_id', 'forum_posts', ['author_id'])
    op.create_index('ix_forum_posts_thread_id', 'forum_posts', ['thread_id'])
    op.create_index('ix_forum_posts_created_at', 'forum_posts', ['created_at'])
    
    # Full-text search index for forum posts (PostgreSQL only)
    # Skip for SQLite as it doesn't support tsvector/gin indexes
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("""
            ALTER TABLE forum_posts ADD COLUMN search_vector tsvector;
        """)
        op.execute("""
            CREATE INDEX ix_forum_posts_search_vector ON forum_posts USING gin(search_vector);
        """)
        op.execute("""
            CREATE TRIGGER forum_posts_search_vector_update BEFORE INSERT OR UPDATE
            ON forum_posts FOR EACH ROW EXECUTE FUNCTION
            tsvector_update_trigger(search_vector, 'pg_catalog.turkish', title, content);
        """)
    
    # ========================================================================
    # 11. AnonymousMapping Table
    # ========================================================================
    op.create_table(
        'anonymous_mappings',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('thread_id', sa.UUID(), nullable=False),
        sa.Column('anonymous_id', sa.String(64), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['thread_id'], ['forum_posts.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', 'thread_id', name='uq_user_thread_mapping')
    )
    op.create_index('ix_anonymous_mappings_anonymous_id', 'anonymous_mappings', ['anonymous_id'])
    
    # ========================================================================
    # 12. SyncJob Table
    # ========================================================================
    op.create_table(
        'sync_jobs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('source_system', sa.Enum('uzem', 'announcements', 'schedule', name='sync_source_type'), nullable=False),
        sa.Column('status', sa.Enum('pending', 'running', 'completed', 'failed', name='sync_status_type'), server_default='pending', nullable=False),
        sa.Column('started_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('completed_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('documents_synced', sa.Integer(), server_default='0', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_sync_jobs_source_system', 'sync_jobs', ['source_system'])
    op.create_index('ix_sync_jobs_status', 'sync_jobs', ['status'])
    op.create_index('ix_sync_jobs_created_at', 'sync_jobs', ['created_at'])
    
    # ========================================================================
    # 13. AuditLog Table
    # ========================================================================
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('resource_type', sa.String(50), nullable=True),
        sa.Column('resource_id', sa.UUID(), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL')
    )
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])


def downgrade() -> None:
    """Downgrade schema - Drop all 13 entities in reverse order."""
    
    # Drop tables in reverse order (respect FK constraints)
    op.drop_table('audit_logs')
    op.drop_table('sync_jobs')
    op.drop_table('anonymous_mappings')
    op.drop_table('forum_posts')
    op.drop_table('chat_messages')
    op.drop_table('conversation_sessions')
    op.drop_table('vector_embeddings')
    op.drop_table('user_documents')
    op.drop_table('official_documents')
    op.drop_table('enrollments')
    op.drop_table('courses')
    op.drop_table('refresh_tokens')
    op.drop_table('users')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS user_role CASCADE')
    op.execute('DROP TYPE IF EXISTS enrollment_status CASCADE')
    op.execute('DROP TYPE IF EXISTS source_system_type CASCADE')
    op.execute('DROP TYPE IF EXISTS processing_status_type CASCADE')
    op.execute('DROP TYPE IF EXISTS document_type CASCADE')
    op.execute('DROP TYPE IF EXISTS vector_store_type CASCADE')
    op.execute('DROP TYPE IF EXISTS message_role CASCADE')
    op.execute('DROP TYPE IF EXISTS sync_source_type CASCADE')
    op.execute('DROP TYPE IF EXISTS sync_status_type CASCADE')
