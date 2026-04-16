"""add_is_approved_to_academic_calendar_events

Revision ID: 8f3c2c1a6d7b
Revises: cc7110f148a8
Create Date: 2026-04-16 19:20:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Alembic revision identifiers
revision: str = "8f3c2c1a6d7b"
down_revision: Union[str, Sequence[str], None] = "cc7110f148a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "academic_calendar_events",
        sa.Column("is_approved", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    with op.batch_alter_table("academic_calendar_events", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_academic_calendar_events_is_approved"), ["is_approved"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("academic_calendar_events", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_academic_calendar_events_is_approved"))
    op.drop_column("academic_calendar_events", "is_approved")
