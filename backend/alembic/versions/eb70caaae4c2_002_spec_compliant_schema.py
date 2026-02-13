"""002_spec_compliant_schema

Spec'lere göre tüm tabloları oluşturan migration.
Spec: specs/SYSTEM_OVERVIEW.md

Revision ID: eb70caaae4c2
Revises: 
Create Date: 2026-01-04 21:36:00.764733
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# Alembic revision tanımlayıcıları
revision: str = 'eb70caaae4c2'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Veritabanı şemasını yükselt - Spec'lere göre tüm tabloları oluştur."""
    
    # ============================================================================
    # CORE TABLES
    # ============================================================================
    
    # users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('username_last_changed_at', sa.DateTime(), nullable=True),
        sa.Column('student_number', sa.String(length=50), nullable=True),
        sa.Column('university', sa.String(length=255), nullable=False),
        sa.Column('department', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=20), server_default='student', nullable=False),
        sa.Column('is_verified', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('profile_picture_url', sa.String(length=255), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('theme_preference', sa.String(length=10), server_default='light', nullable=False),
        sa.Column('terms_accepted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_users_email', 'users', ['email'], unique=True)
    op.create_index('idx_users_username', 'users', ['username'], unique=True)
    op.create_index('idx_users_is_deleted', 'users', ['is_deleted'])
    op.create_index('idx_users_is_verified', 'users', ['is_verified'])
    
    # refresh_tokens table
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('token', sa.String(length=500), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_refresh_tokens_user', 'refresh_tokens', ['user_id'])
    op.create_index('idx_refresh_tokens_token', 'refresh_tokens', ['token'], unique=True)
    op.create_index('idx_refresh_tokens_expires', 'refresh_tokens', ['expires_at'])
    
    # ============================================================================
    # FORUM TABLES
    # ============================================================================
    
    # forum_categories table
    op.create_table(
        'forum_categories',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('order_index', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # forum_topics table
    op.create_table(
        'forum_topics',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('category_id', sa.String(length=36), nullable=False),
        sa.Column('author_id', sa.String(length=36), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_pinned', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('view_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('reply_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('helpful_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('last_reply_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['forum_categories.id']),
        sa.ForeignKeyConstraint(['author_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_forum_topics_category', 'forum_topics', ['category_id'])
    op.create_index('idx_forum_topics_author', 'forum_topics', ['author_id'])
    op.create_index('idx_forum_topics_is_pinned', 'forum_topics', ['is_pinned'])
    op.create_index('idx_forum_topics_created_at', 'forum_topics', ['created_at'])
    
    # forum_replies table
    op.create_table(
        'forum_replies',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('topic_id', sa.String(length=36), nullable=False),
        sa.Column('author_id', sa.String(length=36), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('helpful_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['topic_id'], ['forum_topics.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_forum_replies_topic', 'forum_replies', ['topic_id'])
    op.create_index('idx_forum_replies_author', 'forum_replies', ['author_id'])
    op.create_index('idx_forum_replies_created_at', 'forum_replies', ['created_at'])
    
    # ============================================================================
    # MARKETPLACE TABLES
    # ============================================================================
    
    # marketplace_listings table
    op.create_table(
        'marketplace_listings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('seller_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('condition', sa.String(length=50), nullable=False),
        sa.Column('image_urls', sa.Text(), nullable=True),  # JSON string (SQLite doesn't support arrays)
        sa.Column('status', sa.String(length=20), server_default='active', nullable=False),
        sa.Column('view_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('message_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['seller_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_marketplace_listings_seller', 'marketplace_listings', ['seller_id'])
    op.create_index('idx_marketplace_listings_status', 'marketplace_listings', ['status'])
    op.create_index('idx_marketplace_listings_category', 'marketplace_listings', ['category'])
    op.create_index('idx_marketplace_listings_created_at', 'marketplace_listings', ['created_at'])
    
    # marketplace_reports table
    op.create_table(
        'marketplace_reports',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('listing_id', sa.String(length=36), nullable=False),
        sa.Column('reporter_user_id', sa.String(length=36), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='pending', nullable=False),
        sa.Column('reviewed_by', sa.String(length=36), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['listing_id'], ['marketplace_listings.id']),
        sa.ForeignKeyConstraint(['reporter_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # ============================================================================
    # CAREER TABLES
    # ============================================================================
    
    # career_listings table
    op.create_table(
        'career_listings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('posted_by', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('is_remote', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('application_type', sa.String(length=20), nullable=False),
        sa.Column('external_url', sa.String(length=500), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='active', nullable=False),
        sa.Column('view_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('application_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['posted_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_career_listings_type', 'career_listings', ['type'])
    op.create_index('idx_career_listings_posted_by', 'career_listings', ['posted_by'])
    op.create_index('idx_career_listings_status', 'career_listings', ['status'])
    op.create_index('idx_career_listings_created_at', 'career_listings', ['created_at'])
    
    # career_reports table
    op.create_table(
        'career_reports',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('listing_id', sa.String(length=36), nullable=False),
        sa.Column('reporter_user_id', sa.String(length=36), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='pending', nullable=False),
        sa.Column('reviewed_by', sa.String(length=36), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['listing_id'], ['career_listings.id']),
        sa.ForeignKeyConstraint(['reporter_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # ============================================================================
    # ACADEMIC TABLES
    # ============================================================================
    
    # academic_calendar_events table
    op.create_table(
        'academic_calendar_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('university', sa.String(length=255), nullable=False),
        sa.Column('academic_year', sa.String(length=20), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_academic_calendar_university', 'academic_calendar_events', ['university'])
    op.create_index('idx_academic_calendar_dates', 'academic_calendar_events', ['start_date', 'end_date'])
    
    # course_schedules table
    op.create_table(
        'course_schedules',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('university', sa.String(length=255), nullable=False),
        sa.Column('department', sa.String(length=255), nullable=False),
        sa.Column('class_year', sa.String(length=50), nullable=False),
        sa.Column('semester', sa.String(length=20), nullable=False),
        sa.Column('academic_year', sa.String(length=20), nullable=False),
        sa.Column('schedule_data', sa.Text(), nullable=False),  # JSON string
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('university', 'department', 'class_year', 'semester', 'academic_year')
    )
    op.create_index('idx_course_schedules_university', 'course_schedules', ['university'])
    op.create_index('idx_course_schedules_department', 'course_schedules', ['department'])
    
    # academic_contributions table
    op.create_table(
        'academic_contributions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('university', sa.String(length=255), nullable=False),
        sa.Column('department', sa.String(length=255), nullable=True),
        sa.Column('class_year', sa.String(length=50), nullable=True),
        sa.Column('semester', sa.String(length=20), nullable=True),
        sa.Column('academic_year', sa.String(length=20), nullable=True),
        sa.Column('file_url', sa.String(length=500), nullable=True),
        sa.Column('manual_data', sa.Text(), nullable=True),  # JSON string
        sa.Column('status', sa.String(length=20), server_default='pending', nullable=False),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('reviewed_by', sa.String(length=36), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_academic_contributions_user', 'academic_contributions', ['user_id'])
    op.create_index('idx_academic_contributions_status', 'academic_contributions', ['status'])
    op.create_index('idx_academic_contributions_type', 'academic_contributions', ['type'])
    
    # ============================================================================
    # MESSAGING TABLES
    # ============================================================================
    
    # conversations table (merkezi mesajlaşma)
    op.create_table(
        'conversations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('reference_id', sa.String(length=36), nullable=False),
        sa.Column('user1_id', sa.String(length=36), nullable=False),
        sa.Column('user2_id', sa.String(length=36), nullable=False),
        sa.Column('last_message_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('user1_unread_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('user2_unread_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['user1_id'], ['users.id']),
        sa.ForeignKeyConstraint(['user2_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('type', 'reference_id', 'user1_id', 'user2_id')
    )
    op.create_index('idx_conversations_user1', 'conversations', ['user1_id'])
    op.create_index('idx_conversations_user2', 'conversations', ['user2_id'])
    op.create_index('idx_conversations_last_message', 'conversations', ['last_message_at'])
    
    # career_applications table (conversations'tan sonra oluşturulmalı)
    op.create_table(
        'career_applications',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('listing_id', sa.String(length=36), nullable=False),
        sa.Column('applicant_id', sa.String(length=36), nullable=False),
        sa.Column('application_type', sa.String(length=20), nullable=False),
        sa.Column('dm_conversation_id', sa.String(length=36), nullable=True),
        sa.Column('applied_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['listing_id'], ['career_listings.id']),
        sa.ForeignKeyConstraint(['applicant_id'], ['users.id']),
        sa.ForeignKeyConstraint(['dm_conversation_id'], ['conversations.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('listing_id', 'applicant_id')
    )
    op.create_index('idx_career_applications_listing', 'career_applications', ['listing_id'])
    op.create_index('idx_career_applications_applicant', 'career_applications', ['applicant_id'])
    
    # marketplace_messages table
    op.create_table(
        'marketplace_messages',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('conversation_id', sa.String(length=36), nullable=True),
        sa.Column('sender_id', sa.String(length=36), nullable=False),
        sa.Column('receiver_id', sa.String(length=36), nullable=False),
        sa.Column('listing_id', sa.String(length=36), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id']),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id']),
        sa.ForeignKeyConstraint(['receiver_id'], ['users.id']),
        sa.ForeignKeyConstraint(['listing_id'], ['marketplace_listings.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_marketplace_messages_conversation', 'marketplace_messages', ['conversation_id'])
    op.create_index('idx_marketplace_messages_sender', 'marketplace_messages', ['sender_id'])
    op.create_index('idx_marketplace_messages_receiver', 'marketplace_messages', ['receiver_id'])
    op.create_index('idx_marketplace_messages_listing', 'marketplace_messages', ['listing_id'])
    op.create_index('idx_marketplace_messages_created_at', 'marketplace_messages', ['created_at'])
    
    # career_messages table
    op.create_table(
        'career_messages',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('conversation_id', sa.String(length=36), nullable=True),
        sa.Column('sender_id', sa.String(length=36), nullable=False),
        sa.Column('receiver_id', sa.String(length=36), nullable=False),
        sa.Column('listing_id', sa.String(length=36), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id']),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id']),
        sa.ForeignKeyConstraint(['receiver_id'], ['users.id']),
        sa.ForeignKeyConstraint(['listing_id'], ['career_listings.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_career_messages_conversation', 'career_messages', ['conversation_id'])
    op.create_index('idx_career_messages_sender', 'career_messages', ['sender_id'])
    op.create_index('idx_career_messages_receiver', 'career_messages', ['receiver_id'])
    op.create_index('idx_career_messages_listing', 'career_messages', ['listing_id'])
    op.create_index('idx_career_messages_created_at', 'career_messages', ['created_at'])
    
    # ============================================================================
    # NOTIFICATION TABLES
    # ============================================================================
    
    # notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('actor_id', sa.String(length=36), nullable=True),
        sa.Column('link', sa.String(length=500), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),  # JSON string (metadata reserved keyword)
        sa.Column('is_read', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_notifications_user', 'notifications', ['user_id'])
    op.create_index('idx_notifications_is_read', 'notifications', ['is_read'])
    op.create_index('idx_notifications_created_at', 'notifications', ['created_at'])
    op.create_index('idx_notifications_type', 'notifications', ['type'])
    
    # ============================================================================
    # AI ASSISTANT TABLES
    # ============================================================================
    
    # ai_conversations table
    op.create_table(
        'ai_conversations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_ai_conversations_user', 'ai_conversations', ['user_id'])
    
    # ai_messages table
    op.create_table(
        'ai_messages',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('conversation_id', sa.String(length=36), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['ai_conversations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_ai_messages_conversation', 'ai_messages', ['conversation_id'])
    op.create_index('idx_ai_messages_created_at', 'ai_messages', ['created_at'])
    
    # ai_system_settings table
    op.create_table(
        'ai_system_settings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('system_prompt', sa.Text(), nullable=False),
        sa.Column('rate_limit_per_day', sa.Integer(), server_default='50', nullable=False),
        sa.Column('updated_by', sa.String(length=36), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # ai_knowledge_base table
    op.create_table(
        'ai_knowledge_base',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('keywords', sa.Text(), nullable=False),  # JSON string (array)
        sa.Column('answer', sa.Text(), nullable=False),
        sa.Column('priority', sa.Integer(), server_default='1', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_ai_knowledge_base_priority', 'ai_knowledge_base', ['priority'])
    op.create_index('idx_ai_knowledge_base_is_active', 'ai_knowledge_base', ['is_active'])
    
    # ============================================================================
    # SETTINGS TABLES
    # ============================================================================
    
    # contact_messages table
    op.create_table(
        'contact_messages',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('subject', sa.String(length=100), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='pending', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('answered_at', sa.DateTime(), nullable=True),
        sa.Column('answered_by', sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['answered_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_contact_messages_user', 'contact_messages', ['user_id'])
    op.create_index('idx_contact_messages_status', 'contact_messages', ['status'])
    op.create_index('idx_contact_messages_created_at', 'contact_messages', ['created_at'])


def downgrade() -> None:
    """Veritabanı şemasını geri al - Tüm tabloları sil."""
    
    # Settings tables
    op.drop_index('idx_contact_messages_created_at', table_name='contact_messages')
    op.drop_index('idx_contact_messages_status', table_name='contact_messages')
    op.drop_index('idx_contact_messages_user', table_name='contact_messages')
    op.drop_table('contact_messages')
    
    # AI Assistant tables
    op.drop_index('idx_ai_knowledge_base_is_active', table_name='ai_knowledge_base')
    op.drop_index('idx_ai_knowledge_base_priority', table_name='ai_knowledge_base')
    op.drop_table('ai_knowledge_base')
    op.drop_table('ai_system_settings')
    op.drop_index('idx_ai_messages_created_at', table_name='ai_messages')
    op.drop_index('idx_ai_messages_conversation', table_name='ai_messages')
    op.drop_table('ai_messages')
    op.drop_index('idx_ai_conversations_user', table_name='ai_conversations')
    op.drop_table('ai_conversations')
    
    # Notification tables
    op.drop_index('idx_notifications_type', table_name='notifications')
    op.drop_index('idx_notifications_created_at', table_name='notifications')
    op.drop_index('idx_notifications_is_read', table_name='notifications')
    op.drop_index('idx_notifications_user', table_name='notifications')
    op.drop_table('notifications')
    
    # Messaging tables
    op.drop_index('idx_career_messages_created_at', table_name='career_messages')
    op.drop_index('idx_career_messages_listing', table_name='career_messages')
    op.drop_index('idx_career_messages_receiver', table_name='career_messages')
    op.drop_index('idx_career_messages_sender', table_name='career_messages')
    op.drop_index('idx_career_messages_conversation', table_name='career_messages')
    op.drop_table('career_messages')
    op.drop_index('idx_marketplace_messages_created_at', table_name='marketplace_messages')
    op.drop_index('idx_marketplace_messages_listing', table_name='marketplace_messages')
    op.drop_index('idx_marketplace_messages_receiver', table_name='marketplace_messages')
    op.drop_index('idx_marketplace_messages_sender', table_name='marketplace_messages')
    op.drop_index('idx_marketplace_messages_conversation', table_name='marketplace_messages')
    op.drop_table('marketplace_messages')
    op.drop_index('idx_conversations_last_message', table_name='conversations')
    op.drop_index('idx_conversations_user2', table_name='conversations')
    op.drop_index('idx_conversations_user1', table_name='conversations')
    op.drop_table('conversations')
    
    # Career applications (conversations'tan sonra silinmeli)
    op.drop_index('idx_career_applications_applicant', table_name='career_applications')
    op.drop_index('idx_career_applications_listing', table_name='career_applications')
    op.drop_table('career_applications')
    
    # Academic tables
    op.drop_index('idx_academic_contributions_type', table_name='academic_contributions')
    op.drop_index('idx_academic_contributions_status', table_name='academic_contributions')
    op.drop_index('idx_academic_contributions_user', table_name='academic_contributions')
    op.drop_table('academic_contributions')
    op.drop_index('idx_course_schedules_department', table_name='course_schedules')
    op.drop_index('idx_course_schedules_university', table_name='course_schedules')
    op.drop_table('course_schedules')
    op.drop_index('idx_academic_calendar_dates', table_name='academic_calendar_events')
    op.drop_index('idx_academic_calendar_university', table_name='academic_calendar_events')
    op.drop_table('academic_calendar_events')
    
    # Career tables
    op.drop_table('career_reports')
    op.drop_index('idx_career_listings_created_at', table_name='career_listings')
    op.drop_index('idx_career_listings_status', table_name='career_listings')
    op.drop_index('idx_career_listings_posted_by', table_name='career_listings')
    op.drop_index('idx_career_listings_type', table_name='career_listings')
    op.drop_table('career_listings')
    
    # Marketplace tables
    op.drop_table('marketplace_reports')
    op.drop_index('idx_marketplace_listings_created_at', table_name='marketplace_listings')
    op.drop_index('idx_marketplace_listings_category', table_name='marketplace_listings')
    op.drop_index('idx_marketplace_listings_status', table_name='marketplace_listings')
    op.drop_index('idx_marketplace_listings_seller', table_name='marketplace_listings')
    op.drop_table('marketplace_listings')
    
    # Forum tables
    op.drop_index('idx_forum_replies_created_at', table_name='forum_replies')
    op.drop_index('idx_forum_replies_author', table_name='forum_replies')
    op.drop_index('idx_forum_replies_topic', table_name='forum_replies')
    op.drop_table('forum_replies')
    op.drop_index('idx_forum_topics_created_at', table_name='forum_topics')
    op.drop_index('idx_forum_topics_is_pinned', table_name='forum_topics')
    op.drop_index('idx_forum_topics_author', table_name='forum_topics')
    op.drop_index('idx_forum_topics_category', table_name='forum_topics')
    op.drop_table('forum_topics')
    op.drop_table('forum_categories')
    
    # Core tables
    op.drop_index('idx_refresh_tokens_expires', table_name='refresh_tokens')
    op.drop_index('idx_refresh_tokens_token', table_name='refresh_tokens')
    op.drop_index('idx_refresh_tokens_user', table_name='refresh_tokens')
    op.drop_table('refresh_tokens')
    op.drop_index('idx_users_is_verified', table_name='users')
    op.drop_index('idx_users_is_deleted', table_name='users')
    op.drop_index('idx_users_username', table_name='users')
    op.drop_index('idx_users_email', table_name='users')
    op.drop_table('users')
