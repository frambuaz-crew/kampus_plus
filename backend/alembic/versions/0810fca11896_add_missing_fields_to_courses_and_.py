"""add_missing_fields_to_courses_and_documents

Revision ID: 0810fca11896
Revises: 429265287a30
Create Date: 2025-11-15 12:52:24.114211

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0810fca11896'
down_revision: Union[str, Sequence[str], None] = '429265287a30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add missing fields to courses, official_documents, and user_documents tables."""
    
    # ========================================================================
    # 1. Add missing fields to COURSES table
    # ========================================================================
    op.add_column('courses', sa.Column('department', sa.String(100), nullable=True))
    op.add_column('courses', sa.Column('credits', sa.Integer(), nullable=True))
    op.add_column('courses', sa.Column('schedule', sa.JSON(), nullable=True))
    op.add_column('courses', sa.Column('syllabus_url', sa.String(500), nullable=True))
    
    # ========================================================================
    # 2. Add missing fields to OFFICIAL_DOCUMENTS table
    # ========================================================================
    op.add_column('official_documents', sa.Column('source_id', sa.String(255), nullable=True))
    op.add_column('official_documents', sa.Column('document_type', sa.String(50), nullable=True))
    op.add_column('official_documents', sa.Column('sync_job_id', sa.UUID(), nullable=True))
    op.add_column('official_documents', sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False))
    
    # Add foreign key for sync_job_id
    op.create_foreign_key(
        'fk_official_documents_sync_job_id',
        'official_documents',
        'sync_jobs',
        ['sync_job_id'],
        ['id'],
        ondelete='SET NULL'
    )
    
    # Add unique constraint for (source_system, source_id)
    op.create_index(
        'ix_official_documents_source_system_source_id',
        'official_documents',
        ['source_system', 'source_id'],
        unique=True,
        postgresql_where=sa.text('source_id IS NOT NULL')
    )
    
    # Add index for is_active
    op.create_index('ix_official_documents_is_active', 'official_documents', ['is_active'])
    
    # ========================================================================
    # 3. Add missing fields to USER_DOCUMENTS table
    # ========================================================================
    op.add_column('user_documents', sa.Column('s3_bucket', sa.String(100), nullable=True))
    op.add_column('user_documents', sa.Column('error_message', sa.Text(), nullable=True))
    op.add_column('user_documents', sa.Column('page_count', sa.Integer(), nullable=True))
    
    # Rename upload_at to uploaded_at for consistency with spec
    op.alter_column('user_documents', 'upload_at', new_column_name='uploaded_at')


def downgrade() -> None:
    """Remove added fields from courses, official_documents, and user_documents tables."""
    
    # ========================================================================
    # 1. Remove fields from USER_DOCUMENTS table
    # ========================================================================
    op.alter_column('user_documents', 'uploaded_at', new_column_name='upload_at')
    op.drop_column('user_documents', 'page_count')
    op.drop_column('user_documents', 'error_message')
    op.drop_column('user_documents', 's3_bucket')
    
    # ========================================================================
    # 2. Remove fields from OFFICIAL_DOCUMENTS table
    # ========================================================================
    op.drop_index('ix_official_documents_is_active', table_name='official_documents')
    op.drop_index('ix_official_documents_source_system_source_id', table_name='official_documents')
    op.drop_constraint('fk_official_documents_sync_job_id', 'official_documents', type_='foreignkey')
    op.drop_column('official_documents', 'is_active')
    op.drop_column('official_documents', 'sync_job_id')
    op.drop_column('official_documents', 'document_type')
    op.drop_column('official_documents', 'source_id')
    
    # ========================================================================
    # 3. Remove fields from COURSES table
    # ========================================================================
    op.drop_column('courses', 'syllabus_url')
    op.drop_column('courses', 'schedule')
    op.drop_column('courses', 'credits')
    op.drop_column('courses', 'department')
