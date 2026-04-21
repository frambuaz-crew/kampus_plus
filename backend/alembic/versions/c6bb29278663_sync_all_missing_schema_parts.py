"""sync_all_missing_schema_parts

Revision ID: c6bb29278663
Revises: ae6e77cb3325
Create Date: 2026-04-22 01:19:22.652827
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Alembic revision tanımlayıcıları
revision: str = 'c6bb29278663'
down_revision: Union[str, Sequence[str], None] = 'ae6e77cb3325'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Veritabanı şemasını yükselt."""
    with op.batch_alter_table('academic_calendar_events', schema=None) as batch_op:
        batch_op.add_column(sa.Column('university_id', sa.String(length=36), nullable=True))
        batch_op.create_index(batch_op.f('ix_academic_calendar_events_university_id'), ['university_id'], unique=False)
        batch_op.create_foreign_key('fk_academic_calendar_events_university_id', 'universities', ['university_id'], ['id'])

    with op.batch_alter_table('course_schedules', schema=None) as batch_op:
        batch_op.add_column(sa.Column('university_id', sa.String(length=36), nullable=True))
        batch_op.create_index(batch_op.f('ix_course_schedules_university_id'), ['university_id'], unique=False)
        batch_op.create_foreign_key('fk_course_schedules_university_id', 'universities', ['university_id'], ['id'])


def downgrade() -> None:
    """Veritabanı şemasını geri al."""
    with op.batch_alter_table('course_schedules', schema=None) as batch_op:
        batch_op.drop_constraint('fk_course_schedules_university_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_course_schedules_university_id'))
        batch_op.drop_column('university_id')

    with op.batch_alter_table('academic_calendar_events', schema=None) as batch_op:
        batch_op.drop_constraint('fk_academic_calendar_events_university_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_academic_calendar_events_university_id'))
        batch_op.drop_column('university_id')
