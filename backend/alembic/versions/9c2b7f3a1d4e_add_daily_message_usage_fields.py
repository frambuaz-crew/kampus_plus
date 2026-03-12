"""add daily message usage fields to users

Revision ID: 9c2b7f3a1d4e
Revises: ec83406d5d74
Create Date: 2026-03-06 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Alembic revision identifiers
revision: str = "9c2b7f3a1d4e"
down_revision: Union[str, Sequence[str], None] = "ec83406d5d74"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "users",
        sa.Column("daily_message_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )
    op.add_column("users", sa.Column("last_message_reset", sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "last_message_reset")
    op.drop_column("users", "daily_message_count")
