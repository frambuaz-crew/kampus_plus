"""add_is_approved_to_course_schedules

Revision ID: f9a1b2c3d4e5
Revises: 697d22e360be
Create Date: 2026-04-17 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f9a1b2c3d4e5"
down_revision: Union[str, Sequence[str], None] = "697d22e360be"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "course_schedules",
        sa.Column(
            "is_approved",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    with op.batch_alter_table("course_schedules", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_course_schedules_is_approved"), ["is_approved"], unique=False
        )


def downgrade() -> None:
    with op.batch_alter_table("course_schedules", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_course_schedules_is_approved"))
    op.drop_column("course_schedules", "is_approved")
