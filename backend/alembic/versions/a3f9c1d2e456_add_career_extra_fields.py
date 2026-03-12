"""add_career_extra_fields

Revision ID: a3f9c1d2e456
Revises: 715706673a06
Create Date: 2026-02-21 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a3f9c1d2e456'
down_revision: Union[str, Sequence[str], None] = '715706673a06'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('career_listings', sa.Column('sector', sa.String(length=100), nullable=True))
    op.add_column('career_listings', sa.Column('salary_range', sa.String(length=100), nullable=True))
    op.add_column('career_listings', sa.Column('required_position', sa.String(length=255), nullable=True))
    op.add_column('career_listings', sa.Column('duration', sa.String(length=20), nullable=True))
    op.add_column('career_listings', sa.Column('payment_type', sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('career_listings', 'payment_type')
    op.drop_column('career_listings', 'duration')
    op.drop_column('career_listings', 'required_position')
    op.drop_column('career_listings', 'salary_range')
    op.drop_column('career_listings', 'sector')
