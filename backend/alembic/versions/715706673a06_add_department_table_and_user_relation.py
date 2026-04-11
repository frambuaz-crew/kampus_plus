"""add_department_table_and_user_relation

Revision ID: 715706673a06
Revises: 0ea4742e0b4e
Create Date: 2026-02-15 20:47:14.015418
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Alembic revision tanımlayıcıları
revision: str = '715706673a06'
down_revision: Union[str, Sequence[str], None] = '0ea4742e0b4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Veritabanı şemasını yükselt."""
    op.create_table('departments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_departments_name'), 'departments', ['name'], unique=True)

    # SQLite'ta FK ekleme ve sütun silme için batch mode zorunlu
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('department_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_users_department_id', 'departments', ['department_id'], ['id'], ondelete='RESTRICT'
        )
        batch_op.drop_column('department')


def downgrade() -> None:
    """Veritabanı şemasını geri al."""
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('department', sa.String(length=255), nullable=True))
        batch_op.drop_constraint('fk_users_department_id', type_='foreignkey')
        batch_op.drop_column('department_id')

    op.drop_index(op.f('ix_departments_name'), table_name='departments')
    op.drop_table('departments')
