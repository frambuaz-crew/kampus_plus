"""add_universities_table

Revision ID: 206bfb5c3c42
Revises: eb70caaae4c2
Create Date: 2026-01-05 01:13:51.498911
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Alembic revision tanımlayıcıları
revision: str = '206bfb5c3c42'
down_revision: Union[str, Sequence[str], None] = 'eb70caaae4c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Veritabanı şemasını yükselt - Sadece universities tablosunu ekle."""
    # Universities tablosunu oluştur
    op.create_table('universities',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('university_type', sa.String(length=50), nullable=False),
    sa.Column('city', sa.String(length=100), nullable=True),
    sa.Column('email_domains', sa.Text(), nullable=True),
    sa.Column('yok_data', sa.Text(), nullable=True),
    sa.Column('is_active', sa.Boolean(), server_default=sa.text('(true)'), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    # Index'leri oluştur
    op.create_index('idx_university_name_type', 'universities', ['name', 'university_type'], unique=False)
    op.create_index(op.f('ix_universities_city'), 'universities', ['city'], unique=False)
    op.create_index(op.f('ix_universities_is_active'), 'universities', ['is_active'], unique=False)
    op.create_index(op.f('ix_universities_name'), 'universities', ['name'], unique=False)
    op.create_index(op.f('ix_universities_university_type'), 'universities', ['university_type'], unique=False)


def downgrade() -> None:
    """Veritabanı şemasını geri al."""
    op.drop_index(op.f('ix_universities_university_type'), table_name='universities')
    op.drop_index(op.f('ix_universities_name'), table_name='universities')
    op.drop_index(op.f('ix_universities_is_active'), table_name='universities')
    op.drop_index(op.f('ix_universities_city'), table_name='universities')
    op.drop_index('idx_university_name_type', table_name='universities')
    op.drop_table('universities')
