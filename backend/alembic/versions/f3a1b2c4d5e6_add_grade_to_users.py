"""add_grade_to_users

Revision ID: f3a1b2c4d5e6
Revises: d2122f5d6a59
Create Date: 2026-04-13 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Alembic revision tanımlayıcıları
revision: str = 'f3a1b2c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'd2122f5d6a59'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """users tablosuna grade sütunu ekler."""
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(
            sa.Column('grade', sa.String(length=20), nullable=True)
        )


def downgrade() -> None:
    """grade sütununu users tablosundan kaldırır."""
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('grade')
